# AI Discovery Content Slate

## Strategic Goal

Align berryhill.dev around Matt Berryhill's work building **AI-native discovery systems**: agent governance, provenance, review gates, protocol boundaries, shipped-work proof, and the operator judgment required to turn agent output into accountable public work.

The site should read as a public field notebook on useful agentic systems outside the demo — not a news aggregator, product-marketing surface, or generic AI tooling blog. The audit found the corpus is technically functional but thin and loosely connected. Agents, search systems, and human readers need repeated, interlinked, on-lane content that shows how workflows, protocols, evidence, and operating habits make AI work verifiable.

## Authority Model

Topical authority builds through three mechanisms:

1. **Cluster density** — multiple posts covering distinct sub-topics within a cluster, linked together
2. **Internal linkage** — every new post links to 2–4 related berryhill.dev posts where available
3. **External citation discipline** — claims about public facts, research, or tools get cited; speculation is labeled as such

This slate defines the clusters, names the posts that build each one, and sets the linkage and citation rules that govern future content.

Public terminal-shell surfaces on the home page, posts archive, about page, post detail page, and search are a brand/interface metaphor and a prototype-fidelity contract. They should make the site feel like a working field console while remaining grounded in public site data and visible copy. Issue #75 narrowed terminal-shell public chrome to real public destinations only, and issue #77 removed Search as a visible terminal/public tab destination, but visible terminal tabsets may still be surface-specific. The posts archive intentionally shows only `home`, `posts`, and `about.md`; `/search` remains a public route, but it is not a visible posts-archive terminal tab after issue #79. Issue #80 added a post-detail-specific compact terminal footer concept, and issue #89 now accepts that post detail uses the terminal.html-style `terminal-post-footer` block before the terminal end prompt, containing `block-h terminal-post-footer__heading`, `cat post.meta`, `reader actions`, and an `env terminal-post-footer__env` grid of public-data actions: TAG= tag links, SHARE= share links, `EditPost` when allowed, and TOP= scroll. Preserve that terminal.html-style footer while continuing to ban the older bulky ShareLinks/Tag/post-tools panel and the rejected `tail -f post.meta`, rail/group/label, row/items/chip treatments. Issue #81 refined the about-page bottom presentation specifically: the accepted bottom CTA is `#connect` / `Let's connect..` with email, calendar, LinkedIn, and RSS destinations arranged as a compact vertical contact-card structure, followed by a compact in-window `terminal-exit` rail with an EOF marker and home/back link; do not reintroduce the old `If you want to hire me` section, detached footer, prompt-tail footer treatment, or `built quietly · zero trackers` style footer copy unless a future scoped issue replaces it. Issue #90 adds the featured/pinned card refinement: featured post cards on the home page and pinned cards in the posts archive should use compact terminal card styling, not oversized decorative artifact treatments, and should stay visually consistent, readable, and derived from public post data. Issue #93 adds the homepage `/fleet` rule: it is rendered from `src/utils/homepageFleet.ts`, its count is derived from `curatedHomepageFleet`, and the current public list is exactly `default / silas`, `ada-vector`, `archer`, `chip-renwick`, `luca`, `nick-mercer`, `valeria-cruz`, `wren-ashford`, and `xander`; Vinnie, deprecated, test, and other non-public profiles remain excluded unless a future scoped issue explicitly adds them. Issue #95 specifies that featured/pinned cards must use the target terminal-card treatment: `.md` badge text, shared homepage/archive styling, distinct homepage/archive heading spacing, a plain border/background card shell, no decorative artifact treatment, no warn-color badge treatment, an archive pinned `open →` affordance, and public post data only. Issue #111 further locks the accepted featured/pinned card header rhythm as compact, not vertically padded: the header row margin and padding reset to zero, the header uses 1.2 line-height, the compact `.md` badge uses compact padding, and the title/name separation is 8px. `notes/`, `projects/`, and `uses.md` were hidden because they implied stale or non-existent route surfaces. They are not evidence of private runtime state, production queues, fleet activity, live telemetry, or verified operational metrics unless a public implementation and explicit acceptance criteria back the displayed values.

