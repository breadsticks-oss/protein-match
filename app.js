// ─────────────────────────────────────────────
//  Protein Match — Shared App Logic
// ─────────────────────────────────────────────

// ── Nav active state ─────────────────────────
function setActiveNav() {
  const page = location.pathname.split('/').pop() || '';
  document.querySelectorAll('.nav__links a, .nav__mobile a').forEach(a => {
    const href = a.getAttribute('href') || '';
    // Match clean URLs and handle home page (href="/" when page="")
    const match = href === page || (href === '/' && page === '');
    if (match) a.classList.add('active');
  });
}

// ── Hamburger ────────────────────────────────
function initHamburger() {
  const btn  = document.querySelector('.hamburger');
  const menu = document.querySelector('.nav__mobile');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav') && !e.target.closest('.nav__mobile')) {
      menu.classList.remove('open');
    }
  });
}

// ── Modal ────────────────────────────────────
function openModal(product) {
  if (navigator.vibrate) navigator.vibrate(8);
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  const cp   = product.coles?.price ?? null;
  const wp   = product.woolworths?.price ?? null;
  const cwp  = product.chemistwarehouse?.price ?? null;
  const best = Math.min(cp ?? Infinity, wp ?? Infinity, cwp ?? Infinity);

  // Image
  const imgEl = overlay.querySelector('.modal__img');
  if (imgEl) {
    if (product.image) {
      imgEl.src   = product.image;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }
  }

  overlay.querySelector('.modal__brand').textContent   = product.brand;
  overlay.querySelector('.modal__title').textContent   = product.name;
  overlay.querySelector('.modal__flavour').textContent = product.flavour || '';

  overlay.querySelector('[data-nut="protein"]').textContent  = fmt(product.protein, 'g');
  overlay.querySelector('[data-nut="calories"]').textContent = fmt(product.calories);
  overlay.querySelector('[data-nut="carbs"]').textContent    = fmt(product.carbs, 'g');
  overlay.querySelector('[data-nut="fat"]').textContent      = fmt(product.fat, 'g');
  overlay.querySelector('[data-nut="sugar"]').textContent    = fmt(product.sugar, 'g');
  const ppd = (product.protein && best < Infinity) ? (product.protein / best).toFixed(1) : null;
  overlay.querySelector('[data-nut="ppd"]').textContent      = ppd != null ? `${ppd}g/$` : '—';

  // Prices
  const pricesWrap = overlay.querySelector('.modal__prices');
  const stores = [
    { name: 'Coles', data: product.coles, cls: 'buy-btn--coles' },
    { name: 'Woolworths', data: product.woolworths, cls: 'buy-btn--woolies' },
    { name: 'Chemist Warehouse', data: product.chemistwarehouse, cls: 'buy-btn--cw' },
  ];
  pricesWrap.innerHTML = stores.map(s => {
    if (!s.data) return '';
    const isCheap = s.data.price === best;
    const cls     = s.data.onSale ? 'sale' : isCheap ? 'cheapest' : '';
    const was     = s.data.onSale
      ? `<span style="font-size:.72rem;color:var(--text-sec);text-decoration:line-through;margin-left:.3rem">$${s.data.wasPrice?.toFixed(2)}</span>`
      : '';
    const badge   = s.data.onSale ? `<span class="badge badge--sale" style="margin-left:.5rem">Sale</span>` : '';
    // Prefer the direct product URL stored by the API; fall back to search only if missing
    const q   = encodeURIComponent(product.name);
    const url = s.data.url || (s.name === 'Coles'
      ? `https://www.coles.com.au/search?q=${q}`
      : s.name === 'Chemist Warehouse'
      ? `https://www.chemistwarehouse.com.au/search?q=${q}`
      : `https://www.woolworths.com.au/shop/search/products?searchTerm=${q}`);
    const btnCls  = s.cls;
    return `
      <div class="modal__price-row">
        <span class="modal__store">${s.name}${badge}</span>
        <div style="display:flex;align-items:center;gap:.75rem">
          <span class="modal__price-val ${cls}">$${s.data.price.toFixed(2)}${was}</span>
          <a href="${url}" target="_blank" class="buy-btn ${btnCls}" style="font-size:.72rem;padding:.25rem .65rem">Buy →</a>
        </div>
      </div>`;
  }).join('');

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.modal__close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Swipe down to dismiss on mobile
  let _touchY = 0;
  const modal = overlay.querySelector('.modal');
  if (!modal) return;
  modal.addEventListener('touchstart', e => {
    _touchY = e.touches[0].clientY;
  }, { passive: true });
  modal.addEventListener('touchmove', e => {
    const dy = e.touches[0].clientY - _touchY;
    if (dy > 0) modal.style.transform = `translateY(${dy * 0.6}px)`;
  }, { passive: true });
  modal.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - _touchY;
    if (dy > 80) {
      modal.style.transition = 'transform 0.25s ease';
      modal.style.transform = 'translateY(100%)';
      setTimeout(() => {
        closeModal();
        modal.style.transform = '';
        modal.style.transition = '';
      }, 220);
    } else {
      modal.style.transition = 'transform 0.3s cubic-bezier(0.16,1,0.3,1)';
      modal.style.transform = '';
      setTimeout(() => { modal.style.transition = ''; }, 300);
    }
  }, { passive: true });
}

