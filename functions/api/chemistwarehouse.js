// ─────────────────────────────────────────────
//  Protein Match — Cloudflare Pages Function
//  Route: /api/chemistwarehouse?q=<query>
//
//  Chemist Warehouse requires a full headless browser
//  (Puppeteer) to scrape, which can't run in a Cloudflare
//  Worker. Returns an empty array so the rest of the app
//  works normally — CW prices show when running locally
//  via server.js (which has Puppeteer available).
// ─────────────────────────────────────────────

export async function onRequest() {
  return Response.json([], {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
