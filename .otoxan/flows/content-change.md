# Flow: content change

Use for blog posts, about-page edits, content metadata, and brand copy changes.

1. Read:
   - `.otoxan/context.md`
   - `.otoxan/rules/content-and-brand.md`
   - relevant files under `src/data/blog/`, `src/pages/about.md`, or `src/config.ts`
2. Identify the strategic job:
   - audience
   - desired perception shift
   - arc/campaign if known
   - publication risk
3. Confirm the content path boundary. Most content work should be content-only.
4. For blog posts, follow the frontmatter schema used in `src/data/blog/`.
5. Preserve Matt's positioning: agentic-first builder/operator, not generic AI pundit.
6. For drafts, set `draft: true` unless the issue explicitly asks for publish-ready content.
7. Do not invent facts, metrics, affiliations, client work, regulatory claims, or personal history.
8. Run validation appropriate to the change:
   - `pnpm run format:check`
   - `pnpm run build`
   - `pnpm run lint` when source/config is touched
9. Open a PR with voice/brand rationale and validation evidence.

If the content changes public claims about Matt, his work, compliance-sensitive topics, finance/crypto advice, or professional credentials, call out the review risk in the PR body.
