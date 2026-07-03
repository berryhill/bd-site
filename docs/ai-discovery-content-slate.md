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

**Published or in-flight:**
- `what-breaks-when-ai-agents-access-production-databases` — failure taxonomy, catastrophic vs. silent failures, Zartis multi-agent research
- `where-agent-to-agent-communication-actually-stands` — MCP/A2A verification gap, trust at handoff boundaries (draft)

**Candidate expansion (10–15 post target):**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 1 | What breaks when you run agents in production | Comprehensive failure taxonomy beyond database access — memory, network, auth, rate limits | Links to #1, #3 | P0 |
| 2 | Why agent task queues need audit trails | Async agent workflows require provenance; what breaks without it | Links to #1 | P1 |
| 3 | Agent access patterns: read vs. write vs. mutate | Which operations require what safeguards; tool-permission scoping | Links to #1 | P1 |
| 4 | Silent failures in multi-agent reasoning chains | Deep-dive on Zartis 17.2× error amplification; where it compounds | Links to #1 | P2 |
| 5 | Database schema as an agent contract | Schema-first design as a way to constrain agent mutations | Links to #1, #3 | P2 |

**Tag pattern:** `agentic-ai`, `production-engineering`, `database`, `operating-notes`

---

### Cluster 2: MCP / A2A / Agent Protocols

Where agents meet each other. Protocol mechanics, verification gaps, framework tradeoffs.

**Published or in-flight:**
- `where-agent-to-agent-communication-actually-stands` — MCP vs. A2A, verification gap, trust boundaries (draft)
- `agents-speaking-with-agents` — early published piece on agent communication (verify current status)

**Candidate expansion:**

| # | Title (working) | Angle | Internal links | Priority |
|---|----------------|-------|---------------|----------|
| 6 | MCP vs. A2A: what the protocol comparison actually reveals | Technical comparison; when to use which; where they converge | Links to #7, #8 | P0 |
| 7 | Agent personas as an architecture problem | Public vs. private agent identity; how to design for it | Links to #6, #1 | P1 |
| 8 | Why frameworks (AutoGen, CrewAI, LangGraph) are a tradeoff, not a solution | When to use a framework vs. roll your own orchestration | Links to #6, #7 | P1 |
| 9 | The verification gap: what MCP and A2A don't solve | Trust, observability, and recovery at the agent handoff boundary | Links to #6, #7, #8 | P2 |

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
4. **Do not link to draft-only posts** unless the linked post will be published before or alongside this one.

Example section:

```
## See also

- [What breaks when you give AI agents access to your production database](/posts/what-breaks-when-ai-agents-access-production-databases/) — failure taxonomy and mitigation patterns
- [The Missing Layer in Agent-to-Agent Communication](/posts/where-agent-to-agent-communication-actually-stands/) — verification at agent handoff boundaries
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

1. Are **published** (not draft)
2. Cover a **distinct sub-topic** within one of the defined clusters
3. Are **specific and technical** — not overview or opinion pieces without substance
4. Have **cited sources** or **original analysis** — not just framing
5. Have **visible internal links** to other berryhill.dev posts

Posts that meet all five criteria should be added to the representative section of `llms.txt.ts` and the LLM_CRAWL_MANIFEST.md representative listing.

**Current candidates for /llms.txt representative listing:**
- `what-breaks-when-ai-agents-access-production-databases` — specific failure taxonomy, Zartis citation, clear technical content
- `quantum-readiness-for-agent-workflows` — specific technical framing, diagram, cited sources

**Conditional candidates (pending draft clearance):**
- `where-agent-to-agent-communication-actually-stands` — pending draft→publish
- `agents-speaking-with-agents` — pending status verification

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

---

## Cluster Status Tracker

| Cluster | Published | Draft | Candidates | /llms.txt ready |
|---------|-----------|-------|------------|----------------|
| 1: Agent Infrastructure | 1 | 0 | 4 | 1 |
| 2: MCP/A2A | 0 | 1 | 3 | 0 (pending) |
| 3: Local AI Infrastructure | 0 | 0 | 3 | 0 |
| 4: Operating with Agents | 0 | 0 | 3 | 0 |
| 5: Quantum + Agent Workflows | 1 | 0 | 2 | 1 |
| 6: Developer Value | 0 | 0 | 2 | 0 |
| **Total** | **2** | **1** | **17** | **2** |

---

*Last updated: 2026-06-25*
*Owner: Luca Vale (brand architect)*
*Next review: after 3 new posts publish or Q3 2026*
