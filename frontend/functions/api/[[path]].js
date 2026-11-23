// Cloudflare Pages Functions: same-origin proxy for Spring Boot API.
// Do not cache API responses or expose backend credentials.
const BACKEND = 'https://hajara-ilm-academy-backend.onrender.com';
export async function onRequest({ request }) {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/')) {
    return new Response('Not found', { status: 404 });
  }
  const upstream = new URL(incoming.pathname + incoming.search, BACKEND);
  const headers = new Headers(request.headers);
  // Browser Origin refers to Cloudflare. Backend must see an allowed origin.
  if (headers.has('Origin')) headers.set('Origin', BACKEND);
  headers.delete('Host');
  headers.delete('X-Forwarded-Host');
  headers.delete('X-Forwarded-Proto');
  headers.delete('X-Forwarded-For');
  headers.delete('CF-Connecting-IP');
  let response;
  try {
    response = await fetch(upstream.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(55000),
  });
  } catch {
    return new Response(JSON.stringify({ message: 'Server is starting or temporarily unavailable. Please retry.' }), {
      status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '10' },
    });
  }
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Cache-Control', 'no-store');
  // Spring should issue host-only cookies. Do not forward backend-domain cookies.
  const cookies = response.headers.getSetCookie?.() || [];
  if (cookies.length) {
    responseHeaders.delete('Set-Cookie');
    for (const cookie of cookies) {
      const normalized = cookie.replace(/;\s*Domain=[^;]*/gi, '');
      responseHeaders.append('Set-Cookie', normalized);
    }
  }
  // Avoid backend redirects to the Render domain.
  const location = responseHeaders.get('Location');
  if (location) {
    const redirect = new URL(location, BACKEND);
    if (redirect.origin === BACKEND) responseHeaders.set('Location', redirect.pathname + redirect.search + redirect.hash);
  }
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}
