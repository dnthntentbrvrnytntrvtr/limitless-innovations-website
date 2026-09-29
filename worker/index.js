/* Limitless Innovations website: the server side.
   Runs on Cloudflare Workers in front of the static site. It receives messages from the
   contact form and orders from the trade basket, keeps them in the D1 database, emails an
   alert to the owner, and serves the private order desk at /desk.

   Everything else (every ordinary page and image) is served as a static asset.
   Settings live in wrangler.jsonc; secrets are set in the Cloudflare dashboard
   (see DESK-SETUP.txt). */

import { DESK_HTML, LOGIN_HTML, invoiceHTML } from './desk.js';
import SUPPLIERS from './suppliers.js';   // supplier links per product, shown only on the desk
import { RANGES, PRODUCTS, LOCK_PHOTOS } from './catalogue.js';   // generated from index.html by build-catalogue.js

const MAX = { name: 80, email: 120, phone: 40, message: 4000, company: 120, notes: 2000, items: 60 };
const COOKIE = 'li_desk';
const SESSION_DAYS = 30;
const LIMITS = { messages: 5, orders: 5, logins: 5 };   // per visitor, per hour

function siteLocked(env) { return /^(on|1|true|yes)$/i.test(String(env.SITE_LOCKED || '').trim()); }

// The login page, filled in for the desk (default) or for the locked website.
function loginPage(base, vars) {
  const v = { base, error: '', form: '', heading: 'Order desk', sub: 'Messages and trade orders from limitlessinnovations.co.uk.', button: 'Open the desk', next: '', bg: '', ...vars };
  v.next = String(v.next).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return Object.entries(v).reduce((t, [k, val]) => t.split('{{' + k + '}}').join(val), LOGIN_HTML);
}
// Private preview page: one of the big building photos behind the login, the next one on every
// visit or refresh (a small cookie remembers which was shown last).
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = p => String(p || '').split(',').map(x => x.trim()).filter(Boolean).map(x => /^(\/|https?:)/.test(x) ? x : '/' + x).join(', ');   // "images/a.webp 1280w, ..." -> "/images/a.webp 1280w, ..."
const LOCK_ASSETS = new Set(LOCK_PHOTOS.flatMap(p => [p.src, ...String(p.srcset).split(',').map(x => x.trim().split(/\s+/)[0])]).filter(Boolean).map(x => abs(x)));
function lockPage(request, base, vars, status) {
  const n = LOCK_PHOTOS.length;
  let idx = 0, headers = {};
  if (n) {
    const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)li_bg=(\d+)/);
    idx = m ? (Number(m[1]) + 1) % n : Math.floor(Math.random() * n);
    headers['set-cookie'] = `li_bg=${idx}; Path=/; Max-Age=31536000; Secure; SameSite=Lax`;
  }
  const p = LOCK_PHOTOS[idx];
  let bg = '';
  if (p) {
    const c = p.credit || {};
    const who = c.by ? (c.source ? `<a href="${escH(c.source)}" rel="noopener" target="_blank">${escH(c.by)}</a>` : escH(c.by)) : '';
    const lic = c.licence ? (c.url ? `, <a href="${escH(c.url)}" rel="noopener" target="_blank">${escH(c.licence)}</a>` : ', ' + escH(c.licence)) : '';
    bg = `<div class="lock-bg" aria-hidden="true"><img src="${escH(abs(p.src))}"${p.srcset ? ` srcset="${escH(abs(p.srcset))}" sizes="100vw"` : ''} alt="" fetchpriority="high" decoding="async" style="object-position:${escH(p.focus)}"></div>` +
         `<div class="lock-credit"><b>${escH(p.place)}</b>${who ? 'Photo: ' + who + lic : ''}</div>`;
  }
  const page = loginPage(base, { heading: 'Private preview', sub: 'This website is not public yet.', button: 'Enter', ...vars, bg });
  return html(page, status || 401, headers);
}

