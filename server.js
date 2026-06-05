// ─────────────────────────────────────────────
//  Protein Match — Local Proxy Server
//  Run: node server.js
//  Then open: http://localhost:3000
//
//  Proxies Woolworths + Coles APIs to avoid CORS.
//  No npm install needed — uses Node built-ins only.
// ─────────────────────────────────────────────

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');
const os    = require('os');

// Woolworths/Coles use a certificate chain Node doesn't trust by default
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = 3000;

// ── MIME types ───────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

// ── External HTTPS fetch (follows redirects) ──
function fetchURL(targetURL, extraHeaders = {}, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetURL);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'en-AU,en;q=0.9',
        ...extraHeaders,
      },
    };
    const req = https.get(opts, res => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, targetURL);
        res.resume(); // discard body
        return fetchURL(next.toString(), extraHeaders, redirectsLeft - 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve({
        status:     res.statusCode,
        headers:    res.headers,
        setCookies: res.headers['set-cookie'] || [],
        body:       Buffer.concat(chunks).toString(),
      }));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Woolworths API ────────────────────────────
async function fetchWoolworths(query) {
  const apiURL = `https://www.woolworths.com.au/apis/ui/Search/products?` +
    `searchTerm=${encodeURIComponent(query)}&pageSize=36&pageNumber=1&sortType=TraderRelevance&isMobile=false`;

  const result = await fetchURL(apiURL, {
    'Referer': 'https://www.woolworths.com.au/',
    'Origin':  'https://www.woolworths.com.au',
  });

  if (!result.body.trimStart().startsWith('{') && !result.body.trimStart().startsWith('[')) {
    console.error(`[Woolworths] HTTP ${result.status} — got HTML (bot block). Trying Puppeteer fallback.`);
    if (puppeteer) return fetchWoolworthsPuppeteer(query);
    throw new Error(`Woolworths returned HTML (status ${result.status}) — bot protection active`);
  }

  const data = JSON.parse(result.body);

  // Flatten the nested Products array (Woolworths wraps each product in an object)
  const raw = (data.Products || []).flatMap(p => p.Products || [p]);

  return raw
    .filter(p => p.Name && p.Price)
    .map(p => ({
      source:      'woolworths',
      stockcode:   p.Stockcode,
      name:        p.Name,
      brand:       p.Brand || '',
      price:       p.Price,
      wasPrice:    p.WasPrice || null,
      onSale:      !!p.IsOnSpecial,
      image:       p.LargeImageFile || p.SmallImageFile || null,
      packageSize: p.PackageSize || '',
      url:         `https://www.woolworths.com.au/shop/productdetails/${p.Stockcode}`,
    }));
}

// ── Coles — _next/data JSON approach (no Puppeteer needed) ──
// Coles is built with Next.js. Every page has a matching /_next/data/{buildId}/...json
// endpoint that returns the page's props as clean JSON. We:
//   1. Fetch the Coles homepage ONCE to extract the current buildId, then cache it.
//   2. Hit the _next/data search URL directly — no headless browser required.

// Cache so we don't hammer the Coles homepage on every request (causes rate-limiting).
// Seeded with a known-working buildId so startup never requires a homepage hit.
// tryColesData() sets this to null when the buildId goes stale (notFound response).
let _colesBuildId  = '20260528.5-2fe21bafe8ec119eaa36ff296d6f5b95a2f6e138';
let _colesCacheExp = Date.now() + 6 * 60 * 60 * 1000;
let _buildIdFetch  = null;   // Promise mutex — concurrent requests share one fetch

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

