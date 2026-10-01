import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../worker/photos.js';

test('nameFromFilename: tidy names, jpeg becomes jpg, other types refused', () => {
  assert.deepEqual(P.nameFromFilename('bloomberg-london.jpg'), { name: 'bloomberg-london', ext: 'jpg' });
  assert.deepEqual(P.nameFromFilename('Apple Battersea (2).JPEG'), { name: 'apple-battersea-2', ext: 'jpg' });
  assert.deepEqual(P.nameFromFilename('C:\\Users\\me\\Pictures\\25-Moorgate.webp'), { name: '25-moorgate', ext: 'webp' });
  assert.deepEqual(P.nameFromFilename('../../etc/passwd.png'), { name: 'passwd', ext: 'png' });
  for (const bad of ['notes.txt', 'photo.gif', 'photo', '.jpg', '!!!.jpg', '', null, 'x.jpg.exe', 'photo.svg']) assert.equal(P.nameFromFilename(bad), null, String(bad));
  assert.ok(P.nameFromFilename('a'.repeat(200) + '.jpg').name.length <= 60);
});

test('parseFile / validName only let safe names through', () => {
  assert.deepEqual(P.parseFile('vantage-data-centre-aerial.jpg'), { name: 'vantage-data-centre-aerial', ext: 'jpg' });
  for (const bad of ['../x.jpg', 'a/b.jpg', 'A.jpg', 'x.gif', 'x.jpg/', '-x.jpg', 'x.jpg?v=1', '', undefined]) assert.equal(P.parseFile(bad), null, String(bad));
  assert.equal(P.validName('apple-battersea'), true);
  for (const bad of ['', '../x', 'A', 'x.jpg', '-x', 'a'.repeat(62)]) assert.equal(P.validName(bad), false, bad);
});