const safeNext = n => (typeof n === 'string' && /^\/(?![\/\\])/.test(n) && n.length < 500) ? n : null;   // only paths on this site

function deskBase(env) {
  const p = String(env.DESK_PATH || 'desk').replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9_\-\/]/g, '');
  return '/' + (p || 'desk');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      // The desk lives at /desk, or at a private address of your own if the DESK_PATH secret is set
      // (then /desk is just another missing page). See DESK-SETUP.txt.
      const base = deskBase(env);
      const isDesk = path === base || path.startsWith(base + '/');

      // Private mode: while SITE_LOCKED is "on" (wrangler.jsonc), the whole website needs the desk
      // password. Logging in once (here or at the desk) unlocks both for 30 days on that device.
      if (siteLocked(env) && !isDesk && path !== '/api/stripe/webhook' && path !== '/favicon.svg' && !LOCK_ASSETS.has(path)) {
        if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
        if (!(await authed(request, env))) {
          if (path.startsWith('/api/')) return json({ ok: false, error: 'locked' }, 401);
          return lockPage(request, base, { next: path + url.search }, 401);
        }
      }

      if (path.startsWith('/api/')) return await api(request, env, ctx, url);
      if (isDesk) return await desk(request, env, url, base);
    } catch (err) {
      console.error('worker error', err && err.stack || err);
      return json({ ok: false, error: 'server' }, 500);
    }
    return env.ASSETS.fetch(request);
  }
};

/* ==========================================================================
   Public API: messages and orders
   ========================================================================== */
async function api(request, env, ctx, url) {
  const path = url.pathname;
  if (path.startsWith('/api/desk/')) return deskApi(request, env, url);

  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (path === '/api/stripe/webhook') return stripeWebhook(request, env, ctx);   // Stripe calls this, so no same-site check
  if (!sameSite(request)) return json({ ok: false, error: 'origin' }, 403);
  if (!env.DB) return json({ ok: false, error: 'not-set-up' }, 503);

  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: 'body' }, 400);

  if (path === '/api/messages') return newMessage(body, ip, env, ctx);
  if (path === '/api/orders') return newOrder(body, ip, env, ctx);
  return json({ ok: false, error: 'not-found' }, 404);
}

