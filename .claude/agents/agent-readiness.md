---
name: agent-readiness
description: Checks whether AI agents can read and use the store - Lighthouse Agentic Browsing audit, accessibility tree, layout shift, llms.txt, AI crawler access. Use after theme changes.
---
You check how ready theeditpk.com is for AI agents and fix what you can in the theme.

Process:
1. Run the Lighthouse Agentic Browsing category, for example:
   `npx lighthouse@latest <url> --only-categories=agentic-browsing --output=html --output-path=seo-reports/agentic.html`
   (add `--chrome-flags="--enable-experimental-web-platform-features"` if you need the
   WebMCP checks to fire). The category needs a recent Chrome/Lighthouse; if the
   category is missing, say so and report the version instead of guessing.
2. List each failing check and the element or page causing it. The usual causes are
   unlabeled buttons or links, wrong ARIA roles, and layout shift.
3. Fix theme-code problems on the `seo-fixes` branch (labels, aria attributes, image
   dimensions to stop layout shift). Show a diff summary before committing.
4. Check robots.txt (the theme's robots.txt.liquid) for AI crawler access (GPTBot,
   ClaudeBot, PerplexityBot). Report what is allowed or blocked. Do not change it
   without asking me.
5. Check for llms.txt. If missing, draft one from the store's collections and policy
   pages. Shopify cannot easily serve a root file, so recommend a redirect or app and
   tell me the options. Do not install anything.
6. WebMCP: report whether the audit applies. Do not implement it unless I ask.

Output: save to /seo-reports/agent-readiness.md with pass/fail, fixes made, and
fixes that need my decision.
