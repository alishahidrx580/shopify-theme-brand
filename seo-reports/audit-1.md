# SEO Audit 1 — theeditpk.com

**Date:** 2026-11-05
**Scope:** technical SEO, schema, e-commerce, GEO/AEO
**Method:** live crawl (curl + rendered DOM), sitemap/robots analysis, local Lighthouse, theme code review on branch `seo-fixes`
**Catalog at time of audit:** 133 products, 12 collections, 11 pages, 0 blog posts

---

## Scorecard

| Area | State |
|---|---|
| Crawlability / indexation | OK — all public URLs crawlable, canonicals present everywhere, no accidental noindex |
| AI crawler access | OK — no AI bot blocked, HTML server-rendered and complete |
| Structured data | **Poor** — zero schema on 8 of 10 pages; no Organization, no Breadcrumb, no Collection |
| Titles & meta descriptions | **Poor** — homepage title is 8 characters; meta description missing on 7 of 10 pages |
| Content accuracy / trust | **Critical** — three policy pages carry another brand's text |
| Site structure | Weak — 9 unlinked pages, 5 duplicate demo pages, 1 empty collection, empty blog indexable |
| Link integrity | **Not verified** — Shopify bot protection blocked all three crawl attempts |
| GEO / AI answerability | **Poor** — no FAQ content, no FAQ schema, no extractable answers to buyer questions |
| Page speed | **Poor** — mobile Performance 42 (home), 49 (product), 17 (collection); LCP 6.7s / 5.5s / 11.0s |
| Accessibility | 90–96, but colour contrast and accessible-name mismatches fail on every page |

---

## HIGH priority

### H1. Three policy pages contain another brand's content ("Velomora")
Verified live on 2026-11-05.

| URL | "Velomora" occurrences | Opening line |
|---|---|---|
| `/pages/privacy-policy` | 18 | "Thanks for using Velomora! Our Privacy Policy details how we handle your info." |
| `/pages/return-refund-policy` | 8 | "At Velomora, your hygiene and satisfaction are our top priorities. Due to the intimate nature of our products…" |
| `/pages/terms-conditions` | 10 | "Welcome to Velomora! These Terms & Conditions govern your use of our website…" |

The return policy lists non-returnable items as "Nipple covers, Boob tape, Silicone bras, Uplift products, Nipple pasties" — an intimate-apparel seller's policy published on a skincare store. All three are dated "Effective Date: May 9, 2025".

Why it matters:
- Any AI engine or shopper reading these gets another company's terms, the wrong return window (48 hours / 5–7 days) and products the store does not sell.
- It contradicts the store's real policy. `/policies/refund-policy` states 3 days for sealed items, 7 days for CHAM, plus the real COD terms.
- Brand-name inconsistency on legal pages is a direct E-E-A-T and trust signal problem.

Also note: the three correct Shopify policy pages are clean (0 occurrences) and are the ones the footer already links to:
`/policies/privacy-policy`, `/policies/refund-policy`, `/policies/terms-of-service`, `/policies/shipping-policy`.

**Fix:** delete the three `/pages/` versions in Shopify admin → Online Store → Pages. Nothing links to them, so deletion loses no navigation. Shopify will serve 404; if they have any backlinks, redirect each to its `/policies/` equivalent in Online Store → Navigation → URL Redirects.

**This content is not in the theme.** `grep -rin velomora` across the whole theme returns nothing — the text lives in Shopify page records, so it cannot be fixed on the `seo-fixes` branch. It needs your admin.

### H2. Homepage has no title, no meta description, no H1, and no schema
Verified directly in the homepage HTML:

- **Title:** `THE EDIT` — 8 characters. No keyword, no market, no category. This is the single highest-value SEO field on the site.
- **Meta description:** absent entirely.
- **H1:** zero real `<h1>` in the document (the only `<h1>` match is inside a JavaScript template string in the search script, which never renders as page structure).
- **JSON-LD:** 0 blocks. No Organization, no WebSite, no sameAs.
- **og:image:** absent, so WhatsApp and Facebook shares render with no image — significant in Pakistan where WhatsApp sharing drives traffic.

The og:image gap is a theme bug, fixable on branch: `snippets/meta-tags.liquid` only emits `og:image` inside `{%- if page_image -%}`, and the homepage has no `page_image`, so no fallback image is ever output.

