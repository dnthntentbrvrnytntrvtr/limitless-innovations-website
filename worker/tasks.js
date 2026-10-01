/* The desk's task list: validation (pure, unit-tested) and the few database calls behind
   /api/desk/tasks. The table is created by migrations/0001_tasks.sql (also in schema.sql).

   Priorities the owner can set: urgent, soon, planned, waiting. "Done" is not a priority of its own:
   it is the status. Marking a task done and then undoing it brings back its old priority.
   Dates: a due or chase date is a day (YYYY-MM-DD) or a full UTC time (YYYY-MM-DDTHH:MM:SSZ). */

export const PRIORITIES = ['urgent', 'soon', 'planned', 'waiting'];
export const STATUSES = ['open', 'done'];
export const SOURCES = ['Manual', 'Money', 'Website shop', 'Compliance', 'Audit app', 'Jobs', 'People'];
export const MAX_TASK = { title: 200, detail: 1000, jobId: 60 };

const DAY = 86400000;
const nowIso = (now = Date.now()) => new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z');

function tidy(v, max, multiline) {
  if (v == null) return '';
  let s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = multiline ? s.replace(/\r\n?/g, '\n').trim() : s.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) : s;
}

// '' / null -> {ok:true, value:null}; a real day or UTC time -> {ok:true, value:'...'}; anything else -> {ok:false}
export function parseDay(v) {
  if (v == null || v === '') return { ok: true, value: null };
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 2000 && +m[1] < 2100 ? { ok: true, value: s } : { ok: false };
  }
  m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z$/.exec(s);
  if (m && +m[2] < 24 && +m[3] < 60 && (m[4] == null || +m[4] < 60)) {
    const day = parseDay(m[1]);
    if (day.ok) return { ok: true, value: m[1] + 'T' + m[2] + ':' + m[3] + ':' + (m[4] || '00') + 'Z' };
  }
  return { ok: false };
}

// When the owner doesn't pick a priority: late or due today = urgent, within 7 days = soon, otherwise planned.
export function autoPriority(due, now = Date.now()) {
  if (!due) return 'planned';
  const s = String(due);
  let days;
  if (s.length === 10) days = Math.round((Date.parse(s + 'T00:00:00Z') - Date.parse(new Date(now).toISOString().slice(0, 10) + 'T00:00:00Z')) / DAY);   // whole days from today
  else { const t = Date.parse(s); if (!isFinite(t)) return 'planned'; days = t - now < DAY ? 0 : Math.ceil((t - now) / DAY); }
  if (!isFinite(days)) return 'planned';
  if (days <= 0) return 'urgent';        // overdue, or due today
  if (days <= 7) return 'soon';
  return 'planned';
}

export function validateNewTask(b, now = Date.now()) {
  b = b || {};
  const fields = {};
  const title = tidy(b.title, MAX_TASK.title);
  if (!title) fields.title = 'Add a short title for the task.';
  if (b.title != null && String(b.title).trim().length > MAX_TASK.title) fields.title = 'Keep the title under ' + MAX_TASK.title + ' characters.';
  const detail = tidy(b.detail, MAX_TASK.detail, true);
  const due = parseDay(b.due_at); if (!due.ok) fields.due_at = 'That date does not look right.';
  const chase = parseDay(b.chase_at); if (!chase.ok) fields.chase_at = 'That date does not look right.';
  let priority = b.priority == null || b.priority === '' || b.priority === 'auto' ? null : String(b.priority);
  if (priority !== null && !PRIORITIES.includes(priority)) fields.priority = 'Choose urgent, this week, planned or waiting.';
  const source = b.source == null || b.source === '' ? 'Manual' : String(b.source);
  if (!SOURCES.includes(source)) fields.source = 'Unknown source.';
  const jobId = b.job_id == null || b.job_id === '' ? null : tidy(b.job_id, MAX_TASK.jobId);
  if (Object.keys(fields).length) return { ok: false, fields };
  if (priority === null) priority = autoPriority(due.value, now);
  return { ok: true, value: { title, detail: detail || null, source, job_id: jobId || null, priority, due_at: due.value, chase_at: chase.value } };
}

// Changes allowed on an existing task: status (open/done), priority, due date, chase date.
export function validateTaskUpdate(b) {
  b = b || {};
  const fields = {}, value = {};
  if ('status' in b) { if (STATUSES.includes(b.status)) value.status = b.status; else fields.status = 'Status must be open or done.'; }
  if ('priority' in b) { if (PRIORITIES.includes(b.priority)) value.priority = b.priority; else fields.priority = 'Choose urgent, this week, planned or waiting.'; }
  if ('due_at' in b) { const d = parseDay(b.due_at); if (d.ok) value.due_at = d.value; else fields.due_at = 'That date does not look right.'; }
  if ('chase_at' in b) { const d = parseDay(b.chase_at); if (d.ok) value.chase_at = d.value; else fields.chase_at = 'That date does not look right.'; }
  if (Object.keys(fields).length) return { ok: false, fields };
  if (!Object.keys(value).length) return { ok: false, fields: { _: 'Nothing to change.' } };
  return { ok: true, value };
}

const COLUMNS = 'id, title, detail, source, job_id, priority, due_at, chase_at, status, auto_rule, created_at, updated_at, done_at';

// Every open task, and the ones finished in the last 90 days (so the Done filter and Undo have something to show).
export async function listTasks(DB, now = Date.now()) {
  const since = nowIso(now - 90 * DAY);
  return (await DB.prepare(`SELECT ${COLUMNS} FROM tasks WHERE status = 'open' OR done_at >= ? ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, id DESC LIMIT 600`).bind(since).all()).results;
}

export async function taskCounts(DB) {
  const row = await DB.prepare("SELECT COUNT(*) AS open, COALESCE(SUM(priority = 'urgent'), 0) AS urgent FROM tasks WHERE status = 'open'").first();
  return { open: (row && row.open) || 0, urgent: (row && row.urgent) || 0 };
}

export async function createTask(DB, v, now = Date.now()) {
  const t = nowIso(now);
  const r = await DB.prepare('INSERT INTO tasks (title, detail, source, job_id, priority, due_at, chase_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'open\', ?, ?)')
    .bind(v.title, v.detail, v.source, v.job_id, v.priority, v.due_at, v.chase_at, t, t).run();
  return DB.prepare(`SELECT ${COLUMNS} FROM tasks WHERE id = ?`).bind(r.meta.last_row_id).first();
}

// Returns the changed task, or null if there is no such task.
export async function updateTask(DB, id, v, now = Date.now()) {
  const sets = [], args = [];
  for (const k of ['priority', 'due_at', 'chase_at']) if (k in v) { sets.push(k + ' = ?'); args.push(v[k]); }
  if ('status' in v) {
    sets.push('status = ?'); args.push(v.status);
    sets.push('done_at = ?'); args.push(v.status === 'done' ? nowIso(now) : null);
  }
  sets.push('updated_at = ?'); args.push(nowIso(now));
  const r = await DB.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  if (r.meta && r.meta.changes === 0) return null;
  return DB.prepare(`SELECT ${COLUMNS} FROM tasks WHERE id = ?`).bind(id).first();
}
