# bd-site context

## Repository identity

`berryhill/bd-site` is the Astro-based website for Matt Berryhill's personal brand at `berryhill.dev`.

The site positions Matt around agentic-first development, AI/ML systems, blockchain, crypto markets, digital music, and intelligent automation. Treat this as a brand surface, not a generic blog theme.

## Current stack

Verified from repository files during onboarding:

- Astro 5.x site with AstroPaper lineage.
- TypeScript using Astro strict TypeScript config.
- TailwindCSS 4.x via `@tailwindcss/vite` and `@tailwindcss/typography`.
- SSR/server output via `@astrojs/node` in standalone mode.
- Markdown content under `src/data/blog/`.
- Live content collection setup through `src/live.config.ts` and a custom filesystem loader.
- RSS, dynamic OG image generation, custom sitemap/robots routes, and Pagefind dependencies.
- Docker image deployment through GHCR.
- Kubernetes/Helm deployment for `berryhill.dev`.
- Production secrets managed outside the repo; do not commit `.env`, Doppler tokens, or production values files.

## Important paths

- `src/config.ts` — site identity, brand description, feature toggles, pagination, timezone, edit link, Calendly link.
- `src/content.config.ts` — exports `BLOG_PATH`; live collections are defined elsewhere.
- `src/live.config.ts` — live blog collection wiring.
- `src/loaders/filesystem.ts` — custom recursive Markdown loader.
- `src/utils/blogVisualAssets.ts` — validation for durable local blog visual references.
- `src/data/blog/` — Markdown blog posts.
- `public/assets/blog/<post-slug>/` — stable durable location for repo-backed blog visuals referenced as `/assets/blog/<post-slug>/...`.
- `src/pages/api/posts.ts` — content API for post create/update/delete.
- `src/pages/about.md` — about page content.
- `.github/workflows/ci.yml` — CI validation.
- `.github/workflows/deploy.yaml` — GHCR/Helm deployment.
- `helm/` — Kubernetes deployment chart.
- `CLAUDE.md` — existing AI coding guidance; useful but not always fully current.
- `API.md` — content API docs; useful but contains known mismatches with implementation.

## Source-of-truth order

When docs disagree, prefer this order:

1. Current source code and config files.
2. `package.json` scripts and dependency versions.
3. CI workflow definitions.
4. Deployment files.
5. Repo docs such as README, API.md, and CLAUDE.md.
6. External reports, memories, or agent summaries.

Known cautions:

- `package.json` currently defines `build` as `astro build`; do not assume extra `astro check` or Pagefind copy steps unless the script is changed.
- Current CI uses Node 20, pnpm 10.11.1, `pnpm install`, `pnpm run lint`, `pnpm run format:check`, and `pnpm run build`. Do not assume `--frozen-lockfile`, `astro check`, or Pagefind indexing in CI unless the workflow changes.
- Docker builds intentionally use `pnpm install --frozen-lockfile` in both build and runtime stages. Keep Docker lockfile policy separate from CI's install policy.
- `pnpm-workspace.yaml` is present to approve install-time build scripts required by `@tailwindcss/oxide`, `esbuild`, and `sharp`; do not remove it as unrelated workspace noise.
- Some upstream AstroPaper docs/templates remain in `.github/` and may not be fully bd-site-specific.
- `API.md` and `src/pages/api/posts.ts` should be compared before API changes; docs and implementation have had shape/base-URL mismatches.
- Blog visual references are enforced by both the filesystem loader and POST/PATCH API paths through `src/utils/blogVisualAssets.ts`; inline `data:image` URIs are rejected and local `/assets/blog/<post-slug>/...` references must have backing files plus alt text and caption/title.
- `src/config.ts` edit URL currently references `berryhilldev/bd-site`; verify repo owner paths before changing public edit links.

## Brand frame

This website should make Matt look like a serious operator in the AI/agentic systems space, not a generic AI commentator.

Content and site changes should support:

- Agentic-first development as a practical operating model.
- AI/ML systems and automation as built things, not hype cycles.
- Blockchain/crypto markets with specificity and grounded analysis.
- Digital music/creative systems where relevant to Matt's work.
- Clear, human, opinionated writing with concrete examples.

Avoid generic AI slop, abstract futurism, exaggerated certainty, and copy that could belong to any AI influencer.