### H3. Meta descriptions missing or wrong site-wide
- Missing on 7 of 10 audited pages: homepage, `/collections/shop-all`, `/collections/brightening`, `/blogs/news`, `/pages/our-story`, `/pages/contact`, `/pages/figma-to-shopify`.
- On the 3 pages that have one, all are 320 characters (over the ~155 limit) and are auto-pulled body text truncated mid-sentence.
- `/pages/privacy-policy`'s meta description begins "Thanks for using Velomora!" — the Velomora text is being served into search snippets.

### H4. No structured data beyond a thin Product block
| Page type | Schema present | Missing |
|---|---|---|
| Homepage | none | Organization, WebSite + SearchAction |
| Collections | none | CollectionPage / ItemList, BreadcrumbList |
| Products | Product (1 block) | BreadcrumbList, sku, gtin/mpn, shippingDetails, hasMerchantReturnPolicy |
| Blog | none | Blog / Article |
| Pages | none | — |

**Duplicate Product schema check (CLAUDE.md first-run item 2): no duplication found.** Each product page carries exactly one Product block, from `{{ product | structured_data }}` in `snippets/meta-tags.liquid`. No app injects a second one — the only script hosts on the site are `cdn.shopify.com` and `theeditpk.com`.

**No `aggregateRating` and no `review` anywhere** — correct, since there are no real reviews yet. Judge.me is installed (`shopify://apps/judge-me-reviews` in `config/settings_data.json`) and `layout/theme.liquid` hides its badge with CSS. Keep ratings schema off until real reviews exist.

### H5. Product schema shows the wrong price
On `/products/depiwhite-advanced` the JSON-LD declares `price: "22200.00"` while the page sells at **Rs. 19,980**. The schema is emitting the compare-at price, not the selling price. A price mismatch between schema and page is a Google Merchant/rich-result violation and can suppress the rich result. Needs verification across the other 132 products.

---

## MEDIUM priority

### M1. Five theme-demo pages are indexable near-duplicates
`/pages/figma-to-shopify`, `/pages/mix-and-match`, `/pages/news-articles`, `/pages/compare`, `/pages/wishlist` all return 200, carry no noindex, and render **the same body as `/pages/our-story`** (99.6% text similarity) under a different H1. `/pages/figma-to-shopify` is a theme-vendor leftover whose title is literally "figma to shopify – THE EDIT".

**Fix:** delete in Shopify admin, or add noindex. They are unlinked from navigation already.

### M2. Nine pages are orphaned
Not linked from the homepage, `/collections/shop-all`, or `/pages/our-story`:
`wishlist`, `compare`, `track-my-order`, `news-articles`, `figma-to-shopify`, `mix-and-match`, `privacy-policy`, `return-refund-policy`, `terms-conditions`.

Collections not linked from any crawled page: `/collections/frontpage`, `/collections/discount-eligible`.

### M3. Empty and near-duplicate collections
| Collection | Products |
|---|---|
| frontpage | **0** (empty, orphaned, in sitemap) |
| anti-aging | 3 (thin) |
| night-treatment | 4 (thin) |
| eye-care | 7 (thin) |
| discount-eligible | 131 (near-duplicate of shop-all, orphaned) |
| shop-all | 133 |

`/collections/all` is also in the nav but not in the sitemap — another shop-all duplicate.

### M4. Collection pages share one generic H1
`/collections/shop-all` and `/collections/brightening` both use H1 "Formulations for skin that performs". Each collection needs its own H1 carrying the collection term ("Brightening Skincare in Pakistan"). Collections also have **zero H2s** and no intro copy beyond one marketing line.

### M5. Empty blog is live and indexable
`/blogs/news` returns 200 with **0 posts** (`news.atom` has 0 `<entry>`). It sits in the sitemap as a thin page. This is also the whole content opportunity: no blog posts means nothing to rank for question or comparison queries.

### M6. `?page=2` is an indexable empty duplicate
`/collections/shop-all?page=2` returns 200, 0 products, with its own self-canonical and no noindex. All 133 products render on page 1.

### M7. Delivery, returns and COD statements contradict each other
| Source | Statement |
|---|---|
| `/policies/shipping-policy` | CHAM 1–2 days Lahore, 3–5 other cities; pharmacy brands 14–21 working days; "Delivery is free and already included in the product price." |
| Product page badge | "Nationwide Delivery 14-21 Business Days" (applied regardless of brand) |
| `/policies/refund-policy` | 3 days sealed items, 7 days CHAM; above Rs. 15,000 with under 30% advance requires 50% advance — "Full cash on delivery isn't available on these orders" |
| Product page badge | "7-day returns on sealed items" |
| `/pages/return-refund-policy` | Velomora text: 48-hour window, no returns on opened intimate products |

