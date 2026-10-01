/* The private desk: the pages served only after login (see index.js).
   The desk page reads and updates messages, orders, tasks and header photos through /api/desk/*.
   Desk 2.0 phase 1: sidebar, photo band, priority pills, time bars, tasks. Styles are in desk-style.js,
   the shared pill and time-bar code in desk-ui.js, the new screens' script in desk-client.js. */

import { STYLE } from './desk-style.js';
import { DESK_UI_CLIENT } from './desk-ui.js';
import { NAV, DESK_CLIENT } from './desk-client.js';

// The public website's fonts (served from /fonts), used only by the printable invoice. The desk itself uses
// Source Serif 4 and IBM Plex Mono (see desk-style.js).
const FONTS = `
  @font-face { font-family: "Archivo"; src: url("/fonts/archivo.woff2") format("woff2"); font-weight: 500 700; font-style: normal; font-display: swap; }
  @font-face { font-family: "Inter"; src: url("/fonts/inter.woff2") format("woff2"); font-weight: 400 600; font-style: normal; font-display: swap; }
`;

const MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 14l16-8 16 8-16 8z" fill="#e6dfd1"/><path d="M4 14l16 8v14L4 28z" fill="#b9b0a0"/><path d="M20 22l16-8v14l-16 8z" fill="#6f7882"/></svg>`;
// Neutral grey version for the dark desk and login (no colour tint)
const MARK_DESK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 14l16-8 16 8-16 8z" fill="#ECECEA"/><path d="M4 14l16 8v14L4 28z" fill="#B4B4B2"/><path d="M20 22l16-8v14l-16 8z" fill="#707074"/></svg>`;

