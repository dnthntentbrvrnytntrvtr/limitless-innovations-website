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
  .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
  .tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
  .tab { padding: 9px 14px; border: 1px solid var(--line); border-radius: 4px; background: transparent; color: var(--ink-2); font: 600 14px/1 inherit; cursor: pointer; }
  .tab[aria-selected="true"] { background: var(--panel); color: var(--ink); border-color: var(--steel); }
  .tab .n { display: inline-block; min-width: 20px; padding: 2px 6px; margin-left: 6px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 11px; text-align: center; }
  .tab .n.zero { background: var(--panel-2); color: var(--muted); }
  .filters { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; font-size: 13px; color: var(--muted); }
  .filters label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
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
  @media (max-width: 640px) { .wrap { padding: 14px; } .card { padding: 14px; } .top { padding: 10px 14px; } .top .sub { display: none; } }
`;

const MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4L3 27l17 9z" fill="#cfc6b6"/><path d="M20 4l17 23-17 9z" fill="#7b848e"/></svg>`;

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
<body><div class="login"><form class="box" method="post" action="/desk/login">
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
<style>${STYLE}</style></head>
<body>
<header class="top">
  ${MARK}
  <div><h1>Order desk</h1><div class="sub">Messages and trade orders from the website</div></div>
  <div class="right"><span id="alerts"></span><button class="btn sm" id="refresh" type="button">Refresh</button><a class="btn sm" href="/desk/logout">Log out</a></div>
</header>
<main class="wrap">
  <div class="tabs" role="tablist">
    <button class="tab" role="tab" id="tabMsg" aria-selected="true" data-tab="messages">Messages<span class="n zero" id="nMsg">0</span></button>
    <button class="tab" role="tab" id="tabOrd" aria-selected="false" data-tab="orders">Orders<span class="n zero" id="nOrd">0</span></button>
  </div>
  <div class="filters"><label><input type="checkbox" id="showAll"> Show archived and closed too</label><span id="updated"></span></div>
  <div class="list" id="list"></div>
  <div class="note" id="note" hidden></div>