---

## Cluster Definitions and Candidate Posts

### Cluster 1: Agent Infrastructure (in production)

The core of the site. Covers what happens when agents run against real systems — the failure modes, the access patterns, the operational gravity.

**Verified published public anchors:**
- None in this checkout. Prior Agent Infrastructure concepts should be treated as candidate/in-flight topics only until a non-draft public post exists.

**Candidate expansion (10–15 post target):**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 1 | What breaks when you run agents in production | Comprehensive failure taxonomy beyond database access — memory, network, auth, rate limits | Link only after a verified public anchor exists | P0 |
| 2 | Why agent task queues need audit trails | Async agent workflows require provenance; what breaks without it | Link to governance/protocol anchor where relevant | P1 |
| 3 | Agent access patterns: read vs. write vs. mutate | Which operations require what safeguards; tool-permission scoping | Link only after a verified public anchor exists | P1 |
| 4 | Silent failures in multi-agent reasoning chains | Deep-dive on Zartis 17.2× error amplification; where it compounds | Link only after a verified public anchor exists | P2 |
| 5 | Database schema as an agent contract | Schema-first design as a way to constrain agent mutations | Link only after a verified public anchor exists | P2 |

**Tag pattern:** `agentic-ai`, `production-engineering`, `database`, `operating-notes`

---

### Cluster 2: MCP / A2A / Agent Protocols

Where agents meet each other. Protocol mechanics, verification gaps, framework tradeoffs.

**Verified published public anchors:**
- `protocols-are-saturating-the-operators-gap-is-governance-not-transport` — protocol saturation, governance gaps, authority, review, memory, and handoff boundaries (live)

Prior MCP/A2A landscape and primer concepts remain candidate topics only. Do not treat `where-agent-to-agent-communication-actually-stands`, `agents-speaking-with-agents`, or any missing/draft-only slug as a published link target until it passes the public-post filter.

**Candidate expansion:**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 6 | MCP vs. A2A: what the protocol comparison actually reveals | Technical comparison; when to use which; where they converge | Links to governance/protocol anchor | P0 |
| 7 | Agent personas as an architecture problem | Public vs. private agent identity; how to design for it | Links to governance/protocol anchor | P1 |
| 8 | Why frameworks (AutoGen, CrewAI, LangGraph) are a tradeoff, not a solution | When to use a framework vs. roll your own orchestration | Links to governance/protocol anchor | P1 |
| 9 | The verification gap: what MCP and A2A don't solve | Trust, observability, and recovery at the agent handoff boundary | Links to governance/protocol anchor | P2 |

**Tag pattern:** `agentic-ai`, `multi-agent-systems`, `agent-protocols`, `operating-notes`

---

### Cluster 3: Local AI Infrastructure

Running models on-premises or on developer machines. Quantization, inference servers, hardware constraints, privacy.

**Candidate expansion:**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 10 | What you give up when you run quantized models locally | Accuracy vs. control tradeoff; where quantization breaks down | — | P1 |
| 11 | Local inference servers: a comparison for developer workflows | Ollama vs. lmstudio vs. local API servers; tradeoffs | Links to #10 | P2 |
| 12 | Privacy-first AI: when on-device inference is the right call | Regulatory, latency, and cost contexts that favor local | Links to #10, #11 | P2 |

**Tag pattern:** `local-ai`, `infrastructure`, `quantization`, `privacy`

---

### Cluster 4: Operating with Agents

Workflow, automation, and operational practice. How to work *with* agents rather than just *deploying* them.

