/* Limitless Innovations website: the server side.
   Runs on Cloudflare Workers in front of the static site. It receives messages from the
   contact form and orders from the trade basket, keeps them in the D1 database, emails an
   alert to the owner, and serves the private order desk at /desk.

   Everything else (every ordinary page and image) is served as a static asset.
   Settings live in wrangler.jsonc; secrets are set in the Cloudflare dashboard
   (see DESK-SETUP.txt). */

import { DESK_HTML, LOGIN_HTML } from './desk.js';
import SUPPLIERS from './suppliers.js';   // supplier links per product, shown only on the desk
import { RANGES, PRODUCTS } from './catalogue.js';   // generated from index.html by build-catalogue.js

const MAX = { name: 80, email: 120, phone: 40, message: 4000, company: 120, notes: 2000, items: 60 };
const COOKIE = 'li_desk';
const SESSION_DAYS = 30;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path.startsWith('/api/')) return await api(request, env, ctx, url);
      if (path === '/desk' || path.startsWith('/desk/')) return await desk(request, env, url);
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

  if (!(await rateLimit(env, 'msg:' + ip, 6, 3600))) return json({ ok: false, error: 'rate' }, 429);

  const page = clean(b.page, 120), source = clean(b.source, 40);
  const r = await env.DB.prepare(
    'INSERT INTO messages (name, email, phone, message, page, source, ip) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(name, email, phone || null, message, page || null, source || null, ip).run();
  const id = r.meta.last_row_id;

  ctx.waitUntil(alert(env, `New message from ${name}`,
    `${name} sent a message through the website.\n\nEmail: ${email}\nPhone: ${phone || '-'}\nFrom: ${page || '-'} (${source || 'form'})\n\n${message}\n\nOpen the desk: ${env.SITE_URL || ''}/desk`, email)
    .then(ok => ok && env.DB.prepare('UPDATE messages SET notified = 1 WHERE id = ?').bind(id).run()));

  return json({ ok: true, id });
}

async function newOrder(b, ip, env, ctx) {
  if (b.website) return json({ ok: true, ref: 'LI-0' });
  const company = clean(b.company, MAX.company), contact = clean(b.contact, MAX.name), email = clean(b.email, MAX.email);
  const phone = clean(b.phone, MAX.phone), vat = clean(b.vat, 40), postcode = clean(b.postcode, 12), notes = clean(b.notes, MAX.notes, true);
  const items = Array.isArray(b.items) ? b.items.slice(0, MAX.items).map(i => ({
    id: clean(i.id, 60), brand: clean(i.brand, 60), name: clean(i.name, 120), qty: Math.max(1, Math.min(9999, parseInt(i.qty, 10) || 0))
  })).filter(i => i.id && i.name && i.qty) : [];
  const errors = {};
  if (company.length < 2) errors.company = 'Please add your company name.';
  if (contact.length < 2) errors.contact = 'Please add a contact name.';
  if (!isEmail(email)) errors.email = 'Please check the email address.';
  if (!items.length) errors.items = 'The basket is empty.';
  if (Object.keys(errors).length) return json({ ok: false, error: 'invalid', fields: errors }, 422);

  if (!(await rateLimit(env, 'ord:' + ip, 4, 3600))) return json({ ok: false, error: 'rate' }, 429);

  const ref = makeRef();
  const r = await env.DB.prepare(
    'INSERT INTO orders (ref, company, contact, email, phone, vat, postcode, notes, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(ref, company, contact, email, phone || null, vat || null, postcode || null, notes || null, ip).run();
  const orderId = r.meta.last_row_id;
  await env.DB.batch(items.map(i =>
    env.DB.prepare('INSERT INTO order_items (order_id, product_id, brand, name, qty) VALUES (?, ?, ?, ?, ?)').bind(orderId, i.id, i.brand || null, i.name, i.qty)
  ));

  const lines = items.map(i => `  ${i.qty} x ${i.brand ? i.brand + ' ' : ''}${i.name}`).join('\n');
  ctx.waitUntil(alert(env, `New trade order ${ref} from ${company}`,
    `${contact} at ${company} sent a trade order enquiry.\n\nRef: ${ref}\nEmail: ${email}\nPhone: ${phone || '-'}\nVAT: ${vat || '-'}\nDelivery postcode: ${postcode || '-'}\n\nItems:\n${lines}\n\nNotes: ${notes || '-'}\n\nOpen the desk: ${env.SITE_URL || ''}/desk`, email)
    .then(ok => ok && env.DB.prepare('UPDATE orders SET notified = 1 WHERE id = ?').bind(orderId).run()));

  return json({ ok: true, ref });
}

/* ==========================================================================
   The desk: login page, session cookie, the desk page itself
   ========================================================================== */
async function desk(request, env, url) {
  const path = url.pathname;
  if (!env.DESK_PASSWORD) return html(LOGIN_HTML.replace('{{error}}', 'The desk is not switched on yet: add the DESK_PASSWORD secret in Cloudflare (see DESK-SETUP.txt).').replace('{{form}}', 'hidden'), 503);

  if (path === '/desk/login' && request.method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    if (!(await rateLimit(env, 'login:' + ip, 8, 900))) return html(LOGIN_HTML.replace('{{error}}', 'Too many attempts. Try again in 15 minutes.').replace('{{form}}', ''), 429);
    const body = await readBody(request);
    const ok = body && (await safeEqual(String(body.password || ''), env.DESK_PASSWORD));
    if (!ok) { await sleep(600); return html(LOGIN_HTML.replace('{{error}}', 'Wrong password.').replace('{{form}}', ''), 401); }
    const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
    const token = exp + '.' + (await hmac(env, 'session:' + exp));
    return redirect('/desk', `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`);
  }
  if (path === '/desk/logout') return redirect('/desk', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);

  if (!(await authed(request, env))) return html(LOGIN_HTML.replace('{{error}}', '').replace('{{form}}', ''), 401);
  if (path === '/desk' || path === '/desk/') return html(DESK_HTML);
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
      return json({ ok: true, newMessages: m, newOrders: o, archived, closed, alerts: !!(env.RESEND_API_KEY && env.ALERT_TO) });
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
        const items = (await DB.prepare(`SELECT id, order_id, product_id, brand, name, qty, status FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).bind(...ids).all()).results;
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
    const tables = { messages: ['new', 'read', 'replied', 'archived'], orders: ['new', 'confirmed', 'ordered', 'dispatched', 'closed', 'cancelled'], items: ['new', 'ordered', 'received', 'dispatched'] };
    const allowed = tables[p[0]];
    if (!allowed || !allowed.includes(status)) return json({ ok: false, error: 'invalid' }, 400);
    const table = p[0] === 'items' ? 'order_items' : p[0];
    await DB.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, id).run();
    return json({ ok: true });
  }
  return json({ ok: false, error: 'method' }, 405);
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