COD is never stated as a general policy in site copy. The only "Cash on delivery available" string on the homepage sits inside an embedded Instagram widget payload, not in store content.

### M8. Images missing alt text
| Page | Images | No alt attribute | Empty alt="" |
|---|---|---|---|
| Homepage | 111 | 4 | 42 |
| `/collections/shop-all` | 223 | 0 | 87 |
| `/collections/brightening` | 33 | 0 | 11 |

The 4 with no alt attribute are promo banner tiles (`cham_3x2_1500x1000`, `cham_1111_espresso_banner`, `edit_tile_cerave`, `edit_tile_medicube`). Theme-side, `sections/home-brand-logos.liquid:157` outputs `alt=""` on the duplicated logo strip — acceptable since that copy is `aria-hidden`, but the brand names should be readable in the first pass.

### M9. `/pages/track-my-order` is filler with a fabricated statistic
442 words of generic text with no carrier, no tracking instructions, no delivery times. It states: "According to industry standards, approximately 70% of customers prefer to track their orders online" — an unsourced statistic. Under CLAUDE.md's rules this must be removed or sourced.

---

## LOW priority

- **L1.** No `google-site-verification` meta in `layout/theme.liquid`. Bing (`msvalidate.01`), Yandex and Pinterest verifications are present. Confirm Search Console is verified by another method; if not, this is the first thing to fix because nothing else can be measured without it.
- **L2.** `og:image` uses the `http:` protocol prefix in `snippets/meta-tags.liquid` (`content="http:{{ page_image | image_url }}"`). Should be protocol-relative or https.
- **L3.** Product schema `availability` uses `http://schema.org/InStock`; https is preferred.
- **L4.** Google Fonts (Arimo) loaded from `fonts.googleapis.com` in `layout/theme.liquid`. Self-hosting as a theme asset removes two third-party connections from the critical path.
- **L5.** `/pages/our-story` has page title "About us" while the URL is `our-story` — pick one.
- **L6.** No hreflang anywhere. Correct for a single market; CLAUDE.md defers this.
- **L7.** Theme carries `cham-` prefixed classes, `cham-theme` localStorage key and `product.cham.json` template — cosmetic leftovers from the theme's origin, no SEO impact.
- **L8.** Site returns HTTP 429 ("Verifying your connection", Shopify bot challenge) on rapid repeat product-page requests. Expected Shopify behaviour, worth knowing when running crawls.

---

## Performance

Lighthouse 12, mobile, simulated throttling, run locally 2026-11-05. Raw JSON in `seo-reports/lh-home-mobile.json`, `lh-product-mobile.json`, `lh-collection-mobile.json`.

| Page | Perf | SEO | A11y | Best prac. | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|---|---|---|
| `/` | **42** ❌ | 85 | 90 | 79 | 6.7s ❌ | 0.082 ✅ | 1,100ms ❌ | 3.4s |
| `/products/depiwhite-advanced` | **49** ❌ | 100 ✅ | 96 | 79 | 5.5s ❌ | 0 ✅ | 940ms ❌ | 3.2s |
| `/collections/shop-all` | **17** ❌ | 92 | 95 | 79 | **11.0s** ❌ | **0.273** ❌ | **2,010ms** ❌ | 4.8s |

Server response is not the bottleneck — the root document took 40ms (home), 200ms (product), 210ms (collection). The problem is payload and client work.

**Biggest single win: oversized images.** Lighthouse reports ~1,212 KB wasted on the homepage and ~1,137 KB on the collection page under "Properly size images" — images are being served far larger than their rendered size. Fixing the `image_url` widths and `srcset` in the product card and banner sections addresses both pages at once.

Other opportunities, every page: ~13 KB legacy JavaScript served to modern browsers, ~14–15 KB unused CSS, and 45 KB recoverable by serving next-gen image formats on the collection page.

**Collection page CLS 0.273** is the one layout-shift failure. Theme image markup is not the cause: all 38 `<img>` tags across sections, snippets and blocks carry explicit `width` and `height` (verified in code). The shift is coming from something else on that template — likely the webfont swap or the reveal-on-scroll module — and needs a targeted look.

Raw transfer measurements (curl, single run each):

