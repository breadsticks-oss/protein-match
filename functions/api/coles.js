// ─────────────────────────────────────────────
//  Protein Match — Cloudflare Pages Function
//  Route: /api/coles?q=<query>
//
//  Uses Coles' Next.js _next/data JSON endpoint
//  (no Puppeteer / headless browser needed).
//  A seeded buildId means startup never requires
//  hitting the Coles homepage (which is bot-blocked).
// ─────────────────────────────────────────────

// Module-level cache — persists across requests
// on the same Worker isolate (refreshed every 6 h
// or when Next.js reports the buildId as stale).
let _colesBuildId  = '20260528.5-2fe21bafe8ec119eaa36ff296d6f5b95a2f6e138';
let _colesCacheExp = Date.now() + 6 * 60 * 60 * 1000;
let _buildIdFetch  = null; // promise mutex — concurrent requests share one fetch

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const { searchParams } = new URL(context.request.url);
  const q = searchParams.get('q') || 'protein bar';

  try {
    const products = await fetchColes(q);
    return Response.json(products, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return Response.json({ error: err.message, products: [] }, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// ── Coles fetch (with buildId caching) ───────
async function fetchColes(query) {
  // Step 1: Try with the cached buildId first (avoids homepage hit entirely)
  if (_colesBuildId && Date.now() < _colesCacheExp) {
    const products = await tryColesData(_colesBuildId, query);
    if (products && products.length > 0) return products;
  }

  // Step 2: buildId is stale — fetch a fresh one from the Coles site
  const buildId  = await getColesDataId();
  const products = await tryColesData(buildId, query);

  if (!products || products.length === 0) {
    throw new Error('Coles: no products returned');
  }
  return products;
}

async function tryColesData(buildId, query) {
  const dataURL =
    `https://www.coles.com.au/_next/data/${buildId}/en/search/products.json` +
    `?q=${encodeURIComponent(query)}&page=1`;

  const res  = await fetch(dataURL, {
    headers: {
      'User-Agent':      UA,
      'Accept':          'application/json, */*',
      'Accept-Language': 'en-AU,en;q=0.9',
      'x-nextjs-data':   '1',
      'Referer':         `https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}`,
    },
  });

  const text = await res.text();
  if (!text.trimStart().startsWith('{')) return null; // non-JSON = blocked

  const data = JSON.parse(text);

  if (data.notFound) {
    // Next.js says this buildId route doesn't exist — force a refresh
    _colesBuildId  = null;
    _colesCacheExp = 0;
    return null;
  }

  const results =
    data?.pageProps?.searchResults?.results ||
    data?.pageProps?.catalogueResults?.results ||
    data?.pageProps?.products ||
    [];

  return results
    .filter(p => p.name && p.pricing?.now)
    .map(mapColesProduct);
}

async function getColesDataId() {
  // If another request is already fetching, share its promise
  if (_buildIdFetch) return _buildIdFetch;

  // Try multiple Coles pages — homepage is often Imperva-blocked
  _buildIdFetch = (async () => {
    const PAGES_TO_TRY = [
      'https://www.coles.com.au/health-beauty/sports-nutrition',
      'https://www.coles.com.au/health-beauty',
      'https://www.coles.com.au/',
    ];

    try {
      for (const pageURL of PAGES_TO_TRY) {
        let text;
        try {
          const res = await fetch(pageURL, {
            headers: {
              'User-Agent':      UA,
              'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
              'Accept-Language': 'en-AU,en;q=0.9',
              'Referer':         'https://www.google.com.au/',
            },
          });
          text = await res.text();
        } catch {
          continue;
        }

        const match = text.match(/"buildId"\s*:\s*"([^"]+)"/);
        if (match) {
          _colesBuildId  = match[1];
          _colesCacheExp = Date.now() + 6 * 60 * 60 * 1000;
          return _colesBuildId;
        }
      }
      throw new Error('Could not extract Coles buildId — all pages blocked');
    } finally {
      _buildIdFetch = null;
    }
  })();

  return _buildIdFetch;
}

// ── Map a raw Coles product to our shape ─────
function mapColesProduct(p) {
  const slug  = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  const image = p.imageUris?.[0]?.uri
    ? `https://productimages.coles.com.au/productimages${p.imageUris[0].uri}`
    : null;

  return {
    source:      'coles',
    id:          p.id,
    name:        p.name,
    brand:       p.brand || '',
    price:       p.pricing.now,
    wasPrice:    p.pricing.was || null,
    onSale:      p.pricing.promotionType === 'SPECIAL' || (p.pricing.saveAmount || 0) > 0,
    image,
    packageSize: p.size || '',
    url:         `https://www.coles.com.au/product/${slug}_${p.id}`,
  };
}
