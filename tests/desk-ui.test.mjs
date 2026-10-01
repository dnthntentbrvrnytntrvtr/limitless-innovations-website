import test from 'node:test';
import assert from 'node:assert/strict';
import { ui, DESK_UI_CLIENT, makeDeskUI } from '../worker/desk-ui.js';

const { timeBar, formatDuration, pill, dot, TimeBar } = ui;
const DAY = 86400000, HOUR = 3600000;
const T0 = Date.parse('2026-10-01T12:00:00Z');
const at = (ms) => new Date(T0 + ms).toISOString();

test('formatDuration: hours under 48 h, days above, singular, small values', () => {
  assert.equal(formatDuration(3 * HOUR), '3 h');
  assert.equal(formatDuration(47 * HOUR), '47 h');
  assert.equal(formatDuration(48 * HOUR), '2 days');
  assert.equal(formatDuration(DAY * 12.9, 'days'), '12 days');
  assert.equal(formatDuration(DAY * 1.4, 'days'), '1 day');
  assert.equal(formatDuration(5 * HOUR, 'days'), 'less than a day');
  assert.equal(formatDuration(-40 * 60000), '40 min');
  assert.equal(formatDuration(1000), 'under a minute');
  assert.equal(formatDuration(30 * HOUR, 'hours'), '30 h');
});

test('remaining: "12 days left", fraction = time left / total, amber only in the last 7 days', () => {
  const r = timeBar(at(-18 * DAY), at(12 * DAY), T0, 'remaining');
  assert.equal(r.label, '12 days left');
  assert.equal(r.fraction, 0.4);
  assert.equal(r.fill, 40);
  assert.equal(r.state, 'done');           // plenty left: green
  assert.equal(timeBar(at(-25 * DAY), at(5 * DAY), T0, 'remaining').state, 'soon');
  assert.equal(timeBar(at(-25 * DAY), at(5 * DAY), T0, 'remaining').label, '5 days left');
});

test('remaining, invoice: "32 days late" is red and full', () => {
  const r = timeBar(at(-62 * DAY), at(-32 * DAY), T0, 'remaining');
  assert.equal(r.label, '32 days late');
  assert.equal(r.state, 'urgent');
  assert.equal(r.fill, 100);
  assert.equal(r.over, true);
  assert.equal(timeBar(at(-10 * DAY), at(4 * DAY), T0, 'remaining', { showTotal: true }).label, '4 days left of 14 days');
});

test('remaining, certificate preset: red at 7 days or expired, amber at 30, green beyond', () => {
  const o = { preset: 'certificate' };
  const left = d => timeBar(at(-300 * DAY), at(d * DAY), T0, 'remaining', o);
  assert.equal(left(200).state, 'done');
  assert.equal(left(30).state, 'soon');
  assert.equal(left(31).state, 'done');
  assert.equal(left(7).state, 'urgent');
  assert.equal(left(8).state, 'soon');
  assert.equal(left(-3).state, 'urgent');
  assert.equal(timeBar(at(-300 * DAY), at(-3 * DAY), T0, 'remaining', { preset: 'certificate', pastWord: 'expired' }).label, 'Expired 3 days ago');
});

test('elapsed, step limit: "3 h over the 24 h limit", amber from 60 % used, red at the limit', () => {
  const o = { unit: 'hours' };
  const hrs = h => timeBar(at(-h * HOUR), at((24 - h) * HOUR), T0, 'elapsed', o);
  assert.equal(hrs(27).label, '3 h over the 24 h limit');
  assert.equal(hrs(27).state, 'urgent');
  assert.equal(hrs(27).fill, 100);
  assert.equal(hrs(3).label, '21 h left');
  assert.equal(hrs(3).state, 'planned');
  assert.equal(hrs(3).fraction, 0.125);
  assert.equal(hrs(15).state, 'soon');          // 62.5 % used
  assert.equal(hrs(14).state, 'planned');       // 58 % used
  assert.equal(timeBar(at(-3 * HOUR), at(21 * HOUR), T0, 'elapsed', { unit: 'hours', showTotal: true }).label, '21 h left of 24 h');
});

test('elapsed, task due date preset: red when late or inside the last day, amber within 7 days, blue beyond', () => {
  const o = { preset: 'due', unit: 'days' };
  const due = d => timeBar(at(-2 * DAY), at(d * DAY), T0, 'elapsed', o);
  assert.equal(due(20).state, 'planned');
  assert.equal(due(7).state, 'soon');
  assert.equal(due(3).label, '3 days left');
  assert.equal(due(0.4).label, 'less than a day left');
  assert.equal(due(-1).state, 'urgent');
  assert.equal(timeBar(at(-2 * DAY), at(-1 * DAY), T0, 'elapsed', { preset: 'due', unit: 'days', pastWord: 'late' }).label, '1 day late');
});

