# Content and brand rules

This repo is Matt Berryhill's personal brand website. Treat content work as brand architecture, not filler generation.

## Voice and positioning

The brand should read as:

- Specific enough to be useful and falsifiable.
- Human, direct, and grounded.
- Opinionated without pretending certainty where the facts are unsettled.
- Technical when it matters, but not academic for its own sake.
- Builder/operator oriented, not generic AI-news commentary.

Avoid:

- Generic AI influencer cadence.
- Hype phrases without concrete examples.
- Vague claims like "AI is changing everything" unless immediately grounded.
- Over-polished corporate voice.
- Content that could belong to any AI account.

## Content schema

Blog posts live under `src/data/blog/` as Markdown.

Frontmatter commonly includes:

- `title`
- `description`
- `pubDatetime`
- `modDatetime`
- `tags`
- `featured`
- `draft`
- `ogImage`
- `canonicalURL`
- `hideEditPost`
- `timezone`

Rules:

- Files starting with `_` are ignored by the loader.
- `draft: true` hides posts from production lists.
- Scheduled posts become visible after `pubDatetime` with the configured margin.
- Global timezone is `Asia/Bangkok`; posts can override with `timezone`.
- Do not publish under Matt's brand voice without preserving his positioning and review expectations.

## Content API caution

The repository has API docs and implementation for post management. Before changing or using the API, compare:

- `API.md`
- `src/pages/api/posts.ts`
- `src/config.ts`

Do not assume docs are perfectly current when behavior matters.

## Strategic content fit

Prefer changes that strengthen one of these lanes:

- Agentic-first development.
- AI/ML systems and automation.
- Blockchain and crypto market analysis.
- Digital music and creative systems.
- Practical operating notes from building with agents.

Every post or major page edit should answer: what perception shift does this create for Matt?
