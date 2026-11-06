# Audit 2 — ads readiness, functionality and buyer view

**Date:** 2026-11-06
**Focus:** tracking and pixel setup, functionality bugs, buyer perspective, with the CHAM Brightening Face Mask as the ad landing page
**Method:** live testing in a real browser against theeditpk.com and the Shopify admin. Carts were added and cleared; no order was placed and no setting was changed except the Anti-Aging collection rule (below).

**Status: part 1.** Tracking, the CHAM mask funnel and schema are covered. Search, collection filters, mobile rendering and the full SEO re-check are not yet done.

---

## HIGH — the mask page publishes review markup the store's own rules forbid

`/products/brightening-face-mask` carries **two separate Product JSON-LD blocks**:

| Block | Source | Contains |
|---|---|---|
| 1 | Theme, in `<head>` | name, sku, brand, category, offers price `3999.00` |
| 2 | Judge.me app block inside `#reviews` | name, image, **`aggregateRating` 4.88 / 16 reviews**, **16 full `review` objects** |

Two Product entities describing one page is the duplicate-schema problem CLAUDE.md's first run asked about. Audit 1 reported no duplication, which was correct for the two pages checked then — ACM Depiwhite still has exactly one block and no `aggregateRating`, because Judge.me only emits its block where reviews exist. The duplication appears on reviewed products, which right now means the CHAM products.

**The reviews are real records in Judge.me, and they are visible on the page** — "4.9 out of 5 stars based on 16 reviews". This contradicts the project brief, which states the store has no reviews yet, and it contradicts audit 1, which recorded none. Both need correcting.

**What needs a human decision, stated as fact rather than accusation:** all 16 reviews are timestamped on 2026-10-24 within a single window of about three and a half hours, from 08:49 to 12:10 UTC. One review body is the single character `s`. The store has very few orders — the discount report shows one use on the active mask offer and two on an expired storewide one.

CLAUDE.md is explicit: no fake reviews or ratings, and Review/AggregateRating schema only after real reviews exist. If these came from real buyers, nothing here is wrong and the markup is an asset. If they were seeded, then publishing `aggregateRating` to Google is a fake-review rich-result violation, and it is also a Meta advertising policy risk on exactly the product you are about to put spend behind. **Confirm their origin before running ads.**

There is also an internal contradiction worth resolving either way: `layout/theme.liquid` hides the star badge with CSS —

```css
.jdgm-prev-badge__text, .product-reviews__summary-note, .main-product__rating { display: none !important; }
```

— commented "hidden for now", while the reviews section still displays the 4.9 average and Judge.me still publishes the rating to search engines. The badge is hidden from shoppers but the rating is not hidden from Google.

---

## Tracking and pixel setup — working

Verified live on the mask page.

| Check | Result |
|---|---|
| Meta pixel | `2840657352995594`, active |
| Conversions API | **Active** — Customer events lists Facebook & Instagram as both **Server** and **Web** |
| Data access | "Optimized" |
| PageView / ViewContent | Fire on load — pixel event count 2 |
| **AddToCart** | **Fires** — count 2 → 4 on click, cart confirmed at Rs 3,999 |
| Customer Privacy / consent API | Present |
| Judge.me pixel | Web, always on |

Web pixel plus Conversions API is the right setup; server-side events mitigate iOS signal loss. Nothing blocking here.

### Gaps

- **No GA4.** `gtag` is undefined and `dataLayer` is empty. Meta is the only analytics beyond Shopify's native reporting, so there is no independent view of what paid traffic does on site.
- **No TikTok pixel** — only relevant if that channel is planned.
- **Could not verify:** Meta catalog sync status, whether `InitiateCheckout` and `Purchase` fire, and whether the CHAM mask is approved in Meta commerce. The channel UI runs in a cross-origin iframe. Purchase can only be confirmed by a real order. Check catalog and product approval in Meta Commerce Manager directly — a product rejected there will not deliver however healthy the pixel is.
- **Shopify monorail returned HTTP 503** once during testing (`/.well-known/shopify/monorail/unstable/produce_batch`). Possibly transient; it affects Shopify's own analytics, not Meta.

---

## Functionality — the CHAM mask funnel works

Tested end to end, short of placing an order.

| Test | Result |
|---|---|
| Pack selector (Buy 1 / 2 / 3) | Correct. Selecting Buy 3 sets the quantity input to 3 and updates the displayed price to Rs 11,997 |
| Bonus item | Correct. Adds 3 masks plus 1 CHAM cream at `final_price` 0 |
| Cart total vs advertised | Exact match, Rs 11,997, discount "CHAM: buy 3 masks, get a free cream" |
| Cart drawer | Opens on add; header count updates |
| Console errors | None on the product page |

No functional bug found in this path.

### Display inconsistency

Selecting Buy 3 shows a struck-through **Rs 17,139** in the main price block while the pack tile for the same choice shows **Rs 14,296**. Two different "was" prices for one selection: Rs 17,139 is 3 × the mask's compare-at, Rs 14,296 is 3 masks plus the cream at selling price. Pick one basis.

### Performance drag on the ad landing page

Judge.me loads **60+ separate asset files** on product pages. On a page you are buying traffic to, that is a direct cost — it was the dominant source of requests in the network log. Worth checking whether the widget can be deferred or trimmed.

---

## Buyer view of the mask page

Reads well overall: 887 words, a clear H1, 12 genuine FAQs covering skin type, sensitivity, pore-clogging, ingredients, frequency, layering and originality.

Gaps for a cold visitor arriving from an ad:

- **No delivery window anywhere on the page.** Cash on delivery and free delivery are both mentioned, but not how long it takes. For CHAM the real answer is good — 1–2 days Lahore, 3–5 elsewhere — and it is a competitive advantage against the 14–21 day pharmacy-brand window. It should be on the page.
- **The 12 FAQs are not in schema.** They are hardcoded in `main-product.liquid`, while `sections/product-faq.liquid` renders proper FAQPage JSON-LD from the `custom.faqs` metafield, which is empty. The content exists and the machinery exists; they are not connected.

---

## Correction to audit 1

Audit 1 stated the store has no reviews and no `aggregateRating` anywhere. That was true of the pages sampled then but is **not true of the CHAM products**, which carry 16 reviews and published rating markup. The "no duplicate Product schema" finding is likewise narrower than stated: duplication occurs on every product with reviews.

---

## Still to do

Search, collection filters, mobile rendering, checkout-step events, and the full SEO re-check across page types.
