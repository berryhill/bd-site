# Docs and contributing rule

This repo has a mix of bd-site-specific docs and upstream AstroPaper-derived docs. Agents must check docs against source before treating them as executable truth.

Known docs surfaces:

- `README.md` — bd-site overview, local development, Docker/Helm/deployment notes.
- `CLAUDE.md` — AI coding guide; useful, but some command descriptions may lag `package.json`.
- `API.md` — API reference for post management; compare with `src/pages/api/posts.ts` before changing or using API behavior.
- `.github/CONTRIBUTING.md` — contributor guide; may still reflect AstroPaper upstream defaults.
- `.github/PULL_REQUEST_TEMPLATE.md` — PR template; use it, but add repo-specific validation evidence and path-boundary statement.
- `LLM_CRAWL_MANIFEST.md` — LLM/SEO indexing strategy and crawl surfaces.
- `helm/README.md` — deployment chart guidance.

When updating docs:

1. Identify the source file or behavior the doc describes.
2. Verify the current implementation.
3. Update docs and implementation together only when the issue scopes both.
4. Keep PRs narrowly scoped and explain any docs/source mismatch resolved or intentionally left unresolved.