**Candidate expansion:**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 13 | Prompting as a discipline, not a trick | Why prompt engineering is a design practice; consistency patterns | Links to #1 | P1 |
| 14 | Agent supervision patterns: when to watch and when to放手 | Level of autonomy vs. task criticality; escalation design | Links to #1, #2 | P1 |
| 15 | Why your AI-assisted workflow needs a kill switch | Human override, circuit breakers, and rollback for agent actions | Links to #1, #13, #14 | P1 |

**Tag pattern:** `agentic-ai`, `automation`, `operating-notes`, `workflow`

---

### Cluster 5: Quantum + Agent Workflows

Pre-existing cluster. The quantum post is live; expansion should reinforce rather than dilute.

**Published:**
- `quantum-readiness-for-agent-workflows` — quantum computing implications for agentic systems (live)

**Candidate expansion:**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 16 | Post-quantum crypto and what it means for AI agents | If agents handle sensitive data, they need post-quantum crypto readiness | Links to quantum post | P2 |
| 17 | Quantum optimization for agent scheduling problems | Near-term quantum advantage use cases for agent task routing | Links to quantum post | P3 |

**Tag pattern:** `quantum`, `agentic`, `automation`, `infrastructure`

---

### Cluster 6: Developer Value and AI Tooling

How AI changes developer practice. This cluster overlaps with Cluster 1 but focuses on the human side.

**Candidate expansion:**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 18 | AI agents make some developers more valuable, not all | Who wins when agents write code; the capability asymmetry | Links to #1, #13 | P1 |
| 19 | The copilot-to-agent transition: what changes in your workflow | Moving from completion tools to autonomous agents; what you must redesign | Links to #13, #14, #18 | P1 |

**Tag pattern:** `agentic-ai`, `developer-tools`, `operating-notes`

---

## Internal Linking Rules

Every new technical post must include:

1. **2–4 links to related berryhill.dev posts** where a meaningful connection exists. Do not force links that don't add context.
2. **One explicit "see also" block** at the end of the post listing related posts by cluster. Use RelatedPosts component where available.
3. **Link text must be descriptive** — not "click here" or bare URLs. Anchors should describe the linked content.
4. **Do not link to draft-only or missing posts.** Every internal post link must pass the implemented public-post crawl audit before publication unless the linked post will be published before or alongside this one.

Example section:

```
## See also

- [Protocols are saturating; the operator's gap is governance, not transport](/posts/protocols-are-saturating-the-operators-gap-is-governance-not-transport/) — governance above MCP/A2A/ACP transport
- [Quantum is coming. Agent workflows should start leaving breadcrumbs.](/posts/quantum-readiness-for-agent-workflows/) — provenance and workflow legibility for future optimization layers
```

---

## External Citation Rules

1. **Cite primary sources for research claims** — research papers, official documentation, documented incident reports. Do not cite secondary news coverage as the basis for technical claims.
2. **Label speculation** — if a claim is uncertain, say so. "The pattern suggests X" is better than "X is true."
3. **Include at least one external link per substantial claim** in technical posts. Generic framing like "AI is changing everything" needs a specific grounding.
4. **Cite the Zartis research correctly** — 17.2× error amplification in multi-agent systems vs. 4.4× for centralized orchestration; cite the paper or the documented source.

---

## /llms.txt Representative Selection Criteria

The `/llms.txt` manifest should include posts that:

1. Pass the shared public-post filter: **not draft**, not an underscore/private path, valid publish date, and not scheduled beyond the configured margin.
2. Cover a **distinct sub-topic** within one of the defined clusters
3. Are **specific and technical** — not overview or opinion pieces without substance
4. Have **cited sources** or **original analysis** — not just framing
5. Have **visible internal links** to other berryhill.dev posts

Posts that meet all five criteria must first pass the shared public-post filter before being added to the representative section of `llms.txt.ts` and the LLM_CRAWL_MANIFEST.md representative listing.

