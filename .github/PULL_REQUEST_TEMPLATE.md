## Description

<!-- What does this PR do and why? Include the controlling issue context. -->

## Related Issue

Closes: #<!-- Issue number -->

## Path boundary

<!-- Check one. All changed files should match the declared boundary. -->

- [ ] `.otoxan-only` — all changes under `.otoxan/`
- [ ] docs-only — documentation/template files only, no source code
- [ ] content-only — blog posts or page content under `src/data/blog/`, plus narrowly required supporting files
- [ ] app/source-code-touching — changes to `src/`, config, or build tooling
- [ ] deployment-touching — changes to Docker, Helm, CI workflows, or deploy config

## Change type

- [ ] Content — new or revised blog post, page copy, or media
- [ ] Docs — README, `.otoxan/`, API docs, or templates
- [ ] Feature — new functionality
- [ ] Fix — bug fix or correction
- [ ] Refactor — no behavior change
- [ ] Config/build — tooling, dependencies, or deployment

## Content checklist

<!-- Required for all content-only PRs. For non-content PRs, check N/A and skip. -->

- [ ] N/A — this PR does not touch blog content

_If checked N/A, skip to Validation. Otherwise complete all:_

- [ ] **Voice and brand** — prose reads as specific, human, opinionated, accessible, forward, and useful. No generic AI cadence, hype without examples, or copy that could belong to any AI account.
- [ ] **Frontmatter valid** — `title`, `description`, `pubDatetime`, `tags` are present and correctly typed. `draft` is explicitly set (not omitted). Timezone is `Asia/Bangkok` unless overridden.
- [ ] **Draft state correct** — new posts ship with `draft: true` unless Matt has explicitly approved publish. State transitions follow INV-1 through INV-7.
- [ ] **Strategic fit** — post strengthens at least one brand lane: agentic-first development, AI/ML systems, blockchain/crypto, digital music/creative systems, or practical operating notes.
- [ ] **Images and media** — no screenshots unless initiative-scoped. Default to diagrams, editorial graphics, or dynamic OG. No Unsplash/stock unless explicitly approved.
- [ ] **No agent metadata leaked** — no quality-checklist artifacts, model identifiers, or prompt residue in the post body.

## Validation

- [ ] `pnpm run lint` passes
- [ ] `pnpm run format:check` passes
- [ ] `pnpm run build` passes

<!-- For content-only PRs: if lint/format/build fail due to pre-existing issues unrelated to this PR, note which checks are clean and what the known pre-existing failure is. -->

## Staged diff review

Before merging, the author should confirm:

- [ ] `git diff --stat --cached HEAD` shows only files expected for this issue
- [ ] No unintended deletions, config changes, or files outside the declared path boundary

## Further comments

<!-- Any context reviewers need: alternatives considered, known tradeoffs, pre-existing issues surfaced by validation. -->
