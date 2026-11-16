/**
 * Cart drawer controller.
 *
 * Open/close via `data-cart-trigger` (any element with this attribute opens
 * the drawer; clicking the overlay, an element with `data-cart-close`, or
 * pressing Escape closes it).
 *
 * Quantity steppers and item removal mutate the cart via Shopify's Ajax Cart
 * API (`/cart/change.js`). The drawer stays open across mutations: we update
 * the row's qty + line price, the total, and the count badge in place from
 * the JSON response. When the last item is removed we full-reload so the
 * empty state renders cleanly.
 */
(function () {
  'use strict';

  const drawer = document.querySelector('[data-cart-drawer]');
  if (!drawer) return;

  // Currency formatter — Cham is INR-only, no decimals (matches the React
  // formatPrice helper). The Shopify Ajax response gives prices as integer
  // paise; we divide by 100 before formatting.
  const moneyFormatter = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
  function formatMoney(cents) {
    return moneyFormatter.format(Math.round(cents) / 100);
  }

  // `inert` keeps the closed drawer out of the tab order and away from screen
  // readers; focus moves into the dialog on open and back to where it came
  // from on close. Tab is kept inside the panel while it is open (see keydown).
  let returnFocus = null;
  const isOpen = () => drawer.getAttribute('aria-hidden') === 'false';

  function open() {
    const wasOpen = isOpen();
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.setAttribute('data-drawer-open', 'true');
    document.documentElement.setAttribute('data-drawer-open', 'true');
    document.body.style.overflow = 'hidden';
    if (!wasOpen) {
      const a = document.activeElement;
      returnFocus = a && a !== document.body && !drawer.contains(a) ? a : null;
      const closeBtn = drawer.querySelector('.cart-drawer__close');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }
    loadUpsells();
    startDispatch();
    wireWhatsapp();
  }

  function close() {
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    document.body.removeAttribute('data-drawer-open');
    document.documentElement.removeAttribute('data-drawer-open');
    document.body.style.overflow = '';
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  // ---- Upsells ("You might also like") ----
  // Nothing is requested until the drawer is open. The row comes from
  // sections/cart-upsells.liquid via Section Rendering: Shopify's product
  // recommendations for the first cart item, else the fallback collection.
  // Cached per product for the visit; products already in the cart are
  // dropped here, since the cart changes under the cached HTML.
  const upsellCache = Object.create(null);
  const upsellInflight = Object.create(null);

  function getText(url) {
    return fetch(url, { credentials: 'same-origin' }).then((r) => (r.ok ? r.text() : ''));
  }

  function fetchUpsells(pid, fallback, limit, pair) {
    if (pair) return getText('/products/' + encodeURIComponent(pair) + '?section_id=cart-upsells').catch(() => '');
    const recUrl = '/recommendations/products?section_id=cart-upsells&intent=related&limit=' +
      encodeURIComponent(limit) + '&product_id=' + encodeURIComponent(pid);
    return getText(recUrl).then((html) => {
      if (html.indexOf('class="cart-upsell"') !== -1 || !fallback) return html;
      return getText('/collections/' + encodeURIComponent(fallback) + '?section_id=cart-upsells');
    }).catch(() => '');
  }

  function fillUpsells(html) {
    const slot = drawer.querySelector('[data-cart-upsells]');
    if (!slot) return;
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const content = doc.querySelector('[data-cart-upsells-content]');
    const inCart = new Set(Array.from(drawer.querySelectorAll('.cart-drawer__item[data-product-id]'))
      .map((li) => li.getAttribute('data-product-id')));
    if (content) {
      content.querySelectorAll('.cart-upsell').forEach((card) => {
        if (inCart.has(card.getAttribute('data-product-id'))) card.remove();
      });
    }
    slot.innerHTML = '';
    if (!content || !content.querySelector('.cart-upsell')) {
      slot.hidden = true;
      return;
    }
    slot.hidden = false;
    slot.appendChild(content);
    updateArrows(slot);
  }

  function loadUpsells() {
    if (!isOpen()) return;
    const slot = drawer.querySelector('[data-cart-upsells]');
    if (!slot || slot.hasAttribute('data-filled')) return;
    const pid = slot.getAttribute('data-product-id');
    if (!pid) { slot.hidden = true; return; }
    const fallback = slot.getAttribute('data-fallback') || '';
    const limit = slot.getAttribute('data-limit') || '8';
    const pair = slot.getAttribute('data-pair') || '';
    const key = pid + '|' + fallback + '|' + limit + '|' + pair;
    slot.setAttribute('data-filled', '');
    if (key in upsellCache) { fillUpsells(upsellCache[key]); return; }
    if (!upsellInflight[key]) {
      upsellInflight[key] = fetchUpsells(pid, fallback, limit, pair).then((html) => {
        upsellCache[key] = html;
        delete upsellInflight[key];
        return html;
      });
    }
    upsellInflight[key].then(() => {
      // The drawer may have re-rendered meanwhile; fill whichever slot is current.
      const current = drawer.querySelector('[data-cart-upsells]');
      if (current && current.getAttribute('data-product-id') === pid &&
          (current.getAttribute('data-pair') || '') === pair) fillUpsells(upsellCache[key]);
    });
  }

  function updateArrows(scope) {
    const track = scope.querySelector('.cart-upsells__track');
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth - 2;
    const arrows = scope.querySelector('.cart-upsells__arrows');
    if (arrows) arrows.hidden = max <= 0;
    scope.querySelectorAll('[data-upsell-scroll]').forEach((btn) => {
      const dir = parseInt(btn.getAttribute('data-upsell-scroll'), 10);
      btn.disabled = dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
    });
    if (!track.hasAttribute('data-arrows-bound')) {
      track.setAttribute('data-arrows-bound', '');
      let raf = 0;
      track.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => updateArrows(scope));
      }, { passive: true });
    }
  }

  drawer.addEventListener('click', (e) => {
    const arrow = e.target.closest('[data-upsell-scroll]');
    if (!arrow) return;
    const track = drawer.querySelector('.cart-upsells__track');
    if (!track) return;
    const dir = parseInt(arrow.getAttribute('data-upsell-scroll'), 10);
    track.scrollBy({ left: dir * track.clientWidth * 0.85 });
  });

  // ---- Same-day dispatch timer (CHAM only; markup in snippets/cart-drawer.liquid) ----
  // Counts down to the owner's real daily dispatch cutoff in Pakistan time
  // (UTC+5, no daylight saving), whatever the shopper's own clock zone. Past
  // the cutoff, or on a non-dispatch day, it says when the order will ship.
  // Minute resolution; it only ticks while the drawer is open.
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let dispatchTimer = 0;

  function setDispatchText(target, before, strong, after) {
    target.textContent = before;
    const b = document.createElement('strong');
    b.textContent = strong;
    target.appendChild(b);
    target.appendChild(document.createTextNode(after));
  }

  function updateDispatch() {
    const el = drawer.querySelector('[data-cart-dispatch]');
    if (!el) return false;
    const text = el.querySelector('[data-cart-dispatch-text]');
    const cutoff = parseInt(el.getAttribute('data-cutoff'), 10) || 18;
    const days = (el.getAttribute('data-days') || '').split(',').map(Number);
    const pkt = new Date(Date.now() + 5 * 3600 * 1000);
    const dow = pkt.getUTCDay();
    const secs = pkt.getUTCHours() * 3600 + pkt.getUTCMinutes() * 60 + pkt.getUTCSeconds();
    const left = Math.floor((cutoff * 3600 - secs) / 60);
    if (days.indexOf(dow) !== -1 && cutoff * 3600 - secs > 0) {
      const h = Math.floor(left / 60);
      const m = left % 60;
      if (left < 1) {
        setDispatchText(text, 'Order in the next ', 'minute', ' and it ships today');
      } else {
        const span = h ? h + 'h' + (m ? ' ' + m + 'm' : '') : m + 'm';
        setDispatchText(text, 'Order within ', span, ' and it ships today');
      }
    } else {
      let k = 1;
      while (k < 8 && days.indexOf((dow + k) % 7) === -1) k++;
      if (k >= 8) { el.hidden = true; return false; }
      setDispatchText(text, 'Order now and it ships ', k === 1 ? 'tomorrow' : 'on ' + DAY_NAMES[(dow + k) % 7], '');
    }
    el.hidden = false;
    return true;
  }

  function startDispatch() {
    if (!updateDispatch() || dispatchTimer) return;
    dispatchTimer = setInterval(() => {
      if (!isOpen() || !updateDispatch()) {
        clearInterval(dispatchTimer);
        dispatchTimer = 0;
      }
    }, 15000);
  }

  // ---- Order on WhatsApp ----
  // The number lives in one place: the floating WhatsApp button (Footer
  // group). This link borrows it and opens the chat with the cart already
  // typed (data-text, written by snippets/cart-drawer.liquid). No floating
  // button, or one pointing at a custom link: the link stays hidden.
  function wireWhatsapp() {
    const link = drawer.querySelector('[data-cart-whatsapp]');
    if (!link) return;
    const float = document.querySelector('a.whatsapp-float[href]');
    let base = '';
    try {
      const u = new URL(float.href);
      if (u.hostname === 'wa.me') base = u.origin + u.pathname;
    } catch (err) {}
    if (!base) return;
    link.href = base + '?text=' + encodeURIComponent(link.getAttribute('data-text') || '');
    link.hidden = false;
  }

  // Same Meta event as the floating button, so chat orders from the cart are
  // counted with the rest.
  drawer.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('[data-cart-whatsapp]');
    if (!link || typeof window.fbq !== 'function') return;
    try {
      window.fbq('track', 'Contact', { content_name: 'Cart drawer' }, {
        eventID: 'edit-wa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      });
    } catch (err) {}
  });

  // ---- After every server re-render of the drawer (layout/theme.liquid) ----
  const live = drawer.querySelector('[data-cart-live]');
  document.addEventListener('cart-drawer:rendered', () => {
    loadUpsells();
    wireWhatsapp();
    if (isOpen()) startDispatch();
    if (!live || !isOpen()) return;
    const count = drawer.querySelector('[data-cart-count-sync]');
    const total = drawer.querySelector('.cart-drawer__total-amount');
    const n = count ? count.getAttribute('data-cart-count-sync') : '';
    live.textContent = n === '0'
      ? 'Cart updated. Your cart is empty.'
      : 'Cart updated. ' + n + (n === '1' ? ' item' : ' items') +
        (total ? ', total ' + total.textContent.trim() : '') + '.';
  });

  // Apply a fresh cart object to the drawer in place: per-line qty + line
  // price, the bottom total, and the header count badge.
  function applyCart(cart, changedRow, removed) {
    if (removed && changedRow) {
      changedRow.remove();
    } else if (changedRow) {
      const lineKey = changedRow.getAttribute('data-line-key');
      const item = (cart.items || []).find((it) => it.key === lineKey) || (cart.items || []).find((it) => String(it.key).split(':')[0] === lineKey.split(':')[0]);
      if (item) {
        const qtyEl = changedRow.querySelector('.cart-drawer__qty-value');
        const linePriceEl = changedRow.querySelector('.cart-drawer__item-line-price');
        if (qtyEl) qtyEl.textContent = item.quantity;
        if (linePriceEl) linePriceEl.textContent = formatMoney(item.final_line_price); changedRow.setAttribute('data-line-key', item.key);
      }
      changedRow.removeAttribute('data-loading');
    }

    // Bottom total.
    const totalEl = drawer.querySelector('.cart-drawer__total-amount');
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
  // Total savings row: read the server-computed value from the cart page so it always matches line prices.
  // Section Rendering instead of the whole cart page: 7 KB and ~340ms rather
    // than 242 KB and ~545ms, for the one value read out of it below.
    fetch('/cart?sections=cart&cb=' + Date.now(), { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      var h = (j && j.cart) || '';
    var doc = new DOMParser().parseFromString(h, 'text/html');
    var src = doc.querySelector('.main-cart__row--saved');
    var row = drawer.querySelector('.cart-drawer__row--saved');
    var totals = drawer.querySelector('.cart-drawer__totals');
    if (src) {
      var val = src.lastElementChild.textContent;
      if (row) { row.lastElementChild.textContent = val; }
      else if (totals) {
        row = document.createElement('div');
        row.className = 'cart-drawer__row cart-drawer__row--saved';
        row.setAttribute('style', 'color:var(--primary);font-weight:600');
        row.innerHTML = '<span>Total savings</span><span></span>';
        row.lastElementChild.textContent = val;
        totals.insertBefore(row, totals.firstChild);
      }
    } else if (row) { row.remove(); }
  }).catch(function () {});

    // Drawer header count and global cart-trigger badges.
    const countText = drawer.querySelector('[data-cart-count-text]');
    if (countText) {
      countText.textContent = cart.item_count > 0 ? '(' + cart.item_count + ')' : '';
    }
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = cart.item_count;
      el.setAttribute('data-cart-count', cart.item_count);
    });
