/* The new parts of the desk page's script (Desk 2.0, phase 1): the sidebar, the photo band, the Tasks and
   Today screens, the "coming in phase N" panels and Settings > Header photos.

   These are plain browser JavaScript kept in strings; desk.js pastes them into the desk page's script,
   so they share its helpers ($, api, postJSON, esc, go, UI ...). Written with String.raw and without
   backticks or dollar-brace, so what is written here is exactly what the browser gets. */

// The sidebar (SPEC 4). `phase` is the phase that builds the screen; no phase = it works today.
export const NAV = [
  { group: 'Daily', items: [
    { id: 'today', label: 'Today' },
    { id: 'tasks', label: 'Tasks' } ] },
  { group: 'Work', items: [
    { id: 'jobs', label: 'Jobs', phase: 4, about: 'Every job with its stage, site progress from the audit app, value and whether it is paid.' },
    { id: 'quotes', label: 'Quotes', phase: 4, about: 'Quotes tied to their jobs, with the date sent and a reminder to chase.' },
    { id: 'drawings', label: 'Drawings & pins', phase: 4, about: 'Drawings and the pins on them, read from the audit app.' } ] },
  { group: 'Money', items: [
    { id: 'invoices', label: 'Invoices', phase: 5, about: 'Invoices with a time-to-pay bar and the 7, 14 and 30 day reminders.' },
    { id: 'accounts', label: 'Accounts', phase: 5, about: 'Income against costs by month, margin by job and costs still to log.' } ] },
  { group: 'Website shop', items: [
    { id: 'orders', label: 'Orders' },
    { id: 'suppliers', label: 'Products & prices' },
    { id: 'messages', label: 'Enquiries' },
    { id: 'visitors', label: 'Visitors' } ] },
  { group: 'Company', items: [
    { id: 'compliance', label: 'Compliance', phase: 6, about: 'Insurance, certificates and cards with a bar showing how long each has left.' },
    { id: 'people', label: 'People', phase: 6, about: 'Your operatives, with their cards and training.' },
    { id: 'company', label: 'Company admin', phase: 6, about: 'Companies House and HMRC deadlines, the VAT threshold, renewals and free-plan usage.' },
    { id: 'settings', label: 'Settings' } ] }
];

