# Deployment state — read before touching the theme

**Last updated:** 2026-11-12

## The live site and GitHub do not match

The live theme is **`shopify-theme-brand/main` (#160960577764)** and it is **connected to GitHub**, so in normal operation a commit to `main` deploys to the live site.

That is not how the current contents got there. The branch below was pushed straight to the live theme with the Shopify CLI. It has since also been pushed to GitHub as `seo-fixes`, so the work is no longer only on this machine, but `main` still does not contain it.

| Where | What it holds |
|---|---|
| **Live site** | Every commit on `seo-fixes` up to `af84d2d` |
| **GitHub `main`** | `be5aa3a` — none of it |
| **`origin/seo-fixes`** | 54 commits ahead of `main`, awaiting merge |

### The Buy Now fallback was reverted, not shipped

`ab536ae` ("Add a Buy Now AddToCart fallback") was never put live and has
since been reverted by `eafc95c`, because it lived in
`sections/main-product.liquid` and was blocking every deploy of that
file. The work is preserved in history: reverting `eafc95c` restores it
when there is time to measure the behaviour properly. `ab536ae`'s commit
message records what is unresolved.

Confirmed on the live product page after the `fa5efe1` push: neither
`metaAddToCartThenCheckout` nor `__editAtcWatch` is present.

### The risk

**A commit to `main`, or any GitHub re-sync, will overwrite everything now live.** Shopify treats the connected branch as the source of truth; it does not know the live theme was changed out of band.

### How to close it

Merge `seo-fixes` into `main`. The branch is already on GitHub, so this is a pull request away. Once `main` contains these commits, GitHub and the live theme agree again and the normal pipeline resumes. The merge is the owner's to make.

Until that happens, treat the live theme as the only complete copy, and do not let anyone push to `main`.

## What was deployed

Verified on the live site after the push:

- Homepage title `THE EDIT | Original Imported Skincare in Pakistan`, was `THE EDIT`
- Homepage meta description, 147 characters, was absent
- Organization + WebSite + SearchAction JSON-LD on the homepage, was none
- Product schema price `19980`, matching the charged price; it previously published the pre-discount `22200`
- Product + Brand + Offer + BreadcrumbList on product pages
- Collection H1 now the collection's own title; CollectionPage + ItemList + BreadcrumbList schema
- `google-site-verification` meta tag, driven by the theme setting

Search Console is verified and `https://theeditpk.com/sitemap.xml` is submitted (status Success).

### Deployed 2026-11-08 (`779b6e7`, two files)

Verified on the live product page with the preview cookie cleared:

- WhatsApp float sends Meta's standard `Contact` event — observed firing with
  `content_ids [67387891286244]` and `content_name "BRIGHTENING FACE MASK"`.
- Its prefilled message on product pages reads "Hi! I'd like to order the
  BRIGHTENING FACE MASK." with the product URL appended and no `+` signs.
  Non-product pages keep the generic greeting; checked on the homepage.
- `og:price:amount` is now `3999.0` instead of `3,999`. Non-product pages
  emit no `og:price` tags at all, which is correct.

### Currency display changed 2026-11-08 — "Rs." to "PKR"

Google published the CHAM mask's price in search as **₹7,438.00**: an
Indian-rupee symbol, and a Buy-2 pack price rather than the unit price.

The cause was not Merchant Center. There is no Google sales channel on
this store and Markets holds only Pakistan, so Shopify feeds Google
nothing. Google was extracting a price from the page itself, and "Rs." is
shared by the Indian, Pakistani, Sri Lankan and Nepali rupee — Google
resolved it to INR.

Fixed in two places:

1. **Settings > General > Currency formatting**, all four fields, from
   `Rs. {{amount_no_decimals}}` to `PKR {{amount_no_decimals}}`. This is
   a shop setting, not theme code, so it is not captured in this repo.
2. **Four hardcoded prefixes** the setting could not reach, because they
   build price strings in JavaScript rather than using the money filter
   (`5657471`, `fa5efe1`):
   - `assets/wishlist.js` `formatMoney()`
   - `sections/edit-search.liquid` price-bucket filter labels
   - `sections/edit-search.liquid` `money()` — every search result price
   - `sections/main-product.liquid` `fmt()` — the CHAM pack prices, and
     the literal source of the "Rs. 7,438" Google published

Verified live: product page 11/11 prices PKR, search results 32/32 PKR,
zero visible "Rs." after selecting each of the three CHAM packs. The
Product JSON-LD and `og:price` tags were never affected — they carry the
ISO code, not the symbol.

Two `"unit": "Rs"` strings remain in `sections/main-product.liquid` and
`config/settings_schema.json`. Those are range-setting labels in the
theme editor, admin-facing only, and deliberately left alone.

Google re-crawls on its own schedule, so the ₹ snippet can persist for
days. If it survives a re-crawl, the next suspect is the second
`Product` node Judge.me injects client-side with the same `@id` and no
`offers`, which is also what publishes the unverified `aggregateRating`.

### Cart drawer opened late — fixed 2026-11-08 (`23d8b86`)

Adding to cart felt unresponsive: the drawer appeared 729-1096ms after the
click with nothing on screen in between. Measured on live, three samples each:

| Request | ms |
|---|---|
| `POST /cart/add.js` | 677 / 2235 / 672 |
| `GET /cart.js` | 289 / 245 / 266 |
| `GET /cart?view=drawer` | 319 / 512 / 254 |
| `GET /cart` (full page) | 1044 / 1961 / 396 |

The add request dominates and is Shopify's, not ours. What the theme controlled
was that all of it ran before anything appeared. The drawer now opens
immediately in a busy state (`data-cart-adding` on `<html>`, styled as section
26 of polish.css) and fills in when the cart responds. Buy Now is excluded.

The full cart-page fetch that existed only to read the "Total savings" row was
replaced with Section Rendering of that one section: 242 KB and ~545ms becomes
7 KB and ~336ms. Both copies were updated.

Verified on live after the push: drawer visible at 50 / 54 / 76 ms, busy state
cleared at 1135-2420ms when the cart lands, totals and savings correct.

### `sections/main-product.liquid` has a dead add-to-cart path

Read this before touching add-to-cart. That section defines its own
`addToCart()`, but `layout/theme.liquid` registers a **capture-phase** `submit`
listener that calls `stopImmediatePropagation()`, so the section's handler never
runs. `submitForm()` in layout/theme.liquid is the live path.

Two changes were made in that dead code before this was noticed: the reverted
Buy Now fallback (`ab536ae`), and a first attempt at this drawer fix. Neither
had any effect on the storefront. `ab536ae`'s commit message blames a race for
the missing Buy Now AddToCart; the real reason that code never fired is that it
was never reached.


## Two bugs that only a preview caught

Both were found by pushing to an unpublished theme first. Keep doing that.

1. **Liquid parse error.** `{search_term_string}` was written inside a `{{ }}` output tag in `snippets/schema-organization.liquid`; its closing brace terminated the tag early and Shopify rejected the file on upload. `shopify theme check` passed it clean — the server parser is stricter than the linter.
2. **Schema discount never applied.** `snippets/schema-product.liquid` compared `variant.compare_at_price` with `variant.price` directly. That field is nil on every product outside the CHAM pair, Liquid will not compare nil with a number, so the test was always false and the pre-discount price shipped. The preview showed Rs 19,980 on the page against `22200` in the schema.

## Still outstanding on the live site

- **No `og:image`.** The fallback chain needs an image in the SEO panel (Brand logo, or Default social share image). Until one is set, shares on WhatsApp and Facebook carry no preview image.
- **Homepage has no `<h1>`.** Raised in audit 1, still unfixed.
- **Collection meta descriptions are empty**, because the fallback reads `collection.description` and the collections have none.
- **CHAM mask review markup.** 16 reviews, all timestamped inside one 3.5-hour window on 2026-10-24, publishing `aggregateRating` 4.88 to Google. See `seo-reports/audit-2.md`.

## Verifying against the live site

Two traps, both hit during this work:

1. **The preview cookie outlives the URL.** A `preview_theme_id` cookie keeps serving an unpublished theme with no preview bar on the page. It surfaced only when a Buy Now redirect carried `?preview_theme_id=` into the checkout URL. Clear it by loading `https://theeditpk.com/?preview_theme_id=` with an empty value, then confirm `document.cookie` holds no `preview_theme`, no `.shopify-preview-bar` exists, and no link on the page carries the parameter.
2. **MSYS `sed` and `grep` lie about CR on these files.** `grep -c '$'` reported every line of `sections/brand-strip.liquid` as CRLF when the file is pure LF, and `sed -n '95p' | od -c` showed no CR either. Line endings are mixed across the theme: `brand-strip.liquid` and `home-featured-products.liquid` are LF, `polish.css` and `home-promo-grid.liquid` are CRLF. Read bytes with python before editing, and preserve each file's own endings.

With `core.autocrlf=true` and CRLF blobs in HEAD, always stage and commit with `git -c core.autocrlf=false`, and check `git diff --cached --numstat` first: a few dozen lines means the diff is real, several hundred means line-ending churn. A `.gitattributes` holding `* -text` would fix this permanently; the owner has been offered it and has not decided.

## Other live changes made outside the theme

- **Anti-Aging collection** rule changed from `Vendor is equal to THE EDIT` to `Tag includes anti-ageing`. 3 products to 10.
- **GA4 connected** as a Shopify custom pixel, Measurement ID `G-4TWCDBLYZ4`. `page_view`, `view_item` and `add_to_cart` confirmed in Realtime. It runs in Shopify's sandbox, so it reaches checkout but appears nowhere in page source — which is why Search Console's Google Analytics verification method cannot work on this store.

### Judge.me widget held until the reviews are near — deployed 2026-11-08 (`f32271c`)

Goal: the CHAM mask ad landing page was losing 33-45% of link clicks before a
landing page view was recorded. The Meta pixel is healthy (2.8K PageViews in
Events Manager), so the cause is main-thread load on slow phones. The Judge.me
review widget sits ~8,100px down a ~10,200px page yet fired ~100 requests and
~1.4MB of JS from 300ms in.

`layout/theme.liquid` now carries an inline guard, product template only, that
parks script and `<link>` elements inserted at runtime by Judge.me's loader.js
and releases them when `#reviews` comes within 1,200px of the viewport, on a
`#reviews` deep link, or immediately where IntersectionObserver is missing. It
matches only `judgeme`/`judge.me` URLs and fails open. There is deliberately no
timer fallback. To undo it, delete the commented block above
`{{ content_for_header }}` in `layout/theme.liquid`.

Verified on live with the preview cookie cleared (theme `t/3`):

- 7 Judge.me requests on load, down from 104.
- Reviews 3,000px away: still 7 requests, nothing rendered.
- Reviews in range: 97 requests by 500ms, 214 elements by 1s, **68 review cards,
  widget height 1,350px**, identical to before.
- Rating/review JSON-LD still present in the page HTML (server-rendered).
- Cart path unaffected: drawer opens at 87ms, correct row and total.

Measured gain (8 interleaved Lighthouse runs per arm, medians): style and layout
-42%, script -18%, requests -18%, TBT -20%, but the performance score did not
move (73 vs 73). It is a real but modest improvement, not a fix for the
click-to-landing-page-view rate. `seo-reports/perf-2026-11-08.md` has the full
numbers and what remains: Shopify loads the Meta pixel itself late (its
`fbevents`/`signals` scripts are the last long tasks, pinning TTI near 16s),
~340 idle style recalcs with no script on the stack, and a document-wide
MutationObserver in `polish.js`.

This adds a ~70-line inline script to the theme. It adds no app and no external
file, but it falls under the "ask before adding a script" rule; it was disclosed
and the deploy was approved.

### Style-recalc cost: `html:has()` scroll lock replaced — deployed 2026-11-08 (`d9061e6`)

The product page produced ~250-300 style recalcs in 11s with no script on the
stack. The cause was Shopify's own `/checkouts/internal/preloads.js`
`prefetch()`, which appends ~160 `<link rel="prefetch">` elements to the page,
combined with `html:has([data-drawer-open])` rules in `assets/critical.css` and
`sections/whatsapp-float.liquid`. A `:has()` anchored on `<html>` is re-checked on
every DOM insertion anywhere, making each of those recalcs ~5x dearer. The
announcement-bar marquee and `polish.js`'s MutationObserver were tested and ruled
out; do not spend more time on them for this.

The scroll lock is now `html[data-drawer-open="true"]`. The drawer code sets that
attribute on `<html>` as well as `<body>` (`assets/cart-drawer.js` open/close and
`layout/theme.liquid` fallback `openDrawer()`). **Anything new that opens or closes
the cart drawer must set and clear it on `<html>` too**, or the page will not lock
or will stay locked.

Verified on the real live theme (`t/3`, preview cookie cleared):

- Served `critical.css` has the new rule and no `:has()` scroll-lock rules; served
  `styles.css` has the new WhatsApp rule and no old one. (Shopify strips the quotes
  from attribute values when it serves CSS, so match `[data-drawer-open=true]`.)
- Drawer: `<html>` and `<body>` attributes set and cleared together; html overflow
  hidden while open; released after closing via the X button and via the overlay.
- Cart: correct row, total `PKR 3,999`, test cart cleared.
- Live trace: 250 recalcs costing 112 ms (was 747 / 591 ms), layout 188 ms (was
  228 / 214 ms). A second live capture recorded zero events and was discarded as an
  empty run, probably Shopify throttling repeated requests.

Gain is a reduction in CPU work (less battery and heat on a phone) and a small LCP
improvement, not a performance-score change. See `seo-reports/perf-2026-11-08.md`.

### Arimo self-hosted — deployed 2026-11-12 (`1d6cc18`)

Google Fonts links in `layout/theme.liquid` replaced by two `@font-face` rules
pointing at `assets/arimo-latin.woff2` (variable, 400-700, 20KB) and
`assets/arimo-latin-italic.woff2` (12KB). Same Arimo v36 Latin files; Apache 2.0;
source URLs recorded in the theme comment.

Verified on live (`t/3`, preview cookie cleared): zero requests to Google Fonts;
both files served from the store's own domain (200, valid WOFF2); the only
preconnect left in the HTML is Shopify's own `cdn.shopify.com`; product title
width 512.65px, identical to before.

Note for anyone touching fonts: the stack is `"Helvetica Neue", Helvetica, Arimo,
Arial`. On Windows "Helvetica" maps to Arial, so Arimo is never used there (all faces
stay unloaded on live), and Android is believed to alias Helvetica to Roboto too
(not verified). Arimo is therefore rarely if ever rendered. Making it actually appear
means reordering the stack, which changes how the site looks: a design decision, not
a speed fix.

### Heading order, pack price contrast, poster 404 — deployed 2026-11-12 (`d946eae`)

- Footer column titles and the Shipping / Returns / Order Cancellation subheadings
  changed from `<h4>` to `<h2>` (no heading-level skips left on the product page).
- **Trap:** the admin Custom CSS for the product section contains
  `#shopify-section-...__main h2 { font-size: 32px }`. Any new `<h2>` inside
  `main-product` will be 32px unless its class pins the size; `.cham-sr__h` does so
  with `font-size:12px!important`.
- CHAM pack strike-through prices: opacity 0.55 -> 0.7 (contrast 4.0:1 -> 6.7:1).
- Key-ingredients video poster was a relative path and 404'd on every product view;
  now a full `image_url`.

Verified on live (`t/3`, preview cookie cleared): no heading skips; footer titles
H2 11px/500 and subheadings H2 12px/600, same as before; strike opacity 0.7; poster
URL absolute and 200.

Not changed: the key-ingredients video is a single ~70MB 1080p MP4. It only
downloads when played, but Lighthouse's lab connection fails on it and it is heavy
for mobile data. A smaller mobile rendition would be the fix if wanted.

### Logo sizing and key-ingredients image — deployed 2026-11-12 (`5bfc12a`)

- Header logo: 1x/2x/3x sources from `logo_height` instead of a fixed 200px.
  Live: shown 108x30, downloads 60px / 6KB (was 26KB), every page.
- Key-ingredients image srcset gains 800w and 1000w steps.
- Key-ingredients `<video>` poster: when the click-to-play cover is shown, the poster
  is a 1x1 transparent GIF data URI. A real URL there downloaded the same picture a
  second time (144KB) behind the cover; this was introduced by `d946eae` and is fixed
  here.

Verified on live (`t/3`, preview cookie cleared): picture downloads once (1000w);
pressing play hides the cover and the video plays.

### Slow-network: early downloads moved out of the first seconds — deployed 2026-11-12 (`af84d2d`)

- Gallery slides 2+ on phones (<1024px) start from a 1x1 GIF `<source>` and load
  on first touch/scroll of the gallery or after the load event + idle. Desktop grid
  unaffected. `polish.js` thumbnails read `src` first for this reason.
- Key-ingredients video `preload="none"` when the click-to-play cover is shown.
- Search no longer preloads `/products.json` on every page view; the panel loads it
  when opened.
- Gallery srcset gains 700w/1000w.

Verified on live: desktop shows all six real photos and real thumbnails; search
returns results when opened (catalogue fetched on open, not before); video plays.

Live before vs after, mobile Lighthouse, medians (before = 6 live runs earlier the same
day, after = 4 runs after deploy; not interleaved, so treat timings as indicative):

| | before | after |
|---|---|---|
| Downloaded before page load | 1,951 KB | **1,203 KB** (-748 KB; ranges do not overlap) |
| Total downloaded | 2,677 KB | 2,258 KB |
| First Contentful Paint | 2.01 s | 1.33 s |
| Largest Contentful Paint | 2.79 s | 2.21 s |
| Speed Index | 3.71 s | 3.13 s |
| Time to Interactive | 13.34 s | **11.27 s** (ranges do not overlap) |
| Total Blocking Time | 0.84 s | 1.14 s (ranges overlap; noise) |

products.json fetched on load: 6/6 before, 0/4 after. Video bytes: 66-303 KB before, 0 after.
