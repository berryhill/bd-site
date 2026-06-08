# GitHub issue to PR rule

All material repo changes must follow this path:

1. Create or identify a controlling GitHub issue.
2. Resolve the repo base branch from GitHub metadata; default is `main`.
3. Start from a clean worktree.
4. Fetch/prune and fast-forward local `main` from `origin/main`.
5. Create a feature/docs/fix branch that includes the issue number.
6. Make only scoped changes for the issue.
7. Stage specific files only. Do not use broad `git add -A` in agent flows.
8. Inspect staged diff before commit:
   - `git diff --stat --cached HEAD`
   - `git diff --name-status --cached HEAD`
9. Stop on unexpected source/config deletions or unrelated changes.
10. Commit with a clear scoped message.
11. Push branch and open a PR to `main`.
12. Link PR to the issue and include validation evidence.

Recommended branch names:

- `.otoxan` or docs-only work: `docs/issue-N-short-slug`
- Content work: `content/issue-N-short-slug`
- App/source work: `feat/issue-N-short-slug` or `fix/issue-N-short-slug`

PR body must state the path boundary:

- `.otoxan-only`
- docs-only
- content-only
- app/source-code-touching
- deployment-touching

Never claim a PR is ready without verifying the PR state and changed files through GitHub after opening it.

## PR template

`.github/PULL_REQUEST_TEMPLATE.md` contains the canonical PR checklist. Content PRs must complete the content checklist section (voice/brand, frontmatter, draft state, strategic fit, images/media, no agent metadata). Non-content PRs mark it N/A.

If the PR template is missing or reverted to upstream AstroPaper boilerplate, flag it as a repo health issue.