async function newMessage(b, ip, env, ctx) {
  // Honeypot and a minimum time on the form catch most bots without bothering people.
  if (b.website) return json({ ok: true, id: 0 });
  if (b.t && Date.now() - Number(b.t) < 2500) return json({ ok: false, error: 'too-fast' }, 400);

  const name = clean(b.name, MAX.name), email = clean(b.email, MAX.email), phone = clean(b.phone, MAX.phone);
  const message = clean(b.message, MAX.message, true);
  const errors = {};
  if (name.length < 2) errors.name = 'Please add your name.';
  if (!isEmail(email)) errors.email = 'Please check the email address.';
  if (message.length < 5) errors.message = 'Please tell us a little about the job.';
  if (Object.keys(errors).length) return json({ ok: false, error: 'invalid', fields: errors }, 422);

  if (!(await rateLimit(env, 'msg:' + ip, LIMITS.messages, 3600))) return json({ ok: false, error: 'rate' }, 429);

  const page = clean(b.page, 120), source = clean(b.source, 40);
  const r = await env.DB.prepare(
    'INSERT INTO messages (name, email, phone, message, page, source, ip) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(name, email, phone || null, message, page || null, source || null, ip).run();
  const id = r.meta.last_row_id;

  ctx.waitUntil(alert(env, `New message from ${name}`,
    `${name} sent a message through the website.\n\nEmail: ${email}\nPhone: ${phone || '-'}\nFrom: ${page || '-'} (${source || 'form'})\n\n${message}\n\nOpen the desk: ${env.SITE_URL || ''}${deskBase(env)}`, email)
    .then(ok => ok && env.DB.prepare('UPDATE messages SET notified = 1 WHERE id = ?').bind(id).run()));

  return json({ ok: true, id });
}

async function newOrder(b, ip, env, ctx) {
  if (b.website) return json({ ok: true, ref: 'LI-0' });
  const company = clean(b.company, MAX.company), contact = clean(b.contact, MAX.name), email = clean(b.email, MAX.email);
  const phone = clean(b.phone, MAX.phone), vat = clean(b.vat, 40), postcode = clean(b.postcode, 12), notes = clean(b.notes, MAX.notes, true);
  const items = Array.isArray(b.items) ? b.items.slice(0, MAX.items).map(i => ({
    id: clean(i.id, 60), brand: clean(i.brand, 60), name: clean(i.name, 120), size: clean(i.size, 120), qty: Math.max(1, Math.min(9999, parseInt(i.qty, 10) || 0)),
    price: (Number(i.price) > 0 && Number(i.price) < 100000) ? Math.round(Number(i.price) * 100) / 100 : null   // the price shown on the site when they ordered
  })).filter(i => i.id && i.name && i.qty) : [];
  const errors = {};
  if (company.length < 2) errors.company = 'Please add your company name.';
  if (contact.length < 2) errors.contact = 'Please add a contact name.';
  if (!isEmail(email)) errors.email = 'Please check the email address.';
  if (!items.length) errors.items = 'The basket is empty.';
  if (Object.keys(errors).length) return json({ ok: false, error: 'invalid', fields: errors }, 422);

  if (!(await rateLimit(env, 'ord:' + ip, LIMITS.orders, 3600))) return json({ ok: false, error: 'rate' }, 429);

  const ref = makeRef();
  const r = await env.DB.prepare(
    'INSERT INTO orders (ref, company, contact, email, phone, vat, postcode, notes, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(ref, company, contact, email, phone || null, vat || null, postcode || null, notes || null, ip).run();
  const orderId = r.meta.last_row_id;
  await env.DB.batch(items.map(i =>
    env.DB.prepare('INSERT INTO order_items (order_id, product_id, brand, name, size, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(orderId, i.id, i.brand || null, i.name, i.size || null, i.qty, i.price)
  ));

  const lines = items.map(i => `  ${i.qty} x ${i.brand ? i.brand + ' ' : ''}${i.name}${i.price ? ` @ £${i.price.toFixed(2)}` : ''}`).join('\n');
  const total = items.reduce((t, i) => t + (i.price ? i.price * i.qty : 0), 0);
  ctx.waitUntil(alert(env, `New trade order ${ref} from ${company}`,
    `${contact} at ${company} sent a trade order enquiry.\n\nRef: ${ref}\nEmail: ${email}\nPhone: ${phone || '-'}\nVAT: ${vat || '-'}\nDelivery postcode: ${postcode || '-'}\n\nItems:\n${lines}\n\nEstimated total: £${total.toFixed(2)}${items.some(i => !i.price) ? ' (some items priced on request)' : ''}\nNotes: ${notes || '-'}\n\nOpen the desk: ${env.SITE_URL || ''}${deskBase(env)}`, email)
    .then(ok => ok && env.DB.prepare('UPDATE orders SET notified = 1 WHERE id = ?').bind(orderId).run()));

  return json({ ok: true, ref });
}

/* ==========================================================================
   The desk: login page, session cookie, the desk page itself
   ========================================================================== */
async function desk(request, env, url, base) {
  const path = url.pathname;
  const page = (tpl, vars) => tpl === LOGIN_HTML ? loginPage(base, vars) : Object.entries({ base, ...vars }).reduce((t, [k, v]) => t.split('{{' + k + '}}').join(v), tpl);
  if (!env.DESK_PASSWORD) return html(page(LOGIN_HTML, { error: 'The desk is not switched on yet: add the DESK_PASSWORD secret in Cloudflare (see DESK-SETUP.txt).', form: 'hidden' }), 503);

  if (path === base + '/login' && request.method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    const body = await readBody(request);
    const next = safeNext(body && body.next);
    const site = next && !(next === base || next.startsWith(base + '/') || next.startsWith(base + '?'));   // came from the private-preview page
    if (!(await rateLimit(env, 'login:' + ip, LIMITS.logins, 3600))) {
      const vars = { error: 'Too many attempts. Try again in an hour.', form: 'hidden' };
      return site ? lockPage(request, base, { ...vars, next }, 429) : html(page(LOGIN_HTML, vars), 429);
    }
    const ok = body && (await safeEqual(String(body.password || ''), env.DESK_PASSWORD));
    if (!ok) { await sleep(600); return site ? lockPage(request, base, { error: 'Wrong password.', next }, 401) : html(page(LOGIN_HTML, { error: 'Wrong password.' }), 401); }
    const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
    const token = exp + '.' + (await hmac(env, 'session:' + exp));
    return redirect(next || base, `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`);
  }
  if (path === base + '/logout') return redirect(base, `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);

  if (!(await authed(request, env))) return html(page(LOGIN_HTML, { error: '', form: '' }), 401);
  if (path === base || path === base + '/') return html(page(DESK_HTML, {}));
  const inv = path.match(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/invoice/(\\d+)$'));
  if (inv) {
    const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(inv[1])).first();
    if (!o) return html('<p>No such order.</p>', 404);
    const items = (await env.DB.prepare('SELECT product_id, brand, name, size, qty, price FROM order_items WHERE order_id = ? ORDER BY id').bind(o.id).all()).results;
    return html(invoiceHTML(o, items, env, env.SITE_URL || ''));
  }
  return json({ ok: false, error: 'not-found' }, 404);
}

async function authed(request, env) {
  if (!env.DESK_PASSWORD) return false;
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(env, 'session:' + exp));
}

/* ==========================================================================
   Desk API (cookie-authenticated)
   ========================================================================== */
async function deskApi(request, env, url) {
  if (!(await authed(request, env))) return json({ ok: false, error: 'auth' }, 401);
  if (request.method === 'POST' && !sameSite(request)) return json({ ok: false, error: 'origin' }, 403);
  const p = url.pathname.replace(/^\/api\/desk\/?/, '').split('/').filter(Boolean);
  const DB = env.DB;

  if (request.method === 'GET') {
    if (p[0] === 'suppliers') return json({ ok: true, suppliers: SUPPLIERS, ranges: RANGES, products: PRODUCTS });
    if (p[0] === 'summary') {
      const m = await DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'").first('n');
      const o = await DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'").first('n');
      const archived = await DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'archived'").first('n');
      const closed = await DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE status IN ('closed','cancelled')").first('n');
      return json({ ok: true, newMessages: m, newOrders: o, archived, closed, alerts: !!(env.RESEND_API_KEY && env.ALERT_TO), stripe: !!env.STRIPE_SECRET_KEY });
    }
    if (p[0] === 'messages' && p[1]) {
      const message = await DB.prepare('SELECT id, created_at, name, email, phone, message, page, source, status FROM messages WHERE id = ?').bind(parseInt(p[1], 10) || 0).first();
      return json({ ok: true, message: message || null });
    }
    if (p[0] === 'orders' && p[1]) {
      const order = await DB.prepare('SELECT id, ref, created_at, company, contact, email, phone, vat, postcode, notes, status, stripe_invoice_id, invoice_url, paid_at FROM orders WHERE id = ?').bind(parseInt(p[1], 10) || 0).first();
      if (order) order.items = (await DB.prepare('SELECT id, order_id, product_id, brand, name, size, qty, price, status FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all()).results;
      return json({ ok: true, order: order || null });
    }
    if (p[0] === 'messages') {
      const all = url.searchParams.get('all') === '1';
      const rows = (await DB.prepare(`SELECT id, created_at, name, email, phone, message, page, source, status FROM messages ${all ? '' : "WHERE status IN ('new','read')"} ORDER BY id DESC LIMIT 300`).all()).results;
      return json({ ok: true, messages: rows });
    }
    if (p[0] === 'orders') {
      const all = url.searchParams.get('all') === '1';
      const orders = (await DB.prepare(`SELECT id, ref, created_at, company, contact, email, phone, vat, postcode, notes, status FROM orders ${all ? '' : "WHERE status NOT IN ('closed','cancelled')"} ORDER BY id DESC LIMIT 200`).all()).results;
      if (orders.length) {
        const ids = orders.map(o => o.id);
        const items = (await DB.prepare(`SELECT id, order_id, product_id, brand, name, size, qty, price, status FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).bind(...ids).all()).results;
        const by = {}; items.forEach(i => (by[i.order_id] = by[i.order_id] || []).push(i));
        orders.forEach(o => { o.items = by[o.id] || []; });
      }
      return json({ ok: true, orders });
    }
    return json({ ok: false, error: 'not-found' }, 404);
  }

  if (request.method === 'POST') {
    const body = (await readBody(request)) || {};

    // Clear out finished items in one go: POST /api/desk/purge {kind: 'messages'|'orders'}
    // removes archived messages, or closed and cancelled orders (with their lines).
    if (p[0] === 'purge') {
      const kind = clean(body.kind, 20);
      if (kind === 'messages') {
        const r = await DB.prepare("DELETE FROM messages WHERE status = 'archived'").run();
        return json({ ok: true, deleted: changes(r) });
      }
      if (kind === 'orders') {
        await DB.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status IN ('closed','cancelled'))").run();
        const r = await DB.prepare("DELETE FROM orders WHERE status IN ('closed','cancelled')").run();
        return json({ ok: true, deleted: changes(r) });
      }
      return json({ ok: false, error: 'invalid' }, 400);
    }

    const id = parseInt(p[1], 10);
    if (!id || !['messages', 'orders', 'items'].includes(p[0])) return json({ ok: false, error: 'invalid' }, 400);

    // Change a quoted price on an order line: POST /api/desk/items/<id>/price {price} (null clears it)
    if (p[0] === 'items' && p[2] === 'price') {
      const price = body.price === null || body.price === '' ? null : Math.round(Number(body.price) * 100) / 100;
      if (price !== null && !(price >= 0 && price < 100000)) return json({ ok: false, error: 'invalid' }, 400);
      await DB.prepare('UPDATE order_items SET price = ? WHERE id = ?').bind(price, id).run();
      return json({ ok: true });
    }
    // Send the order as a Stripe invoice: POST /api/desk/orders/<id>/stripe
    if (p[0] === 'orders' && p[2] === 'stripe') return stripeInvoice(id, env);

    // Delete one message or one order: POST /api/desk/<messages|orders>/<id>/delete
    if (p[2] === 'delete') {
      if (p[0] === 'messages') await DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
      else if (p[0] === 'orders') {
        await DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id).run();
        await DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      } else return json({ ok: false, error: 'invalid' }, 400);
      return json({ ok: true });
    }

    // Otherwise a status change: POST /api/desk/<messages|orders|items>/<id> {status}
    const status = clean(body.status, 20);
    if (!status) return json({ ok: false, error: 'invalid' }, 400);
    const tables = { messages: ['new', 'read', 'replied', 'archived'], orders: ['new', 'confirmed', 'invoiced', 'paid', 'ordered', 'dispatched', 'closed', 'cancelled'], items: ['new', 'ordered', 'received', 'dispatched'] };
    const allowed = tables[p[0]];
    if (!allowed || !allowed.includes(status)) return json({ ok: false, error: 'invalid' }, 400);
    const table = p[0] === 'items' ? 'order_items' : p[0];
    await DB.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, id).run();
    return json({ ok: true });
  }
  return json({ ok: false, error: 'method' }, 405);
}