test('elapsed, deadline preset (colour by time left, not by share used)', () => {
  const o = { preset: 'deadline', unit: 'days' };
  const d = n => timeBar(at(-300 * DAY), at(n * DAY), T0, 'elapsed', o);
  assert.equal(d(100).state, 'done');
  assert.equal(d(60).state, 'soon');
  assert.equal(d(14).state, 'urgent');
});

test('usage: "2,130 of 3,000" with amber at 70 % and red at 90 %, and the over-the-limit case', () => {
  const u = (used, limit, o) => timeBar(0, limit, used, 'usage', o);
  assert.equal(u(2130, 3000).label, '2,130 of 3,000');
  assert.equal(u(2130, 3000).state, 'soon');       // 71 %
  assert.equal(u(2130, 3000).fill, 71);
  assert.equal(u(1000, 3000).state, 'planned');
  assert.equal(u(2700, 3000).state, 'urgent');
  assert.equal(u(3400, 3000).label, '3,400 of 3,000 (400 over)');
  assert.equal(u(3400, 3000).fill, 100);
  assert.equal(u(3.4, 10, { suffix: ' GB' }).label, '3.4 of 10 GB');
  assert.equal(u(0, 3000).fill, 0);
  assert.equal(u(2400, 3000, { soonFrac: 0.8 }).state, 'soon');   // VAT style: warn from 80 %
});

test('edge cases: no date, bad dates, zero length, finished things, tiny share still shows a sliver', () => {
  assert.equal(timeBar(null, null, T0, 'remaining').state, 'waiting');
  assert.equal(timeBar(null, null, T0, 'remaining').label, 'No date set');
  assert.equal(timeBar('nonsense', at(DAY), T0, 'remaining', { emptyLabel: 'Date missing' }).label, 'Date missing');
  assert.equal(timeBar(at(0), at(0), T0, 'remaining').over, false);
  assert.equal(timeBar(at(0), at(0), T0, 'remaining').label, 'due now');
  assert.equal(timeBar(at(-DAY), at(-DAY), T0, 'elapsed').fill, 100);
  const done = timeBar(at(-DAY), at(DAY), T0, 'remaining', { done: true, doneLabel: 'Paid on time' });
  assert.deepEqual([done.state, done.label, done.fill], ['done', 'Paid on time', 100]);
  assert.equal(timeBar(at(-1000 * DAY), at(DAY), T0, 'remaining').fill, 3);   // 0.1 % left still draws a 3 % sliver
  assert.equal(timeBar(new Date(T0 - DAY), new Date(T0 + DAY), T0 + 0, 'remaining').label, '24 h left');   // Date objects and numbers work too
  assert.equal(timeBar(T0 - DAY, T0 + 10 * DAY, T0, 'remaining').label, '10 days left');
});

test('HTML: pills and bars carry words as well as colour, and escape their text', () => {
  for (const k of ['urgent', 'soon', 'planned', 'waiting', 'done']) {
    const h = pill(k);
    assert.match(h, new RegExp('pri-' + k));
    assert.match(h, new RegExp('>' + ui.PRIORITIES[k].label + '<'));
    assert.match(dot(k), new RegExp('class="sr">' + ui.PRIORITIES[k].label));
  }
  assert.match(pill('nonsense'), /pri-planned/);
  const bar = TimeBar(at(-18 * DAY), at(12 * DAY), T0, 'remaining');
  assert.match(bar, /class="tb tb-done"/);
  assert.match(bar, /<span class="tb-label">12 days left<\/span>/);
  assert.match(bar, /width:40%/);
  assert.equal(ui.esc('<b>"x"&'), '&lt;b&gt;&quot;x&quot;&amp;');
});

test('the browser copy of the code behaves exactly like the Worker copy', () => {
  const UI = new Function(DESK_UI_CLIENT + '; return UI;')();
  for (const args of [
    [at(-18 * DAY), at(12 * DAY), T0, 'remaining'],
    [at(-27 * HOUR), at(-3 * HOUR), T0, 'elapsed', { unit: 'hours' }],
    [0, 3000, 2130, 'usage']
  ]) assert.deepEqual(UI.timeBar(...args), timeBar(...args));
  assert.equal(UI.pill('urgent'), pill('urgent'));
  assert.equal(typeof makeDeskUI().timeBar, 'function');
});

test('the page copy of the UI helpers defines __name first (Cloudflare bundling with keep_names adds __name calls)', () => {
  assert.match(DESK_UI_CLIENT, /^var __name = /);
  const withCalls = DESK_UI_CLIENT.replace('const UI = (', 'const probe = __name(() => 1, "probe"); probe();\nconst UI = (');
  assert.doesNotThrow(() => new Function(withCalls + '; return UI;')());
});
