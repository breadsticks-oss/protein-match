// ─────────────────────────────────────────────
//  Protein Match — Data Layer
//  Live prices from Woolworths + Coles APIs via local proxy server.
//  Categories: bars, yogurts, powders.
// ─────────────────────────────────────────────

// ── Search queries per category ──────────────
const SEARCHES = [
  { cat: 'bar',    woolQ: 'protein bar',        colesQ: 'protein bar'         },
  { cat: 'yogurt', woolQ: 'protein yogurt',     colesQ: 'high protein yogurt' },
  { cat: 'powder', woolQ: 'protein powder',     colesQ: 'protein powder'      },
];

// ── Nutrition by brand — BARS (per bar) ──────
const BRAND_NUTRITION = {
  // ── Brands actually in Coles / Woolworths API ──
  'Muscle Nation':      { protein: 30, calories: 218, carbs: 10, sugar: 2,  fat: 8  },
  'Musashi':            { protein: 40, calories: 355, carbs: 22, sugar: 4,  fat: 9  },
  'Quest':              { protein: 21, calories: 190, carbs: 22, sugar: 1,  fat: 8  },
  'Grenade':            { protein: 23, calories: 215, carbs: 18, sugar: 1,  fat: 7  },
  'BSc':                { protein: 20, calories: 196, carbs: 12, sugar: 2,  fat: 8  },
  'BSC':                { protein: 20, calories: 196, carbs: 12, sugar: 2,  fat: 8  },
  'Body Science':       { protein: 20, calories: 196, carbs: 12, sugar: 2,  fat: 8  },
  "Sam's Pantry":       { protein: 20, calories: 200, carbs: 18, sugar: 4,  fat: 7  },
  'Nice & Natural':     { protein: 20, calories: 192, carbs: 18, sugar: 5,  fat: 6  },
  "Carman's":           { protein: 15, calories: 220, carbs: 22, sugar: 8,  fat: 8  },
  'Noshu':              { protein: 15, calories: 162, carbs: 14, sugar: 1,  fat: 8  },
  'Health Lab':         { protein: 20, calories: 200, carbs: 16, sugar: 4,  fat: 8  },
  'Heritage Mill':      { protein: 20, calories: 210, carbs: 18, sugar: 4,  fat: 8  },
  "Maxine's":           { protein: 20, calories: 190, carbs: 15, sugar: 3,  fat: 7  },
  "Mayver's":           { protein: 14, calories: 228, carbs: 16, sugar: 6,  fat: 14 },
  'Tasti':              { protein: 14, calories: 200, carbs: 20, sugar: 7,  fat: 8  },
  'True Protein':       { protein: 20, calories: 200, carbs: 15, sugar: 3,  fat: 7  },
  'Noway':              { protein: 20, calories: 185, carbs: 14, sugar: 4,  fat: 6  },
  'Uncle Tobys':        { protein: 10, calories: 190, carbs: 28, sugar: 10, fat: 5  },
  'Clif Bar':           { protein: 11, calories: 250, carbs: 44, sugar: 20, fat: 5  },
  'Clif':               { protein: 11, calories: 250, carbs: 44, sugar: 20, fat: 5  },
  'Famous Nutrition':   { protein: 20, calories: 200, carbs: 16, sugar: 3,  fat: 7  },
  'Greenback':          { protein: 20, calories: 218, carbs: 18, sugar: 3,  fat: 8  },
  'Coles':                    { protein: 18, calories: 195, carbs: 18, sugar: 4,  fat: 7  },
  'BC':                       { protein: 20, calories: 200, carbs: 16, sugar: 3,  fat: 7  },
  'Sarah Di Lorenzo 10:10':   { protein: 20, calories: 200, carbs: 14, sugar: 3,  fat: 8  },
  // ── Additional brands ──
  'Aussie Bodies':      { protein: 15, calories: 176, carbs: 10, sugar: 1,  fat: 7  },
  'Optimum Nutrition':  { protein: 20, calories: 212, carbs: 20, sugar: 6,  fat: 7  },
  'Macro Mike':         { protein: 20, calories: 210, carbs: 16, sugar: 3,  fat: 8  },
  'Switch Nutrition':   { protein: 25, calories: 215, carbs: 14, sugar: 2,  fat: 8  },
  'EHP Labs':           { protein: 20, calories: 200, carbs: 15, sugar: 2,  fat: 7  },
  'Giant Sports':       { protein: 25, calories: 220, carbs: 18, sugar: 3,  fat: 7  },
  'Atkins':             { protein: 15, calories: 160, carbs: 18, sugar: 1,  fat: 9  },
  'Fulfil':             { protein: 20, calories: 198, carbs: 18, sugar: 2,  fat: 8  },
  'Rule 1':             { protein: 21, calories: 210, carbs: 22, sugar: 2,  fat: 8  },
};