**Current candidates for /llms.txt representative listing:**
- `protocols-are-saturating-the-operators-gap-is-governance-not-transport` — public governance/protocol anchor with cited protocol sources and original operator analysis
- `quantum-readiness-for-agent-workflows` — specific technical framing, diagram, cited sources

**Future candidates (pending public-post filter clearance):**
- MCP/A2A landscape and primer concepts may become representative candidates after publication, but missing or draft-only slugs are not current link targets.

---

## Publish Gate

This slate is a **planning and authoring artifact**, not a publication schedule. All posts still go through the two-gate content protocol:

1. Strategic brief + voice audit
2. Matt review and approval

No post is published from this slate without the normal gate. This document does not change Matt's approval authority.

---

## Maintenance

This slate should be reviewed quarterly or after every 3–5 new published posts to:
- Mark completed posts as "done"
- Add new candidate posts as the content corpus grows
- Update /llms.txt representative section when new qualifying posts publish
- Adjust cluster boundaries if the content strategy shifts
- Verify tag, page, and card shells remain on-brand while stale route surfaces stay hidden or return 404 instead of presenting inactive inventory as public navigation.
- Verify the issue #73 terminal route set, with the issue #75, issue #79, issue #80, issue #81, issue #89, issue #90, issue #93, issue #95, and issue #111 refinements — home, posts archive including pagination, about page, and post detail must keep the intended terminal prototype language, class contract, responsive behavior, and public-data-only integrity rule. Posts archive pagination/table rows must keep the explicit five-column row contract: date, read time, slug/title, description, and arrow. Posts archive tab navigation must not reintroduce a visible `search` tab unless a future scoped issue explicitly accepts it, and must not reintroduce `notes/`, `projects/`, or `uses.md` labels unless those routes are rebuilt as real public surfaces. For the issue #89 post-detail footer, verify the terminal.html-style `terminal-post-footer` block remains before the target bottom sequence and that the full order stays compact footer -> end prompt -> adjacent posts -> back link, with responsive env grid behavior intact. Preserve `cat post.meta`, `reader actions`, TAG=/SHARE=/TOP= env-card language, `data-terminal-top`, and the allowed `EditPost` action when enabled. Do not reintroduce `terminal-post-footer__row`, `terminal-post-footer__items`, `terminal-post-footer__chip`, `terminal-post-footer__rail`, `terminal-post-footer__group`, `terminal-post-footer__label`, `tail -f post.meta`, bulky ShareLinks, Tag panel, post-tools chrome, or oversized/non-target footer treatments. About page maintenance must also preserve the issue #81 bottom contract: `#connect`, `Let's connect..`, compact problem/artifact/deadline/decision deck copy, four public destinations, two primary cards only for email/calendar, vertical `.contact-grid a` card structure, `.terminal-exit` inside the terminal window, EOF marker, and no old `If you want to hire me`, prompt-tail footer, detached `<footer>`, or `built quietly · zero trackers` copy. For issue #90/#95/#111 featured/pinned cards, preserve shared compact `.featured-file` and `.pin` styling; preserve `class="block-h featured-shell-heading"` on the homepage featured shell heading and `class="block-h pinned-shell-heading"` on the posts archive pinned shell heading; do not reintroduce `.featured-file::before`, `.featured-file::after`, `featured artifact` watermark text, emoji pin pseudo-elements, inline warn-color star styling, warn-color badge treatment, or a `PINNED` badge; keep archive pinned links accessible with `aria-label` and a `.md` badge. Future maintainers must not regress the issue #95/#111 card CSS contract: homepage `.featured-shell-heading` uses `margin-top: 32px; margin-bottom: 14px;`; archive `.pinned-shell-heading` uses `margin-top: 36px; margin-bottom: 14px;`; `.featured-file`/`.pin` share `border: 1px solid var(--border)`, `border-radius: 6px`, `padding: 16px 16px 18px`, and `background: var(--surface)`; `.featured-file .head, .pin .head` must preserve `margin: 0`, `padding-block: 0`, and `line-height: 1.2`, and must not force uppercase or letter spacing; `.featured-file .head .ext, .pin .head .ext` uses `color: var(--info)`, `background: var(--surface-2)`, `padding: 1px 5px`, `border-radius: 3px`, `font-size: 10px`, and `line-height: 1.2`; `.featured-file .name, .pin .name` uses `margin-top: 8px`, `font-size: 16px`, `font-weight: 500`, and `line-height: 1.3`; descriptions use `line-height: 1.45` and `-webkit-line-clamp: 2`; `.featured-file .stat, .pin .meta` use `margin-top: 14px`, `gap: 16px`, and `line-height: 1.2`; both `.featured-file .stat .open` and `.pin .meta .open` auto-align with `margin-left: auto`; archive pinned links keep the literal `<span class="open">open →</span>` affordance. For issue #93 homepage fleet maintenance, preserve shared-data rendering from `curatedHomepageFleet`, keep `getHomepageFleetCountLabel(curatedHomepageFleet)` aligned with the list length, keep all rendered rows derived from public curated data, and preserve the explicit omission of `vinnie-santoro`, fixture/test profiles, and World Cup betting-only copy until separately scoped.