| Page | HTTP | TTFB | HTML size |
|---|---|---|---|
| `/` | 200 | 2.52s | 479 KB |
| `/collections/shop-all` | 200 | 5.73s | **786 KB** |
| `/products/depiwhite-advanced` | 200 | 1.89s | 297 KB |
| `/blogs/news` | 200 | 0.49s | 237 KB |
| `/pages/our-story` | 200 | 0.41s | 249 KB |

`/collections/shop-all` ships all 133 products in one document. Paginating to 24–36 per page is the structural fix behind the 11s LCP and 786 KB payload.

Total theme asset weight is only 151 KB across 13 files — the theme's own code is lean.

Google's PageSpeed Insights API was unavailable during this audit (shared keyless daily quota exhausted), so these numbers come from a local Lighthouse run rather than Google's servers. A free PageSpeed Insights API key would make scheduled runs reliable and add field (CrUX) data.

### Accessibility failures (also AI-agent readiness)

| Failure | Pages |
|---|---|
| `color-contrast` | all three |
| `label-content-name-mismatch` | all three |
| `image-alt` | homepage |
| `image-redundant-alt` | homepage |
| `heading-order` | collection |
| `third-party-cookies`, `inspector-issues` | all three (best-practices) |

`label-content-name-mismatch` on every page means an interactive element's accessible name does not match its visible text — exactly the class of problem that stops an AI shopping agent from operating the store reliably. `heading-order` on the collection page follows from it having an H1 and zero H2s.

---

## Link integrity — NOT VERIFIED

This is the one part of the audit I could not complete, and it is worth stating plainly rather than leaving a gap.

58 unique internal links were extracted from the homepage. Three separate attempts to check their HTTP status all failed, and none produced usable data: every response came back either `429` or `000` (no response — the connection held open until timeout).

The cause is Shopify's bot protection, and the behaviour is specific enough to be worth recording. Requesting the same URL twice, seconds apart:

| Request | Result |
|---|---|
| `curl` with its default user agent | `200` |
| `curl` with a Chrome user agent | `429` |

A request claiming to be Chrome while arriving with no cookies and no JavaScript is treated as a bot and served the "Verifying your connection" challenge. After sustained crawling the whole IP gets challenged regardless of user agent, which is where the `000` timeouts came from. Crawling was stopped at that point rather than continuing to hammer the store.

**What this means for the audit:** no broken internal links were found, but none were ruled out either. Treat link integrity as unknown.

**How to get it properly:**
- Search Console's Pages report already has this data, server-side, for free — check it first.
- Screaming Frog run from your own machine at 1–2 requests/second, which Shopify tolerates from a normal browsing IP.
- Either beats scripted crawling from here.

One result that did come back is worth not misreading: `/products/acm-depiwhite-advanced` returns 404. That URL is not in the sitemap and was only probed as a guess at a duplicate slug — it is not a broken link on the site.

---

## GEO / AEO — AI search readiness

**Access: fine.** No AI crawler is blocked. robots.txt names only `*` (Allow: /) and `adsbot-google`; no GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended or Bytespider directives, and no Cloudflare managed AI block. Fetches with ClaudeBot and GPTBot user agents both returned HTTP 200 with the full 479 KB server-rendered homepage including real product names — no cloaking, no JS shell.

**Answerability: poor.** Zero FAQ sections and zero FAQPage schema anywhere on the live site. A buyer in Pakistan asking "is this original", "how long is delivery", "is COD available", "which product for oily skin" finds no extractable answer on the homepage, any collection page, or any product page.

The theme already has the machinery for this: `sections/product-faq.liquid` renders FAQs with valid FAQPage JSON-LD, driven by the `product.metafields.custom.faqs` metafield, and it is wired into all three product templates. **The metafield is empty, so nothing renders.** Filling it is content work in admin, not code.

**llms.txt / agents.md: Shopify defaults.** Both return 200 and are byte-identical platform boilerplate about UCP/MCP agent shopping. Store-specific content is four policy links. No store description, no brand list, no collections, no shipping or COD facts. `/.well-known/ucp` is a machine-readable commerce manifest with no citation value.

**Entity signals: thin.** No Organization, LocalBusiness or WebSite JSON-LD anywhere. No `sameAs`. Contact details exist only as page text: `theeditskincarepk@gmail.com` (a Gmail address, not a domain address), `03268399421`, "DHA PHASE 3 Y block, Lahore". Social links in HTML only: Instagram `@the.editpk`, a Facebook profile URL, and a YouTube link that points at CHAM's channel rather than the store's.