</main>
<script>
(() => {
  const $ = s => document.querySelector(s);
  let tab = 'messages', suppliers = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = iso => { const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')); const m = (Date.now() - d) / 60000;
    if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + ' min ago'; if (m < 36 * 60) return Math.round(m / 60) + ' h ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  const api = (path, opts) => fetch('/api/desk/' + path, { credentials: 'same-origin', ...opts }).then(r => { if (r.status === 401) { location.reload(); throw new Error('auth'); } return r.json(); });
  const post = (path, status) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });

  api('suppliers').then(j => { suppliers = (j && j.suppliers) || {}; if (tab === 'orders') load(); }).catch(() => {});

  function supplierLinks(pid) {
    const s = suppliers[pid];
    if (!s || !s.length) return '<span class="none">No supplier links yet</span>';
    return s.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.supplier) + '</b>' + (x.price ? esc(x.price) : '') + (x.checked ? ' <span style="color:var(--faint)">(' + esc(x.checked) + ')</span>' : '') + '</a>').join('');
  }
  function messageCard(m) {
    const opts = ['new', 'read', 'replied', 'archived'].map(s => '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + s[0].toUpperCase() + s.slice(1) + '</option>').join('');
    const subject = encodeURIComponent('Re: your message to Limitless Innovations');
    const body = encodeURIComponent('Hello ' + m.name + ',\\n\\nThank you for your message.\\n\\n\\n\\n---\\nYour message:\\n' + m.message);
    return '<article class="card ' + (m.status === 'new' ? 'new' : '') + '" data-id="' + m.id + '">' +
      '<div class="head"><h3>' + esc(m.name) + '</h3><span class="when">' + when(m.created_at) + (m.source ? ' · via ' + esc(m.source) : '') + '</span><span class="status">' + esc(m.status) + '</span></div>' +
      '<div class="meta"><span><b>Email</b><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></span>' + (m.phone ? '<span><b>Phone</b><a href="tel:' + esc(m.phone.replace(/\\s+/g, '')) + '">' + esc(m.phone) + '</a></span>' : '') + (m.page ? '<span><b>From</b>' + esc(m.page) + '</span>' : '') + '</div>' +
      '<div class="body">' + esc(m.message) + '</div>' +
      '<div class="actions"><a class="btn acc sm" href="mailto:' + esc(m.email) + '?subject=' + subject + '&body=' + body + '">Reply by email</a>' + (m.phone ? '<a class="btn sm" href="tel:' + esc(m.phone.replace(/\\s+/g, '')) + '">Call</a>' : '') +
      '<select data-kind="messages" data-id="' + m.id + '">' + opts + '</select></div></article>';
  }
  function orderCard(o) {
    const opts = ['new', 'confirmed', 'ordered', 'dispatched', 'closed', 'cancelled'].map(s => '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + ({ new: 'New', confirmed: 'Confirmed with customer', ordered: 'Ordered from supplier', dispatched: 'Dispatched', closed: 'Closed', cancelled: 'Cancelled' })[s] + '</option>').join('');
    const rows = (o.items || []).map(i => '<tr><td class="qty">' + i.qty + ' ×</td><td>' + (i.brand ? '<span style="color:var(--muted)">' + esc(i.brand) + '</span> ' : '') + esc(i.name) + '</td><td><div class="sup">' + supplierLinks(i.product_id) + '</div></td></tr>').join('');
    const lines = (o.items || []).map(i => i.qty + ' x ' + (i.brand ? i.brand + ' ' : '') + i.name).join('\\n');
    const subject = encodeURIComponent('Your trade order ' + o.ref + ' - Limitless Innovations');
    const body = encodeURIComponent('Hello ' + o.contact + ',\\n\\nThank you for your order enquiry ' + o.ref + '.\\n\\n' + lines + '\\n\\n');
    return '<article class="card ' + (o.status === 'new' ? 'new' : '') + '" data-id="' + o.id + '">' +
      '<div class="head"><h3>' + esc(o.company) + '</h3><span class="when">' + esc(o.ref) + ' · ' + when(o.created_at) + '</span><span class="status">' + esc(o.status) + '</span></div>' +
      '<div class="meta"><span><b>Contact</b>' + esc(o.contact) + '</span><span><b>Email</b><a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></span>' + (o.phone ? '<span><b>Phone</b><a href="tel:' + esc(o.phone.replace(/\\s+/g, '')) + '">' + esc(o.phone) + '</a></span>' : '') + (o.vat ? '<span><b>VAT</b>' + esc(o.vat) + '</span>' : '') + (o.postcode ? '<span><b>Deliver to</b>' + esc(o.postcode) + '</span>' : '') + '</div>' +
      '<table class="items"><thead><tr><th>Qty</th><th>Item</th><th>Buy from</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (o.notes ? '<div class="body">' + esc(o.notes) + '</div>' : '') +
      '<div class="actions"><a class="btn acc sm" href="mailto:' + esc(o.email) + '?subject=' + subject + '&body=' + body + '">Email the customer</a><select data-kind="orders" data-id="' + o.id + '">' + opts + '</select></div></article>';
  }
  async function load() {
    const all = $('#showAll').checked ? '?all=1' : '';
    const [sum, data] = await Promise.all([api('summary'), api(tab + all)]);
    $('#nMsg').textContent = sum.newMessages; $('#nMsg').classList.toggle('zero', !sum.newMessages);
    $('#nOrd').textContent = sum.newOrders; $('#nOrd').classList.toggle('zero', !sum.newOrders);
    document.title = ((sum.newMessages + sum.newOrders) ? '(' + (sum.newMessages + sum.newOrders) + ') ' : '') + 'Order desk · Limitless Innovations';
    $('#alerts').textContent = sum.alerts ? 'Email alerts on' : 'Email alerts off';
    const rows = tab === 'messages' ? data.messages : data.orders;
    $('#list').innerHTML = rows.length ? rows.map(tab === 'messages' ? messageCard : orderCard).join('') : '<div class="empty">Nothing here yet.</div>';
    $('#updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const note = $('#note');
    if (!sum.alerts) { note.hidden = false; note.innerHTML = '<b>Email alerts are off.</b> New messages and orders still arrive here; to get an email for each one, add the RESEND_API_KEY secret (see DESK-SETUP.txt).'; } else note.hidden = true;
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t === b))); load(); }));
  $('#showAll').addEventListener('change', load);
  $('#refresh').addEventListener('click', load);
  $('#list').addEventListener('change', async e => {
    const s = e.target.closest('select[data-kind]'); if (!s) return;
    await post(s.dataset.kind + '/' + s.dataset.id, s.value); load();
  });
  load();
  setInterval(load, 60000);
})();
</script>
</body></html>`;
