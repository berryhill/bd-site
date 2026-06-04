# Flow: GitHub issue to PR

Use this as the default repository mutation flow for `berryhill/bd-site`.

1. Intake
   - Read the issue, comments, labels, and acceptance criteria.
   - Classify the path boundary: `.otoxan-only`, docs-only, content-only, app/source-code-touching, or deployment-touching.
2. Prepare branch
   - Verify clean worktree.
   - Fetch/prune.
   - Fast-forward `main` from `origin/main`.
   - Create an issue-numbered branch.
3. Execute scoped work
   - Read relevant `.otoxan/` rules and repo files.
   - Edit only files in scope.
   - Stage specific files only.
4. Validate
   - `.otoxan-only`: inspect file list and Markdown readability.
   - docs/content/source changes: run applicable `pnpm` validation.
   - source/deployment changes: run full lint, format check, and build unless blocked.
5. Pre-commit guard
   - `git diff --stat --cached HEAD`
   - `git diff --name-status --cached HEAD`
   - Stop on unrelated files or unexpected deletions.
6. Finalize
   - Commit.
   - Push.
   - Open PR to `main`.
   - Include issue link, summary, validation, changed files, path boundary, and residual risks.