/* ==========================================================================
   Stripe: the customer pays first. "Send Stripe invoice" on the desk creates an invoice in
   Stripe from the quoted prices and emails it to the customer with a pay-online link.
   When they pay, Stripe calls /api/stripe/webhook and the order becomes "paid".
   Needs the STRIPE_SECRET_KEY secret (a restricted key) and STRIPE_WEBHOOK_SECRET. See DESK-SETUP.txt.
   ========================================================================== */
async function stripe(env, path, params) {
  const body = new URLSearchParams();
  const add = (k, v) => { if (v === undefined || v === null) return; if (typeof v === 'object') Object.entries(v).forEach(([kk, vv]) => add(k + '[' + kk + ']', vv)); else body.append(k, String(v)); };
  Object.entries(params || {}).forEach(([k, v]) => add(k, v));
  const r = await fetch('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded', 'stripe-version': '2024-06-20' }, body });   // API version pinned so Stripe's future changes can't break the desk
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ('Stripe error ' + r.status));
  return j;
}

async function stripeInvoice(orderId, env) {
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: 'Stripe is not connected yet: add the STRIPE_SECRET_KEY secret (see DESK-SETUP.txt).' }, 503);
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!o) return json({ ok: false, error: 'not-found' }, 404);
  const items = (await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(orderId).all()).results;
  if (!items.length) return json({ ok: false, error: 'The order has no lines.' }, 400);
  const missing = items.filter(i => !(i.price > 0));
  if (missing.length) return json({ ok: false, error: 'Every line needs a price first: ' + missing.map(i => i.name).join(', ') }, 400);
  if (o.stripe_invoice_id && o.invoice_url) return json({ ok: true, url: o.invoice_url, already: true });
  try {
    const found = await stripe(env, 'customers/search', { query: "email:'" + o.email.replace(/'/g, '') + "'" }).catch(() => null);
    const customer = (found && found.data && found.data[0]) || await stripe(env, 'customers', { email: o.email, name: o.company, description: o.contact, phone: o.phone || undefined, metadata: { contact: o.contact, vat: o.vat || '', postcode: o.postcode || '' } });
    const inv = await stripe(env, 'invoices', { customer: customer.id, collection_method: 'send_invoice', days_until_due: 7, currency: 'gbp', description: 'Order ' + o.ref + '. Goods are ordered once payment is received. Not VAT registered: no VAT is charged.', metadata: { order_id: String(o.id), ref: o.ref }, footer: 'Limitless Innovations Ltd, company no. ' + (env.COMPANY_NUMBER || '14380770') + '. Payment before goods are ordered.' });
    for (const i of items) {
      await stripe(env, 'invoiceitems', { customer: customer.id, invoice: inv.id, currency: 'gbp', quantity: i.qty, unit_amount: Math.round(i.price * 100), description: (i.brand ? i.brand + ' ' : '') + i.name + (i.size ? ' (' + i.size + ')' : '') });
    }
    await stripe(env, 'invoices/' + inv.id + '/finalize', {});
    const sent = await stripe(env, 'invoices/' + inv.id + '/send', {});
    await env.DB.prepare("UPDATE orders SET stripe_invoice_id = ?, invoice_url = ?, status = CASE WHEN status IN ('new','confirmed') THEN 'invoiced' ELSE status END WHERE id = ?").bind(inv.id, sent.hosted_invoice_url || null, o.id).run();
    return json({ ok: true, url: sent.hosted_invoice_url || null });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) }, 502);
  }
}