const dl = drawer.querySelector('.cart-drawer__applied-discounts'); if (dl) { const tot = {}; (cart.items || []).forEach((it) => (it.discounts || []).forEach((d) => { tot[d.title] = (tot[d.title] || 0) + d.amount; })); if (!Object.keys(tot).length) { (cart.cart_level_discount_applications || []).forEach((d) => { tot[d.title] = d.total_allocated_amount; }); } dl.innerHTML = ''; Object.keys(tot).forEach((t) => { if (!t || !isFinite(tot[t])) return; const li = document.createElement('li'); li.textContent = t + ' · −' + formatMoney(tot[t]); dl.appendChild(li); }); }
    // Empty cart needs the full empty-state markup — reload for that one case.
    if (cart.item_count === 0) {
      window.location.assign(window.location.pathname + '?cart=open');
    }
  }

  // Open: any element with data-cart-trigger
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-cart-trigger]');
    if (trigger) {
      e.preventDefault();
      open();
      return;
    }
    const closer = e.target.closest('[data-cart-close]');
    if (closer && drawer.contains(closer)) {
      // For navigation links (anchors with a real href), let the browser
      // navigate. The next page load renders the drawer in its default
      // closed state, so no explicit close() is needed.
      const isNavLink = closer.tagName === 'A'
        && closer.getAttribute('href')
        && closer.getAttribute('href') !== '#';
      if (isNavLink) return;
      e.preventDefault();
      close();
      return;
    }
  });

  // Esc closes; Tab stays inside the open panel.
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = drawer.querySelector('.cart-drawer__panel');
    const focusables = Array.from(panel.querySelectorAll(
      'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary'
    )).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!panel.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Qty stepper + remove — in-place rehydration via /cart/change.js JSON.
  // We identify the line by its key (stable) rather than line index, because
  // the gift wrap product is hidden from the items list — DOM position no
  // longer matches Shopify's 1-based line numbering.
  drawer.addEventListener('click', async (e) => {
    const qtyBtn = e.target.closest('[data-cart-qty]');
    const removeBtn = e.target.closest('[data-cart-remove]');
    if (!qtyBtn && !removeBtn) return;

    e.preventDefault();
    const target = qtyBtn || removeBtn;
    const row = target.closest('[data-line-key]');
    if (!row) return;

    const lineKey = row.getAttribute('data-line-key');
    if (!lineKey) return;

    let newQty;
    if (qtyBtn) {
      const delta = parseInt(qtyBtn.getAttribute('data-delta'), 10);
      const current = parseInt(row.querySelector('.cart-drawer__qty-value').textContent, 10) || 0;
      newQty = Math.max(0, current + delta);
    } else {
      newQty = 0;
    }

    row.setAttribute('data-loading', 'true');
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lineKey, quantity: newQty }),
      });
      if (!res.ok) throw new Error('Cart change failed: ' + res.status);
      const cart = await res.json();
      applyCart(cart, row, newQty === 0);
    } catch (err) {
      console.error('Cart change failed', err);
      row.removeAttribute('data-loading');
    }
  });

  // Open the drawer automatically if a `?cart=open` query param is present
  // (useful after add-to-cart redirects from product/quick-add forms in future).
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('cart') === 'open') {
    open();
  }

  // Discount form — apply via Shopify's /discount/<code>?redirect=... URL.
  // We round-trip through a redirect so Shopify can validate and apply server-side.
  // After return, if the attempted code didn't land in the applied list we
  // surface the error inline (matches the prod-site UX).
  // Delegated, because the drawer's markup is replaced on every cart change.
  drawer.addEventListener('submit', (e) => {
    const discountForm = e.target.closest('[data-discount-form]');
    if (!discountForm) return;
    {
      e.preventDefault();
      const input = discountForm.querySelector('[data-discount-input]');
      if (!input) return;
      const code = input.value.trim();
      if (!code) return;
      const redirect = window.location.pathname + '?cart=open&attempted_discount=' + encodeURIComponent(code);
      window.location.assign('/discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(redirect));
    }
  });

  // After a discount redirect, compare the attempted code against the applied
  // discounts rendered server-side. If absent, show the error message. Either
  // way, expand the discount section so the user sees the outcome.
  const attempted = urlParams.get('attempted_discount');
  if (attempted) {
    const discountDetails = drawer.querySelector('.cart-drawer__discount');
    if (discountDetails) discountDetails.open = true;
    const applied = Array.from(drawer.querySelectorAll('.cart-drawer__applied-discounts li'))
      .map((li) => li.textContent.toLowerCase());
    const wasApplied = applied.some((text) => text.includes(attempted.toLowerCase()));
    if (!wasApplied) {
      const errorEl = drawer.querySelector('[data-discount-error]');
      if (errorEl) errorEl.hidden = false;
    }
    // Clean up the URL after we've consumed the param.
    const url = new URL(window.location);
    url.searchParams.delete('attempted_discount');
    url.searchParams.delete('cart');
    window.history.replaceState({}, '', url.toString());
  } else if (urlParams.get('cart') === 'open') {
    // Clean cart param even when there's no attempted_discount.
    const url = new URL(window.location);
    url.searchParams.delete('cart');
    window.history.replaceState({}, '', url.toString());
  }

  // ---- Gift message ----
  // Save the textarea contents to the `Gift Message` cart
  // attribute. Debounce while typing (600ms idle) and force-save on blur, so
  // we don't spam /cart/update.js but never lose the latest value.
  const messageInput = drawer.querySelector('[data-cart-gift-message]');
  const messageCount = drawer.querySelector('[data-cart-gift-message-count]');
  const messageStatus = drawer.querySelector('[data-cart-gift-message-status]');
  if (messageInput) {
    let messageTimer = null;
    let lastSavedMessage = messageInput.value;

    async function saveMessage() {
      const value = messageInput.value;
      if (value === lastSavedMessage) return;
      try {
        await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ attributes: { 'Gift Message': value } }),
        });
        lastSavedMessage = value;
        if (messageStatus) {
          messageStatus.hidden = false;
          setTimeout(() => { messageStatus.hidden = true; }, 1800);
        }
      } catch (err) {
        console.error('Save gift message failed', err);
      }
    }

    messageInput.addEventListener('input', () => {
      if (messageCount) messageCount.textContent = String(messageInput.value.length);
      if (messageStatus) messageStatus.hidden = true;
      clearTimeout(messageTimer);
      messageTimer = setTimeout(saveMessage, 600);
    });

    messageInput.addEventListener('blur', () => {
      clearTimeout(messageTimer);
      saveMessage();
    });
  }
  // Public API: lets other scripts (e.g. the product form's Add to Bag handler)
  // update the badge/totals and open the drawer via AJAX, without a reload.
  window.CartDrawer = { open: open, close: close, applyCart: applyCart };

  // Add-to-cart integration: the product form's inline script dispatches
  // these custom events after a successful `/cart/add.js` POST rather than
  // calling window.CartDrawer directly. Listen here and react by pulling
  // fresh cart state and updating the badge/drawer via AJAX -- no reload.
  document.addEventListener('cart:refresh', async () => {
  try {
  const res = await fetch('/cart.js');
  const cart = await res.json();
  // layout/theme.liquid replaces CartDrawer.applyCart with its own painter.
  (window.CartDrawer.applyCart || applyCart)(cart);
  } catch (err) {
  console.error('Cart refresh failed', err);
  }
  });
  document.addEventListener('cart:open', () => {
  open();
  });
})();
