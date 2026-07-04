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
- Verify archive, tag, and card/page-shell framing still presents the corpus as field notes, operating questions, and evidence trails rather than generic blog inventory.

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

*Last updated: 2026-07-04*
*Owner: Luca Vale (brand architect)*
*Next review: after 3 new posts publish or Q3 2026*
