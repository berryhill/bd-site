# Embedded wiki status

At the time this pack was created, `berryhill/bd-site` does not have an embedded `wiki/` knowledge base requiring wiki index/log maintenance.

If a future issue adds an embedded wiki or knowledge base:

- Add explicit wiki instructions to `.otoxan/`.
- Define where raw sources live and whether they are immutable.
- Define where synthesized knowledge should be written.
- Require index/log updates if the wiki uses them.
- Route wiki mutations through issue -> branch -> PR.

Until then, do not invent wiki paths or claim wiki update requirements for this repo. Use `.otoxan/` for durable agent operating context and existing repository docs for human-facing project documentation.