export const DESK_CLIENT = String.raw`
  /* ======================= Desk 2.0, phase 1 ======================= */
  const SCREENS = {}; NAV.forEach(g => g.items.forEach(i => { SCREENS[i.id] = i; }));
  const NEW_SCREENS = new Set(['today', 'tasks', 'settings', ...NAV.flatMap(g => g.items).filter(i => i.phase).map(i => i.id)]);
  const todayLong = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  /* ---- sidebar and top bar ---- */
  const side = $('#side'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
  function menu(openIt) { side.classList.toggle('open', openIt); scrim.classList.toggle('open', openIt); menuBtn.setAttribute('aria-expanded', String(openIt)); }
  menuBtn.addEventListener('click', () => menu(!side.classList.contains('open')));
  scrim.addEventListener('click', () => menu(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('open')) { menu(false); menuBtn.focus(); } });
  side.addEventListener('click', e => { if (e.target.closest('a.nav')) menu(false); });

  // Called on every route change: highlights the sidebar item, sets the band title and height, shows only the controls that belong.
  function frame() {
    document.querySelectorAll('a.nav').forEach(a => { if (a.dataset.s === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const band = $('#band'); band.classList.toggle('today', tab === 'today');
    $('#pageTitle').textContent = (SCREENS[tab] && SCREENS[tab].label) || 'Today';
    $('#pageSub').textContent = tab === 'today' ? todayLong() : '';
    $('#markupBox').hidden = !(tab === 'orders' || tab === 'suppliers');
  }

  // Count badges: red when something is urgent (see applySummary).
  function badge(id, n, urgent) { const el = document.getElementById('cnt-' + id); if (!el) return; el.hidden = !n; el.textContent = n > 99 ? '99+' : String(n); el.classList.toggle('urgent', !!urgent && n > 0); }

  /* ---- photo band: one random project photo per page load, kept until the next load ---- */
  let photos = [], photosOk = false, bandPhoto = null, bandChosen = false;
  const photoSrc = p => BASE + '/photo/' + encodeURIComponent(p.file) + '?v=' + (p.v || 0);
  const focusCss = p => p.x + '% ' + p.y + '%';
  function pickBand() {
    if (bandChosen || !photos.length) return;
    bandChosen = true; bandPhoto = photos[Math.floor(Math.random() * photos.length)];
    const img = $('#bandImg');
    img.onerror = () => { img.hidden = true; $('#bandCredit').innerHTML = ''; };
    img.onload = () => { img.hidden = false; };
    img.style.objectPosition = focusCss(bandPhoto);
    img.alt = '';
    img.src = photoSrc(bandPhoto);
    $('#bandCredit').innerHTML = '<b>' + esc(bandPhoto.title) + '</b>' + (bandPhoto.place ? '<span>' + esc(bandPhoto.place) + '</span>' : '');
  }
  const loadPhotos = () => api('photos').then(j => { photosOk = !!(j && j.ok); photos = (j && j.photos) || []; storageOn = !j || j.storage !== false; pickBand(); return j; }).catch(() => null);
  let storageOn = true;

  /* ---- "Coming in phase N" ---- */
  function comingSoon() {
    const s = SCREENS[tab];
    $('#list').innerHTML = '<div class="panel coming"><span class="pri pri-planned"><i class="pri-dot" aria-hidden="true"></i>Planned</span><h3>Coming in phase ' + s.phase + '</h3><p>' + esc(s.about) + '</p>' +
      '<p class="fine">Nothing is lost while you wait: your orders, enquiries and visitor numbers all work from the Website shop group, and the Tasks screen is ready to use.</p></div>';
  }

  /* ---- tasks (Today and Tasks screens) ---- */
  let taskRows = null, taskFilter = 'open', taskSort = 'priority', taskMsg = '';
  const TASK_FILTERS = [['open', 'Open', null], ['urgent', 'Urgent', 'urgent'], ['soon', 'This week', 'soon'], ['planned', 'Planned', 'planned'], ['waiting', 'Waiting', 'waiting'], ['done', 'Done', 'done']];
  const shownPriority = t => t.status === 'done' ? 'done' : t.priority;
  const dayEnd = s => /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 23, 59, 59).getTime() : Date.parse(s);
  const shortDate = s => { if (!s) return ''; const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const taskKeep = (t, f) => f === 'done' ? t.status === 'done' : t.status === 'open' && (f === 'open' || t.priority === f);
  const taskCount = f => (taskRows || []).filter(t => taskKeep(t, f)).length;
  const dueSort = t => { const e = t.priority === 'waiting' && t.chase_at ? t.chase_at : t.due_at; return e ? dayEnd(e) : Infinity; };

  function taskDue(t) {
    if (t.status === 'done') return '<span class="when">Done ' + esc(shortDate(t.done_at)) + '</span>';
    const waiting = t.priority === 'waiting', end = waiting && t.chase_at ? t.chase_at : t.due_at;
    if (!end) return '<span class="when">No date set</span>';
    const opts = waiting ? { urgentLeft: 0, soonLeft: 0, farState: 'waiting', unit: 'days', pastWord: 'late' } : { preset: 'due', unit: 'days', pastWord: 'late' };   // waiting turns red only once its chase date passes
    return '<span class="when">' + (waiting && t.chase_at ? 'Chase ' : 'Due ') + esc(shortDate(end)) + '</span>' + UI.TimeBar(t.created_at, dayEnd(end), Date.now(), 'elapsed', opts);
  }
  function taskRow(t) {
    const p = shownPriority(t), done = t.status === 'done';
    const opts = ['urgent', 'soon', 'planned', 'waiting'].map(k => '<option value="' + k + '"' + (t.priority === k ? ' selected' : '') + '>' + UI.priorityLabel(k) + '</option>').join('');
    return '<div class="trow' + (done ? ' is-done' : '') + '" data-task="' + t.id + '"><div class="pr">' + UI.pill(p) + '</div>' +
      '<div class="tt"><b>' + esc(t.title) + '</b>' + (t.detail ? '<small>' + esc(t.detail) + '</small>' : '') + '</div>' +
      '<span class="src">' + esc(t.source || 'Manual') + '</span><div class="due">' + taskDue(t) + '</div>' +
      '<div class="act">' + (done ? '' : '<select data-task-pri="' + t.id + '" aria-label="Priority of ' + esc(t.title) + '">' + opts + '</select>') +
      '<button class="btn sm' + (!done && t.priority === 'urgent' ? ' urgent' : '') + '" type="button" data-task-done="' + t.id + '" data-to="' + (done ? 'open' : 'done') + '">' + (done ? 'Undo' : 'Mark done') + '</button></div></div>';
  }
  function taskForm() {
    return '<form class="panel form newtask" id="taskForm" novalidate><h4>New task</h4><div class="fields">' +
      '<label class="field" data-f="title"><span>What needs doing *</span><input name="title" maxlength="200" autocomplete="off"><span class="err"></span></label>' +
      '<label class="field" data-f="due_at"><span>Due date (optional)</span><input name="due_at" type="date"><span class="err"></span></label>' +
      '<label class="field" data-f="priority"><span>Priority</span><select name="priority"><option value="">Automatic from the date</option><option value="urgent">Urgent</option><option value="soon">This week</option><option value="planned">Planned</option><option value="waiting">Waiting on someone</option></select><span class="err"></span></label>' +
      '<label class="field" data-f="chase_at"><span>Chase on (for waiting tasks)</span><input name="chase_at" type="date"><span class="err"></span></label>' +
      '</div><label class="field" data-f="detail"><span>Details (optional)</span><textarea name="detail" maxlength="1000"></textarea><span class="err"></span></label>' +
      '<div class="actions"><button class="btn acc" type="submit" id="taskSave">Add the task</button><a class="btn" href="#tasks">Cancel</a><span class="err" id="taskErr"></span></div></form>';
  }
  function renderTasks() {
    const out = [];
    if (tab === 'tasks' && open === 'new') out.push(taskForm());
    if (taskMsg) out.push('<div class="note warn" style="margin-top:0">' + taskMsg + '</div>');
    if (taskRows) {
      const chips = TASK_FILTERS.map(([k, label, pri]) => '<button class="chip" type="button" data-tf="' + k + '" aria-pressed="' + (taskFilter === k) + '">' + (pri ? '<i class="pri-dot pri-' + pri + '" aria-hidden="true"></i>' : '') + label + ' <span class="n">' + taskCount(k) + '</span></button>').join('');
      const sorts = [['priority', 'Priority'], ['due', 'Due date'], ['source', 'Where from']].map(([k, l]) => '<button type="button" data-ts="' + k + '" aria-pressed="' + (taskSort === k) + '">' + l + '</button>').join('');
      const rank = t => UI.PRIORITIES[shownPriority(t)].rank;
      const rows = taskRows.filter(t => taskKeep(t, taskFilter)).sort((a, b) =>
        taskSort === 'due' ? dueSort(a) - dueSort(b) || rank(a) - rank(b) :
        taskSort === 'source' ? String(a.source).localeCompare(String(b.source)) || rank(a) - rank(b) || dueSort(a) - dueSort(b) :
        rank(a) - rank(b) || dueSort(a) - dueSort(b) || b.id - a.id);
      out.push('<section class="panel tasks" aria-label="Task list"><div class="t-head"><span class="ttl">To do</span><div class="chips">' + chips + '</div><div class="sorts"><span>Sort</span>' + sorts + '</div></div>' +
        (rows.length ? '<div class="trow hd"><span>Priority</span><span>Task</span><span>From</span><span>Due</span><span></span></div>' + rows.map(taskRow).join('') : '<div class="empty-mini" style="padding:36px;text-align:center">' + (taskRows.length ? 'Nothing here. Pick another filter to see the rest.' : 'No tasks yet. Press New task to add the first one.') + '</div>') + '</section>');
    }
    $('#list').innerHTML = out.join('');
  }
  async function showTasks(my) {
    const j = await api('tasks');
    if (my != null && my !== loadToken) return;
    if (j && j.ok) { taskRows = j.tasks || []; taskMsg = ''; }
    else { taskRows = null; taskMsg = j && j.error === 'not-set-up' ? '<b>Tasks are not switched on yet.</b> The database needs the one-off step in migrations/0001_tasks.sql (Claude does this before the update goes live).' : 'The task list could not be loaded. Try Refresh.'; }
    const note = $('#note');
    if (tab === 'today') { note.hidden = false; note.innerHTML = '<b>Today is the first version.</b> The photo, the date and your task list are here; the headline tiles (money owed, jobs on site, orders to approve, items expiring) and instant search come in phase 2.'; }
    else note.hidden = true;
    renderTasks();
    if (tab === 'tasks' && open === 'new') { const f = $('#taskForm input[name=title]'); if (f) f.focus(); }
  }
  function taskPatch(t) { const i = taskRows.findIndex(x => x.id === t.id); if (i >= 0) taskRows[i] = t; renderTasks(); api('summary').then(applySummary).catch(() => {}); }
  $('#list').addEventListener('click', async e => {
    const tf = e.target.closest('[data-tf]'); if (tf) { taskFilter = tf.dataset.tf; renderTasks(); return; }
    const ts = e.target.closest('[data-ts]'); if (ts) { taskSort = ts.dataset.ts; renderTasks(); return; }
    const d = e.target.closest('[data-task-done]'); if (!d) return;
    d.disabled = true;
    const r = await postJSON('tasks/' + d.dataset.taskDone, { status: d.dataset.to }).catch(() => null);
    if (r && r.ok) taskPatch(r.task); else { d.disabled = false; alert('That change was not saved. Try again.'); }
  });
  $('#list').addEventListener('change', async e => {
    const s = e.target.closest('select[data-task-pri]'); if (s) {
      const r = await postJSON('tasks/' + s.dataset.taskPri, { priority: s.value }).catch(() => null);
      if (r && r.ok) taskPatch(r.task); else { alert('That change was not saved. Try again.'); showTasks(); }
      return; }
  });
  $('#list').addEventListener('submit', async e => {
    const f = e.target.closest('#taskForm'); if (!f) return;
    e.preventDefault();
    f.querySelectorAll('.err').forEach(x => { x.textContent = ''; }); f.querySelectorAll('.field.bad').forEach(x => x.classList.remove('bad'));
    const v = n => (f.querySelector('[name=' + n + ']').value || '').trim();
    const body = { title: v('title'), detail: v('detail'), due_at: v('due_at'), priority: v('priority'), chase_at: v('chase_at') };
    const btn = $('#taskSave'); btn.disabled = true;
    const r = await postJSON('tasks', body).catch(() => null);
    btn.disabled = false;
    if (r && r.ok) { taskRows = [r.task].concat(taskRows || []); go('#tasks'); api('summary').then(applySummary).catch(() => {}); return; }
    if (r && r.fields) {
      Object.entries(r.fields).forEach(([k, msg]) => { const fl = f.querySelector('.field[data-f="' + k + '"]'); if (fl) { fl.classList.add('bad'); fl.querySelector('.err').textContent = msg; } });
      const bad = f.querySelector('.field.bad input, .field.bad select'); if (bad) bad.focus();
    } else $('#taskErr').textContent = 'It could not be saved. Check the connection and try again.';
  });
  $('#list').addEventListener('input', e => { const fl = e.target.closest('#taskForm .field.bad'); if (fl) { fl.classList.remove('bad'); fl.querySelector('.err').textContent = ''; } });

  /* ---- Settings > Header photos ---- */
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  let focusDraft = {};   // name -> {x, y} chosen but not saved yet
  const photoCard = p => {
    const f = focusDraft[p.name] || { x: p.x, y: p.y };
    return '<div class="ph" data-photo="' + esc(p.name) + '"><div class="pv" data-pick="' + esc(p.name) + '" title="Click where the picture should stay in view"><img loading="lazy" alt="" src="' + esc(photoSrc(p)) + '"><i class="pt" style="left:' + f.x + '%;top:' + f.y + '%"></i></div>' +
      '<div class="band-prev" style="aspect-ratio:7/1;border-radius:6px;overflow:hidden;background:var(--bg-raised)"><img alt="" loading="lazy" src="' + esc(photoSrc(p)) + '" style="width:100%;height:100%;object-fit:cover;object-position:' + f.x + '% ' + f.y + '%;display:block"></div>' +
      '<div class="nm"><b>' + esc(p.title) + (p.place ? ' <span style="color:var(--text-3);font-weight:400">· ' + esc(p.place) + '</span>' : '') + '</b><small>' + esc(p.file) + ' · ' + kb(p.size) + '</small></div>' +
      '<div class="row"><button class="btn sm acc" type="button" data-focus-save="' + esc(p.name) + '"' + (focusDraft[p.name] ? '' : ' disabled') + '>Save focus point</button><button class="btn sm danger" type="button" data-photo-del="' + esc(p.name) + '" data-label="' + esc(p.title) + '">Delete</button>' +
      '<span class="hint">Click the big picture where it should stay in view. The strip underneath shows how the band will crop it.</span></div></div>';
  };
  function renderSettings(msg) {
    $('#list').innerHTML = '<div class="detail"><div class="panel"><h4>Header photos</h4>' +
      '<p class="fine" style="margin:0">One of these is picked at random each time you open the desk, and it stays the same until you reload. Pictures are kept in your private storage and only shown after you log in. They are stored exactly as uploaded: jpg, png or webp, up to 12 MB each.</p>' +
      (storageOn ? '<div class="drop"><label class="field"><span>Add pictures (the file name becomes the title, so bloomberg-london.jpg is "Bloomberg London")</span><input type="file" id="phFile" accept="image/jpeg,image/png,image/webp" multiple></label>' +
        '<button class="btn acc sm" type="button" id="phUpload">Upload</button><div class="fine" id="phMsg" role="status">' + (msg || '') + '</div></div>' : '<div class="note warn" style="margin:0"><b>Photo storage is not connected yet.</b> The website needs its DESK_FILES storage link (wrangler.jsonc) before pictures can be added. Until then the band shows a plain dark gradient.</div>') +
      (photos.length ? '<div class="photos" id="photoGrid">' + photos.map(photoCard).join('') + '</div>' : (storageOn ? '<div class="empty-mini">No pictures yet: until you add some, the band shows a plain dark gradient.</div>' : '')) + '</div>' +
      '<div class="panel"><h4>More settings</h4><p class="fine" style="margin:0">Reminder days, the VAT threshold and the automatic task rules will appear here as the screens that use them are built.</p></div></div>';
  }
  async function showSettings(msg, my) { const j = await loadPhotos(); if (my != null && my !== loadToken) return; if (!j) { photos = []; } renderSettings(msg); }
  $('#list').addEventListener('click', async e => {
    const pv = e.target.closest('[data-pick]');
    if (pv) {
      const img = pv.querySelector('img'), r = img.getBoundingClientRect(), x = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100))), y = Math.max(0, Math.min(100, Math.round((e.clientY - r.top) / r.height * 100)));
      const name = pv.dataset.pick; focusDraft[name] = { x, y };
      const card = pv.closest('.ph'); card.querySelector('.pt').style.left = x + '%'; card.querySelector('.pt').style.top = y + '%';
      card.querySelector('.band-prev img').style.objectPosition = x + '% ' + y + '%'; card.querySelector('[data-focus-save]').disabled = false; return;
    }
    const fs = e.target.closest('[data-focus-save]');
    if (fs) { const name = fs.dataset.focusSave, f = focusDraft[name]; if (!f) return; fs.disabled = true;
      const r = await postJSON('photos/' + encodeURIComponent(name) + '/focus', f).catch(() => null);
      if (r && r.ok) { delete focusDraft[name]; const i = photos.findIndex(p => p.name === name); if (i >= 0) photos[i] = r.photo; renderSettings('Focus point saved.'); } else { fs.disabled = false; alert('That was not saved. Try again.'); }
      return; }
    const pd = e.target.closest('[data-photo-del]');
    if (pd) { if (!confirm('Delete the picture "' + pd.dataset.label + '"? This cannot be undone.')) return; pd.disabled = true;
      const r = await postJSON('photos/' + encodeURIComponent(pd.dataset.photoDel) + '/delete').catch(() => null);
      if (r && r.ok) { delete focusDraft[pd.dataset.photoDel]; photos = photos.filter(p => p.name !== pd.dataset.photoDel); renderSettings('Deleted.'); } else { pd.disabled = false; alert('It could not be deleted.'); }
      return; }
    if (e.target.closest('#phUpload')) {
      const input = $('#phFile'), files = [...input.files], msg = $('#phMsg');
      if (!files.length) { msg.textContent = 'Choose one or more pictures first.'; return; }
      const btn = $('#phUpload'); btn.disabled = true; const lines = [];
      for (const file of files) {
        msg.innerHTML = lines.concat('Uploading ' + esc(file.name) + '…').join('<br>');
        if (file.size > 12 * 1024 * 1024) { lines.push(esc(file.name) + ': over 12 MB, not uploaded.'); continue; }
        let r = null; try { r = await api('photos/upload?filename=' + encodeURIComponent(file.name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }); } catch (err) {}
        lines.push(esc(file.name) + ': ' + (r && r.ok ? 'added.' : esc((r && r.error) || 'could not be uploaded.')));
      }
      const j = await loadPhotos(); renderSettings(lines.join('<br>')); return;
    }
  });

  /* ---- the new screens, called from load() ---- */
  async function showNewScreen(my) {
    if (tab === 'today' || tab === 'tasks') return showTasks(my);
    $('#note').hidden = true;
    if (tab === 'settings') return showSettings('', my);
    return comingSoon();
  }

  // Apply the new counts from the summary (new messages, orders waiting, open and urgent tasks).
  function applyBadges(sum) {
    badge('messages', sum.newMessages || 0, false);
    badge('orders', sum.newOrders || 0, (sum.ordersOverdue || 0) > 0);   // red once an order has waited more than 24 hours for approval
    badge('tasks', sum.tasksOpen || 0, (sum.tasksUrgent || 0) > 0);
    badge('today', sum.tasksUrgent || 0, true);
  }
`;
