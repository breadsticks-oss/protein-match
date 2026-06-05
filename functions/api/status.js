// ─────────────────────────────────────────────
//  Protein Match — Cloudflare Pages Function
//  Route: /api/status
//
//  Health-check endpoint — data.js calls this
//  on page load to decide whether to use the
//  live API or fall back to offline mode.
// ─────────────────────────────────────────────

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  return Response.json(
    { woolworths: true, coles: true },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}