// ── Nutrition by brand — POWDERS (per ~30-35g serving) ──
const POWDER_NUTRITION = {
  'Musashi':            { protein: 26, calories: 120, carbs: 3,  sugar: 1, fat: 2 },
  'BSc':                { protein: 27, calories: 130, carbs: 4,  sugar: 1, fat: 2 },
  'BSC':                { protein: 27, calories: 130, carbs: 4,  sugar: 1, fat: 2 },
  'Body Science':       { protein: 27, calories: 130, carbs: 4,  sugar: 1, fat: 2 },
  'Optimum Nutrition':  { protein: 24, calories: 120, carbs: 3,  sugar: 1, fat: 1 },
  'EHP Labs':           { protein: 25, calories: 120, carbs: 3,  sugar: 1, fat: 1 },
  'Macro Mike':         { protein: 24, calories: 130, carbs: 5,  sugar: 2, fat: 3 },
  'True Protein':       { protein: 25, calories: 115, carbs: 2,  sugar: 1, fat: 1 },
  'Switch Nutrition':   { protein: 25, calories: 125, carbs: 3,  sugar: 1, fat: 2 },
  'Rule 1':             { protein: 25, calories: 110, carbs: 2,  sugar: 1, fat: 1 },
  'Muscle Nation':      { protein: 25, calories: 120, carbs: 3,  sugar: 1, fat: 2 },
  'Noway':              { protein: 20, calories: 80,  carbs: 1,  sugar: 0, fat: 0 },
  'Ghost':              { protein: 25, calories: 130, carbs: 4,  sugar: 2, fat: 2 },
  'Dymatize':           { protein: 25, calories: 120, carbs: 2,  sugar: 1, fat: 1 },
  'Grenade':            { protein: 25, calories: 125, carbs: 3,  sugar: 1, fat: 2 },
  'Maxine\'s':          { protein: 24, calories: 120, carbs: 4,  sugar: 1, fat: 2 },
  'Giant Sports':       { protein: 25, calories: 120, carbs: 3,  sugar: 1, fat: 2 },
};

// ── Nutrition by brand — YOGURTS (per ~160g serve) ──
const YOGURT_NUTRITION = {
  'YoPRO':              { protein: 15, calories: 128, carbs: 9,  sugar: 9, fat: 3 },
  'Chobani':            { protein: 14, calories: 130, carbs: 13, sugar: 9, fat: 3 },
  'Farmers Union':      { protein: 12, calories: 125, carbs: 12, sugar: 9, fat: 4 },
  'Vaalia':             { protein: 10, calories: 108, carbs: 12, sugar: 9, fat: 3 },
  'Jalna':              { protein: 10, calories: 100, carbs: 10, sugar: 8, fat: 3 },
  "Siggi's":            { protein: 14, calories: 120, carbs: 11, sugar: 7, fat: 3 },
  'Danone':             { protein: 15, calories: 128, carbs: 9,  sugar: 9, fat: 3 },
  'Coles':              { protein: 12, calories: 118, carbs: 11, sugar: 8, fat: 3 },
  'Woolworths':         { protein: 12, calories: 118, carbs: 11, sugar: 8, fat: 3 },
};

