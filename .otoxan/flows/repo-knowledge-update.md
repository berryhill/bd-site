# Flow: repo knowledge update

Use when updating `.otoxan/`, repo docs, AI guidance, or operating context.

1. Treat source code and config as primary evidence.
2. Inspect current repo files before changing guidance.
3. Capture durable rules, not temporary task status.
4. If adding process guidance, prefer class-level rules and reusable flows over one-off notes.
5. Keep `.otoxan/` concise enough to be read at the start of a future task.
6. Route changes through issue -> branch -> PR.
7. For `.otoxan-only` work, verify all changed paths are under `.otoxan/`:
   - `git diff --name-status HEAD`
   - `git diff --name-status --cached HEAD`
8. Include in the PR:
   - why the operating pack changed
   - what future agent behavior changes
   - changed files
   - validation/readback evidence

Do not use `.otoxan/` to hide task progress, stale PR numbers, or temporary session notes. Durable context belongs here; ephemeral execution status does not.