// ── Category helpers ─────────────────────────
const CAT_LABEL = { bar: 'Bar', yogurt: 'Yogurt', powder: 'Powder' };
const CAT_CLASS = { bar: '', yogurt: 'cat--yogurt', powder: 'cat--powder' };

// ── SVG icons (no emojis) ─────────────────────
const SVG_CART = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
const SVG_SEARCH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
const SVG_BAR = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="opacity:.25"><rect x="2" y="8" width="20" height="8" rx="2.5"/><path d="M8 8V7a2 2 0 0 1 4 0v1M8 16v1a2 2 0 0 0 4 0v-1"/></svg>`;
const SVG_WARNING = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.29 3.86-8.27 14.28A1 1 0 0 0 2.88 20H21.1a1 1 0 0 0 .87-1.5L13.7 4.14a1 1 0 0 0-1.73-.28z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

// ── Card image HTML ───────────────────────────
function cardImageHTML(product) {
  if (product.image) {
    return `
      <div style="position:relative">
        <img
          src="${product.image}"
          alt="${product.name}"
          class="card__img"
          onerror="this.parentElement.innerHTML=cardFallbackHTML()"
        />
        <div class="card__badges">
          ${isOnSale(product) ? '<span class="badge badge--sale">On Sale</span>' : ''}
        </div>
      </div>`;
  }
  return `
    <div class="card__img-placeholder">
      ${SVG_BAR}
      <div class="card__badges">
        ${isOnSale(product) ? '<span class="badge badge--sale">On Sale</span>' : ''}
      </div>
    </div>`;
}

function cardFallbackHTML() {
  return `<div class="card__img-placeholder">${SVG_BAR}</div>`;
}

// ── Card builder ─────────────────────────────
function fmt(val, unit = '') {
  return val != null ? `${val}${unit}` : '—';
}

function buildCard(product, index = 0) {
  const cp   = product.coles?.price ?? null;
  const wp   = product.woolworths?.price ?? null;
  const cwp  = product.chemistwarehouse?.price ?? null;
  const best = Math.min(cp ?? Infinity, wp ?? Infinity, cwp ?? Infinity);
  const ppd  = (product.protein && best < Infinity) ? (product.protein / best).toFixed(1) : null;

  function priceHTML(store, price, data) {
    if (!data) return `
      <div class="price-pill">
        <div class="price-pill__store">${store}</div>
        <div class="price-pill__na">N/A</div>
      </div>`;
    const cheapClass = price === best ? 'cheapest' : '';
    const saleClass  = data.onSale ? 'on-sale' : '';
    const was        = data.onSale
      ? `<div class="price-pill__was">was $${data.wasPrice?.toFixed(2)}</div>`
      : '';
    return `
      <div class="price-pill ${cheapClass} ${saleClass}">
        <div class="price-pill__store">${store}</div>
        <div class="price-pill__price">$${price.toFixed(2)}</div>
        ${was}
      </div>`;
  }

  const colesURL = cp != null
    ? (product.coles.url || `https://www.coles.com.au/search?q=${encodeURIComponent(product.name)}`)
    : null;
  const woolURL  = wp != null
    ? (product.woolworths.url || `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(product.name)}`)
    : null;
  const cwURL    = cwp != null
    ? (product.chemistwarehouse.url || `https://www.chemistwarehouse.com.au/search?q=${encodeURIComponent(product.name)}`)
    : null;

  return `
    <div class="card animate-in" style="animation-delay:${index * 0.05}s">
      <div class="card__clickable" onclick='openModal(${JSON.stringify(product)})'>
        ${cardImageHTML(product)}
        <div class="card__body">
          <div class="card__brand">
            ${product.brand}
            ${product.category && product.category !== 'bar' ? `<span class="cat-badge ${CAT_CLASS[product.category] || ''}">${CAT_LABEL[product.category] || product.category}</span>` : ''}
          </div>
          <div class="card__name">${product.name}</div>
          ${product.flavour ? `<div class="card__flavour">${product.flavour}</div>` : ''}
          ${product.protein ? `<div class="card__protein-badge">${product.protein}<span>g protein</span></div>` : ''}
          ${(() => {
            const _cheapStore = (typeof cheapestStore !== 'undefined') ? cheapestStore(product) : null;
            const _cheapP     = bestPrice(product);
            const _cheapLabel = _cheapStore === 'chemistwarehouse' ? 'Chemist WH' :
                                _cheapStore === 'coles'            ? 'Coles' :
                                _cheapStore === 'woolworths'        ? 'Woolworths' : '';
            return (_cheapP < Infinity && _cheapLabel)
              ? `<div class="card__cheapest"><span class="cheapest__price">$${_cheapP.toFixed(2)}</span><span class="cheapest__store"> at ${_cheapLabel}</span></div>`
              : '';
          })()}
          <div class="card__prices">
            ${priceHTML('Coles', cp, product.coles)}
            ${priceHTML('Woolworths', wp, product.woolworths)}
            ${priceHTML('CW', cwp, product.chemistwarehouse)}
          </div>
          <div class="card__ppd">
            <span class="ppd__label">Protein / $1</span>
            <span class="ppd__value">${ppd != null ? ppd + 'g' : '—'}</span>
          </div>
        </div>
        <div class="card__row-arrow">›</div>
      </div>
      <div class="card__buy">
        ${colesURL ? `<a href="${colesURL}" target="_blank" class="buy-btn buy-btn--coles">${SVG_CART} Coles</a>` : ''}
        ${woolURL  ? `<a href="${woolURL}"  target="_blank" class="buy-btn buy-btn--woolies">${SVG_CART} Woolworths</a>` : ''}
        ${cwURL    ? `<a href="${cwURL}"    target="_blank" class="buy-btn buy-btn--cw">${SVG_CART} CW</a>` : ''}
      </div>
    </div>`;
}