// ── Case-insensitive brand lookup (category-aware) ──
function getBrandNutrition(brand, cat = 'bar') {
  if (!brand) return null;
  const table = cat === 'powder' ? POWDER_NUTRITION
              : cat === 'yogurt' ? YOGURT_NUTRITION
              : BRAND_NUTRITION;
  if (table[brand]) return table[brand];
  const lower = brand.toLowerCase();
  const key = Object.keys(table).find(k => k.toLowerCase() === lower);
  if (key) return table[key];
  // Bars as universal fallback (powders/yogurts may share brand names)
  if (cat !== 'bar') {
    if (BRAND_NUTRITION[brand]) return BRAND_NUTRITION[brand];
    const k2 = Object.keys(BRAND_NUTRITION).find(k => k.toLowerCase() === lower);
    if (k2) return BRAND_NUTRITION[k2];
  }
  return null;
}

// ── Mock pricing by brand ────────────────────
// Used to assign realistic Coles/Woolworths prices to API products
const BRAND_PRICES = {
  "Musashi":           { coles: 3.50, woolworths: 3.20 },
  "Quest":             { coles: 4.50, woolworths: 4.20 },
  "Body Science":      { coles: 3.00, woolworths: 3.50 },
  "BSc":               { coles: 3.00, woolworths: 3.50 },
  "Grenade":           { coles: 5.00, woolworths: 4.80 },
  "Aussie Bodies":     { coles: 2.50, woolworths: 2.50 },
  "Clif":              { coles: 3.80, woolworths: 3.60 },
  "Optimum Nutrition": { coles: 4.80, woolworths: 4.50 },
  "Macro Mike":        { coles: 4.00, woolworths: 3.80 },
  "default":           { coles: 3.50, woolworths: 3.50 },
};

// Known specials (brand → store on sale)
const SALE_OVERRIDES = {
  "Musashi":       { woolworths: { onSale: true, wasPrice: 3.50 } },
  "Quest":         { woolworths: { onSale: true, wasPrice: 4.50 } },
  "Body Science":  { coles:      { onSale: true, wasPrice: 3.50 } },
  "BSc":           { coles:      { onSale: true, wasPrice: 3.50 } },
  "Grenade":       { woolworths: { onSale: true, wasPrice: 5.50 } },
  "Aussie Bodies": { coles:      { onSale: true, wasPrice: 3.00 } },
};

