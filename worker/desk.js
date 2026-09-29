/* The private order desk: one page, served only after login (see index.js).
   It reads and updates messages and orders through /api/desk/*. */

const STYLE = `
  :root { color-scheme: dark; --bg: #0b0d10; --panel: #15191d; --panel-2: #1c2126; --ink: #eef1f4; --ink-2: #c9d0d7; --muted: #9aa4ae; --faint: #6f7983;
    --line: rgba(238,241,244,.12); --accent: #b9623f; --stone: #d3c9b8; --steel: #b3bcc4; --ok: #6fb98a; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 400 15px/1.5 Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: var(--steel); }
  h1, h2, h3 { margin: 0; font-family: Archivo, Inter, system-ui, sans-serif; font-weight: 600; letter-spacing: -0.01em; }
  .top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 16px; padding: 12px 20px; background: rgba(11,13,16,.92); border-bottom: 1px solid var(--line); backdrop-filter: blur(10px); }
  .top .mark { width: 30px; height: 30px; }
  .top h1 { font-size: 17px; }
  .top .sub { font-size: 12px; color: var(--muted); }
  .top .right { margin-left: auto; display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); color: var(--ink); font: 600 13px/1 inherit; cursor: pointer; text-decoration: none; }
  .btn:hover { border-color: var(--steel); }
  .btn.acc { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.sm { padding: 6px 9px; font-size: 12px; }
  .btn.danger { color: #f0a08a; }
  .btn.danger:hover { border-color: #f0a08a; }
  .btn[disabled] { opacity: .45; cursor: default; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
  .tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
  .tab { padding: 9px 14px; border: 1px solid var(--line); border-radius: 4px; background: transparent; color: var(--ink-2); font: 600 14px/1 inherit; cursor: pointer; }
  .tab[aria-selected="true"] { background: var(--panel); color: var(--ink); border-color: var(--steel); }
  .tab .n { display: inline-block; min-width: 20px; padding: 2px 6px; margin-left: 6px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 11px; text-align: center; }
  .tab .n.zero { background: var(--panel-2); color: var(--muted); }
  .filters { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; font-size: 13px; color: var(--muted); }
  .filters[hidden] { display: none; }
  .filters label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  .filters .spacer { flex: 1; }
  .filters input[type="search"] { flex: 1 1 220px; min-width: 160px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); color: var(--ink); font: 400 14px/1.3 inherit; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { padding: 7px 11px; border: 1px solid var(--line); border-radius: 999px; background: transparent; color: var(--ink-2); font: 500 13px/1 inherit; cursor: pointer; }
  .chip[aria-pressed="true"] { background: var(--panel); color: var(--ink); border-color: var(--steel); }
  .card h4.grp { margin: 6px 0 0; font: 500 11px/1 inherit; letter-spacing: .12em; text-transform: uppercase; color: var(--stone); }
  table.items td .size { font-size: 12.5px; color: var(--muted); }
  table.items td.pic { width: 56px; padding-right: 0; }
  .thumb { display: block; width: 48px; height: 48px; object-fit: contain; padding: 3px; border-radius: 3px; background: #f3f4f6; border: 1px solid var(--line); cursor: zoom-in; }
  .thumb:hover { outline: 2px solid var(--steel); }
  .cost { display: grid; gap: 2px; margin-top: 6px; font-size: 12.5px; color: var(--ink-2); }
  .cost b { color: var(--ink); font-weight: 600; } .cost .sell { color: var(--ok); font-weight: 600; } .cost .from { color: var(--faint); }
  .markup { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); white-space: nowrap; }
  .markup input { width: 58px; padding: 7px 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); color: var(--ink); font: 500 14px/1 inherit; text-align: center; }
  .totals { display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 8px 10px; border-radius: 4px; background: var(--bg); border: 1px solid var(--line); font-size: 13px; color: var(--ink-2); }
  .totals b { color: var(--ink); } .totals .sell { color: var(--ok); font-weight: 600; }
  .zoom { border: 0; padding: 0; background: transparent; max-width: min(92vw, 560px); }
  .zoom::backdrop { background: rgba(5,6,8,.8); }
  .zoom figure { margin: 0; border-radius: 6px; overflow: hidden; background: #f3f4f6; }
  .zoom img { display: block; width: 100%; max-height: 70vh; object-fit: contain; padding: 20px; }
  .zoom figcaption { padding: 12px 16px; background: var(--panel); color: var(--ink); font-weight: 600; }
  table.items td a.mf { display: inline-block; margin-top: 3px; font-size: 12px; color: var(--steel); }
  .card .actions .del { margin-left: auto; }
  .list { display: grid; gap: 12px; }
  .card { padding: 16px 18px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); display: grid; gap: 10px; }
  .card.new { border-left: 3px solid var(--accent); }
  .card .head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
  .card .head h3 { font-size: 17px; }
  .card .when { font-size: 12.5px; color: var(--muted); }
  .card .status { margin-left: auto; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--stone); }
  .card .meta { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 13.5px; color: var(--ink-2); }
  .card .meta span b { color: var(--muted); font-weight: 500; margin-right: 4px; }
  .card .body { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ink); padding: 10px 12px; border-radius: 4px; background: var(--bg); border: 1px solid var(--line); }
  .card .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .card select { padding: 7px 9px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); color: var(--ink); font: 500 13px/1 inherit; }
  table.items { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  table.items th, table.items td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.items th { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
  table.items td.qty { font-weight: 600; white-space: nowrap; }
  .sup { display: flex; flex-wrap: wrap; gap: 6px; }
  .sup a { display: inline-flex; gap: 6px; padding: 4px 8px; border: 1px solid var(--line); border-radius: 3px; font-size: 12px; text-decoration: none; color: var(--ink-2); }
  .sup a b { color: var(--stone); font-weight: 600; }
  .sup a:hover { border-color: var(--steel); color: var(--ink); }
  .sup .none { font-size: 12px; color: var(--faint); }
  .empty { padding: 40px; text-align: center; color: var(--muted); border: 1px dashed var(--line); border-radius: 6px; }
  .note { margin-top: 20px; padding: 12px 14px; border-radius: 4px; background: var(--panel); border: 1px solid var(--line); font-size: 13px; color: var(--muted); }
  .note b { color: var(--stone); font-weight: 600; }
  @media (max-width: 640px) {
    .wrap { padding: 14px; } .card { padding: 14px; } .top { padding: 10px 14px; gap: 10px; } .top .sub { display: none; } .top h1 { white-space: nowrap; } .top .right { font-size: 12px; gap: 6px; }
    .tab { padding: 8px 11px; font-size: 13px; }
    /* Tables stack: product on one line, where to buy it underneath. */
    table.items thead { display: none; }
    table.items, table.items tbody, table.items tr, table.items td { display: block; }
    table.items tr { padding: 8px 0; border-bottom: 1px solid var(--line); }
    table.items td { border: 0; padding: 3px 0; }
    table.items td.qty { display: inline-block; padding-right: 6px; } table.items td.qty + td { display: inline; }
    .sup a { flex-wrap: wrap; }
  }
`;

const MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 14l16-8 16 8-16 8z" fill="#e6dfd1"/><path d="M4 14l16 8v14L4 28z" fill="#b9b0a0"/><path d="M20 22l16-8v14l-16 8z" fill="#6f7882"/></svg>`;

export const LOGIN_HTML = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Order desk · Limitless Innovations</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600&family=Inter:wght@400;500;600&display=swap">
<style>${STYLE}
  .login { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
  .box { width: min(380px, 100%); padding: 28px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); display: grid; gap: 14px; }
  .box .brand { display: flex; align-items: center; gap: 10px; }
  .box .brand .mark { width: 34px; height: 34px; }
  .box h1 { font-size: 20px; }
  .box p { margin: 0; font-size: 13.5px; color: var(--muted); }
  .box input { width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 4px; background: var(--bg); color: var(--ink); font: 400 16px/1.3 inherit; }
  .box .err { color: #f0a08a; font-size: 13.5px; }
  .box .btn { justify-content: center; padding: 12px; font-size: 14px; }
  .hidden { display: none; }
</style></head>
<body><div class="login"><form class="box" method="post" action="{{base}}/login">
  <div class="brand">${MARK}<h1>Order desk</h1></div>
  <p>Messages and trade orders from limitlessinnovations.co.uk.</p>
  <p class="err">{{error}}</p>
  <div class="{{form}}">
    <label for="pw" style="font-size:13px;color:var(--muted)">Password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
  </div>
  <button class="btn acc {{form}}" type="submit">Open the desk</button>
</form></div></body></html>`;

export const DESK_HTML = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Order desk · Limitless Innovations</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600&family=Inter:wght@400;500;600&display=swap">
<style>${STYLE}
  /* Gallery: everything is a tile you click to open, so the lists stay short. */
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 10px; }
  .tile { position: relative; display: grid; gap: 8px; align-content: start; padding: 14px 16px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); cursor: pointer; text-align: left; color: inherit; font: inherit; transition: border-color .15s ease, transform .15s ease; }
  .tile:hover { border-color: var(--steel); transform: translateY(-1px); }
  .tile.new { border-left: 3px solid var(--accent); }
  .tile .t-top { display: flex; align-items: baseline; gap: 8px; }
  .tile h3 { font-size: 15.5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile .when { margin-left: auto; flex: none; font-size: 12px; color: var(--muted); }
  .tile .excerpt { font-size: 13.5px; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .tile .t-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; color: var(--muted); }
  .tile .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; background: var(--panel-2); color: var(--stone); }
  .tile .pill.new { background: var(--accent); color: #fff; } .tile .pill.paid { background: var(--ok); color: #0b0d10; }
  .tile .thumbs { display: flex; gap: 4px; } .tile .thumbs img { width: 40px; height: 40px; object-fit: contain; padding: 2px; border-radius: 3px; background: #f3f4f6; border: 1px solid var(--line); }
  .tile .thumbs .more { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 3px; border: 1px dashed var(--line); font-size: 12px; color: var(--muted); }
  .tile .money { font-size: 14px; color: var(--ink); } .tile .money b { color: var(--ok); font-weight: 600; }
  .tile.product { grid-template-columns: 64px minmax(0, 1fr); gap: 8px 12px; cursor: default; }
  .tile.product:hover { transform: none; }
  .tile.product .thumb { width: 64px; height: 64px; grid-row: span 3; }
  .tile.product h3 { white-space: normal; font-size: 14.5px; }
  .tile.product .sup { grid-column: 2; }
  .tile.product .cost { grid-column: 2; margin-top: 0; }
  /* Detail pages */
  .detail { display: grid; gap: 14px; }
  .detail .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .detail .bar h2 { font-size: 22px; }
  .detail .bar .pill { margin-left: 4px; }
  .panel { padding: 16px 18px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); display: grid; gap: 10px; }
  .panel h4 { margin: 0; font: 500 11px/1 inherit; letter-spacing: .12em; text-transform: uppercase; color: var(--stone); }
  .kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px 18px; font-size: 13.5px; }
  .kv span b { display: block; color: var(--muted); font-weight: 500; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 2px; }
  .two { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 14px; align-items: start; }
  @media (max-width: 900px) { .two { grid-template-columns: 1fr; } }
  table.items td.num { text-align: right; white-space: nowrap; } table.items th.num { text-align: right; }
  table.items td .quote { color: var(--ok); font-weight: 600; }
  input.price-in { width: 84px; padding: 4px 6px; border: 1px solid var(--line); border-radius: 3px; background: var(--panel-2); color: var(--ink); font: 500 13px/1.2 inherit; text-align: right; }
  .sum { display: grid; gap: 6px; font-size: 13.5px; } .sum div { display: flex; justify-content: space-between; gap: 12px; } .sum b { font-weight: 600; } .sum .big b { font-size: 18px; color: var(--ok); } .sum .dim { color: var(--muted); }
  .empty-mini { font-size: 13px; color: var(--faint); }
</style></head>
<body>
<header class="top">
  ${MARK}
  <div><h1>Order desk</h1><div class="sub">Messages, trade orders and where to buy</div></div>
  <div class="right"><label class="markup" title="Your mark-up on the price you pay (inc VAT); used for the sell-at prices on orders and suppliers">Mark-up <input type="number" id="markup" min="0" max="100" step="1" value="20">%</label><span id="alerts"></span><button class="btn sm" id="refresh" type="button">Refresh</button><a class="btn sm" href="{{base}}/logout">Log out</a></div>
</header>
<main class="wrap">
  <div class="tabs" role="tablist">
    <button class="tab" role="tab" id="tabMsg" aria-selected="true" data-tab="messages">Messages<span class="n zero" id="nMsg">0</span></button>
    <button class="tab" role="tab" id="tabOrd" aria-selected="false" data-tab="orders">Orders<span class="n zero" id="nOrd">0</span></button>
    <button class="tab" role="tab" id="tabSup" aria-selected="false" data-tab="suppliers">Suppliers</button>
  </div>
  <div class="filters" id="filtersInbox"><label><input type="checkbox" id="showAll"> Show archived and closed too</label><button class="btn sm danger" id="purge" type="button">Clear archived messages</button><span class="spacer"></span><span id="updated"></span></div>
  <div class="filters" id="filtersSup" hidden><div class="chips" id="rangeChips"></div><input type="search" id="supSearch" placeholder="Find a product, brand or group" autocomplete="off"></div>
  <div id="list"></div>
  <div class="note" id="note" hidden></div>
  <dialog class="zoom" id="zoom"><figure><img id="zoomImg" alt=""><figcaption id="zoomCap"></figcaption></figure></dialog>
</main>
<script>
(() => {
  const $ = s => document.querySelector(s);
  const BASE = '{{base}}';
  let tab = 'messages', open = null, suppliers = {}, cat = { ranges: [], products: [] }, range = 'all', counts = { archived: 0, closed: 0 }, stripeOn = false;
  const VAT = 0.2;
  let markup = 20; try { const v = localStorage.getItem('li-markup'); if (v !== null) markup = Math.min(100, Math.max(0, Number(v) || 0)); } catch (e) {}
  const gbp = n => '£' + n.toFixed(2);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = iso => { const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')); const m = (Date.now() - d) / 60000;
    if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + ' min ago'; if (m < 36 * 60) return Math.round(m / 60) + ' h ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  const tel = p => 'tel:' + esc(String(p).replace(/\\s+/g, ''));
  const api = (path, opts) => fetch('/api/desk/' + path, { credentials: 'same-origin', ...opts }).then(r => { if (r.status === 401) { location.reload(); throw new Error('auth'); } return r.json(); });
  const postJSON = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const MSG_STATUS = { new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived' };
  const ORD_STATUS = { new: 'New', confirmed: 'Confirmed with customer', invoiced: 'Invoice sent', paid: 'Paid', ordered: 'Ordered from supplier', dispatched: 'Dispatched', closed: 'Closed', cancelled: 'Cancelled' };
  const pill = s => '<span class="pill ' + esc(s) + '">' + esc((ORD_STATUS[s] || MSG_STATUS[s] || s)) + '</span>';
  const productOf = pid => cat.products.find(p => p.id === pid);
  const thumb = (p, size) => p && p.image ? '<img class="thumb" src="/' + esc(p.image) + '" alt="" data-zoom="' + esc(p.image) + '" data-cap="' + esc((p.brand ? p.brand + ' ' : '') + p.name) + '"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '>' : '';

  /* Cheapest priced supplier for a product: what you pay (inc VAT, since you can't reclaim it) and what to sell at. */
  function cost(pid) {
    let best = null;
    (suppliers[pid] || []).forEach(x => {
      const m = /£\\s*([0-9]+(?:\\.[0-9]+)?)/.exec(x.price || ''); if (!m) return;
      const n = parseFloat(m[1]); const inc = /inc\\.? ?VAT/i.test(x.price) ? n : n * (1 + VAT);
      if (!best || inc < best.inc) best = { inc, supplier: x.supplier, note: (x.price || '').replace(/^£[^ ]+\\s*/, '') };
    });
    if (!best) return null;
    best.sell = best.inc * (1 + markup / 100);
    return best;
  }
  const supplierLinks = pid => { const s = suppliers[pid]; if (!s || !s.length) return '<span class="none">No supplier links yet</span>';
    return s.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.supplier) + '</b>' + (x.price ? esc(x.price) : '') + (x.checked ? ' <span style="color:var(--faint)">(' + esc(x.checked) + ')</span>' : '') + '</a>').join(''); };
  const costHTML = (pid, qty) => { const c = cost(pid); if (!c) return ''; const q = qty || 1;
    return '<div class="cost"><span>You pay <b>' + gbp(c.inc * q) + '</b> inc VAT' + (q > 1 ? ' (' + gbp(c.inc) + ' each)' : '') + ' <span class="from">· ' + esc(c.supplier) + (c.note ? ', ' + esc(c.note) : '') + '</span></span><span>Sell at <span class="sell">' + gbp(c.sell * q) + '</span> (+' + markup + '%)</span></div>'; };
  const orderMoney = o => { let quoted = 0, pay = 0, sell = 0, unq = 0, unp = 0;
    (o.items || []).forEach(i => { if (i.price) quoted += i.price * i.qty; else unq++; const c = cost(i.product_id); if (c) { pay += c.inc * i.qty; sell += c.sell * i.qty; } else unp++; });
    return { quoted, pay, sell, unq, unp }; };

  /* ---- tiles ---- */
  const messageTile = m => '<button class="tile ' + (m.status === 'new' ? 'new' : '') + '" type="button" data-open="messages/' + m.id + '"><div class="t-top"><h3>' + esc(m.name) + '</h3><span class="when">' + when(m.created_at) + '</span></div>' +
    '<div class="excerpt">' + esc(m.message) + '</div><div class="t-meta">' + pill(m.status) + '<span>' + esc(m.email) + '</span>' + (m.phone ? '<span>' + esc(m.phone) + '</span>' : '') + '</div></button>';
  const orderTile = o => { const $m = orderMoney(o); const th = (o.items || []).slice(0, 4).map(i => { const p = productOf(i.product_id); return p && p.image ? '<img src="/' + esc(p.image) + '" alt="">' : ''; }).join('') + ((o.items || []).length > 4 ? '<span class="more">+' + ((o.items || []).length - 4) + '</span>' : '');
    return '<button class="tile ' + (o.status === 'new' ? 'new' : '') + '" type="button" data-open="orders/' + o.id + '"><div class="t-top"><h3>' + esc(o.company) + '</h3><span class="when">' + when(o.created_at) + '</span></div>' +
      '<div class="thumbs">' + th + '</div>' +
      '<div class="money">' + (o.items || []).length + ' item' + ((o.items || []).length === 1 ? '' : 's') + ' · quoted <b>' + gbp($m.quoted) + '</b>' + ($m.unq ? ' <span style="color:var(--faint)">+ ' + $m.unq + ' on request</span>' : '') + '</div>' +
      '<div class="t-meta">' + pill(o.status) + '<span>' + esc(o.ref) + '</span><span>' + esc(o.contact) + '</span></div></button>'; };
  const productTile = p => '<div class="tile product">' + (thumb(p, 64) || '<span class="thumb"></span>') + '<div><span style="color:var(--muted);font-size:12px">' + esc(p.brand) + '</span><h3>' + esc(p.name) + '</h3>' + (p.size ? '<div class="size" style="font-size:12.5px;color:var(--muted)">' + esc(p.size) + '</div>' : '') + (p.link ? '<a class="mf" href="' + esc(p.link) + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--steel)">Manufacturer page</a>' : '') + '</div>' +
    '<div class="sup">' + supplierLinks(p.id) + '</div>' + costHTML(p.id) + '</div>';

  /* ---- detail pages ---- */
  const back = (t, label) => '<div class="bar"><button class="btn sm" type="button" data-back="' + t + '">← ' + label + '</button>';
  function messageDetail(m) {
    const opts = Object.keys(MSG_STATUS).map(s => '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + MSG_STATUS[s] + '</option>').join('');
    const subject = encodeURIComponent('Re: your message to Limitless Innovations');
    const body = encodeURIComponent('Hello ' + m.name + ',\\n\\nThank you for your message.\\n\\n\\n\\n---\\nYour message:\\n' + m.message);
    return '<div class="detail">' + back('messages', 'Messages') + '<h2>' + esc(m.name) + '</h2>' + pill(m.status) + '<span class="when">' + when(m.created_at) + (m.source ? ' · via ' + esc(m.source) : '') + '</span></div>' +
      '<div class="panel"><div class="kv"><span><b>Email</b><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></span>' + (m.phone ? '<span><b>Phone</b><a href="' + tel(m.phone) + '">' + esc(m.phone) + '</a></span>' : '') + (m.page ? '<span><b>Sent from</b>' + esc(m.page) + '</span>' : '') + '</div>' +
      '<div class="body">' + esc(m.message) + '</div>' +
      '<div class="actions"><a class="btn acc sm" href="mailto:' + esc(m.email) + '?subject=' + subject + '&body=' + body + '">Reply by email</a>' + (m.phone ? '<a class="btn sm" href="' + tel(m.phone) + '">Call</a>' : '') +
      '<select data-kind="messages" data-id="' + m.id + '">' + opts + '</select><button class="btn sm danger del" type="button" data-del="messages" data-id="' + m.id + '" data-label="the message from ' + esc(m.name) + '">Delete</button></div></div></div>';
  }
  function orderDetail(o) {
    const opts = Object.keys(ORD_STATUS).map(s => '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + ORD_STATUS[s] + '</option>').join('');
    const $m = orderMoney(o);
    const rows = (o.items || []).map(i => '<tr><td class="pic">' + thumb(productOf(i.product_id)) + '</td><td class="qty">' + i.qty + ' ×</td><td>' + (i.brand ? '<span style="color:var(--muted)">' + esc(i.brand) + '</span> ' : '') + esc(i.name) + (i.size ? '<div class="size">' + esc(i.size) + '</div>' : '') + '</td>' +
      '<td class="num">' + (i.price ? '<span class="quote">' + gbp(i.price * i.qty) + '</span>' : '<span class="empty-mini">on request</span>') + '<div class="size"><label>£<input class="price-in" type="number" min="0" step="0.01" value="' + (i.price ? i.price.toFixed(2) : '') + '" data-item="' + i.id + '" placeholder="each" title="Price each; change it and press Enter or click away"></label></div></td>' +
      '<td><div class="sup">' + supplierLinks(i.product_id) + '</div>' + costHTML(i.product_id, i.qty) + '</td></tr>').join('');
    const lines = (o.items || []).map(i => i.qty + ' x ' + (i.brand ? i.brand + ' ' : '') + i.name + (i.price ? ' @ £' + i.price.toFixed(2) : '')).join('\\n');
    const subject = encodeURIComponent('Your order ' + o.ref + ' - Limitless Innovations');
    const body = encodeURIComponent('Hello ' + o.contact + ',\\n\\nThank you for your order ' + o.ref + '.\\n\\n' + lines + '\\n\\nTotal: £' + $m.quoted.toFixed(2) + '\\n\\n');
    return '<div class="detail">' + back('orders', 'Orders') + '<h2>' + esc(o.company) + '</h2>' + pill(o.status) + '<span class="when">' + esc(o.ref) + ' · ' + when(o.created_at) + '</span></div>' +
      '<div class="two"><div class="panel"><h4>Customer</h4><div class="kv"><span><b>Contact</b>' + esc(o.contact) + '</span><span><b>Email</b><a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></span>' + (o.phone ? '<span><b>Phone</b><a href="' + tel(o.phone) + '">' + esc(o.phone) + '</a></span>' : '') + (o.vat ? '<span><b>VAT number</b>' + esc(o.vat) + '</span>' : '') + (o.postcode ? '<span><b>Deliver to</b>' + esc(o.postcode) + '</span>' : '') + '</div>' + (o.notes ? '<h4>Customer notes</h4><div class="body">' + esc(o.notes) + '</div>' : '') + '</div>' +
      '<div class="panel"><h4>Money</h4><div class="sum"><div class="big"><span>Quoted to customer</span><b>' + gbp($m.quoted) + '</b></div>' + ($m.unq ? '<div class="dim"><span>' + $m.unq + ' item' + ($m.unq === 1 ? '' : 's') + ' priced on request</span><span>add when confirmed</span></div>' : '') +
      '<div><span>Cost to you (inc VAT)</span><b>' + gbp($m.pay) + '</b></div><div><span>At today\\'s mark-up (+' + markup + '%)</span><b>' + gbp($m.sell) + '</b></div><div><span>Margin on quoted</span><b>' + gbp($m.quoted - $m.pay) + '</b></div>' + ($m.unp ? '<div class="dim"><span>' + $m.unp + ' line' + ($m.unp === 1 ? '' : 's') + ' without a supplier price</span></div>' : '') + '</div>' +
      (o.invoice_url ? '<div class="size">Stripe invoice sent · <a href="' + esc(o.invoice_url) + '" target="_blank" rel="noopener">open the pay page</a>' + (o.paid_at ? ' · paid ' + when(o.paid_at) : ' · not paid yet') + '</div>' : '') +
      '<div class="actions"><button class="btn acc sm" type="button" data-stripe="' + o.id + '"' + (stripeOn ? '' : ' disabled title="Connect Stripe first (STRIPE_SECRET_KEY, see DESK-SETUP.txt)"') + '>' + (o.invoice_url ? 'Resend Stripe invoice' : 'Send Stripe invoice') + '</button><a class="btn sm" href="' + BASE + '/invoice/' + o.id + '" target="_blank" rel="noopener">Print invoice</a><a class="btn sm" href="mailto:' + esc(o.email) + '?subject=' + subject + '&body=' + body + '">Email the customer</a></div>' +
      (stripeOn ? '' : '<div class="size">Stripe not connected: print the invoice and email it, then set the order to Paid yourself when the money arrives.</div>') + '</div></div>' +
      '<div class="panel"><h4>Items</h4><table class="items"><thead><tr><th></th><th>Qty</th><th>Item</th><th class="num">Quoted</th><th>Buy from</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="panel"><div class="actions"><label style="font-size:13px;color:var(--muted)">Status</label><select data-kind="orders" data-id="' + o.id + '">' + opts + '</select><button class="btn sm danger del" type="button" data-del="orders" data-id="' + o.id + '" data-label="order ' + esc(o.ref) + ' from ' + esc(o.company) + '">Delete</button></div></div></div>';
  }

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
      out.push('<h3 style="margin:18px 0 10px;font-size:16px">' + esc(r.name) + ' <span style="font-size:12px;color:var(--muted);font-weight:500">' + inRange.length + '</span></h3><div class="tiles">' + inRange.map(productTile).join('') + '</div>');
    });
    $('#list').innerHTML = out.join('');
  }

  /* ---- routing: #messages, #orders, #orders/12, #messages/5, #suppliers ---- */
  function route() {
    const m = location.hash.match(/^#(messages|orders|suppliers)(?:\\/(\\d+))?/);
    tab = m ? m[1] : 'messages'; open = m && m[2] ? Number(m[2]) : null;
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
    load();
  }
  const go = h => { if (location.hash !== h) location.hash = h; else route(); };

  async function load() {
    const inbox = tab !== 'suppliers';
    $('#filtersInbox').hidden = !inbox || !!open; $('#filtersSup').hidden = inbox;
    const all = $('#showAll').checked ? '?all=1' : '';
    const want = !inbox ? null : open ? tab + '/' + open : tab + all;
    const [sum, data] = await Promise.all([api('summary'), want ? api(want) : null]);
    $('#nMsg').textContent = sum.newMessages; $('#nMsg').classList.toggle('zero', !sum.newMessages);
    $('#nOrd').textContent = sum.newOrders; $('#nOrd').classList.toggle('zero', !sum.newOrders);
    document.title = ((sum.newMessages + sum.newOrders) ? '(' + (sum.newMessages + sum.newOrders) + ') ' : '') + 'Order desk · Limitless Innovations';
    $('#alerts').textContent = (sum.alerts ? 'Email alerts on' : 'Email alerts off') + (sum.stripe ? ' · Stripe on' : ''); stripeOn = !!sum.stripe;
    counts = { archived: sum.archived || 0, closed: sum.closed || 0 };
    const note = $('#note');
    if (!inbox) { renderSuppliers(); note.hidden = false; note.innerHTML = '<b>For you, not for customers.</b> Where to buy each product when an order comes in. Prices are what the supplier page showed on the date in brackets. "You pay" adds 20% VAT to ex-VAT prices (not VAT registered, so that is your real cost); "Sell at" adds your mark-up from the top bar. The shop shows these sell prices at +20%.'; return; }
    if (open) {
      const item = tab === 'messages' ? data.message : data.order;
      if (!item) { $('#list').innerHTML = '<div class="empty">Not found: it may have been deleted.</div>'; return; }
      $('#list').innerHTML = tab === 'messages' ? messageDetail(item) : orderDetail(item);
      if (tab === 'messages' && item.status === 'new') postJSON('messages/' + item.id, { status: 'read' }).then(() => api('summary')).then(s => { $('#nMsg').textContent = s.newMessages; $('#nMsg').classList.toggle('zero', !s.newMessages); }).catch(() => {});
    } else {
      const rows = tab === 'messages' ? data.messages : data.orders;
      $('#list').innerHTML = rows.length ? '<div class="tiles">' + rows.map(tab === 'messages' ? messageTile : orderTile).join('') + '</div>' : '<div class="empty">Nothing here yet.</div>';
      $('#updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const purge = $('#purge'); const n = tab === 'messages' ? counts.archived : counts.closed;
      purge.textContent = (tab === 'messages' ? 'Clear archived messages' : 'Clear closed and cancelled orders') + (n ? ' (' + n + ')' : ''); purge.disabled = !n;
    }
    if (!sum.alerts) { note.hidden = false; note.innerHTML = '<b>Email alerts are off.</b> New messages and orders still arrive here; to get an email for each one, add the RESEND_API_KEY secret (see DESK-SETUP.txt).'; } else note.hidden = true;
  }

  api('suppliers').then(j => {
    suppliers = (j && j.suppliers) || {}; cat = { ranges: (j && j.ranges) || [], products: (j && j.products) || [] };
    $('#rangeChips').innerHTML = [{ id: 'all', name: 'All' }].concat(cat.ranges).map(r => '<button class="chip" type="button" data-range="' + esc(r.id) + '" aria-pressed="' + (r.id === range) + '">' + esc(r.name) + '</button>').join('');
    load();
  }).catch(() => {});

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => go('#' + b.dataset.tab)));
  addEventListener('hashchange', route);
  $('#showAll').addEventListener('change', load);
  $('#refresh').addEventListener('click', load);
  $('#list').addEventListener('click', async e => {
    const t = e.target.closest('[data-open]'); if (t) { go('#' + t.dataset.open); return; }
    const bk = e.target.closest('[data-back]'); if (bk) { go('#' + bk.dataset.back); return; }
    const b = e.target.closest('button[data-del]'); if (!b) return;
    if (!confirm('Delete ' + b.dataset.label + '? This cannot be undone.')) return;
    b.disabled = true; await postJSON(b.dataset.del + '/' + b.dataset.id + '/delete'); go('#' + b.dataset.del);
  });
  $('#list').addEventListener('change', async e => {
    const pi = e.target.closest('input.price-in'); if (pi) { await postJSON('items/' + pi.dataset.item + '/price', { price: pi.value === '' ? null : Number(pi.value) }); load(); return; }
    const s = e.target.closest('select[data-kind]'); if (!s) return; await postJSON(s.dataset.kind + '/' + s.dataset.id, { status: s.value }); load(); });
  $('#list').addEventListener('click', async e => {
    const b = e.target.closest('button[data-stripe]'); if (!b) return;
    if (!confirm('Send this order to the customer as a Stripe invoice with a pay-online link?')) return;
    b.disabled = true; b.textContent = 'Sending…';
    const r = await postJSON('orders/' + b.dataset.stripe + '/stripe');
    if (!r.ok) alert(r.error || 'Stripe could not send the invoice.');
    load();
  });
  $('#purge').addEventListener('click', async () => {
    const what = tab === 'messages' ? 'all archived messages' : 'all closed and cancelled orders';
    if (!confirm('Delete ' + what + '? This cannot be undone.')) return;
    const r = await postJSON('purge', { kind: tab }); await load();
    if (r && r.ok) $('#updated').textContent = 'Cleared ' + (r.deleted == null ? '' : r.deleted + ' ') + (tab === 'messages' ? 'archived messages' : 'closed orders');
  });
  $('#rangeChips').addEventListener('click', e => { const c = e.target.closest('.chip[data-range]'); if (!c) return; range = c.dataset.range; document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === c))); renderSuppliers(); });
  $('#supSearch').addEventListener('input', renderSuppliers);
  $('#markup').value = markup;
  $('#markup').addEventListener('input', () => { markup = Math.min(100, Math.max(0, Number($('#markup').value) || 0)); try { localStorage.setItem('li-markup', String(markup)); } catch (e) {} load(); });
  document.addEventListener('click', e => { const t = e.target.closest('img[data-zoom]'); const z = $('#zoom');
    if (t) { $('#zoomImg').src = '/' + t.dataset.zoom; $('#zoomCap').textContent = t.dataset.cap; z.showModal(); return; }
    if (e.target === z) z.close(); });
  route();
  setInterval(load, 60000);
})();
</script>
</body></html>`;

/* ==========================================================================
   Invoice: a printable page for one order (Print > Save as PDF in the browser).
   Company details come from the Worker's variables when set (COMPANY_NAME, COMPANY_ADDRESS,
   COMPANY_NUMBER, COMPANY_EMAIL, COMPANY_PHONE, BANK_DETAILS); otherwise the defaults below.
   ========================================================================== */
export function invoiceHTML(o, items, env, siteUrl) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = n => '£' + Number(n).toFixed(2);
  const co = {
    name: env.COMPANY_NAME || 'Limitless Innovations Ltd',
    address: env.COMPANY_ADDRESS || 'Unit A, 82 James Carter Road, Mildenhall, Suffolk, IP28 7DE',
    number: env.COMPANY_NUMBER || '14380770',
    email: env.COMPANY_EMAIL || env.ALERT_TO || 'info@limitlessinnovations.co.uk',
    phone: env.COMPANY_PHONE || '',
    bank: env.BANK_DETAILS || ''
  };
  const d = new Date((o.created_at || '') + (String(o.created_at || '').endsWith('Z') ? '' : 'Z'));
  const date = isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  let total = 0, tbc = 0;
  const rows = items.map(i => { const line = i.price ? i.price * i.qty : null; if (line != null) total += line; else tbc++;
    return `<tr><td>${esc(i.brand ? i.brand + ' ' : '')}${esc(i.name)}${i.size ? `<div class="s">${esc(i.size)}</div>` : ''}</td><td class="n">${i.qty}</td><td class="n">${i.price ? gbp(i.price) : 'TBC'}</td><td class="n">${line != null ? gbp(line) : 'TBC'}</td></tr>`; }).join('');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Invoice ${esc(o.ref)} · ${esc(co.name)}</title>
<style>
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
  td.n, th.n { text-align: right; white-space: nowrap; } td .s { font-size: 12px; color: #666; }
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
    <div class="inv"><h1>Invoice</h1><div>Invoice no. <b>${esc(o.ref)}</b></div><div>Date ${esc(today)}</div><div>Order received ${esc(date)}</div></div>
  </div>
  <div class="cols">
    <div><h4>From</h4><p>${esc(co.name)}\n${esc(co.address)}\nCompany no. ${esc(co.number)}\n${esc(co.email)}${co.phone ? '\n' + esc(co.phone) : ''}${siteUrl ? '\n' + esc(siteUrl.replace(/^https?:\/\//, '')) : ''}</p></div>
    <div><h4>Invoice to</h4><p>${esc(o.company)}\n${esc(o.contact)}\n${esc(o.email)}${o.phone ? '\n' + esc(o.phone) : ''}${o.vat ? '\nVAT no. ' + esc(o.vat) : ''}${o.postcode ? '\nDeliver to: ' + esc(o.postcode) : ''}</p></div>
  </div>
  <table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Total</th></tr></thead><tbody>${rows}
    <tr class="tot"><td colspan="3">Total to pay${tbc ? ` (${tbc} line${tbc === 1 ? '' : 's'} to be confirmed)` : ''}</td><td class="n">${gbp(total)}</td></tr></tbody></table>
  <div class="terms">
    <h4>Payment</h4>
    <p>Payment is due before goods are ordered. Please quote <b>${esc(o.ref)}</b> with your payment.${co.bank ? '\n' + esc(co.bank) : '\nBank details: to be added (set BANK_DETAILS in Cloudflare, see DESK-SETUP.txt).'}</p>
    <p>${esc(co.name)} is not VAT registered: no VAT is charged and this is not a VAT invoice.</p>
    ${o.notes ? `<h4>Notes</h4><p>${esc(o.notes)}</p>` : ''}
  </div>
  <div class="foot">${esc(co.name)} · Registered in England and Wales no. ${esc(co.number)} · ${esc(co.address)}</div>
</div>
</body></html>`;
}