async function stripeWebhook(request, env, ctx) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ ok: false, error: 'no-secret' }, 503);
  const raw = await request.text();
  const sig = request.headers.get('stripe-signature') || '';
  const parts = Object.fromEntries(sig.split(',').map(x => x.split('=')));
  if (!parts.t || !parts.v1) return json({ ok: false, error: 'signature' }, 400);
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return json({ ok: false, error: 'stale' }, 400);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts.t + '.' + raw)));
  const expected = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  if (!(await safeEqual(expected, parts.v1))) return json({ ok: false, error: 'signature' }, 400);
  let ev; try { ev = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'json' }, 400); }
  if (ev.type === 'invoice.paid' || ev.type === 'invoice.payment_succeeded') {
    const inv = ev.data && ev.data.object; const id = inv && inv.metadata && inv.metadata.order_id;
    if (id) {
      await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ? AND status IN ('new','confirmed','invoiced')").bind(Number(id)).run();
      const o = await env.DB.prepare('SELECT ref, company, email FROM orders WHERE id = ?').bind(Number(id)).first();
      if (o) ctx.waitUntil(alert(env, `Paid: order ${o.ref} from ${o.company}`, `${o.company} has paid invoice ${o.ref} (£${((inv.amount_paid || 0) / 100).toFixed(2)}). You can order from the supplier now.\n\nOpen the desk: ${env.SITE_URL || ''}${deskBase(env)}#orders/${id}`));
    }
  }
  return json({ ok: true });
}