// ── Table row builder ─────────────────────────
function buildRow(product) {
  const cp   = product.coles?.price ?? null;
  const wp   = product.woolworths?.price ?? null;
  const cwp  = product.chemistwarehouse?.price ?? null;
  const best = Math.min(cp ?? Infinity, wp ?? Infinity, cwp ?? Infinity);
  const ppd  = (product.protein && best < Infinity) ? (product.protein / best).toFixed(1) : null;

  function cellHTML(price, data) {
    if (!data || price == null) return '<td class="price-cell">—</td>';
    const cheapClass = price === best ? 'cheapest' : '';
    const saleClass  = data.onSale ? 'sale' : '';
    const was        = data.onSale
      ? ` <span style="font-size:.72rem;text-decoration:line-through;opacity:.6">$${data.wasPrice?.toFixed(2)}</span>`
      : '';
    return `<td class="price-cell ${cheapClass} ${saleClass}">$${price.toFixed(2)}${was}</td>`;
  }

  const store = cheapestStore(product);
  const cheapStore =
    store === 'chemistwarehouse' ? '<span class="badge badge--cw">Chemist WH</span>' :
    store === 'coles'            ? '<span class="badge badge--coles">Coles</span>' :
    store === 'woolworths'       ? '<span class="badge badge--woolies">Woolworths</span>' :
                                   '<span class="badge badge--equal">Equal</span>';

  const thumb = product.image
    ? `<img src="${product.image}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;flex-shrink:0" onerror="this.style.display='none'" />`
    : `<div class="product-cell__thumb" style="display:flex;align-items:center;justify-content:center">${SVG_BAR}</div>`;

  return `
    <tr onclick='openModal(${JSON.stringify(product)})' title="Click for details">
      <td>
        <div class="product-cell">
          ${thumb}
          <div>
            <div class="product-cell__name">${product.name}</div>
            <div class="product-cell__flavour">${product.flavour ? product.flavour + ' · ' : ''}${product.brand}</div>
          </div>
        </div>
      </td>
      ${cellHTML(cp, product.coles)}
      ${cellHTML(wp, product.woolworths)}
      ${cellHTML(cwp, product.chemistwarehouse)}
      <td>${cheapStore}</td>
      <td class="ppd-cell">${ppd != null ? ppd + 'g / $1' : '—'}</td>
      <td><span style="font-family:var(--font-mono);font-size:.85rem">${fmt(product.protein, 'g')}</span></td>
      <td><span style="color:var(--accent);font-size:1rem;padding:0 .5rem">→</span></td>
    </tr>`;
}