**No founder or author identity** anywhere — a direct E-E-A-T gap for a new store with no reviews.

---

## Claims flagged against CLAUDE.md hard rules

| Claim | Where | Problem |
|---|---|---|
| "Pharmacy brands imported from UAE" | homepage marquee | CLAUDE.md: do not describe everything as imported from UAE. This blanket line covers CHAM too, which is an official partner brand made in China and designed in France. Needs splitting by sourcing tier. |
| "No. 1 anti-blemish treatment prescribed by dermatologists in France since 2021" | `/products/depiwhite-advanced` | [SOURCE NEEDED] — a prescription-ranking claim with no citation |
| "Effective on pregnancy mask, sun spots, and age-related pigmentation" | same page | Efficacy claim; borders on the medical-claim rule |
| "bought from licensed pharmacies in the UAE" | `/pages/our-story` | [SOURCE NEEDED] — no licence or supplier named |
| "Official CHAM partner" | homepage | [VERIFY] — true per your brief, but no proof is shown on-site |
| "Dermatologist-developed, fragrance-free" | CeraVe homepage banner | [VERIFY] against CeraVe's own wording |
| "approximately 70% of customers prefer to track their orders online" | `/pages/track-my-order` | Fabricated statistic. Remove. |

No instances of "treats", "cures", "heals", "eliminates" or "guaranteed results" were found.

Catalog note: the live catalog is broader than CLAUDE.md records. Brands by product count: La Roche-Posay 23, Dermalogica 22, CeraVe 16, Avène 15, ACM 14, ISDIN 12, Medicube 11, Aveeno 9, COSRX 7. CLAUDE.md names only CeraVe, ISDIN, Dermalogica and CHAM — worth updating so sourcing-tier language stays accurate.

---

## Prioritized fix list

### Needs your admin (I cannot do these from the theme)
1. **Delete `/pages/privacy-policy`, `/pages/return-refund-policy`, `/pages/terms-conditions`** — Velomora content. Clean `/policies/` versions already exist and are already linked in the footer.
2. **Set the homepage SEO title and meta description** (Online Store → Preferences). Title under 60 characters, carrying the category and market.
3. **Delete or noindex the 5 demo pages** — figma-to-shopify, mix-and-match, news-articles, compare, wishlist.
4. **Delete or fix `/collections/frontpage`** (0 products) and `/pages/track-my-order` (filler + fabricated statistic).
5. **Fix the product-page delivery and returns badges** so they match the real shipping policy per brand tier.
6. **Fill the `custom.faqs` metafield** on top products — the theme already renders them with valid FAQPage schema.

### I can do on the `seo-fixes` branch
7. Add Organization + WebSite JSON-LD with `sameAs` to `layout/theme.liquid`.
8. Add CollectionPage/ItemList and BreadcrumbList schema; add BreadcrumbList to product pages.
9. Add a homepage `og:image` fallback in `snippets/meta-tags.liquid`, and fix the `http:` prefix.
10. Make collection H1s collection-specific instead of one shared line.
11. Investigate and fix the Product-schema price emitting compare-at instead of selling price.
12. Add alt text to the 4 unlabelled banner images and the brand-logo strip.
13. Paginate `/collections/shop-all` to cut the 786 KB / 5.7s page.
14. Self-host the Arimo font; add `google-site-verification` if Search Console is not yet verified.
15. Fix oversized images (`image_url` widths and `srcset` in product-card and banner sections) — ~1.2 MB wasted per page, the single biggest speed win.
16. Find and fix the collection-page CLS source (0.273); theme image dimensions are already correct, so look at the font swap and the reveal module.
17. Fix the accessible-name mismatches (`label-content-name-mismatch`) on all three templates — this is what blocks AI shopping agents.
18. Fix colour-contrast failures and the collection page's heading order.
19. Drop the legacy-JavaScript transpilation target and trim ~14 KB unused CSS.

### Decisions I need from you
- Whether a hand-written `llms.txt` is worth pursuing (Shopify generates the current one; overriding it may need a redirect or app — I have not verified that Shopify permits it, and per your rules I will not install anything).
- Whether Search Console is already verified, and by which method.
- How you want the two sourcing tiers worded on the homepage, replacing the blanket UAE line.

---

*Audit performed on branch `seo-fixes`. No live theme changes were made. No content was published or deleted.*
