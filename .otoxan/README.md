# bd-site .otoxan operating pack

This directory is the repo-local operating pack for AI agents working on `berryhill/bd-site`, Matt Berryhill's personal brand website at `berryhill.dev`.

Read order for any agent session:

1. `.otoxan/README.md` — operating contract and read order.
2. `.otoxan/context.md` — repository identity, stack, brand context, and source-of-truth notes.
3. `.otoxan/rules/agent-onboarding.md` — minimum repo readback for future agents.
4. `.otoxan/rules/github-issue-to-pr.md` — required change-control path.
5. `.otoxan/rules/safe-agent-work.md` — staging, validation, secrets, and deployment safety.
6. `.otoxan/rules/content-and-brand.md` — personal brand/content rules.
7. `.otoxan/rules/docs-and-contributing.md` — docs/source truth handling.
8. `.otoxan/rules/no-embedded-wiki.md` — current wiki-status boundary.
9. `.otoxan/flows/github-issue-to-pr.md` — default repo mutation flow.
10. `.otoxan/flows/code-change.md` — app/source change flow.
11. `.otoxan/flows/content-change.md` — blog/content change flow.
12. `.otoxan/flows/repo-knowledge-update.md` — docs and operating-pack update flow.

Hard rule: every material repository change goes through issue -> branch -> scoped commit -> PR. Do not direct-commit to `main`.

Canonical repo/base branch:

- Repository: `berryhill/bd-site`
- Website: `https://berryhill.dev/`
- Base branch: `main`
- Package manager: `pnpm`
- Validation suite: `pnpm run lint`, `pnpm run format:check`, `pnpm run build`

Boundary for this pack:

- `.otoxan/` describes how agents should work in this repository.
- It is not application runtime code.
- It should travel with the repo so future agents do not depend only on external onboarding reports, vector indexes, or one agent's memory.
