// Folio AI endpoint — forwards requests to the Claude API with the key kept on the server.
// Env vars (Vercel → Project → Settings → Environment Variables):
//   ANTHROPIC_API_KEY  required — from console.anthropic.com
//   FOLIO_ACCESS_CODE  recommended — the app must send this code, so strangers can't spend your credits
const MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function GET(request) {
  const url = new URL(request.url);
  const code = process.env.FOLIO_ACCESS_CODE || '';
  const sent = request.headers.get('x-folio-code') || url.searchParams.get('code') || '';
  return json({ ready: !!process.env.ANTHROPIC_API_KEY, needsCode: !!code, codeOk: !code || sent === code });
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'no-api-key' }, 503);
  const code = process.env.FOLIO_ACCESS_CODE || '';
  if (code && request.headers.get('x-folio-code') !== code) return json({ error: 'bad-access-code' }, 401);

  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'bad-json' }, 400); }
  const model = MODELS.has(body.model) ? body.model : 'claude-sonnet-5-5';
  const payload = {
    model,
    max_tokens: Math.min(Number(body.max_tokens) || 4096, 16000),
    system: body.system,
    messages: body.messages,
    stream: !!body.stream,
  };

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload),
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    let msg = '';
    try { msg = JSON.parse(detail)?.error?.message || ''; } catch (_) {}
    return json({ error: `claude-${upstream.status}`, detail: (msg || detail).slice(0, 300) }, upstream.status);
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { 'content-type': payload.stream ? 'text/event-stream' : 'application/json', 'cache-control': 'no-store' },
  });
}