async function getColesDataId(UA) {
  // Return cached value if still fresh
  if (_colesBuildId && Date.now() < _colesCacheExp) {
    return _colesBuildId;
  }

  // If another request is already fetching, piggyback on it
  if (_buildIdFetch) {
    console.log('[Coles] Waiting for in-flight buildId fetch…');
    return _buildIdFetch;
  }

  // Start one fetch and share it with any concurrent callers.
  // Try multiple Coles pages in order — the homepage is often blocked by
  // Imperva, but category/search pages can get through.
  _buildIdFetch = (async () => {
    const PAGES_TO_TRY = [
      'https://www.coles.com.au/health-beauty/sports-nutrition',
      'https://www.coles.com.au/health-beauty',
      'https://www.coles.com.au/',
    ];
    try {
      for (const pageURL of PAGES_TO_TRY) {
        console.log(`[Coles] Trying to extract buildId from ${pageURL}…`);
        let res;
        try {
          res = await fetchURL(pageURL, {
            'User-Agent':      UA,
            'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
            'Accept-Language': 'en-AU,en;q=0.9',
            'Referer':         'https://www.google.com.au/',
          });
        } catch (e) {
          console.warn(`[Coles] Fetch error for ${pageURL}: ${e.message}`);
          continue;
        }
        const match = res.body.match(/"buildId"\s*:\s*"([^"]+)"/);
        if (match) {
          _colesBuildId  = match[1];
          _colesCacheExp = Date.now() + 6 * 60 * 60 * 1000; // cache 6 hours
          console.log(`[Coles] buildId refreshed: ${_colesBuildId}`);
          return _colesBuildId;
        }
        console.warn(`[Coles] No buildId in response from ${pageURL} (Imperva block?)`);
      }
      throw new Error('Could not extract Coles buildId from any page (all blocked)');
    } finally {
      _buildIdFetch = null; // always clear so next failure can retry
    }
  })();

  return _buildIdFetch;
}

async function tryColesData(buildId, query, UA) {
  const dataURL = `https://www.coles.com.au/_next/data/${buildId}/en/search/products.json?q=${encodeURIComponent(query)}&page=1`;
  const dataRes = await fetchURL(dataURL, {
    'User-Agent':      UA,
    'Accept':          'application/json, */*',
    'Accept-Language': 'en-AU,en;q=0.9',
    'x-nextjs-data':   '1',
    'Referer':         `https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}`,
  });

  if (!dataRes.body.trimStart().startsWith('{')) return null; // non-JSON = blocked

  const data = JSON.parse(dataRes.body);
  if (data.notFound) {
    // buildId is stale — Next.js says this route doesn't exist
    console.warn('[Coles] buildId stale (notFound), will refresh');
    _colesBuildId = null; // force a homepage re-fetch next time
    return null;
  }

  const results =
    data?.pageProps?.searchResults?.results ||
    data?.pageProps?.catalogueResults?.results ||
    data?.pageProps?.products ||
    [];

  return results.filter(p => p.name && p.pricing?.now).map(mapColesProduct);
}

async function fetchColes(query) {
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // ── Step 1: try with cached buildId first (avoids a homepage hit entirely) ──
  if (_colesBuildId && Date.now() < _colesCacheExp) {
    const products = await tryColesData(_colesBuildId, query, UA);
    if (products && products.length > 0) {
      console.log(`[Coles] ${products.length} products (cached buildId)`);
      return products;
    }
  }

  // ── Step 2: buildId missing or stale — fetch homepage to get a fresh one ──
  const buildId = await getColesDataId(UA);
  const products = await tryColesData(buildId, query, UA);

  if (!products || products.length === 0) {
    throw new Error('Coles: no products returned');
  }

  console.log(`[Coles] ${products.length} products`);
  return products;
}

// ── Local IP helper ───────────────────────────
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const cfg of iface) {
      if (cfg.family === 'IPv4' && !cfg.internal) return cfg.address;
    }
  }
  return 'localhost';
}

