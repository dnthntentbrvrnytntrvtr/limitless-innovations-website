/* Header photos for the desk: the project picture behind each page title.

   The pictures live in the R2 bucket "limitless-site-files" (binding DESK_FILES), under header-photos/.
   They are stored exactly as uploaded (no recompression) and only ever sent through the Worker, after the
   desk login. The point of the picture that stays in view when it is cropped to a wide band (the "focus
   point") is kept on the stored file as custom metadata, so there is no extra table to maintain.

   This file holds the pure parts (names, file checks, focus points: unit-tested) and the small R2 calls. */

export const PREFIX = 'header-photos/';
export const MAX_BYTES = 12 * 1024 * 1024;   // 12 MB per photo
export const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// The eight project photos, so uploading a file with one of these names picks up its title and focus point.
// focus = where to centre the crop, in percent from the left and from the top.
export const SEED = {
  'bloomberg-london':           { title: 'Bloomberg London',    place: 'Cannon Street',            x: 50, y: 42 },
  '25-moorgate':                { title: '25 Moorgate',         place: 'City of London',           x: 50, y: 38 },
  'one-canada-square':          { title: 'One Canada Square',   place: 'Level 43, Canary Wharf',   x: 50, y: 14 },
  'vantage-data-centre':        { title: 'Vantage Data Centre', place: 'London',                   x: 50, y: 45 },
  'vantage-data-centre-aerial': { title: 'Vantage Data Centre', place: 'London, from above',       x: 50, y: 60 },
  'locke-wood-wharf':           { title: 'Locke at Wood Wharf', place: 'Canary Wharf',             x: 50, y: 35 },
  'apple-battersea':            { title: 'Apple Battersea',     place: 'Battersea Power Station',  x: 50, y: 33 },
  'silvertown-tunnel':          { title: 'Silvertown Tunnel',   place: 'Silvertown',               x: 50, y: 62 }
};

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;
const FILE_RE = /^([a-z0-9][a-z0-9-]{0,60})\.(jpg|png|webp)$/;

// "Apple Battersea (2).JPG" -> { name: 'apple-battersea-2', ext: 'jpg' }, or null if it isn't a jpg, png or webp name.
export function nameFromFilename(filename) {
  const m = /^(.*)\.(jpe?g|png|webp)$/i.exec(String(filename || '').trim().split(/[\\/]/).pop());
  if (!m) return null;
  const ext = m[2].toLowerCase() === 'jpeg' ? 'jpg' : m[2].toLowerCase();
  const name = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  return NAME_RE.test(name) ? { name, ext } : null;
}
export const validName = n => NAME_RE.test(String(n || ''));
export const parseFile = f => { const m = FILE_RE.exec(String(f || '')); return m ? { name: m[1], ext: m[2] } : null; };
export const keyFor = (name, ext) => PREFIX + name + '.' + ext;

// What kind of picture the first bytes say it is ('jpg', 'png', 'webp') or null. Never trusts the file name or header.
export function sniffImage(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) return 'png';
  if (b.length >= 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP') return 'webp';
  return null;
}

const pct = v => { const n = Number(v); return v !== '' && v != null && isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null; };
export function parseFocus(x, y) { const a = pct(x), b = pct(y); return a === null || b === null ? null : { x: a, y: b }; }

export function titleFromName(name) { return String(name).split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' '); }

// What the desk page needs to show one photo.
export function describe(obj) {
  const f = parseFile(obj.key.slice(PREFIX.length));
  if (!f) return null;
  const seed = SEED[f.name] || {};
  const meta = obj.customMetadata || {};
  const focus = parseFocus(meta.focusX, meta.focusY) || (seed.x != null ? { x: seed.x, y: seed.y } : { x: 50, y: 50 });
  return { name: f.name, file: f.name + '.' + f.ext, title: seed.title || titleFromName(f.name), place: seed.place || '', x: focus.x, y: focus.y, custom: !!parseFocus(meta.focusX, meta.focusY),
    size: obj.size, v: obj.uploaded ? new Date(obj.uploaded).getTime() : 0 };
}

/* ---- R2 calls (bucket = env.DESK_FILES) ---- */
export async function listPhotos(bucket) {
  const out = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix: PREFIX, limit: 200, cursor, include: ['customMetadata'] });
    for (const o of page.objects) { const d = describe(o); if (d) out.push(d); }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Keep one file per name: remove the same name in the other formats.
async function dropOthers(bucket, name, keepExt) {
  const old = Object.keys(TYPES).filter(e => e !== keepExt).map(e => keyFor(name, e));
  if (old.length) await bucket.delete(old);
}

// bytes: ArrayBuffer of the picture exactly as uploaded. Returns { ok, photo } or { ok:false, status, error }.
export async function savePhoto(bucket, filename, bytes) {
  if (!bytes || !bytes.byteLength) return { ok: false, status: 400, error: 'No file received.' };
  if (bytes.byteLength > MAX_BYTES) return { ok: false, status: 413, error: 'That picture is over 12 MB. Use a smaller file.' };
  const n = nameFromFilename(filename);
  if (!n) return { ok: false, status: 400, error: 'Use a .jpg, .png or .webp file.' };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, status: 400, error: 'That file is not a jpg, png or webp picture.' };
  const key = keyFor(n.name, kind);   // the real format decides the extension, whatever the file was called
  const existing = (await bucket.list({ prefix: PREFIX + n.name + '.', limit: 5, include: ['customMetadata'] })).objects.find(o => parseFile(o.key.slice(PREFIX.length)));
  const customMetadata = {};
  if (existing && existing.customMetadata && parseFocus(existing.customMetadata.focusX, existing.customMetadata.focusY)) {   // replacing a picture keeps its focus point
    customMetadata.focusX = existing.customMetadata.focusX; customMetadata.focusY = existing.customMetadata.focusY;
  }
  await bucket.put(key, bytes, { httpMetadata: { contentType: TYPES[kind] }, customMetadata });
  await dropOthers(bucket, n.name, kind);
  const head = await bucket.head(key);
  return { ok: true, photo: describe(head) };
}

// Change the focus point: the picture's bytes are copied back unchanged with new metadata.
export async function setFocus(bucket, name, x, y) {
  const f = parseFocus(x, y);
  if (!validName(name) || !f) return { ok: false, status: 400, error: 'invalid' };
  const found = (await bucket.list({ prefix: PREFIX + name + '.', limit: 5 })).objects.find(o => parseFile(o.key.slice(PREFIX.length)));
  if (!found) return { ok: false, status: 404, error: 'No such photo.' };
  const obj = await bucket.get(found.key);
  if (!obj) return { ok: false, status: 404, error: 'No such photo.' };
  const bytes = await obj.arrayBuffer();
  await bucket.put(found.key, bytes, { httpMetadata: { contentType: (obj.httpMetadata && obj.httpMetadata.contentType) || TYPES[parseFile(found.key.slice(PREFIX.length)).ext] }, customMetadata: { focusX: String(f.x), focusY: String(f.y) } });
  return { ok: true, photo: describe(await bucket.head(found.key)) };
}

export async function deletePhoto(bucket, name) {
  if (!validName(name)) return { ok: false, status: 400, error: 'invalid' };
  await bucket.delete(Object.keys(TYPES).map(e => keyFor(name, e)));
  return { ok: true };
}
