// Folio sync endpoint — stores end-to-end encrypted snapshots in a private Vercel Blob store.
// The server never sees the password or the plaintext: the client sends an opaque id (SHA-256)
// and AES-GCM ciphertext. Requires a Blob store connected to the project (private access).
import { get, put } from '@vercel/blob';

const ID_RE = /^[a-f0-9]{64}$/;
const FILE_RE = /^(txt|pdf)-[a-z0-9]{6,40}$/;
const MAX = 4.4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const ready = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

function target(url) {
  const id = url.searchParams.get('id') || '';
  const f = url.searchParams.get('f') || '';
  if (!ID_RE.test(id)) return null;
  if (f && !FILE_RE.test(f)) return null;
  return f ? `folio/${id}/f/${f}.bin` : `folio/${id}/data.json`;
}

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.has('ping')) return json({ ok: true, ready: ready() });
  if (!ready()) return json({ error: 'storage-not-connected' }, 503);
  const path = target(url);
  if (!path) return json({ error: 'bad-request' }, 400);
  try {
    const res = await get(path, { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200) return json({ error: 'not-found' }, 404);
    return new Response(res.stream, { status: 200, headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-folio-etag': String(res.blob.etag || '').replace(/^W\//, '') } });
  } catch (e) {
    if (e?.name === 'BlobNotFoundError' || /not.?found/i.test(String(e?.message))) return json({ error: 'not-found' }, 404);
    return json({ error: 'read-failed' }, 500);
  }
}

export async function PUT(request) {
  if (!ready()) return json({ error: 'storage-not-connected' }, 503);
  const url = new URL(request.url);
  const path = target(url);
  if (!path) return json({ error: 'bad-request' }, 400);
  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX) return json({ error: 'too-large' }, 413);
  const rawMatch = request.headers.get('if-match');
  const ifMatch = rawMatch ? `"${rawMatch.replace(/^W\//, '').replace(/"/g, '')}"` : undefined;
  try {
    const r = await put(path, Buffer.from(body), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true,
      contentType: 'application/octet-stream', cacheControlMaxAge: 60,
      ...(ifMatch ? { ifMatch } : {}),
    });
    return json({ ok: true, etag: r.etag });
  } catch (e) {
    if (e?.name === 'BlobPreconditionFailedError' || /precondition|etag mismatch/i.test(String(e?.message))) return json({ error: 'conflict' }, 412);
    return json({ error: 'write-failed', detail: String(e?.message || e).slice(0, 200) }, 500);
  }
}