export const LOGIN_HTML = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>{{heading}} · Limitless Innovations</title>
<style>${STYLE}
  .login { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
  .box { width: min(380px, 100%); padding: 28px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--bg-panel); display: grid; gap: 14px; }
  .box .brand { display: flex; align-items: center; gap: 10px; }
  .box .brand .mark { width: 34px; height: 34px; }
  .box h1 { font-size: 20px; }
  .box p { margin: 0; font-size: 13.5px; color: var(--text-3); }
  .box input { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-ctl); background: var(--bg-page); color: var(--text); font: 400 16px/1.3 var(--font-ui); }
  .box .err { color: var(--urgent); font-size: 13.5px; }
  .box .btn { justify-content: center; padding: 12px; font-size: 14px; }
  .hidden { display: none; }
  /* Private preview: a big building photo behind the login, a different one each visit */
  .lock-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: var(--bg-page); }
  .lock-bg img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transform: scale(1.06);
    animation: lock-in 1.2s ease-out .05s forwards, lock-drift 26s ease-out forwards; }
  .lock-bg::after { content: ""; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(15,15,16,.62) 0%, rgba(15,15,16,.18) 30%, rgba(15,15,16,.28) 62%, rgba(15,15,16,.94) 100%),
                radial-gradient(ellipse 60% 55% at 50% 50%, rgba(15,15,16,.45), rgba(15,15,16,0) 70%); }
  @keyframes lock-in { to { opacity: 1; } }
  @keyframes lock-drift { from { transform: scale(1.06); } to { transform: scale(1); } }
  .lock-bg ~ .login { position: relative; z-index: 1; padding-bottom: 84px; }
  .lock-bg ~ .login .box { background: rgba(15,15,16,.72); border-color: rgba(245,245,243,.16); box-shadow: 0 30px 70px -24px rgba(0,0,0,.85);
    backdrop-filter: blur(16px) saturate(1.1); -webkit-backdrop-filter: blur(16px) saturate(1.1); }
  .lock-bg ~ .login .box p { color: var(--text-2); }
  .lock-credit { position: fixed; z-index: 1; left: 22px; right: 22px; bottom: 18px; font-size: 11.5px; line-height: 1.45; color: rgba(245,245,243,.66); }
  .lock-credit b { display: block; margin-bottom: 2px; font: 600 14px/1.25 var(--font-ui); color: #fff; letter-spacing: .01em; }
  .lock-credit a { color: inherit; }
  @media (prefers-reduced-motion: reduce) { .lock-bg img { animation: lock-in .01s forwards; transform: none; } }
</style></head>
<body>{{bg}}<div class="login"><form class="box" method="post" action="{{base}}/login">
  <div class="brand">${MARK_DESK}<h1>{{heading}}</h1></div>
  <p>{{sub}}</p>
  <input type="hidden" name="next" value="{{next}}">
  <p class="err">{{error}}</p>
  <div class="{{form}}">
    <label for="pw" style="font-size:13px;color:var(--text-3)">Password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
  </div>
  <button class="btn acc {{form}}" type="submit">{{button}}</button>
</form></div></body></html>`;

const NAV_HTML = NAV.map(g => `<div class="grp"><h2>${g.group}</h2>${g.items.map(i => `<a class="nav" href="#${i.id}" data-s="${i.id}">${i.label}<span class="cnt" id="cnt-${i.id}" hidden></span></a>`).join('')}</div>`).join('');

export const DESK_HTML = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Desk · Limitless Innovations</title>
<style>${STYLE}</style></head>
<body>
<div class="app">
<aside class="side" id="side" aria-label="Desk sections">
  <div class="brand"><span class="logo" aria-hidden="true">LI</span><div><b>Desk</b><small>Limitless Innovations</small></div></div>
  <nav class="grps" aria-label="Desk sections" style="display:grid;gap:22px">${NAV_HTML}</nav>
  <div class="foot">Shop ↔ Desk: orders and payments<br>Audit app ↔ Desk: jobs and progress</div>
</aside>
<div class="scrim" id="scrim"></div>
<div class="main">
<header class="top">
  <button class="btn sm menu-btn" id="menuBtn" type="button" aria-controls="side" aria-expanded="false">☰ Menu</button>
  <div class="right"><label class="markup" id="markupBox" hidden title="Your mark-up on the price you pay (inc VAT); used for the sell-at prices on orders and suppliers">Mark-up <input type="number" id="markup" min="0" max="100" step="1" value="20">%</label><span id="alerts"></span><a class="btn sm acc" href="#tasks/new">New task</a><button class="btn sm" id="refresh" type="button">Refresh</button><a class="btn sm" href="{{base}}/logout">Log out</a></div>
</header>
<main class="wrap">
  <section class="band today" id="band" aria-label="Page title">
    <img id="bandImg" alt="" hidden decoding="async">
    <div class="shade"></div>
    <div class="txt"><div class="ttl"><h1 id="pageTitle">Today</h1><span id="pageSub"></span></div><div class="credit" id="bandCredit"></div></div>
  </section>
  <div class="filters" id="filtersInbox"><button class="btn sm acc" id="newJob" type="button" hidden>New job invoice</button><label><input type="checkbox" id="showAll"> Show archived and closed too</label><button class="btn sm danger" id="purge" type="button">Clear archived messages</button><span class="spacer"></span><span id="updated"></span></div>
  <div class="filters" id="filtersSup" hidden><div class="chips" id="rangeChips"></div><input type="search" id="supSearch" placeholder="Find a product, brand or group" autocomplete="off"></div>
  <div class="filters" id="filtersVis" hidden><div class="chips" id="visRange"><button class="chip" type="button" data-days="7" aria-pressed="false">7 days</button><button class="chip" type="button" data-days="30" aria-pressed="true">30 days</button><button class="chip" type="button" data-days="90" aria-pressed="false">90 days</button><button class="chip" type="button" data-days="365" aria-pressed="false">12 months</button></div></div>
  <div class="note warn" id="buildWarn" hidden></div>
  <div id="list"></div>
  <div class="note" id="note" hidden></div>
  <dialog class="zoom" id="zoom"><figure><img id="zoomImg" alt=""><figcaption id="zoomCap"></figcaption></figure></dialog>
</main>
</div>
</div>
<script>
const NAV = ${JSON.stringify(NAV)};
${DESK_UI_CLIENT}
(() => {
  const $ = s => document.querySelector(s);
  const BASE = '{{base}}';
  let tab = 'today', open = null, loadToken = 0, sub = null, suppliers = {}, cat = { ranges: [], products: [] }, range = 'all', counts = { archived: 0, closed: 0 }, stripeOn = false, visDays = 30;
  const VAT = 0.2;
  let markup = 20; try { const v = localStorage.getItem('li-markup'); if (v !== null) markup = Math.min(100, Math.max(0, Number(v) || 0)); } catch (e) {}
  const gbp = n => '£' + n.toFixed(2);
  const qtyTxt = q => { const n = Number(q) || 0; return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = iso => { const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')); const m = (Date.now() - d) / 60000;
    if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + ' min ago'; if (m < 36 * 60) return Math.round(m / 60) + ' h ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  const tel = p => 'tel:' + esc(String(p).replace(/\\s+/g, ''));
  const api = (path, opts) => fetch('/api/desk/' + path, { credentials: 'same-origin', ...opts }).then(r => { if (r.status === 401) { location.reload(); throw new Error('auth'); } return r.json(); });
  const postJSON = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const MSG_STATUS = { new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived' };
  const ORD_STATUS = { new: 'New', confirmed: 'Confirmed with customer', invoiced: 'Invoice sent', paid: 'Paid', ordered: 'Ordered from supplier', dispatched: 'Dispatched', closed: 'Closed', cancelled: 'Cancelled' };
  const JOB_STATUS = { confirmed: 'Draft', invoiced: 'Invoice sent', paid: 'Paid', closed: 'Closed', cancelled: 'Cancelled' };
  const pill = (s, job) => '<span class="pill ' + esc(s) + '">' + esc((job && JOB_STATUS[s]) || ORD_STATUS[s] || MSG_STATUS[s] || s) + '</span>';
  const JOB_PILL = '<span class="pill job">Job</span>';
  const productOf = pid => cat.products.find(p => p.id === pid);
  const kitOf = pid => { const p = productOf(pid); return p && Array.isArray(p.kit) && p.kit.length ? p.kit : null; };
  const pname = p => (p.brand && p.brand !== 'Various' ? p.brand + ' ' : '') + p.name;
  const thumb = (p, size) => p && p.image ? '<img class="thumb" src="/' + esc(p.image) + '" alt="" data-zoom="' + esc(p.image) + '" data-cap="' + esc((p.brand ? p.brand + ' ' : '') + p.name) + '"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '>' : '';

  /* Cheapest priced supplier for a product: what you pay (inc VAT, since you can't reclaim it) and what to sell at.
     A kit costs what its parts cost, each from its own cheapest supplier. */
  function cost(pid) {
    const kit = kitOf(pid);
    if (kit) {
      let inc = 0;
      for (const [id, q] of kit) { const c = cost(id); if (!c) return null; inc += c.inc * q; }
      return { inc, supplier: 'each part from its cheapest supplier', note: '', sell: inc * (1 + markup / 100) };
    }
    let best = null;
    (suppliers[pid] || []).forEach(x => {
      if (x.alt) return;
      const m = /£\\s*([0-9]+(?:\\.[0-9]+)?)/.exec(x.price || ''); if (!m) return;
      const n = parseFloat(m[1]); const inc = /inc\\.? ?VAT/i.test(x.price) ? n : n * (1 + VAT);
      if (!best || inc < best.inc) best = { inc, supplier: x.supplier, note: (x.price || '').replace(/^£[^ ]+\\s*/, '') };
    });
    if (!best) return null;
    best.sell = best.inc * (1 + markup / 100);
    return best;
  }
  const linksOf = pid => { const s = suppliers[pid]; if (!s || !s.length) return '<span class="none">No supplier links yet</span>';
    return s.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.supplier) + '</b>' + (x.price ? esc(x.price) : '') + (x.checked ? ' <span style="color:var(--text-faint)">(' + esc(x.checked) + ')</span>' : '') + '</a>').join(''); };
  const supplierLinks = pid => { const kit = kitOf(pid); if (!kit) return linksOf(pid);
    return kit.map(([id, q]) => { const p = productOf(id); return '<div class="kp"><span class="kp-n">' + qtyTxt(q) + ' × ' + esc(p ? pname(p) : id) + '</span>' + linksOf(id) + '</div>'; }).join(''); };
  const costHTML = (pid, qty) => { const c = cost(pid); if (!c) return ''; const q = qty || 1;
    return '<div class="cost"><span>You pay <b>' + gbp(c.inc * q) + '</b> inc VAT' + (q > 1 ? ' (' + gbp(c.inc) + ' each)' : '') + ' <span class="from">· ' + esc(c.supplier) + (c.note ? ', ' + esc(c.note) : '') + '</span></span><span>Sell at <span class="sell">' + gbp(c.sell * q) + '</span> (+' + markup + '%)</span></div>'; };
  const orderMoney = o => { let quoted = 0, pay = 0, sell = 0, unq = 0, unp = 0;
    (o.items || []).forEach(i => { if (i.price) quoted += i.price * i.qty; else unq++; const c = cost(i.product_id); if (c) { pay += c.inc * i.qty; sell += c.sell * i.qty; } else unp++; });
    return { quoted, pay, sell, unq, unp }; };

  /* ---- tiles ---- */
  const messageTile = m => '<button class="tile ' + (m.status === 'new' ? 'new' : '') + '" type="button" data-open="messages/' + m.id + '"><div class="t-top"><h3>' + esc(m.name) + '</h3><span class="when">' + when(m.created_at) + '</span></div>' +
    '<div class="excerpt">' + esc(m.message) + '</div><div class="t-meta">' + pill(m.status) + '<span>' + esc(m.email) + '</span>' + (m.phone ? '<span>' + esc(m.phone) + '</span>' : '') + '</div></button>';
  const orderTile = o => { const $m = orderMoney(o), job = o.kind === 'job', n = (o.items || []).length;
    const th = job ? '' : (o.items || []).slice(0, 4).map(i => { const p = productOf(i.product_id); return p && p.image ? '<img src="/' + esc(p.image) + '" alt="">' : ''; }).join('') + (n > 4 ? '<span class="more">+' + (n - 4) + '</span>' : '');
    return '<button class="tile ' + (o.status === 'new' ? 'new' : '') + '" type="button" data-open="orders/' + o.id + '"><div class="t-top"><h3>' + esc(o.company) + '</h3><span class="when">' + when(o.created_at) + '</span></div>' +
      (job ? (o.site ? '<div class="site">' + esc(o.site) + '</div>' : '') : '<div class="thumbs">' + th + '</div>') +
      '<div class="money">' + n + (job ? ' line' : ' item') + (n === 1 ? '' : 's') + ' · ' + (job ? 'total' : 'quoted') + ' <b>' + gbp($m.quoted) + '</b>' + ($m.unq ? ' <span style="color:var(--text-faint)">+ ' + $m.unq + (job ? ' to price' : ' on request') + '</span>' : '') + '</div>' +
      '<div class="t-meta">' + (job ? JOB_PILL : '') + pill(o.status, job) + '<span>' + esc(o.ref) + '</span><span>' + esc(o.contact) + '</span></div></button>'; };
  const productTile = p => '<div class="tile product">' + (thumb(p, 64) || '<span class="thumb"></span>') + '<div><span style="color:var(--text-3);font-size:12px">' + esc(p.brand) + '</span><h3>' + esc(p.name) + '</h3>' + (p.size ? '<div class="size" style="font-size:12.5px;color:var(--text-3)">' + esc(p.size) + '</div>' : '') + (p.link ? '<a class="mf" href="' + esc(p.link) + '" target="_blank" rel="noopener" style="font-size:12px;color:#8DB4F2">Manufacturer page</a>' : '') + '</div>' +
    '<div class="sup">' + supplierLinks(p.id) + '</div>' + costHTML(p.id) + '</div>';

  /* ---- detail pages ---- */
  const back = (t, label) => '<div class="bar"><button class="btn sm" type="button" data-back="' + t + '">← ' + label + '</button>';
  function messageDetail(m) {
    const opts = Object.keys(MSG_STATUS).map(s => '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + MSG_STATUS[s] + '</option>').join('');
    const subject = encodeURIComponent('Re: your message to Limitless Innovations');
    const body = encodeURIComponent('Hello ' + m.name + ',\\n\\nThank you for your message.\\n\\n\\n\\n---\\nYour message:\\n' + m.message);
    return '<div class="detail">' + back('messages', 'Enquiries') + '<h2>' + esc(m.name) + '</h2>' + pill(m.status) + '<span class="when">' + when(m.created_at) + (m.source ? ' · via ' + esc(m.source) : '') + '</span></div>' +
      '<div class="panel"><div class="kv"><span><b>Email</b><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></span>' + (m.phone ? '<span><b>Phone</b><a href="' + tel(m.phone) + '">' + esc(m.phone) + '</a></span>' : '') + (m.page ? '<span><b>Sent from</b>' + esc(m.page) + '</span>' : '') + '</div>' +
      '<div class="body">' + esc(m.message) + '</div>' +
      '<div class="actions"><a class="btn acc sm" href="mailto:' + esc(m.email) + '?subject=' + subject + '&body=' + body + '">Reply by email</a>' + (m.phone ? '<a class="btn sm" href="' + tel(m.phone) + '">Call</a>' : '') +
      '<select data-kind="messages" data-id="' + m.id + '">' + opts + '</select><button class="btn sm danger del" type="button" data-del="messages" data-id="' + m.id + '" data-label="the message from ' + esc(m.name) + '">Delete</button></div></div></div>';
  }
  const fmtDay = s => { const d = new Date(String(s).length === 10 ? s + 'T00:00:00Z' : s); return isNaN(d) ? String(s) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  function orderDetail(o) {
    const job = o.kind === 'job';
    const labels = job ? JOB_STATUS : ORD_STATUS;
    const keys = Object.keys(labels); if (!keys.includes(o.status)) keys.unshift(o.status);
    const opts = keys.map(s => '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + esc(labels[s] || ORD_STATUS[s] || s) + '</option>').join('');
    const $m = orderMoney(o);
    const priceCell = i => '<td class="num">' + (i.price ? '<span class="quote">' + gbp(i.price * i.qty) + '</span>' : '<span class="empty-mini">' + (job ? 'to price' : 'on request') + '</span>') + '<div class="size"><label>£<input class="price-in" type="number" min="0" step="0.01" value="' + (i.price ? i.price.toFixed(2) : '') + '" data-item="' + i.id + '" placeholder="each" title="Price each; change it and press Enter or click away"></label></div></td>';
    const rows = (o.items || []).map(i => job
      ? '<tr><td class="qty">' + qtyTxt(i.qty) + ' ×</td><td>' + esc(i.name) + '</td>' + priceCell(i) + '</tr>'
      : '<tr><td class="pic">' + thumb(productOf(i.product_id)) + '</td><td class="qty">' + qtyTxt(i.qty) + ' ×</td><td>' + (i.brand ? '<span style="color:var(--text-3)">' + esc(i.brand) + '</span> ' : '') + esc(i.name) + (i.size ? '<div class="size">' + esc(i.size) + '</div>' : '') +
        '<div><label class="spec' + (i.special ? ' on' : '') + '" title="Special order (made to order, cut to size, non-stock): not returnable unless faulty, trade terms 9.2. Shown on the invoice."><input type="checkbox" data-special="' + i.id + '"' + (i.special ? ' checked' : '') + '> Special order</label></div></td>' +
        priceCell(i) + '<td><div class="sup">' + supplierLinks(i.product_id) + '</div>' + costHTML(i.product_id, i.qty) + '</td></tr>').join('');
    const lines = (o.items || []).map(i => qtyTxt(i.qty) + ' x ' + (i.brand ? i.brand + ' ' : '') + i.name + (i.price ? ' @ £' + i.price.toFixed(2) : '')).join('\\n');
    const subject = encodeURIComponent((job ? 'Invoice ' : 'Your order ') + o.ref + ' - Limitless Innovations');
    const body = encodeURIComponent('Hello ' + o.contact + ',\\n\\n' + (job ? 'Please find our invoice ' + o.ref + (o.site ? ' for the work at ' + o.site : '') + '.' : 'Thank you for your order ' + o.ref + '.') + '\\n\\n' + lines + '\\n\\nTotal: £' + $m.quoted.toFixed(2) + '\\n\\n');
    const editable = job && !o.stripe_invoice_id && !o.paid_at;
    const customer = '<div class="panel"><h4>Customer</h4><div class="kv"><span><b>Contact</b>' + esc(o.contact) + '</span><span><b>Email</b><a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></span>' + (o.phone ? '<span><b>Phone</b><a href="' + tel(o.phone) + '">' + esc(o.phone) + '</a></span>' : '') + (o.vat ? '<span><b>VAT number</b>' + esc(o.vat) + '</span>' : '') +
      (job ? (o.site ? '<span><b>Site</b>' + esc(o.site) + '</span>' : '') : (o.postcode ? '<span><b>Deliver to</b>' + esc(o.postcode) + '</span>' : '') + (o.terms ? '<span><b>Trade terms</b>Agreed (version of ' + esc(fmtDay(o.terms)) + ')</span>' : '')) + '</div>' +
      (o.notes ? '<h4>' + (job ? 'Notes on the invoice' : 'Customer notes') + '</h4><div class="body">' + esc(o.notes) + '</div>' : '') + '</div>';
    const money = '<div class="panel"><h4>Money</h4><div class="sum"><div class="big"><span>' + (job ? 'Invoice total' : 'Quoted to customer') + '</span><b>' + gbp($m.quoted) + '</b></div>' + ($m.unq ? '<div class="dim"><span>' + $m.unq + (job ? ' line' : ' item') + ($m.unq === 1 ? '' : 's') + (job ? ' without a price' : ' priced on request') + '</span><span>' + (job ? 'add before sending' : 'add when confirmed') + '</span></div>' : '') +
      (job ? '<div class="dim"><span>No VAT: not VAT registered</span></div>' : '<div><span>Cost to you (inc VAT)</span><b>' + gbp($m.pay) + '</b></div><div><span>At today\\'s mark-up (+' + markup + '%)</span><b>' + gbp($m.sell) + '</b></div><div><span>Margin on quoted</span><b>' + gbp($m.quoted - $m.pay) + '</b></div>' + ($m.unp ? '<div class="dim"><span>' + $m.unp + ' line' + ($m.unp === 1 ? '' : 's') + ' without a supplier price</span></div>' : '')) + '</div>' +
      (o.invoice_url ? '<div class="size">Stripe invoice sent · <a href="' + esc(o.invoice_url) + '" target="_blank" rel="noopener">open the pay page</a>' + (o.paid_at ? ' · paid ' + when(o.paid_at) : ' · not paid yet') + '</div>' : (o.paid_at ? '<div class="size">Paid ' + when(o.paid_at) + '</div>' : '')) +
      '<div class="actions"><button class="btn acc sm" type="button" data-stripe="' + o.id + '"' + (stripeOn ? '' : ' disabled title="Connect Stripe first (STRIPE_SECRET_KEY, see DESK-SETUP.txt)"') + '>' + (o.invoice_url ? 'Resend Stripe invoice' : 'Send Stripe invoice') + '</button><a class="btn sm" href="' + BASE + '/invoice/' + o.id + '" target="_blank" rel="noopener">Print invoice</a><a class="btn sm" href="mailto:' + esc(o.email) + '?subject=' + subject + '&body=' + body + '">Email the customer</a>' +
      (editable ? '<button class="btn sm" type="button" data-open="orders/' + o.id + '/edit">Edit</button>' : '') + '</div>' +
      (stripeOn ? '' : '<div class="size">Stripe not connected: print the invoice and email it, then set the ' + (job ? 'invoice' : 'order') + ' to Paid yourself when the money arrives.</div>') + '</div>';
    const table = job
      ? '<div class="panel"><h4>Work</h4><table class="items"><thead><tr><th>Qty</th><th>Description</th><th class="num">Price</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="panel"><h4>Items</h4><table class="items"><thead><tr><th></th><th>Qty</th><th>Item</th><th class="num">Quoted</th><th>Buy from</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    return '<div class="detail">' + back('orders', 'Orders') + '<h2>' + esc(o.company) + '</h2>' + (job ? JOB_PILL : '') + pill(o.status, job) + '<span class="when">' + esc(o.ref) + ' · ' + when(o.created_at) + '</span></div>' +
      '<div class="two">' + customer + money + '</div>' + table +
      '<div class="panel"><div class="actions"><label style="font-size:13px;color:var(--text-3)">Status</label><select data-kind="orders" data-id="' + o.id + '">' + opts + '</select><button class="btn sm danger del" type="button" data-del="orders" data-id="' + o.id + '" data-label="' + (job ? 'invoice ' : 'order ') + esc(o.ref) + ' for ' + esc(o.company) + '">Delete</button></div></div></div>';
  }

  /* ---- new or edited job invoice (installation work) ---- */
  const JOB_LINES = ['Firestopping to service penetrations', 'Head-of-wall firestopping', 'Linear joints sealed (fire and acoustic)', 'Floor void closed with coated batt', 'Riser firestopping at slab level', 'Intumescent coating to structural steel', 'Remedial firestopping: seals broken by other trades', 'Labour, day rate', 'Materials', 'Access equipment'];
  let learned = null;   // line descriptions from earlier job invoices, offered as suggestions
  const descOptions = () => [...new Set(JOB_LINES.concat(learned || []))].map(d => '<option value="' + esc(d) + '">').join('');
  const lineRow = l => '<tr><td class="d"><input name="desc" list="jobDescs" maxlength="200" value="' + esc(l.desc || '') + '" placeholder="What was done" aria-label="Description"></td>' +
    '<td class="q"><input name="qty" type="number" min="0.01" step="any" inputmode="decimal" value="' + esc(l.qty == null ? '1' : qtyTxt(l.qty)) + '" aria-label="Quantity"></td>' +
    '<td class="u"><input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="' + (l.price == null || l.price === '' ? '' : Number(l.price).toFixed(2)) + '" placeholder="0.00" aria-label="Price each in pounds"></td>' +
    '<td class="t">£0.00</td><td class="x"><button class="btn sm rm" type="button" data-rm aria-label="Remove this line">×</button></td></tr>';
  function jobForm(o) {
    const v = o || {};
    const lines = o && o.items && o.items.length ? o.items.map(i => ({ desc: i.name, qty: i.qty, price: i.price })) : [{ desc: '', qty: 1, price: '' }];
    const f = (name, label, value, type, extra) => '<label class="field" data-f="' + name + '"><span>' + label + '</span><input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(value || '') + '"' + (extra || '') + '><span class="err"></span></label>';
    const to = o ? 'orders/' + o.id : 'orders';
    return '<form class="detail form" id="jobForm" data-id="' + (o ? o.id : '') + '" novalidate>' + back(to, o ? esc(o.ref) : 'Orders') + '<h2>' + (o ? 'Edit invoice ' + esc(o.ref) : 'New job invoice') + '</h2></div>' +
      '<p class="fine" style="margin:0">For installation and other site work. It goes through the same invoice and Stripe steps as a shop order.</p>' +
      '<div class="panel"><h4>Customer</h4><div class="fields">' +
        f('company', 'Customer or company *', v.company, 'text', ' maxlength="120" autocomplete="off"') +
        f('contact', 'Contact name *', v.contact, 'text', ' maxlength="80" autocomplete="off"') +
        f('email', 'Email for the invoice *', v.email, 'email', ' maxlength="120" autocomplete="off"') +
        f('phone', 'Phone', v.phone, 'tel', ' maxlength="40" autocomplete="off"') +
        f('site', 'Site (where the work was done)', v.site, 'text', ' maxlength="200" autocomplete="off"') +
        f('vat', 'Their VAT number, if any', v.vat, 'text', ' maxlength="40" autocomplete="off"') +
      '</div></div>' +
      '<div class="panel"><h4>Work</h4><table class="lines"><thead><tr><th>Description</th><th>Qty</th><th>Price each (£)</th><th class="num">Total</th><th></th></tr></thead><tbody id="jobLines">' + lines.map(lineRow).join('') + '</tbody></table>' +
      '<datalist id="jobDescs">' + descOptions() + '</datalist>' +
      '<div class="foot"><button class="btn sm" type="button" id="addLine">+ Add a line</button><span class="err" data-f="lines"></span><span class="total">Total<b id="jobTotal">£0.00</b>no VAT to add</span></div></div>' +
      '<div class="panel"><label class="field" data-f="notes"><span>Notes printed on the invoice (optional)</span><textarea name="notes" maxlength="2000" placeholder="For example: purchase order number, dates on site, drawing or area references">' + esc(v.notes || '') + '</textarea><span class="err"></span></label></div>' +
      '<div class="actions"><button class="btn acc" type="submit" id="jobSave">' + (o ? 'Save changes' : 'Create the invoice') + '</button><button class="btn" type="button" data-back="' + to + '">Cancel</button><span class="err" id="jobErr"></span></div></form>';
  }
  function jobTotals() {
    let t = 0;
    document.querySelectorAll('#jobLines tr').forEach(tr => {
      const q = Number(tr.querySelector('[name=qty]').value) || 0, p = Number(tr.querySelector('[name=price]').value) || 0;
      const line = Math.round(q * p * 100) / 100; t += line; tr.querySelector('td.t').textContent = gbp(line);
    });
    const el = $('#jobTotal'); if (el) el.textContent = gbp(t);
  }
  function learnLines() {
    if (learned) return;
    learned = [];
    api('orders?all=1').then(j => {
      learned = [...new Set((j.orders || []).filter(o => o.kind === 'job').flatMap(o => (o.items || []).map(i => i.name)))].slice(0, 80);
      const dl = $('#jobDescs'); if (dl) dl.innerHTML = descOptions();
    }).catch(() => {});
  }
  const formOpen = () => tab === 'orders' && (open === 'new' || sub === 'edit');

  /* ---- suppliers gallery ---- */
  function renderSuppliers() {
    const q = ($('#supSearch').value || '').trim().toLowerCase();
    const hit = p => (range === 'all' || p.category === range) && (!q || (p.brand + ' ' + p.name + ' ' + p.group + ' ' + p.size).toLowerCase().includes(q));
    const rows = cat.products.filter(hit);
    if (!cat.products.length) { $('#list').innerHTML = '<div class="empty">Loading the product list…</div>'; return; }
    if (!rows.length) { $('#list').innerHTML = '<div class="empty">No products match.</div>'; return; }
    const out = [];
    cat.ranges.forEach(r => {
      const inRange = rows.filter(p => p.category === r.id); if (!inRange.length) return;
      out.push('<h3 style="margin:18px 0 10px;font-size:16px">' + esc(r.name) + ' <span style="font-size:12px;color:var(--text-3);font-weight:500">' + inRange.length + '</span></h3><div class="tiles">' + inRange.map(productTile).join('') + '</div>');
    });
    $('#list').innerHTML = out.join('');
  }

  /* ---- visitors: daily totals counted by the website itself (no cookies, no IP addresses) ---- */
  const region = (() => { let dn = null; try { dn = new Intl.DisplayNames(['en-GB'], { type: 'region' }); } catch (e) {}
    return c => c === 'XX' ? 'Unknown' : c === 'T1' ? 'Tor network' : (dn ? (dn.of(c) || c) : c); })();
  const DEVICE = { phone: 'Phones', tablet: 'Tablets', computer: 'Computers' };
  const PAGE = { '/': 'Home page', '/privacy': 'Privacy notice', '/terms': 'Trade terms of sale' };
  function renderVisits(v) {
    if (!v || !v.ok) { $('#list').innerHTML = '<div class="empty">Visitor numbers could not be loaded.</div>'; return; }
    const byDay = {}; (v.daily || []).forEach(d => { byDay[d.day] = d.n; });
    const start = Date.parse(v.since + 'T00:00:00Z'), days = [];
    for (let i = 0; i < v.days; i++) { const d = new Date(start + i * 86400000).toISOString().slice(0, 10); days.push([d, byDay[d] || 0]); }
    let series = days;
    if (v.days > 90) { const m = {}; days.forEach(([d, n]) => { m[d.slice(0, 7)] = (m[d.slice(0, 7)] || 0) + n; }); series = Object.entries(m); }
    const total = days.reduce((t, [, n]) => t + n, 0);
    const today = byDay[new Date().toISOString().slice(0, 10)] || 0;
    const devTotal = (v.devices || []).reduce((t, d) => t + d.n, 0);
    const phones = ((v.devices || []).find(d => d.k === 'phone') || { n: 0 }).n;
    const top = (v.countries || [])[0];
    const max = Math.max(1, ...series.map(([, n]) => n));
    const label = k => k.length === 7 ? new Date(k + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : new Date(k + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const bars = series.map(([k, n]) => '<i' + (n ? ' style="height:' + Math.max(2, Math.round(n / max * 100)) + '%"' : ' class="z"') + ' title="' + esc(label(k) + ': ' + n + ' visit' + (n === 1 ? '' : 's')) + '"></i>').join('');
    const mid = series[Math.floor(series.length / 2)];
    const rank = (rows, name) => rows && rows.length ? '<div class="rank">' + rows.map(r => '<div><span>' + esc(name(r.k)) + '</span><b>' + r.n + '</b><span class="bar"><i style="width:' + Math.max(2, Math.round(r.n / rows[0].n * 100)) + '%"></i></span></div>').join('') + '</div>' : '<p class="empty-mini">None yet.</p>';
    const stat = (n, what, extra) => '<div class="stat"><span>' + what + '</span><b>' + n + '</b>' + (extra ? '<small>' + extra + '</small>' : '') + '</div>';
    const period = v.days > 90 ? 'the last 12 months' : 'the last ' + v.days + ' days';
    $('#list').innerHTML = '<div class="detail">' +
      (v.locked ? '<div class="note" style="margin:0"><b>The website is private at the moment.</b> Only you can open it, and your own visits aren\\'t counted, so these numbers stay at zero until you make it public (SITE_LOCKED "off").</div>' : '') +
      '<div class="stats">' + stat(total, 'Visits, ' + (v.days > 90 ? '12 months' : v.days + ' days')) + stat(today, 'Today') + stat(devTotal ? Math.round(phones / devTotal * 100) + '%' : '–', 'On phones') + stat(top ? esc(region(top.k)) : '–', 'Top country', top ? top.n + ' visit' + (top.n === 1 ? '' : 's') : '') + '</div>' +
      '<div class="panel"><h4>' + (v.days > 90 ? 'Visits per month' : 'Visits per day') + '</h4><div class="chart" role="img" aria-label="' + esc((v.days > 90 ? 'Visits per month' : 'Visits per day') + ' over ' + period + ': ' + total + ' in total') + '">' + bars + '</div>' +
        '<div class="axis"><span>' + esc(label(series[0][0])) + '</span><span>' + esc(label(mid[0])) + '</span><span>' + esc(label(series[series.length - 1][0])) + '</span></div></div>' +
      '<div class="grid2"><div class="panel"><h4>Countries</h4>' + rank(v.countries, region) + '</div><div class="panel"><h4>Where they came from</h4>' + rank(v.refs, k => k === 'direct' ? 'Direct or typed in' : k) + '</div>' +
      '<div class="panel"><h4>Devices</h4>' + rank(v.devices, k => DEVICE[k] || k) + '</div><div class="panel"><h4>Pages</h4>' + rank(v.pages, k => PAGE[k] || k) + '</div></div>' +
      '<p class="fine">Counted by the website itself: each time a real browser opens a page. No cookies, no IP addresses and nothing stored on the visitor\\'s device, so there is no consent banner to show. Search engine robots and your own visits (logged in) are left out. Daily totals are kept for 25 months.</p></div>';
  }

  /* ---- routing: #messages, #orders, #orders/12, #orders/new, #orders/12/edit, #messages/5, #suppliers, #visitors ---- */
  function route() {
    const m = location.hash.match(/^#([a-z]+)(?:\\/(\\d+|new))?(?:\\/(edit))?$/);
    $('#list').innerHTML = '';
    tab = m && SCREENS[m[1]] ? m[1] : 'today'; open = m && SCREENS[m[1]] && m[2] ? (m[2] === 'new' ? 'new' : Number(m[2])) : null; sub = m && SCREENS[m[1]] && m[3] ? m[3] : null;
    load();
  }
  const go = h => { if (location.hash !== h) location.hash = h; else route(); };

  function applySummary(sum) {
    applyBadges(sum);
    document.title = ((sum.newMessages + sum.newOrders) ? '(' + (sum.newMessages + sum.newOrders) + ') ' : '') + 'Desk · Limitless Innovations';
    $('#alerts').textContent = (sum.alerts ? 'Email alerts on' : 'Email alerts off') + (sum.stripe ? ' · Stripe on' : ''); stripeOn = !!sum.stripe;
    counts = { archived: sum.archived || 0, closed: sum.closed || 0 };
    const bw = $('#buildWarn');   // a website update that failed to publish (see DESK-SETUP.txt step 4)
    if (sum.buildFailedAt) { bw.hidden = false; bw.innerHTML = '<b>The last website update failed</b> (' + esc(new Date(sum.buildFailedAt * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })) + '). Nothing is broken: the live site still shows the previous version. The build log is in Cloudflare under Workers &amp; Pages › limitless-innovations-website › Deployments. This note goes away after the next good update.'; }
    else bw.hidden = true;
  }

  async function load() {
    const my = ++loadToken;   // a slow answer for a screen you have already left is dropped
    frame();
    const inbox = tab === 'messages' || tab === 'orders';
    $('#filtersInbox').hidden = !inbox || !!open; $('#filtersSup').hidden = tab !== 'suppliers'; $('#filtersVis').hidden = tab !== 'visitors';
    $('#newJob').hidden = tab !== 'orders';
    const all = $('#showAll').checked ? '?all=1' : '';
    const want = tab === 'visitors' ? 'visits?days=' + visDays : !inbox || open === 'new' ? null : open ? tab + '/' + open : tab + all;
    const [sum, data] = await Promise.all([api('summary'), want ? api(want) : null]);
    if (my !== loadToken) return;
    applySummary(sum);
    if (NEW_SCREENS.has(tab)) { await showNewScreen(my); return; }
    const note = $('#note');
    if (tab === 'suppliers') { renderSuppliers(); note.hidden = false; note.innerHTML = '<b>For you, not for customers.</b> Where to buy each product when an order comes in. Prices are what the supplier page showed on the date in brackets. "You pay" adds 20% VAT to ex-VAT prices (not VAT registered, so that is your real cost); "Sell at" adds your mark-up from the top bar. The shop shows these sell prices at +20%. A kit lists each part with its own suppliers.'; return; }
    if (tab === 'visitors') { renderVisits(data); note.hidden = true; return; }
    if (formOpen()) {
      note.hidden = true;
      if (open === 'new') $('#list').innerHTML = jobForm(null);
      else {
        const o = data && data.order;
        if (!o) { $('#list').innerHTML = '<div class="empty">Not found: it may have been deleted.</div>'; return; }
        if (o.kind !== 'job' || o.stripe_invoice_id || o.paid_at) { $('#list').innerHTML = '<div class="empty">This invoice has been sent or paid, so it can\\'t be changed. <a href="#orders/' + o.id + '">Back to it</a></div>'; return; }
        $('#list').innerHTML = jobForm(o);
      }
      jobTotals(); learnLines();
      const first = $('#jobForm input[name=company]'); if (first && !first.value) first.focus();
      return;
    }
    if (open) {
      const item = tab === 'messages' ? data.message : data.order;
      if (!item) { $('#list').innerHTML = '<div class="empty">Not found: it may have been deleted.</div>'; return; }
      $('#list').innerHTML = tab === 'messages' ? messageDetail(item) : orderDetail(item);
      if (tab === 'messages' && item.status === 'new') postJSON('messages/' + item.id, { status: 'read' }).then(() => api('summary')).then(applySummary).catch(() => {});
    } else {
      const rows = tab === 'messages' ? data.messages : data.orders;
      $('#list').innerHTML = rows.length ? '<div class="tiles">' + rows.map(tab === 'messages' ? messageTile : orderTile).join('') + '</div>' : '<div class="empty">' + (tab === 'orders' ? 'No orders yet. Shop orders arrive here; for site work, press New job invoice.' : 'Nothing here yet.') + '</div>';
      $('#updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const purge = $('#purge'); const n = tab === 'messages' ? counts.archived : counts.closed;
      purge.textContent = (tab === 'messages' ? 'Clear archived messages' : 'Clear unpaid closed and cancelled orders') + (n ? ' (' + n + ')' : ''); purge.disabled = !n;
    }
    if (!sum.alerts) { note.hidden = false; note.innerHTML = '<b>Email alerts are off.</b> New messages and orders still arrive here; to get an email for each one, add the RESEND_API_KEY secret (see DESK-SETUP.txt).'; } else note.hidden = true;
  }

  api('suppliers').then(j => {
    suppliers = (j && j.suppliers) || {}; cat = { ranges: (j && j.ranges) || [], products: (j && j.products) || [] };
    $('#rangeChips').innerHTML = [{ id: 'all', name: 'All' }].concat(cat.ranges).map(r => '<button class="chip" type="button" data-range="' + esc(r.id) + '" aria-pressed="' + (r.id === range) + '">' + esc(r.name) + '</button>').join('');
    if (!formOpen() && !NEW_SCREENS.has(tab)) load();   // prices and thumbnails arrived: redraw the orders and products screens
  }).catch(() => {});

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => go('#' + b.dataset.tab)));
  addEventListener('hashchange', route);
  $('#showAll').addEventListener('change', load);
  $('#refresh').addEventListener('click', load);
  $('#newJob').addEventListener('click', () => go('#orders/new'));
  $('#list').addEventListener('click', async e => {
    const t = e.target.closest('[data-open]'); if (t) { go('#' + t.dataset.open); return; }
    const bk = e.target.closest('[data-back]'); if (bk) { go('#' + bk.dataset.back); return; }
    if (e.target.closest('#addLine')) { $('#jobLines').insertAdjacentHTML('beforeend', lineRow({ qty: 1 })); jobTotals(); $('#jobLines').lastElementChild.querySelector('input').focus(); return; }
    const rm = e.target.closest('button[data-rm]');
    if (rm) { const tr = rm.closest('tr'); if ($('#jobLines').children.length > 1) tr.remove(); else tr.querySelectorAll('input').forEach(i => { i.value = i.name === 'qty' ? '1' : ''; }); jobTotals(); return; }
    const b = e.target.closest('button[data-del]'); if (!b) return;
    if (!confirm('Delete ' + b.dataset.label + '? This cannot be undone.')) return;
    b.disabled = true;
    const r = await postJSON(b.dataset.del + '/' + b.dataset.id + '/delete');
    if (!r || !r.ok) { alert((r && r.error) || 'It could not be deleted.'); b.disabled = false; return; }
    go('#' + b.dataset.del);
  });
  $('#list').addEventListener('change', async e => {
    const sp = e.target.closest('input[data-special]');
    if (sp) { sp.closest('label').classList.toggle('on', sp.checked); const r = await postJSON('items/' + sp.dataset.special + '/special', { special: sp.checked }); if (!r || !r.ok) { alert('That change was not saved. Try again.'); load(); } return; }
    const pi = e.target.closest('input.price-in'); if (pi) { await postJSON('items/' + pi.dataset.item + '/price', { price: pi.value === '' ? null : Number(pi.value) }); load(); return; }
    const s = e.target.closest('select[data-kind]'); if (!s) return; await postJSON(s.dataset.kind + '/' + s.dataset.id, { status: s.value }); load(); });
  $('#list').addEventListener('input', e => { if (e.target.closest('#jobLines')) { jobTotals(); const le = document.querySelector('#jobForm .err[data-f=lines]'); if (le) le.textContent = ''; } const fl = e.target.closest('.field.bad'); if (fl) { fl.classList.remove('bad'); fl.querySelector('.err').textContent = ''; } });
  // Enter in a box of the invoice form doesn't send the form half-filled
  $('#list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('#jobForm input')) e.preventDefault(); });
  $('#list').addEventListener('submit', async e => {
    const f = e.target.closest('#jobForm'); if (!f) return;
    e.preventDefault();
    f.querySelectorAll('.err').forEach(x => { x.textContent = ''; }); f.querySelectorAll('.field.bad').forEach(x => x.classList.remove('bad'));
    const val = n => (f.querySelector('[name=' + n + ']').value || '').trim();
    const body = { company: val('company'), contact: val('contact'), email: val('email'), phone: val('phone'), site: val('site'), vat: val('vat'), notes: f.querySelector('[name=notes]').value,
      lines: [...f.querySelectorAll('#jobLines tr')].map(tr => ({ desc: tr.querySelector('[name=desc]').value.trim(), qty: tr.querySelector('[name=qty]').value, price: tr.querySelector('[name=price]').value })).filter(l => l.desc) };
    const btn = $('#jobSave'); btn.disabled = true;
    let r = null; try { r = await postJSON(f.dataset.id ? 'orders/' + f.dataset.id + '/job' : 'orders/new', body); } catch (err) {}
    btn.disabled = false;
    if (r && r.ok) { go('#orders/' + r.id); return; }
    if (r && r.fields) {
      Object.entries(r.fields).forEach(([k, msg]) => { const fl = f.querySelector('.field[data-f="' + k + '"]'); if (fl) { fl.classList.add('bad'); fl.querySelector('.err').textContent = msg; } else { const el = f.querySelector('.err[data-f="' + k + '"]'); if (el) el.textContent = msg; } });
      const bad = f.querySelector('.field.bad input'); if (bad) bad.focus();
    } else $('#jobErr').textContent = (r && r.error && r.error.length > 12 ? r.error : 'It could not be saved. Check the connection and try again.');
  });
  $('#list').addEventListener('click', async e => {
    const b = e.target.closest('button[data-stripe]'); if (!b) return;
    if (!confirm('Send this to the customer as a Stripe invoice with a pay-online link?')) return;
    b.disabled = true; b.textContent = 'Sending…';
    const r = await postJSON('orders/' + b.dataset.stripe + '/stripe');
    if (!r.ok) alert(r.error || 'Stripe could not send the invoice.');
    load();
  });
  $('#purge').addEventListener('click', async () => {
    const what = tab === 'messages' ? 'all archived messages' : 'all unpaid closed and cancelled orders (paid ones are sales records and stay)';
    if (!confirm('Delete ' + what + '? This cannot be undone.')) return;
    const r = await postJSON('purge', { kind: tab }); await load();
    if (r && r.ok) $('#updated').textContent = 'Cleared ' + (r.deleted == null ? '' : r.deleted + ' ') + (tab === 'messages' ? 'archived messages' : 'closed orders');
  });
  $('#rangeChips').addEventListener('click', e => { const c = e.target.closest('.chip[data-range]'); if (!c) return; range = c.dataset.range; document.querySelectorAll('#rangeChips .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c))); renderSuppliers(); });
  $('#visRange').addEventListener('click', e => { const c = e.target.closest('.chip[data-days]'); if (!c) return; visDays = Number(c.dataset.days); document.querySelectorAll('#visRange .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c))); load(); });
  $('#supSearch').addEventListener('input', renderSuppliers);
  $('#markup').value = markup;
  $('#markup').addEventListener('input', () => { markup = Math.min(100, Math.max(0, Number($('#markup').value) || 0)); try { localStorage.setItem('li-markup', String(markup)); } catch (e) {} if (!formOpen()) load(); });
  document.addEventListener('click', e => { const t = e.target.closest('img[data-zoom]'); const z = $('#zoom');
    if (t) { $('#zoomImg').src = '/' + t.dataset.zoom; $('#zoomCap').textContent = t.dataset.cap; z.showModal(); return; }
    if (e.target === z) z.close(); });
${DESK_CLIENT}
  loadPhotos();
  route();
  // Refresh every minute, but never while you're filling in the invoice form or typing in a box.
  setInterval(() => {
    const a = document.activeElement, typing = a && a.closest && a.closest('#list') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if (formOpen() || typing || tab === 'settings' || (tab === 'tasks' && open === 'new')) { api('summary').then(applySummary).catch(() => {}); return; }
    load();
  }, 60000);
})();
</script>
</body></html>`;


/* ==========================================================================
   Invoice: a printable page for one order or job (Print > Save as PDF in the browser).
   Company details come from the Worker's variables when set (COMPANY_NAME, COMPANY_ADDRESS,
   COMPANY_NUMBER, COMPANY_EMAIL, COMPANY_PHONE, BANK_DETAILS); otherwise the defaults below.
   ========================================================================== */
export function invoiceHTML(o, items, env, siteUrl) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = n => '£' + Number(n).toFixed(2);
  const qty = q => { const n = Number(q) || 0; return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); };
  const job = o.kind === 'job';
  const co = {
    name: env.COMPANY_NAME || 'Limitless Innovations Ltd',
    address: env.COMPANY_ADDRESS || 'Unit A, 82 James Carter Road, Mildenhall, Suffolk, IP28 7DE',
    number: env.COMPANY_NUMBER || '14380770',
    email: env.COMPANY_EMAIL || env.ALERT_TO || 'info@limitlessinnovations.co.uk',
    phone: env.COMPANY_PHONE || '',
    bank: env.BANK_DETAILS || ''
  };
  const site = String(siteUrl || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const d = new Date((o.created_at || '') + (String(o.created_at || '').endsWith('Z') ? '' : 'Z'));
  const date = isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  let total = 0, tbc = 0, special = 0;
  const rows = items.map(i => { const line = i.price ? Math.round(i.price * i.qty * 100) / 100 : null; if (line != null) total += line; else tbc++; if (i.special) special++;
    return `<tr><td>${esc(i.brand ? i.brand + ' ' : '')}${esc(i.name)}${i.size ? `<div class="s">${esc(i.size)}</div>` : ''}${i.special ? '<div class="s sp">Special order: not returnable unless faulty</div>' : ''}</td><td class="n">${qty(i.qty)}</td><td class="n">${i.price ? gbp(i.price) : 'TBC'}</td><td class="n">${line != null ? gbp(line) : 'TBC'}</td></tr>`; }).join('');
  const bank = co.bank ? '\n' + esc(co.bank) : '\nBank details: to be added (set BANK_DETAILS in Cloudflare, see DESK-SETUP.txt).';
  const payment = job
    ? `<p>Please pay within 7 days of the invoice date, quoting <b>${esc(o.ref)}</b>.${bank}</p><p>Work as agreed in our quotation.</p>`
    : `<p>Please pay within 7 days, quoting <b>${esc(o.ref)}</b>. We order the goods from our supplier once you've paid.${bank}</p><p>Supplied under our Trade terms of sale${site ? ': ' + esc(site) + '/terms' : ''}.${special ? ' Lines marked special order can\'t be returned unless faulty (clause 9.2).' : ''}</p>`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Invoice ${esc(o.ref)} · ${esc(co.name)}</title>
<style>${FONTS}
  body { margin: 0; padding: 40px; color: #111; background: #fff; font: 14px/1.5 Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .sheet { max-width: 820px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; } .brand svg { width: 40px; height: 40px; }
  .brand b { display: block; font: 600 20px/1.1 Archivo, Inter, system-ui, sans-serif; } .brand small { display: block; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #666; }
  .inv h1 { margin: 0; font: 600 26px/1.1 Archivo, Inter, system-ui, sans-serif; text-align: right; } .inv div { text-align: right; color: #444; font-size: 13px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 22px 0; }
  .cols h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #666; }
  .cols p { margin: 0; white-space: pre-line; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #666; border-bottom: 1px solid #111; }
  td.n, th.n { text-align: right; white-space: nowrap; } td .s { font-size: 12px; color: #666; } td .sp { color: #8a3b1e; }
  .tot td { border: 0; font-weight: 600; font-size: 16px; padding-top: 14px; }
  .terms { margin-top: 26px; padding-top: 14px; border-top: 1px solid #ddd; font-size: 13px; color: #333; }
  .terms h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #666; }
  .terms p { margin: 0 0 8px; white-space: pre-line; }
  .foot { margin-top: 30px; font-size: 11.5px; color: #666; text-align: center; }
  .print { position: fixed; top: 14px; right: 14px; padding: 9px 14px; border: 1px solid #111; border-radius: 4px; background: #111; color: #fff; font: 600 13px/1 inherit; cursor: pointer; }
  @media print { .print { display: none; } body { padding: 0; } }
</style></head><body>
<button class="print" onclick="print()">Print / save as PDF</button>
<div class="sheet">
  <div class="head">
    <div class="brand">${MARK}<div><b>${esc(co.name)}</b><small>Passive fire protection</small></div></div>
    <div class="inv"><h1>Invoice</h1><div>Invoice no. <b>${esc(o.ref)}</b></div><div>Date ${esc(today)}</div>${job ? '' : `<div>Order received ${esc(date)}</div>`}</div>
  </div>
  <div class="cols">
    <div><h4>From</h4><p>${esc(co.name)}\n${esc(co.address)}\nCompany no. ${esc(co.number)}\n${esc(co.email)}${co.phone ? '\n' + esc(co.phone) : ''}${site ? '\n' + esc(site) : ''}</p></div>
    <div><h4>Invoice to</h4><p>${esc(o.company)}\n${esc(o.contact)}\n${esc(o.email)}${o.phone ? '\n' + esc(o.phone) : ''}${o.vat ? '\nVAT no. ' + esc(o.vat) : ''}${job ? (o.site ? '\nSite: ' + esc(o.site) : '') : (o.postcode ? '\nDeliver to: ' + esc(o.postcode) : '')}</p></div>
  </div>
  <table><thead><tr><th>${job ? 'Description' : 'Item'}</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Total</th></tr></thead><tbody>${rows}
    <tr class="tot"><td colspan="3">Total to pay${tbc ? ` (${tbc} line${tbc === 1 ? '' : 's'} to be confirmed)` : ''}</td><td class="n">${gbp(total)}</td></tr></tbody></table>
  <div class="terms">
    <h4>Payment</h4>
    ${payment}
    <p>${esc(co.name)} is not VAT registered: no VAT is charged and this is not a VAT invoice.</p>
    ${o.notes ? `<h4>Notes</h4><p>${esc(o.notes)}</p>` : ''}
  </div>
  <div class="foot">${esc(co.name)} · Registered in England and Wales no. ${esc(co.number)} · ${esc(co.address)}</div>
</div>
</body></html>`;
}