// ── Fallback data (shown if API is unavailable) ──
// Images sourced from Open Food Facts (openfoodfacts.org) — free open database
const FALLBACK_PRODUCTS = [
  {
    id: 1, name: "Musashi High Protein Bar", flavour: "Cookies & Cream", brand: "Musashi",
    image: "https://images.openfoodfacts.org/images/products/931/001/205/2089/front_en.3.400.jpg",
    weightG: 90, protein: 40, calories: 361, carbs: 22, sugar: 4, fat: 9,
    coles: { price: 3.50, onSale: false }, woolworths: { price: 3.20, onSale: true, wasPrice: 3.50 },
  },
  {
    id: 2, name: "Quest Protein Bar", flavour: "Chocolate Chip Cookie Dough", brand: "Quest",
    image: "https://images.openfoodfacts.org/images/products/888/849/000/588/front_en.5.400.jpg",
    weightG: 60, protein: 21, calories: 190, carbs: 22, sugar: 1, fat: 8,
    coles: { price: 4.50, onSale: false }, woolworths: { price: 4.20, onSale: true, wasPrice: 4.50 },
  },
  {
    id: 3, name: "BSc Low Carb Protein Bar", flavour: "Choc Fudge Brownie", brand: "Body Science",
    image: "https://images.openfoodfacts.org/images/products/931/001/600/3440/front_en.3.400.jpg",
    weightG: 60, protein: 20, calories: 196, carbs: 12, sugar: 2, fat: 8,
    coles: { price: 3.00, onSale: true, wasPrice: 3.50 }, woolworths: { price: 3.50, onSale: false },
  },
  {
    id: 4, name: "Grenade Carb Killa", flavour: "Dark Chocolate Raspberry", brand: "Grenade",
    image: "https://images.openfoodfacts.org/images/products/500/011/453/5528/front_en.7.400.jpg",
    weightG: 60, protein: 23, calories: 215, carbs: 18, sugar: 1, fat: 7,
    coles: { price: 5.00, onSale: false }, woolworths: { price: 4.80, onSale: false },
  },
  {
    id: 5, name: "Aussie Bodies Lo Carb Hero", flavour: "Choc Mint", brand: "Aussie Bodies",
    image: "https://images.openfoodfacts.org/images/products/931/001/301/5993/front_en.3.400.jpg",
    weightG: 60, protein: 15, calories: 176, carbs: 10, sugar: 1, fat: 7,
    coles: { price: 2.50, onSale: true, wasPrice: 3.00 }, woolworths: { price: 2.50, onSale: false },
  },
  {
    id: 6, name: "Optimum Nutrition Protein Crisp", flavour: "Salted Caramel", brand: "Optimum Nutrition",
    image: "https://images.openfoodfacts.org/images/products/748/927/052/3512/front_en.6.400.jpg",
    weightG: 65, protein: 20, calories: 212, carbs: 20, sugar: 6, fat: 7,
    coles: { price: 4.80, onSale: false }, woolworths: { price: 4.50, onSale: false },
  },
  {
    id: 7, name: "Clif Builder's Protein Bar", flavour: "Chocolate Mint", brand: "Clif",
    image: "https://images.openfoodfacts.org/images/products/722/252/308/5188/front_en.5.400.jpg",
    weightG: 68, protein: 20, calories: 270, carbs: 30, sugar: 20, fat: 8,
    coles: { price: 3.80, onSale: false }, woolworths: { price: 3.60, onSale: false },
  },
  {
    id: 8, name: "Macro Mike Protein Bar", flavour: "Peanut Butter Choc Chip", brand: "Macro Mike",
    image: "https://images.openfoodfacts.org/images/products/931/001/702/5002/front_en.3.400.jpg",
    weightG: 55, protein: 20, calories: 210, carbs: 16, sugar: 3, fat: 8,
    coles: { price: 4.00, onSale: false }, woolworths: { price: 3.80, onSale: false },
  },
];

// ── Transform Open Food Facts product → our format ──
function transformOFFProduct(item, index) {
  const n = item.nutriments || {};

  // Parse serving size weight
  const qtyMatch = (item.quantity || '').match(/(\d+)/);
  const weightG  = qtyMatch ? parseInt(qtyMatch[1]) : 60;

  // Nutrition per serving (prefer per-serving, fall back to per-100g scaled)
  const serving = weightG / 100;
  const protein  = Math.round((n['proteins_serving']  ?? (n['proteins_100g']  ?? 0) * serving));
  const calories = Math.round((n['energy-kcal_serving'] ?? (n['energy-kcal_100g'] ?? 0) * serving));
  const carbs    = Math.round((n['carbohydrates_serving'] ?? (n['carbohydrates_100g'] ?? 0) * serving));
  const fat      = Math.round((n['fat_serving'] ?? (n['fat_100g'] ?? 0) * serving));
  const sugar    = Math.round((n['sugars_serving'] ?? (n['sugars_100g'] ?? 0) * serving));

  // Skip products with no protein data
  if (!protein) return null;

  const brand      = (item.brands || 'Unknown').split(',')[0].trim();
  const pricing    = BRAND_PRICES[brand] || BRAND_PRICES["default"];
  const saleInfo   = SALE_OVERRIDES[brand] || {};

  // Slight price variation per product so not every bar costs the same
  const jitter = ((index % 5) - 2) * 0.05;

  return {
    id:       index + 1,
    name:     item.product_name || item.abbreviated_product_name || 'Protein Bar',
    flavour:  item.flavor || extractFlavour(item.product_name || '') || brand,
    brand,
    image:    item.image_front_url || item.image_url || null,
    weightG,
    protein:  Math.max(protein, 1),
    calories: Math.max(calories, 50),
    carbs:    Math.max(carbs, 0),
    sugar:    Math.max(sugar, 0),
    fat:      Math.max(fat, 0),
    coles: {
      price:   parseFloat((pricing.coles + jitter).toFixed(2)),
      onSale:  saleInfo.coles?.onSale || false,
      wasPrice: saleInfo.coles?.wasPrice || null,
    },
    woolworths: {
      price:   parseFloat((pricing.woolworths + jitter).toFixed(2)),
      onSale:  saleInfo.woolworths?.onSale || false,
      wasPrice: saleInfo.woolworths?.wasPrice || null,
    },
  };
}

