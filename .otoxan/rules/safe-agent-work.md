# Safe agent work rules

## Commands

Use `pnpm`, not npm or yarn, for normal repository work.

Core validation commands:

```bash
pnpm run lint
pnpm run format:check
pnpm run build
```

There is no formal test script in `package.json` at the time this pack was created. Treat lint, format check, and build as the default validation suite unless a task introduces a more specific check.

## Secrets and generated files

Do not commit:

- `.env`
- `.env.prod`
- Doppler tokens or service tokens
- `helm/values.prod.yaml`
- `.roo/mcp.json`
- `dist/`
- `.astro/`
- `node_modules/`
- `public/pagefind/`

`X_API_KEY` is a server-side secret for API routes. Never print, paste, or commit real key values.

## Code patterns

- Prefer `@/*` imports for `src` paths.
- Respect ESLint's `no-console` rule. Do not add `console.*` unless explicitly justified and suppressed.
- Keep TypeScript/Astro changes compatible with strict config.
- Do not assume static-site-only behavior; this repo uses server output and live content behavior.
- Be careful with routes that set `prerender = false`; many dynamic routes depend on live collections.

## Deployment cautions

Deployment involves Docker, GHCR, Helm, and Doppler-backed runtime secrets.

For deployment-touching changes, inspect both:

- `.github/workflows/deploy.yaml`
- `helm/values.yaml`

Keep image tags and deployment assumptions synchronized when explicitly changing release/deploy behavior.

Do not alter branch protection, GitHub Actions settings, repo secrets, webhooks, Doppler config, cluster config, or Helm production values unless Matt explicitly scopes that work.

## Diff safety

Before any commit, staged changes must be scoped to the controlling issue.

For `.otoxan-only` work, changed paths should all begin with `.otoxan/`.
For content-only work, changed paths should normally be under `src/data/blog/` plus narrowly required supporting assets/docs.
For source work, include validation output in the PR.