// ── Chemist Warehouse fetcher ─────────────────
async function fetchChemistWarehouse(query) {
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const searchURL = `https://www.chemistwarehouse.com.au/search?q=${encodeURIComponent(query)}`;

  let html;
  try {
    const res = await fetchURL(searchURL, {
      'User-Agent':      UA,
      'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Referer':         'https://www.google.com.au/',
    });
    html = res.body;
  } catch (err) {
    console.warn('[CW] Network error:', err.message);
    return [];
  }

  // ── Method 1: JSON-LD ─────────────────────
  const products = [];
  const ldRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = data['@graph']
        ? data['@graph']
        : data['@type'] === 'ItemList'
        ? (data.itemListElement || []).map(i => i.item || i)
        : [data];
      for (const item of items) {
        if (item['@type'] !== 'Product') continue;
        for (const offer of [].concat(item.offers || [])) {
          const price = parseFloat(offer.price || offer.lowPrice || '0');
          if (!price) continue;
          const wasP  = parseFloat(offer.highPrice || '0') || null;
          products.push({
            source:      'chemistwarehouse',
            id:          item.sku || item.productID || '',
            name:        item.name || '',
            brand:       item.brand?.name || '',
            price,
            wasPrice:    wasP && wasP > price ? wasP : null,
            onSale:      !!(wasP && wasP > price),
            image:       [].concat(item.image || [])[0] || null,
            packageSize: '',
            url:         offer.url || item.url || '',
          });
        }
      }
    } catch {}
  }

  if (products.length > 0) {
    console.log(`[CW] ${products.length} products (JSON-LD)`);
    return products.filter(p => p.name && p.price > 0);
  }

  // ── Method 2: embedded JSON state ─────────
  const stateMatch = html.match(/window\.__(?:PRELOADED_STATE|INITIAL_STATE)__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const raw = state?.search?.products || state?.catalogue?.products || [];
      if (raw.length > 0) {
        console.log(`[CW] ${raw.length} products (window state)`);
        return raw.map(p => ({
          source:      'chemistwarehouse',
          id:          String(p.id || p.ProductId || ''),
          name:        p.name || p.ProductName || '',
          brand:       p.brand || p.BrandName || '',
          price:       parseFloat(p.price || p.Price || p.StandardPrice || '0'),
          wasPrice:    parseFloat(p.wasPrice || p.WasPrice || '0') || null,
          onSale:      p.onSale || p.IsOnSale || false,
          image:       p.image || p.ImageUrl || null,
          packageSize: p.packageSize || '',
          url:         p.url ? `https://www.chemistwarehouse.com.au${p.url}` : '',
        })).filter(p => p.name && p.price > 0);
      }
    } catch {}
  }

  // ── Method 3: regex price scrape ─────────
  // Last resort — extract prices and names near known product patterns
  const tileRe = /class="[^"]*product[^"]*"[\s\S]{0,600}?href="(\/buy\/[^"]+)"[\s\S]{0,400}?alt="([^"]+)"[\s\S]{0,300}?\$(\d+\.\d{2})/gi;
  while ((m = tileRe.exec(html)) !== null) {
    products.push({
      source:      'chemistwarehouse',
      id:          m[1].split('/')[2] || '',
      name:        m[2],
      brand:       '',
      price:       parseFloat(m[3]),
      wasPrice:    null,
      onSale:      false,
      image:       null,
      packageSize: '',
      url:         `https://www.chemistwarehouse.com.au${m[1]}`,
    });
  }

  if (products.length > 0) {
    console.log(`[CW] ${products.length} products (regex)`);
    return products.filter(p => p.name && p.price > 0);
  }

  console.warn('[CW] No products found — site may be bot-blocking this server IP');
  return [];
}

// ── Route handler ─────────────────────────────
async function handleAPI(pathname, query, res) {
  const q = query.q || 'protein bar';

  try {
    let data;

    if (pathname === '/api/woolworths') {
      data = await fetchWoolworths(q);
    } else if (pathname === '/api/coles') {
      data = await fetchColes(q);
    } else if (pathname === '/api/chemistwarehouse') {
      data = await fetchChemistWarehouse(q);
    } else if (pathname === '/api/status') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(200);
      res.end(JSON.stringify({ woolworths: true, coles: true }));
      return;
    } else {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end(JSON.stringify(data));

  } catch (err) {
    console.error(`[API ERROR] ${pathname}:`, err.message);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message, products: [] }));
  }
}

// ── Static file handler ───────────────────────
function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, safePath.replace(/\.\./g, ''));
  const ext      = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', MIME[ext] || 'text/plain');
    res.writeHead(200);
    res.end(data);
  });
}

// ── Server ────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/')) {
    handleAPI(pathname, parsed.query, res);
  } else {
    serveStatic(pathname, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('  ✅  Protein Match server running!');
  console.log(`  This device: http://localhost:${PORT}`);
  console.log(`  Same WiFi:   http://${localIP}:${PORT}`);
  console.log('');
  console.log('  Share the WiFi link with anyone on your network.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
  console.log(`  [Coles] Using seeded buildId: ${_colesBuildId.slice(0, 20)}…`);
});