/* ==========================================================================
   Email alert (Resend). Without RESEND_API_KEY the desk still records everything.
   ========================================================================== */
async function alert(env, subject, text, replyTo) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.ALERT_FROM || 'Limitless website <onboarding@resend.dev>', to: [env.ALERT_TO], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) })   // pressing Reply in your inbox answers the visitor directly
    });
    if (!r.ok) console.error('alert failed', r.status, await r.text());
    return r.ok;
  } catch (err) { console.error('alert error', err); return false; }
}

/* ==========================================================================
   Helpers
   ========================================================================== */
function changes(r) { return (r && r.meta && typeof r.meta.changes === 'number') ? r.meta.changes : null; }
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
function html(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer', ...headers } });
}
function redirect(to, cookie) {
  const h = { location: to, 'cache-control': 'no-store' };
  if (cookie) h['set-cookie'] = cookie;
  return new Response(null, { status: 303, headers: h });
}
async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  try {
    if (type.includes('application/json')) return await request.json();
    if (type.includes('form')) { const out = {}; (await request.formData()).forEach((v, k) => { out[k] = typeof v === 'string' ? v : ''; }); return out; }
  } catch (_) { return null; }
  return null;
}
function clean(v, max, multiline = false) {
  if (v == null) return '';
  let s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = multiline ? s.replace(/\r\n?/g, '\n').trim() : s.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) : s;
}
function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= MAX.email; }
function sameSite(request) {
  // Browsers send Sec-Fetch-Site; same-origin fetches from the site pass, other sites don't.
  const sfs = request.headers.get('sec-fetch-site');
  if (sfs && sfs !== 'same-origin' && sfs !== 'none') return false;
  const origin = request.headers.get('origin');
  if (origin) { try { return new URL(origin).host === new URL(request.url).host; } catch (_) { return false; } }
  return true;
}
function makeRef() {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  return `LI-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rand}`;
}
async function rateLimit(env, key, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT count, window_start FROM rate WHERE key = ?').bind(key).first();
  if (!row || now - row.window_start >= windowSec) {
    await env.DB.prepare('INSERT OR REPLACE INTO rate (key, count, window_start) VALUES (?, 1, ?)').bind(key, now).run();
    return true;
  }
  if (row.count >= limit) return false;
  await env.DB.prepare('UPDATE rate SET count = count + 1 WHERE key = ?').bind(key).run();
  return true;
}
async function hmacKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode('limitless-desk:' + env.DESK_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function hmac(env, text) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function safeEqual(a, b) {
  // Compare fixed-length digests byte by byte, so the time taken doesn't depend on where they differ.
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(String(a))), crypto.subtle.digest('SHA-256', enc.encode(String(b)))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