function extractFlavour(name) {
  const flavours = ['Chocolate', 'Vanilla', 'Caramel', 'Peanut Butter', 'Cookies', 'Mint', 'Berry', 'Salted', 'Fudge', 'Crisp'];
  for (const f of flavours) {
    if (name.toLowerCase().includes(f.toLowerCase())) return f;
  }
  return '';
}

// ── Fuzzy name match (for merging Woolworths + Coles results) ──
function normaliseName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function nameSimilarity(a, b) {
  const wa = new Set(normaliseName(a).split(' ').filter(w => w.length > 2));
  const wb = new Set(normaliseName(b).split(' ').filter(w => w.length > 2));
  let matches = 0;
  wa.forEach(w => { if (wb.has(w)) matches++; });
  return matches / Math.max(wa.size, wb.size, 1);
}

// ── Merge Woolworths + Coles products ─────────
function mergeStoreProducts(woolies, coles, cat = 'bar') {
  const merged = [];
  const usedColes = new Set();

  woolies.forEach((wp, i) => {
    let bestMatch = null, bestScore = 0;
    coles.forEach((cp, ci) => {
      if (usedColes.has(ci)) return;
      const score = nameSimilarity(wp.name, cp.name);
      if (score > bestScore) { bestScore = score; bestMatch = { cp, ci }; }
    });

    const colesData = bestScore > 0.4 ? bestMatch.cp : null;
    if (colesData) usedColes.add(bestMatch.ci);

    const image = wp.image || colesData?.image || null;
    const brand = wp.brand || colesData?.brand || '';
    const exactMatch = FALLBACK_PRODUCTS.find(f =>
      f.brand.toLowerCase() === brand.toLowerCase() &&
      nameSimilarity(f.name, wp.name) > 0.45
    );
    const nutrition = exactMatch || getBrandNutrition(brand, cat) || {};

    merged.push({
      id:       i + 1,
      category: cat,
      name:     wp.name,
      flavour:  extractFlavour(wp.name) || '',
      brand,
      image,
      weightG:  parseInt((wp.packageSize || '60').match(/\d+/)?.[0]) || 60,
      protein:  nutrition.protein  || null,
      calories: nutrition.calories || null,
      carbs:    nutrition.carbs    || null,
      sugar:    nutrition.sugar    || null,
      fat:      nutrition.fat      || null,
      woolworths: { price: wp.price, onSale: wp.onSale, wasPrice: wp.wasPrice, url: wp.url },
      coles: colesData
        ? { price: colesData.price, onSale: colesData.onSale, wasPrice: colesData.wasPrice, url: colesData.url }
        : null,
    });
  });

  // Coles-only products not matched above
  coles.forEach((cp, ci) => {
    if (usedColes.has(ci)) return;
    const brand = cp.brand || '';
    const exactMatch = FALLBACK_PRODUCTS.find(f =>
      f.brand.toLowerCase() === brand.toLowerCase() &&
      nameSimilarity(f.name, cp.name) > 0.45
    );
    const nutrition = exactMatch || getBrandNutrition(brand, cat) || {};
    merged.push({
      id:       woolies.length + ci + 1,
      category: cat,
      name:     cp.name,
      flavour:  extractFlavour(cp.name) || '',
      brand,
      image:    cp.image || null,
      weightG:  parseInt((cp.packageSize || '60').match(/\d+/)?.[0]) || 60,
      protein:  nutrition.protein  || null,
      calories: nutrition.calories || null,
      carbs:    nutrition.carbs    || null,
      sugar:    nutrition.sugar    || null,
      fat:      nutrition.fat      || null,
      woolworths: null,
      coles: { price: cp.price, onSale: cp.onSale, wasPrice: cp.wasPrice, url: cp.url },
    });
  });

  return merged;
}

