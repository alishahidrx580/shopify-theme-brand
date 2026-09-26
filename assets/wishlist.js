/**
 * Wishlist / save-for-later.
 *
 * Guest-only by design: saved products live in localStorage under one key, as
 * an array of light entries ({ handle, variantId, title, price, image }). No
 * customer account or app is involved, so the list persists per browser and
 * does not follow the shopper across devices.
 *
 * Surfaces, all wired up from here so that client-rendered cards (search
 * results are injected into `.er__grid` after load) get the same treatment as
 * Liquid-rendered ones:
 *   - a heart on every `a.product-card`
 *   - a heart beside Add to Bag on `[data-product-section]`
 *   - a header trigger + count badge, inserted before `[data-cart-trigger]`
 *   - a drawer listing saved items, with Add to Bag per row
 *
 * Add to Bag posts to `/cart/add.js` and then hands off to the cart drawer via
 * the `cart:refresh` / `cart:open` events it already listens for -- same
 * contract the product form uses, so no reload.
 */
(function () {
  'use strict';

  var KEY = 'theedit:wishlist:v1';

  /* ---------------- money ----------------
     Mirrors the Liquid in main-product.liquid / the product card: when there is
     a real compare-at price we show the price as-is, otherwise the theme shows
     a 10% "member" price. Formatting matches the storefront's money filter
     (Rs.1,234.56) rather than the cart drawer's PKR style, because these rows
     sit next to card prices in the shopper's head. */
  function formatMoney(cents) {
    return 'Rs.' + (Math.round(cents) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function displayPrice(price, compareAt) {
    if (typeof price !== 'number') return '';
    if (typeof compareAt === 'number' && compareAt > price) return formatMoney(price);
    return formatMoney(Math.round(price * 0.9));
  }

  /* ---------------- store ---------------- */
  function read() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(list)) return [];
      return list.filter(function (e) { return e && typeof e.handle === 'string' && e.handle; });
    } catch (err) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (err) {
      /* private mode / quota -- the UI still works for this page view. */
    }
    document.dispatchEvent(new CustomEvent('wishlist:change'));
  }

  function saved(handle) {
    return read().some(function (e) { return e.handle === handle; });
  }

  function toggle(entry) {
    var list = read();
    var i = -1;
    for (var n = 0; n < list.length; n++) {
      if (list[n].handle === entry.handle) { i = n; break; }
    }
    if (i > -1) {
      list.splice(i, 1);
    } else {
      list.unshift(entry);
    }
    write(list);
    return i === -1;
  }

  function remove(handle) {
    write(read().filter(function (e) { return e.handle !== handle; }));
  }

  /* ---------------- helpers ---------------- */
  function handleFromUrl(url) {
    if (!url) return '';
    var path = String(url).split('?')[0].split('#')[0];
    var i = path.indexOf('/products/');
    if (i === -1) return '';
    return path.slice(i + 10).replace(/\/.*$/, '');
  }

  function text(el) {
    return el ? el.textContent.trim() : '';
  }

  function heartSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M12 20.8C7.3 17.6 3 14.2 3 10.2A4.6 4.6 0 0 1 7.6 5.6c1.8 0 3.4 1 4.4 2.5 1-1.5 2.6-2.5 4.4-2.5A4.6 4.6 0 0 1 21 10.2c0 4-4.3 7.4-9 10.6Z"/>' +
      '</svg>';
  }

  function makeHeart(className, label) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wishlist-heart ' + className;
    btn.setAttribute('data-wishlist-toggle', '');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', label);
    btn.innerHTML = heartSvg();
    return btn;
  }

  function syncHeart(btn) {
    var on = saved(btn.getAttribute('data-wishlist-handle'));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var name = btn.getAttribute('data-wishlist-title') || 'this product';
    btn.setAttribute('aria-label', (on ? 'Remove ' : 'Save ') + name + (on ? ' from saved items' : ' for later'));
  }

  function syncAll() {
    document.querySelectorAll('[data-wishlist-toggle]').forEach(syncHeart);
    var count = read().length;
    document.querySelectorAll('[data-wishlist-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
    document.querySelectorAll('[data-wishlist-trigger]').forEach(function (el) {
      el.setAttribute('data-has-items', count > 0 ? 'true' : 'false');
      el.setAttribute('aria-label', count === 1 ? '1 saved item' : count + ' saved items');
    });
    var countText = document.querySelector('[data-wishlist-count-text]');
    if (countText) countText.textContent = count > 0 ? '(' + count + ')' : '';
  }

  /* ---------------- product cards ---------------- */
  function entryFromCard(card) {
    var quickAdd = card.querySelector('[data-quick-add]');
    var img = card.querySelector('.product-card__img');
    return {
      handle: handleFromUrl(card.getAttribute('href')),
      url: card.getAttribute('href') || '',
      variantId: quickAdd ? quickAdd.getAttribute('data-variant-id') : null,
      title: text(card.querySelector('.product-card__title')),
      price: text(card.querySelector('.product-card__price')),
      image: img ? (img.currentSrc || img.getAttribute('src') || '') : ''
    };
  }

  function decorateCards(root) {
    (root || document).querySelectorAll('a.product-card').forEach(function (card) {
      if (card.querySelector('[data-wishlist-toggle]')) return;
      var handle = handleFromUrl(card.getAttribute('href'));
      if (!handle) return;

      var media = card.querySelector('.product-card__media') || card;
      if (getComputedStyle(media).position === 'static') media.style.position = 'relative';

      var title = text(card.querySelector('.product-card__title'));
      var btn = makeHeart('wishlist-heart--card', 'Save ' + title + ' for later');
      btn.setAttribute('data-wishlist-handle', handle);
      btn.setAttribute('data-wishlist-title', title);
      media.appendChild(btn);
      syncHeart(btn);
    });
  }

  /* ---------------- product page ---------------- */
  function decorateProduct() {
    var section = document.querySelector('[data-product-section]');
    if (!section) return;

    var atc = section.querySelector('[data-atc]');
    if (!atc || section.querySelector('.wishlist-heart--product')) return;

    var handle = section.getAttribute('data-product-handle') || handleFromUrl(location.pathname);
    if (!handle) return;

    var idInput = section.querySelector('[data-product-form] input[name="id"]');
    var img = section.querySelector('.main-product__gallery img');
    var title = text(section.querySelector('.main-product__sticky-title')) ||
      text(section.querySelector('h1'));

    var btn = makeHeart('wishlist-heart--product', 'Save ' + title + ' for later');
    btn.setAttribute('data-wishlist-handle', handle);
    btn.setAttribute('data-wishlist-title', title);
    btn.setAttribute('data-wishlist-variant', idInput ? idInput.value : '');
    btn.setAttribute('data-wishlist-image', img ? (img.currentSrc || img.getAttribute('src') || '') : '');
    btn.setAttribute('data-wishlist-price', text(section.querySelector('[data-atc-price]')));

    /* Wrap the existing button so the heart sits on the same row without
       touching the Liquid that renders Add to Bag. */
    var row = document.createElement('div');
    row.className = 'main-product__atc-row';
    atc.parentNode.insertBefore(row, atc);
    row.appendChild(atc);
    row.appendChild(btn);
    syncHeart(btn);
  }

  function entryFromProductHeart(btn) {
    return {
      handle: btn.getAttribute('data-wishlist-handle'),
      url: '/products/' + btn.getAttribute('data-wishlist-handle'),
      variantId: btn.getAttribute('data-wishlist-variant') || null,
      title: btn.getAttribute('data-wishlist-title') || '',
      price: btn.getAttribute('data-wishlist-price') || '',
      image: btn.getAttribute('data-wishlist-image') || ''
    };
  }

  /* ---------------- header trigger ---------------- */
  function injectHeaderTrigger() {
    if (document.querySelector('[data-wishlist-trigger]')) return;
    var cartBtn = document.querySelector('.header__cart, [data-cart-trigger]');
    if (!cartBtn || !cartBtn.parentNode) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header__wishlist';
    btn.setAttribute('data-wishlist-trigger', '');
    btn.setAttribute('aria-label', 'Saved items');
    btn.innerHTML = heartSvg() +
      '<span class="header__wishlist-count" data-wishlist-count hidden>0</span>';
    cartBtn.parentNode.insertBefore(btn, cartBtn);
  }

  /* ---------------- drawer ---------------- */
  var drawer = null;

  function buildDrawer() {
    if (drawer) return drawer;
    drawer = document.createElement('div');
    drawer.className = 'wishlist-drawer';
    drawer.setAttribute('data-wishlist-drawer', '');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = [
      '<div class="wishlist-drawer__overlay" data-wishlist-close></div>',
      '<aside class="wishlist-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="wishlist-drawer-title">',
      '  <header class="wishlist-drawer__header">',
      '    <p class="wishlist-drawer__title font-display" id="wishlist-drawer-title">Saved for later ',
      '      <span class="wishlist-drawer__count" data-wishlist-count-text></span></p>',
      '    <button type="button" class="wishlist-drawer__close" data-wishlist-close aria-label="Close saved items">&times;</button>',
      '  </header>',
      '  <div class="wishlist-drawer__body" data-wishlist-body></div>',
      '</aside>'
    ].join('');
    document.body.appendChild(drawer);
    return drawer;
  }

  function renderDrawer() {
    var body = buildDrawer().querySelector('[data-wishlist-body]');
    var list = read();

    if (!list.length) {
      body.innerHTML = '<div class="wishlist-drawer__empty">' +
        '<p class="wishlist-drawer__empty-heading font-display">Nothing saved yet</p>' +
        '<p>Tap the heart on any product to keep it here for later.</p>' +
        '</div>';
      return;
    }

    body.innerHTML = list.map(function (e) {
      var img = e.image
        ? '<img class="wishlist-item__img" src="' + e.image + '" alt="" loading="lazy">'
        : '';
      var addable = e.variantId && e.available !== false;
      return '<div class="wishlist-item" data-wishlist-row="' + e.handle + '">' +
        '<a class="wishlist-item__media" href="' + (e.url || '/products/' + e.handle) + '">' + img + '</a>' +
        '<div class="wishlist-item__body">' +
        '<a class="wishlist-item__title" href="' + (e.url || '/products/' + e.handle) + '">' + e.title + '</a>' +
        '<span class="wishlist-item__price">' + (e.price || '') + '</span>' +
        '<div class="wishlist-item__actions">' +
        '<button type="button" class="wishlist-item__add" data-wishlist-add="' + (e.variantId || '') + '"' +
        (addable ? '' : ' disabled') + '>' + (addable ? 'Add to bag' : 'Sold out') + '</button>' +
        '<button type="button" class="wishlist-item__remove" data-wishlist-remove="' + e.handle + '">Remove</button>' +
        '</div></div></div>';
    }).join('');
  }

  /* Prices and availability can move between visits, so refresh each saved
     product from its own JSON when the drawer opens. */
  function refreshEntries() {
    var list = read();
    if (!list.length) return Promise.resolve();

    return Promise.all(list.map(function (e) {
      return fetch('/products/' + e.handle + '.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) {
          if (!p) return e;
          var variant = p.variants && p.variants[0];
          return {
            handle: e.handle,
            url: p.url || e.url,
            variantId: variant ? String(variant.id) : e.variantId,
            title: p.title || e.title,
            price: displayPrice(p.price, p.compare_at_price) || e.price,
            image: p.featured_image || e.image,
            available: !!p.available
          };
        })
        .catch(function () { return e; });
    })).then(function (fresh) {
      try {
        localStorage.setItem(KEY, JSON.stringify(fresh));
      } catch (err) { /* ignore */ }
    });
  }

  function openDrawer() {
    renderDrawer();
    buildDrawer().setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    syncAll();
    refreshEntries().then(function () {
      if (drawer && drawer.getAttribute('aria-hidden') === 'false') renderDrawer();
    });
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function addToBag(btn) {
    var id = btn.getAttribute('data-wishlist-add');
    if (!id || btn.disabled) return;
    btn.setAttribute('data-loading', 'true');

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ items: [{ id: Number(id), quantity: 1 }] })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Add to cart failed');
        return r.json();
      })
      .then(function () {
        btn.removeAttribute('data-loading');
        /* Hand off to the cart drawer exactly as the product form does. */
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        closeDrawer();
        document.dispatchEvent(new CustomEvent('cart:open'));
      })
      .catch(function (err) {
        btn.removeAttribute('data-loading');
        console.error('Wishlist add to bag failed', err);
      });
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (e) {
    var heart = e.target.closest('[data-wishlist-toggle]');
    if (heart) {
      /* Cards are anchors -- stop the click becoming a navigation. */
      e.preventDefault();
      e.stopPropagation();
      var card = heart.closest('a.product-card');
      toggle(card ? entryFromCard(card) : entryFromProductHeart(heart));
      return;
    }

    if (e.target.closest('[data-wishlist-trigger]')) {
      e.preventDefault();
      openDrawer();
      return;
    }

    if (e.target.closest('[data-wishlist-close]')) {
      e.preventDefault();
      closeDrawer();
      return;
    }

    var addBtn = e.target.closest('[data-wishlist-add]');
    if (addBtn) {
      e.preventDefault();
      addToBag(addBtn);
      return;
    }

    var removeBtn = e.target.closest('[data-wishlist-remove]');
    if (removeBtn) {
      e.preventDefault();
      remove(removeBtn.getAttribute('data-wishlist-remove'));
      renderDrawer();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.getAttribute('aria-hidden') === 'false') closeDrawer();
  });

  document.addEventListener('wishlist:change', function () {
    syncAll();
    if (drawer && drawer.getAttribute('aria-hidden') === 'false') renderDrawer();
  });

  /* Another tab changed the list. */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) syncAll();
  });

  /* ---------------- boot ---------------- */
  function decorateAll() {
    decorateCards(document);
    decorateProduct();
    injectHeaderTrigger();
    syncAll();
  }

  function start() {
    decorateAll();
    /* Search results and any other async card rendering. */
    new MutationObserver(function (mutations) {
      var needs = mutations.some(function (m) { return m.addedNodes && m.addedNodes.length; });
      if (needs) {
        decorateCards(document);
        syncAll();
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.Wishlist = { open: openDrawer, close: closeDrawer, read: read, toggle: toggle };
})();
 */