### Public Surface Integrity

Public terminal surfaces may only display values derived from public site data, such as published post count, tag count, latest post date, total word count, frontmatter previews, per-post word count, post tags, and canonical/share URL data. Post-detail bottom metadata is allowed only inside the terminal.html-style `terminal-post-footer` env grid, where it must use public site data: post tags for TAG=, canonical/share URLs for SHARE=, the allowed edit link through `EditPost`, and the static TOP= scroll action. Do not invent fake views, fake agent counts, private fleet dashboards, production queue claims, live telemetry, verified telemetry, non-public claims, or private operations, and do not turn the restored compact footer back into stale bulky ShareLinks/Tag/post-tools panels. Homepage `/fleet` may display only the curated, profile-backed public agent list and count from `src/utils/homepageFleet.ts`; it must not imply live telemetry, private dashboard state, queue status, task execution, hidden profile inventory, legacy/deprecated agents, or temporary omissions as public availability. Route-like labels in terminal chrome are treated as product promises, but public route availability is not the same as a visible terminal chrome promise. Visible tabs must match the accepted surface-specific navigation contract; for the posts archive, that contract is `home`, `posts`, and `about.md` only, with no visible `search`, `notes/`, `projects/`, `uses.md`, or `archive` tab. Do not show `notes/`, `projects/`, `uses.md`, archived project pages, or telemetry-like shells unless the route is current, public, and intentionally accepted; `/archives/` and `/projects/draftfly/` are intentionally hidden or 404 under issue #75 until future scoped work restores them. Any telemetry-style claim must be backed by a public implementation and acceptance criteria before it appears on the site. For the about page, contact/footer chrome is limited to accepted static public destinations in compact card form and static brand copy; it must not imply private agent telemetry, private dashboards, queue state, private telemetry, tracking claims, external/footer chrome beyond the accepted in-window `terminal-exit` rail, or inactive route surfaces.

---

## Cluster Status Tracker

| Cluster | Published | Draft | Candidates | /llms.txt ready |
|---------|-----------|-------|------------|----------------|
| 1: Agent Infrastructure | 0 | 0 | 5 | 0 |
| 2: MCP/A2A | 1 | 0 | 4 | 1 |
| 3: Local AI Infrastructure | 0 | 0 | 3 | 0 |
| 4: Operating with Agents | 0 | 0 | 3 | 0 |
| 5: Quantum + Agent Workflows | 1 | 0 | 2 | 1 |
| 6: Developer Value | 0 | 0 | 2 | 0 |
| **Total** | **2** | **0** | **19** | **2** |

---

*Last updated: 2026-07-08*
*Owner: Luca Vale (brand architect)*
*Next review: after 3 new posts publish or Q3 2026*