test('sniffImage reads the real format from the first bytes, not the name', () => {
  assert.equal(P.sniffImage(Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0])), 'jpg');
  assert.equal(P.sniffImage(Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0])), 'png');
  assert.equal(P.sniffImage(new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')), 'webp');
  assert.equal(P.sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(P.sniffImage(new TextEncoder().encode('GIF89a......')), null);
  assert.equal(P.sniffImage(new Uint8Array(0)), null);
  assert.equal(P.sniffImage(new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WAVEfmt ')), null);
});

test('parseFocus clamps to 0-100 and refuses non-numbers', () => {
  assert.deepEqual(P.parseFocus(50, 40), { x: 50, y: 40 });
  assert.deepEqual(P.parseFocus('12.6', '99.4'), { x: 13, y: 99 });
  assert.deepEqual(P.parseFocus(-5, 140), { x: 0, y: 100 });
  for (const [a, b] of [['', 5], [5, null], ['x', 5], [undefined, undefined], [Infinity, 5]]) assert.equal(P.parseFocus(a, b), null);
});

test('the eight seeded names carry titles and focus points, and describe() uses them', () => {
  const names = ['bloomberg-london', '25-moorgate', 'one-canada-square', 'vantage-data-centre', 'vantage-data-centre-aerial', 'locke-wood-wharf', 'apple-battersea', 'silvertown-tunnel'];
  assert.deepEqual(Object.keys(P.SEED).sort(), names.slice().sort());
  for (const n of names) { const s = P.SEED[n]; assert.ok(s.title && s.place && s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100, n); }
  const d = P.describe({ key: 'header-photos/locke-wood-wharf.jpg', size: 3948547, uploaded: new Date('2026-10-01T10:00:00Z') });
  assert.equal(d.title, 'Locke at Wood Wharf'); assert.equal(d.file, 'locke-wood-wharf.jpg'); assert.deepEqual([d.x, d.y, d.custom], [P.SEED['locke-wood-wharf'].x, P.SEED['locke-wood-wharf'].y, false]);
  const c = P.describe({ key: 'header-photos/locke-wood-wharf.jpg', size: 1, customMetadata: { focusX: '20', focusY: '70' } });
  assert.deepEqual([c.x, c.y, c.custom], [20, 70, true]);
  const u = P.describe({ key: 'header-photos/my-new-site.png', size: 1 });
  assert.deepEqual([u.title, u.place, u.x, u.y], ['My New Site', '', 50, 50]);
  assert.equal(P.describe({ key: 'header-photos/readme.txt', size: 1 }), null);
});

// A tiny in-memory stand-in for an R2 bucket, enough for the save / focus / delete calls.
function fakeBucket() {
  const m = new Map();
  return {
    m,
    async put(key, bytes, o) { m.set(key, { bytes, httpMetadata: o.httpMetadata, customMetadata: o.customMetadata || {}, uploaded: new Date() }); },
    async head(key) { const o = m.get(key); return o && { key, size: o.bytes.byteLength, customMetadata: o.customMetadata, uploaded: o.uploaded }; },
    async get(key) { const o = m.get(key); return o && { ...o, key, arrayBuffer: async () => o.bytes }; },
    async list({ prefix }) { return { objects: [...m].filter(([k]) => k.startsWith(prefix)).map(([key, o]) => ({ key, size: o.bytes.byteLength, customMetadata: o.customMetadata, uploaded: o.uploaded })), truncated: false }; },
    async delete(keys) { for (const k of [].concat(keys)) m.delete(k); }
  };
}
const jpeg = n => { const b = new Uint8Array(n); b.set([0xFF, 0xD8, 0xFF, 0xE0]); return b.buffer; };

test('savePhoto: stores the bytes unchanged under the right key, refuses bad files', async () => {
  const b = fakeBucket();
  const bytes = jpeg(5000);
  const r = await P.savePhoto(b, 'Bloomberg London.JPG', bytes);
  assert.equal(r.ok, true);
  assert.equal(r.photo.file, 'bloomberg-london.jpg'); assert.equal(r.photo.title, 'Bloomberg London');
  assert.equal(b.m.get('header-photos/bloomberg-london.jpg').bytes, bytes);   // the very same bytes, no recompression
  assert.equal(b.m.get('header-photos/bloomberg-london.jpg').httpMetadata.contentType, 'image/jpeg');
  assert.equal((await P.savePhoto(b, 'x.jpg', jpeg(P.MAX_BYTES + 1))).status, 413);
  assert.equal((await P.savePhoto(b, 'x.jpg', new ArrayBuffer(0))).status, 400);
  assert.equal((await P.savePhoto(b, 'x.gif', jpeg(10))).status, 400);
  assert.equal((await P.savePhoto(b, 'fake.jpg', new TextEncoder().encode('<script>alert(1)</script>').buffer)).status, 400);
  assert.equal(b.m.size, 1);
});

test('savePhoto: the real format decides the extension, one file per name, a replaced picture keeps its focus point', async () => {
  const b = fakeBucket();
  await P.savePhoto(b, 'site.jpg', jpeg(100));
  await P.setFocus(b, 'site', 30, 80);
  const png = new Uint8Array(100); png.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const r = await P.savePhoto(b, 'site.jpg', png.buffer);   // a png called .jpg
  assert.equal(r.photo.file, 'site.png');
  assert.deepEqual([...b.m.keys()], ['header-photos/site.png']);
  assert.deepEqual([r.photo.x, r.photo.y], [30, 80]);
});

test('setFocus and deletePhoto', async () => {
  const b = fakeBucket();
  await P.savePhoto(b, 'a.jpg', jpeg(100));
  const f = await P.setFocus(b, 'a', '25', '75');
  assert.deepEqual([f.ok, f.photo.x, f.photo.y, f.photo.custom], [true, 25, 75, true]);
  assert.equal((await P.setFocus(b, 'a', 'x', 1)).status, 400);
  assert.equal((await P.setFocus(b, '../a', 1, 1)).status, 400);
  assert.equal((await P.setFocus(b, 'missing', 1, 1)).status, 404);
  assert.equal((await P.deletePhoto(b, '../a')).status, 400);
  assert.equal((await P.deletePhoto(b, 'a')).ok, true);
  assert.equal(b.m.size, 0);
  assert.deepEqual(await P.listPhotos(b), []);
});