// ── Loading skeleton ──────────────────────────
function buildSkeleton(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="card" style="opacity:.5">
      <div style="width:100%;aspect-ratio:3/2;background:var(--surface);animation:shimmer 1.5s infinite"></div>
      <div class="card__body">
        <div style="height:10px;width:40%;background:var(--surface);border-radius:4px;margin-bottom:.5rem"></div>
        <div style="height:14px;width:80%;background:var(--surface);border-radius:4px;margin-bottom:.25rem"></div>
        <div style="height:12px;width:55%;background:var(--surface);border-radius:4px;margin-bottom:1rem"></div>
        <div style="height:60px;background:var(--surface);border-radius:8px"></div>
      </div>
    </div>`).join('');
}

// ── Modal HTML ────────────────────────────────
const MODAL_HTML = `
<div class="overlay" id="modal-overlay">
  <div class="modal">
    <button class="modal__close" aria-label="Close">✕</button>
    <img class="modal__img" src="" alt="" style="width:100%;border-radius:10px;margin-bottom:1rem;object-fit:cover;max-height:200px;display:none" />
    <div class="modal__brand"></div>
    <div class="modal__title"></div>
    <div class="modal__flavour"></div>
    <div class="nutrition-grid">
      <div class="nutrition-item nutrition-item--protein">
        <span class="nutrition-item__val" data-nut="protein"></span>
        <span class="nutrition-item__label">Protein</span>
      </div>
      <div class="nutrition-item nutrition-item--calories">
        <span class="nutrition-item__val" data-nut="calories"></span>
        <span class="nutrition-item__label">Calories</span>
      </div>
      <div class="nutrition-item nutrition-item--carbs">
        <span class="nutrition-item__val" data-nut="carbs"></span>
        <span class="nutrition-item__label">Carbs</span>
      </div>
      <div class="nutrition-item nutrition-item--fat">
        <span class="nutrition-item__val" data-nut="fat"></span>
        <span class="nutrition-item__label">Fat</span>
      </div>
      <div class="nutrition-item nutrition-item--sugar">
        <span class="nutrition-item__val" data-nut="sugar"></span>
        <span class="nutrition-item__label">Sugar</span>
      </div>
      <div class="nutrition-item nutrition-item--ppd">
        <span class="nutrition-item__val" data-nut="ppd"></span>
        <span class="nutrition-item__label">Protein / $</span>
      </div>
    </div>
    <div class="modal__prices"></div>
  </div>
</div>`;

// ── Error banner ─────────────────────────────
function showErrorBanner(err) {
  const hint = err.hint || 'Make sure the server is running: <code>node server.js</code>, then open <a href="http://localhost:3000" style="color:var(--accent)">http://localhost:3000</a>';
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;background:#1a0a0a;border:1px solid var(--danger);border-radius:var(--radius);padding:1rem 1.5rem;max-width:520px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.5)';
  banner.innerHTML = `
    <div style="display:flex;gap:.75rem;align-items:flex-start">
      <span style="flex-shrink:0;color:var(--danger)">${SVG_WARNING}</span>
      <div>
        <div style="font-weight:700;margin-bottom:.35rem;color:var(--danger)">Couldn't load live data</div>
        <div style="font-size:.85rem;color:var(--text-sec);line-height:1.6">${hint}</div>
      </div>
      <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;color:var(--text-sec);cursor:pointer;font-size:1.1rem;flex-shrink:0;padding:0">✕</button>
    </div>`;
  document.body.appendChild(banner);
}

// ── loadProducts — use this on every page ────
// Wraps fetchProducts() with loading state + error handling.
// Usage: const products = await loadProducts();
async function loadProducts(loadingTargets = []) {
  // Show loading skeletons in any grid containers provided
  loadingTargets.forEach(el => {
    if (el) el.innerHTML = buildSkeleton(4);
  });

  try {
    const products = await fetchProducts();
    return products;
  } catch (err) {
    console.error('loadProducts failed:', err);
    showErrorBanner(err);
    // Clear skeletons
    loadingTargets.forEach(el => { if (el) el.innerHTML = ''; });
    return [];
  }
}

// ── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
  setActiveNav();
  initHamburger();
  initModal();
});

// ── PWA: Install prompt ───────────────────────
(function () {
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;
    // Don't show if already dismissed or installed
    if (localStorage.getItem('pwa-dismissed')) return;
    setTimeout(showInstallBanner, 3000);
  });

  function showInstallBanner() {
    const existing = document.getElementById('pwa-install-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-banner';
    banner.innerHTML = `
      <img class="pwa-banner__icon" src="favicon.png" alt="" />
      <div class="pwa-banner__text">
        <div class="pwa-banner__title">Add to Home Screen</div>
        <div class="pwa-banner__sub">Install for quick access, offline use</div>
      </div>
      <button class="pwa-banner__install" id="pwa-install-btn">Install</button>
      <button class="pwa-banner__close" id="pwa-dismiss-btn">✕</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
      if (!_deferredPrompt) return;
      _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      _deferredPrompt = null;
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    });
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      localStorage.setItem('pwa-dismissed', '1');
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    });
  }

  // iOS doesn't fire beforeinstallprompt — show a manual tip after 5s if on iOS Safari and not in standalone
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isIOS && !isStandalone && !localStorage.getItem('pwa-dismissed')) {
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.className = 'pwa-banner';
      banner.innerHTML = `
        <img class="pwa-banner__icon" src="favicon.png" alt="" />
        <div class="pwa-banner__text">
          <div class="pwa-banner__title">Add to Home Screen</div>
          <div class="pwa-banner__sub">Tap Share → "Add to Home Screen"</div>
        </div>
        <button class="pwa-banner__close" id="pwa-dismiss-btn">✕</button>
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
      document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        localStorage.setItem('pwa-dismissed', '1');
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 400);
      });
    }, 5000);
  }
})();

// ── PWA: Offline / online banner ──────────────
(function () {
  let bar = null;
  function getBar() {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'offline-bar';
      bar.innerHTML = '<div class="offline-bar__dot"></div><span>No internet — showing cached data</span>';
      document.body.appendChild(bar);
    }
    return bar;
  }
  function updateOnline() {
    if (navigator.onLine) {
      if (bar) { bar.classList.remove('show'); }
    } else {
      getBar().classList.add('show');
    }
  }
  window.addEventListener('online',  updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();
})();
