# Deployment state — read before touching the theme

**Last updated:** 2026-11-06

## The live site and GitHub do not match

The live theme is **`shopify-theme-brand/main` (#160960577764)** and it is **connected to GitHub**, so in normal operation a commit to `main` deploys to the live site.

That is not how the current contents got there. On 2026-11-06 the branch below was pushed straight to the live theme with the Shopify CLI, because this working copy has no git credentials and no `gh` CLI, so GitHub could not be updated.

| Where | What it holds |
|---|---|
| **Live site** | All 20 commits of SEO work |
| **GitHub `main`** | `be5aa3a` — none of it |
| **Local `seo-fixes`** | All 20 commits, **unpushed** |

### The risk

**A commit to `main`, or any GitHub re-sync, will overwrite everything now live.** Shopify treats the connected branch as the source of truth; it does not know the live theme was changed out of band.

### How to close it

Push `seo-fixes` and merge it into `main`. Once `main` contains these commits, GitHub and the live theme agree again and the normal pipeline resumes. This needs credentials that are not available in this working copy.

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

## Two bugs that only a preview caught

Both were found by pushing to an unpublished theme first. Keep doing that.

1. **Liquid parse error.** `{search_term_string}` was written inside a `{{ }}` output tag in `snippets/schema-organization.liquid`; its closing brace terminated the tag early and Shopify rejected the file on upload. `shopify theme check` passed it clean — the server parser is stricter than the linter.
2. **Schema discount never applied.** `snippets/schema-product.liquid` compared `variant.compare_at_price` with `variant.price` directly. That field is nil on every product outside the CHAM pair, Liquid will not compare nil with a number, so the test was always false and the pre-discount price shipped. The preview showed Rs 19,980 on the page against `22200` in the schema.

## Still outstanding on the live site

- **No `og:image`.** The fallback chain needs an image in the SEO panel (Brand logo, or Default social share image). Until one is set, shares on WhatsApp and Facebook carry no preview image.
- **Homepage has no `<h1>`.** Raised in audit 1, still unfixed.
- **Collection meta descriptions are empty**, because the fallback reads `collection.description` and the collections have none.
- **CHAM mask review markup.** 16 reviews, all timestamped inside one 3.5-hour window on 2026-10-24, publishing `aggregateRating` 4.88 to Google. See `seo-reports/audit-2.md`.

## Other live changes made outside the theme

- **Anti-Aging collection** rule changed from `Vendor is equal to THE EDIT` to `Tag includes anti-ageing`. 3 products to 10.
- **GA4 connected** as a Shopify custom pixel, Measurement ID `G-4TWCDBLYZ4`. `page_view`, `view_item` and `add_to_cart` confirmed in Realtime. It runs in Shopify's sandbox, so it reaches checkout but appears nowhere in page source — which is why Search Console's Google Analytics verification method cannot work on this store.