// ── Fetch with hard timeout ──────────────────
function fetchWithTimeout(url, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .finally(() => clearTimeout(timer));
}

// ── Main fetch — LIVE DATA ONLY ──────────────
// Fetches bars, yogurts and powders from both stores in parallel.
// Must be opened via http://localhost:3000 (run node server.js first).
async function fetchProducts() {
  if (location.protocol === 'file:') {
    throw Object.assign(new Error('FILE_PROTOCOL'), {
      hint: 'Open http://localhost:3000 instead of opening the HTML file directly.',
    });
  }

  console.log('Fetching bars, yogurts & powders from Woolworths + Coles…');

  // 6 parallel requests: 3 categories × 2 stores
  const requests = SEARCHES.flatMap(s => [
    fetchWithTimeout(`/api/woolworths?q=${encodeURIComponent(s.woolQ)}`, 15000)
      .then(d => ({ store: 'woolworths', cat: s.cat, data: Array.isArray(d) ? d : [] }))
      .catch(() => ({ store: 'woolworths', cat: s.cat, data: [] })),
    fetchWithTimeout(`/api/coles?q=${encodeURIComponent(s.colesQ)}`, 25000)
      .then(d => ({ store: 'coles', cat: s.cat, data: Array.isArray(d) ? d : [] }))
      .catch(() => ({ store: 'coles', cat: s.cat, data: [] })),
  ]);

  const settled = await Promise.all(requests);

  // Group results by [cat][store]
  const byCategory = {};
  for (const r of settled) {
    if (!byCategory[r.cat]) byCategory[r.cat] = {};
    byCategory[r.cat][r.store] = r.data;
  }

  let allProducts = [];
  let barWoolworths = byCategory.bar?.woolworths || [];

  if (barWoolworths.length === 0) {
    throw Object.assign(new Error('WOOLWORTHS_FAILED'), {
      hint: 'Woolworths API failed. Make sure the server is running (node server.js).',
    });
  }

  for (const { cat } of SEARCHES) {
    const woolData  = byCategory[cat]?.woolworths || [];
    const colesData = byCategory[cat]?.coles      || [];
    const merged    = mergeStoreProducts(woolData, colesData, cat);
    allProducts.push(...merged);
    console.log(`  ${cat}: ${woolData.length} Woolworths + ${colesData.length} Coles → ${merged.length} merged`);
  }

  return allProducts.filter(p => p.name && p.name.length > 2);
}

// ── Helpers ──────────────────────────────────
function bestPrice(product) {
  const cp = product.coles?.price ?? Infinity;
  const wp = product.woolworths?.price ?? Infinity;
  return Math.min(cp, wp);
}

function cheapestStore(product) {
  const cp = product.coles?.price ?? Infinity;
  const wp = product.woolworths?.price ?? Infinity;
  if (cp < wp) return 'coles';
  if (wp < cp) return 'woolworths';
  return 'equal';
}

function proteinPerDollar(product) {
  const price = bestPrice(product);
  if (!price || price === Infinity || !product.protein) return 0;
  return product.protein / price;
}

function isOnSale(product) {
  return product.coles?.onSale || product.woolworths?.onSale;
}
