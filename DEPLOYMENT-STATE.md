# Deployment state — read before touching the theme

**Last updated:** 2026-11-08 (second update)

## The live site and GitHub do not match

The live theme is **`shopify-theme-brand/main` (#160960577764)** and it is **connected to GitHub**, so in normal operation a commit to `main` deploys to the live site.

That is not how the current contents got there. The branch below was pushed straight to the live theme with the Shopify CLI. It has since also been pushed to GitHub as `seo-fixes`, so the work is no longer only on this machine, but `main` still does not contain it.

| Where | What it holds |
|---|---|
| **Live site** | Every commit on `seo-fixes` up to `fa5efe1` |
| **GitHub `main`** | `be5aa3a` — none of it |
| **`origin/seo-fixes`** | 36 commits ahead of `main`, awaiting merge |

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
