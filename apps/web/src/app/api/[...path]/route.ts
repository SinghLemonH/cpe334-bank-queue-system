export const dynamic = 'force-dynamic';

async function forward(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${process.env.API_BASE_URL}/api/${path.join('/')}${url.search}`;
  const headers = new Headers(req.headers);
  headers.delete('host');
  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
    redirect: 'manual',
    cache: 'no-store',
  });
  const out = new Headers(res.headers);
  out.delete('content-encoding');
  out.delete('content-length');
  return new Response(res.body, { status: res.status, headers: out });
}
export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
