/* /asa and /asa/* — proxies to the existing asa-surprise.vercel.app deployment (same routes vercel.json used).
   _redirects cannot proxy to external hosts on Pages, so this function does it, and adds the noindex header. */
const TARGET = 'https://asa-surprise.vercel.app';

export async function onRequest({ request, params }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const rest = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const url = new URL(`${TARGET}/${rest || 'index.html'}`);
  url.search = new URL(request.url).search;

  const upstream = await fetch(url, { method: request.method, headers: { accept: request.headers.get('accept') || '*/*' }, redirect: 'manual' });
  const headers = new Headers(upstream.headers);
  headers.set('x-robots-tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  headers.delete('content-security-policy'); // the upstream CSP is written for its own origin
  return new Response(upstream.body, { status: upstream.status, headers });
}
