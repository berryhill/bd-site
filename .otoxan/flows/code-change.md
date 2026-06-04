# Flow: code change

Use for application/source changes in `berryhill/bd-site`.

1. Read context:
   - `.otoxan/README.md`
   - `.otoxan/context.md`
   - `.otoxan/rules/github-issue-to-pr.md`
   - `.otoxan/rules/safe-agent-work.md`
2. Confirm the controlling issue and intended path boundary.
3. Start from fresh `main`:
   - `git status --short --branch`
   - `git fetch origin --prune`
   - `git checkout main`
   - `git pull --ff-only origin main`
4. Create an issue-numbered branch.
5. Inspect relevant files before editing. Prefer source/config over stale docs when they conflict.
6. Make the smallest coherent change that solves the issue.
7. Stage specific files only.
8. Run validation:
   - `pnpm run lint`
   - `pnpm run format:check`
   - `pnpm run build`
9. Inspect staged diff:
   - `git diff --stat --cached HEAD`
   - `git diff --name-status --cached HEAD`
10. Commit, push, and open a PR with:
   - issue link
   - summary
   - files changed
   - validation evidence
   - source-code boundary statement
   - residual risks

If validation fails, fix and rerun. Do not open a PR claiming success without reporting unresolved failures.
