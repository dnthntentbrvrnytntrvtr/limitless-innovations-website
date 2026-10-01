import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDay, autoPriority, validateNewTask, validateTaskUpdate, MAX_TASK } from '../worker/tasks.js';

const NOW = Date.parse('2026-10-01T09:00:00Z');

test('parseDay accepts real days and UTC times, empties to null, refuses the rest', () => {
  assert.deepEqual(parseDay(''), { ok: true, value: null });
  assert.deepEqual(parseDay(null), { ok: true, value: null });
  assert.deepEqual(parseDay('2026-10-06'), { ok: true, value: '2026-10-06' });
  assert.deepEqual(parseDay('2026-10-06T14:30:00Z'), { ok: true, value: '2026-10-06T14:30:00Z' });
  assert.deepEqual(parseDay('2026-10-06T14:30Z'), { ok: true, value: '2026-10-06T14:30:00Z' });
  for (const bad of ['2026-02-30', '2026-13-01', '06/10/2026', 'tomorrow', '2026-10-06T25:00:00Z', '2026-10-06T10:00:00+01:00', '1999-01-01', '2026-10-6', 12345])
    assert.equal(parseDay(bad).ok, false, String(bad));
});

test('autoPriority: late or due today = urgent, within 7 days = soon, otherwise planned', () => {
  assert.equal(autoPriority(null, NOW), 'planned');
  assert.equal(autoPriority('2026-09-28', NOW), 'urgent');
  assert.equal(autoPriority('2026-10-01', NOW), 'urgent');
  assert.equal(autoPriority('2026-10-02', NOW), 'soon');
  assert.equal(autoPriority('2026-10-08', NOW), 'soon');
  assert.equal(autoPriority('2026-10-10', NOW), 'planned');
  assert.equal(autoPriority('2026-10-20T10:00:00Z', NOW), 'planned');
});

test('validateNewTask: trims, cleans, fills in the priority and the source', () => {
  const r = validateNewTask({ title: '  Send  the quote \u0007 ', detail: 'a\r\nb', due_at: '2026-10-03' }, NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { title: 'Send the quote', detail: 'a\nb', source: 'Manual', job_id: null, priority: 'soon', due_at: '2026-10-03', chase_at: null });
  const w = validateNewTask({ title: 'Waiting on drawings', priority: 'waiting', chase_at: '2026-10-05' }, NOW);
  assert.equal(w.value.priority, 'waiting'); assert.equal(w.value.chase_at, '2026-10-05');
  assert.equal(validateNewTask({ title: 'x', priority: 'auto' }, NOW).value.priority, 'planned');
  assert.equal(validateNewTask({ title: 'x', priority: '' }, NOW).value.priority, 'planned');
});

test('validateNewTask: refuses an empty title, a too-long title, bad dates, bad priority or source', () => {
  assert.deepEqual(Object.keys(validateNewTask({ title: '   ' }).fields), ['title']);
  assert.deepEqual(Object.keys(validateNewTask({}).fields), ['title']);
  assert.ok(validateNewTask({ title: 'x'.repeat(MAX_TASK.title + 1) }).fields.title);
  assert.ok(validateNewTask({ title: 'x', due_at: '31/12/2026' }).fields.due_at);
  assert.ok(validateNewTask({ title: 'x', chase_at: 'soon' }).fields.chase_at);
  assert.ok(validateNewTask({ title: 'x', priority: 'done' }).fields.priority);     // done is a status, not a priority
  assert.ok(validateNewTask({ title: 'x', priority: 'critical' }).fields.priority);
  assert.ok(validateNewTask({ title: 'x', source: 'Somewhere' }).fields.source);
  const many = validateNewTask({ title: '', due_at: 'x', priority: 'q' });
  assert.deepEqual(Object.keys(many.fields).sort(), ['due_at', 'priority', 'title']);
});

test('validateNewTask: ignores fields it should not take (id, status, auto_rule, done_at)', () => {
  const r = validateNewTask({ title: 'x', id: 99, status: 'done', auto_rule: 'overdue_invoice', done_at: '2026-01-01', created_at: 'x' }, NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.value).sort(), ['chase_at', 'detail', 'due_at', 'job_id', 'priority', 'source', 'title']);
});

test('validateTaskUpdate: status open/done, priority, due and chase dates; nothing else, nothing empty', () => {
  assert.deepEqual(validateTaskUpdate({ status: 'done' }), { ok: true, value: { status: 'done' } });
  assert.deepEqual(validateTaskUpdate({ status: 'open', priority: 'urgent', due_at: '2026-10-09', chase_at: '' }).value, { status: 'open', priority: 'urgent', due_at: '2026-10-09', chase_at: null });
  assert.deepEqual(validateTaskUpdate({ due_at: '' }).value, { due_at: null });   // clearing the date
  assert.ok(validateTaskUpdate({ status: 'archived' }).fields.status);
  assert.ok(validateTaskUpdate({ priority: 'done' }).fields.priority);
  assert.ok(validateTaskUpdate({ due_at: '2026-02-31' }).fields.due_at);
  assert.ok(validateTaskUpdate({}).fields._);
  assert.ok(validateTaskUpdate({ title: 'renamed', id: 4 }).fields._);   // title and id cannot be changed this way
  assert.ok(validateTaskUpdate(null).fields._);
});
