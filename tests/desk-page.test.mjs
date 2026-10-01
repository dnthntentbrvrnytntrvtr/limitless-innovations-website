import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DESK_HTML, LOGIN_HTML } from '../worker/desk.js';
import { STYLE, TOKENS } from '../worker/desk-style.js';
import { NAV } from '../worker/desk-client.js';

const script = DESK_HTML.match(/<script>([\s\S]*)<\/script>/)[1];

test('the desk page script is valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(script, { filename: 'desk-page-script.js' }));
});

test('no outside hosts, no orange/terracotta, only defined colour variables', () => {
  for (const page of [DESK_HTML, LOGIN_HTML]) {
    assert.doesNotMatch(page, /googleapis|gstatic/);
    assert.doesNotMatch(page, /#b9623f|#d3c9b8|#f0a08a|terracotta|--accent|--stone|--steel|--ink|--panel-2|--muted\b/i);
  }
  const defined = new Set([...TOKENS.matchAll(/(--[a-z0-9-]+):/g)].map(m => m[1]).concat(['--c', '--bg', '--bd']));
  const used = [...new Set([...(STYLE + script).matchAll(/var\((--[a-z0-9-]+)\)/g)].map(m => m[1]))];
  assert.deepEqual(used.filter(v => !defined.has(v)), []);
});

test('every font file the stylesheet names exists in /fonts, with licences', () => {
  const files = [...STYLE.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map(m => m[1]);
  assert.equal(files.length, 5);
  for (const f of files) assert.ok(fs.statSync(new URL('../fonts/' + f, import.meta.url)).size > 5000, f);
  assert.ok(fs.existsSync(new URL('../fonts/OFL-SourceSerif4.txt', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../fonts/OFL-IBMPlexMono.txt', import.meta.url)));
  assert.match(TOKENS, /--font-ui: 'Source Serif 4', Georgia, serif/);
  assert.match(TOKENS, /--font-num: 'IBM Plex Mono'/);
});

test('the sidebar has the groups of SPEC section 4, and the old tabs have a home', () => {
  assert.deepEqual(NAV.map(g => g.group), ['Daily', 'Work', 'Money', 'Website shop', 'Company']);
  const labels = NAV.map(g => g.items.map(i => i.label));
  assert.deepEqual(labels, [['Today', 'Tasks'], ['Jobs', 'Quotes', 'Drawings & pins'], ['Invoices', 'Accounts'], ['Orders', 'Products & prices', 'Enquiries', 'Visitors'], ['Compliance', 'People', 'Company admin', 'Settings']]);
  const ids = Object.fromEntries(NAV.flatMap(g => g.items).map(i => [i.id, i]));
  for (const id of ['orders', 'suppliers', 'messages', 'visitors']) assert.ok(ids[id] && !ids[id].phase, id + ' keeps its old route and works now');
  for (const id of ['jobs', 'quotes', 'drawings', 'invoices', 'accounts', 'compliance', 'people', 'company']) assert.ok(ids[id].phase >= 4 && ids[id].about, id);
  assert.match(DESK_HTML, /href="#orders"/);
  assert.match(DESK_HTML, /id="cnt-messages"/);
});

test('old hash links still route: #orders/12, #orders/new, #orders/12/edit, #messages/5, #suppliers, #visitors', () => {
  const re = new RegExp(script.match(/location\.hash\.match\((\/.*\/)\)/)[1].slice(1, -1));
  const ok = (h, id, arg, edit) => { const m = h.match(re); assert.ok(m, h); assert.deepEqual([m[1], m[2], m[3]], [id, arg, edit], h); };
  ok('#orders/12', 'orders', '12', undefined);
  ok('#orders/new', 'orders', 'new', undefined);
  ok('#orders/12/edit', 'orders', '12', 'edit');
  ok('#messages/5', 'messages', '5', undefined);
  ok('#suppliers', 'suppliers', undefined, undefined);
  ok('#visitors', 'visitors', undefined, undefined);
  ok('#tasks/new', 'tasks', 'new', undefined);
  assert.equal('#orders/12/delete'.match(re), null);
});
