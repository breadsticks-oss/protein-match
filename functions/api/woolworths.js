// ─────────────────────────────────────────────
//  Protein Match — Cloudflare Pages Function
//  Route: /api/woolworths?q=<query>
//
//  Proxies the Woolworths search API and returns
//  a clean JSON array of product objects.
// ─────────────────────────────────────────────

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
    const products = await fetchWoolworths(q);
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

// ── Woolworths fetch ──────────────────────────
async function fetchWoolworths(query) {
  const apiURL =
    'https://www.woolworths.com.au/apis/ui/Search/products?' +
    `searchTerm=${encodeURIComponent(query)}&pageSize=36&pageNumber=1` +
    `&sortType=TraderRelevance&isMobile=false`;

  const res = await fetch(apiURL, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':          'application/json, text/plain, */*',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Referer':         'https://www.woolworths.com.au/',
      'Origin':          'https://www.woolworths.com.au',
    },
  });

  const text = await res.text();

  if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
    throw new Error(`Woolworths returned non-JSON (HTTP ${res.status}) — possible bot block`);
  }

  const data = JSON.parse(text);

  // Woolworths wraps each product in an outer object; flatten both shapes
  const raw = (data.Products || []).flatMap(p => p.Products || [p]);

  return raw
    .filter(p => p.Name && p.Price)
    .map(p => ({
      source:      'woolworths',
      stockcode:   p.Stockcode,
      name:        p.Name,
      brand:       p.Brand || '',
      price:       p.Price,
      wasPrice:    p.WasPrice  || null,
      onSale:      !!p.IsOnSpecial,
      image:       p.LargeImageFile || p.SmallImageFile || null,
      packageSize: p.PackageSize || '',
      url:         `https://www.woolworths.com.au/shop/productdetails/${p.Stockcode}`,
    }));
}
