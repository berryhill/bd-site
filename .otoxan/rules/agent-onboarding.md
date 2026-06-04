# Agent onboarding rule

Before doing repo work, agents must build a current local picture of `bd-site` instead of relying only on memory or prior reports.

Minimum onboarding read:

1. `.otoxan/README.md`
2. `.otoxan/context.md`
3. `package.json`
4. `README.md`
5. `CLAUDE.md`
6. `src/config.ts`
7. `src/content.config.ts`
8. `src/live.config.ts`
9. The issue-specific files named by the task

Then verify:

```bash
git status --short --branch
pnpm --version
node --version
```

Operational expectations:

- Work in the canonical clone for this repo unless the task flow explicitly creates a separate worktree.
- Do not assume repo docs are current when package scripts or source code say otherwise.
- Treat this site as a personal-brand property. Product/content decisions need brand context, not just technical correctness.
- If the task changes repo behavior, leave PR evidence that explains what future agents or humans should know.
