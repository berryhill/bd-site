---
title: "Protocols are saturating; the operator's gap is governance, not transport"
description: "MCP, A2A, and ACP are solving transport. But authority, review, memory, and handoff — the governance layer no spec hands you — is what makes a stack safe."
pubDatetime: 2026-06-28T13:00:00Z
tags: ["agentic-ai", "agent-protocols", "multi-agent-systems", "governance", "operating-notes"]
featured: false
draft: false
---

Everyone is shipping agent-to-agent protocols. MCP, A2A, ACP — the story is that agents can now talk to each other, and the frontier is moving fast. That story is not wrong. It is incomplete in a way that matters, and the incompleteness is where the next year of real work lives.

This is not a post about whether agents can communicate. The [landscape post](/posts/where-agent-to-agent-communication-actually-stands/) mapped the territory; the [primer](/posts/agents-speaking-with-agents/) covered what the protocols are. This post is about what protocols solve and what they deliberately leave to you — the governance layer that no specification will hand you.

Protocols solve transport: can a message get from agent A to agent B with a shared schema, reliably and interoperably. They do not solve governance: who is allowed to act, who reviews the action before it propagates, how state survives a handoff, and what happens when authority is revoked mid-task. The protocol layer is saturating. The governance layer is where operator value compounds next.

## The saturation signal

Here is an operator hypothesis — grounded in cross-source signals but not settled fact: the protocol layer is converging. Three pieces of evidence support the read.

First, ACP — the Agent Communication Protocol — has [merged into A2A](https://agentcommunicationprotocol.dev/introduction/welcome) under the Linux Foundation. The ACP documentation states it plainly: "ACP is now part of A2A under the Linux Foundation!" Two of the three major inter-agent protocols are now under one foundation. That is the strongest single piece of consolidation evidence available today.

Second, [A2A launched with 50+ technology partners](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) and explicitly positions itself as complementary to MCP, not competitive. Google's announcement states: "A2A is an open protocol that complements Anthropic's Model Context Protocol (MCP)." The ecosystem is converging on shared transport, not fragmenting into competing dialects.

Third, the plumbing is standardizing. MCP and A2A both build on JSON-RPC over HTTP, with Server-Sent Events for streaming and structured capability discovery — Agent Cards in A2A, server capability negotiation in MCP. When two independent protocols arrive at the same transport primitives, the transport problem is close to solved. Or close to boring, which in infrastructure amounts to the same thing.

This is an early read, not a proven trend. But the direction is consistent enough to act on. If you are betting that your differentiation will come from a better protocol, the window is narrowing. The interesting work is moving above the protocol.

## What the protocol does not solve

A protocol that delivers messages perfectly still does not tell you who should be allowed to send them, what should happen when the content is wrong, or how context survives the transfer. Four governance problems live above the protocol layer. Every one of them can cause a production failure that a flawless protocol would not prevent.

### Authority — who is allowed to do what

The [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18), version 2025-06-18, states the gap explicitly: "MCP cannot enforce these security principles at the protocol level, but implementors SHOULD: (1) Build robust consent and authorization flows, (2) Provide clear documentation of security implications, (3) Implement appropriate access controls and data protections." The protocol exposes the tool. It does not decide who may call it, with what parameters, under what conditions. OWASP's Top 10 for Agentic Applications maps the same gap independently — Tool Misuse and Identity & Privilege Abuse are authority failures, not transport failures.

### Review — who checks agent decisions before they ship

A protocol can deliver a result. It cannot verify the result is correct before the next agent acts on it. OWASP's Agent Goal Hijack and Human-Agent Trust Exploitation categories both describe failures where the output looked plausible, propagated downstream, and turned out to be wrong — because nothing checked it between the protocol delivering and the next step consuming. The review gate — does a human or a verification step inspect the output before it propagates — is an application concern. No protocol ships with one.

### Memory — how context and state persist across agents

A2A's first design principle states that agents operate "without shared memory/tools/context; agents aren't reduced to mere 'tools.'" The protocol deliberately treats agents as opaque collaborators and does not address how memory is written, who owns it, how it decays, or what happens when it is corrupted. OWASP's Memory & Context Poisoning category exists precisely because persistent memory without provenance, isolation, or decay is an attack surface that no protocol manages for you.

### Handoff — how task state, evidence, and authority transfer

A handoff is not a chat event. It is a state-transfer problem: the receiving agent needs task state, context, authority boundaries, and evidence of prior work. OWASP's Insecure Inter-Agent Communication and Cascading Failures categories describe what happens when the protocol makes the message arrive but the handoff is structurally unsound — a single bad output propagates through the chain, and the blast radius is the entire downstream path.

<figure class="diagram">
<img src="/assets/blog/protocols-saturating-governance-gap-not-transport/governance-layer-tree.svg" alt="Vertical tree showing the governance layer decomposed into authority, review, memory, and handoff, sitting above the solved protocol layer with a gap labeled no spec hands you the above." title="Protocols solve how messages move. Governance solves who is allowed to act, who checks the result, how state persists, and what survives a handoff. No spec hands you the second layer." />
<figcaption>Protocols solve how messages move. Governance solves who is allowed to act, who checks the result, how state persists, and what survives a handoff. No spec hands you the second layer.</figcaption>
</figure>

## The counterpoint: "MCP has OAuth 2.1 now"

The strongest objection is fair. MCP's 2025-06-18 specification added OAuth 2.1 as the authorization mechanism for remote servers. Does that not solve the authority problem?

It solves connection-level authorization — can this client authenticate to this server and access these protected resources. That is transport-layer security: identity verification, token scoping, consent flows at the API boundary.

It does not solve action-level governance — should this specific agent, at this specific moment, be allowed to execute this specific tool with these specific parameters, given the current task context, review state, and operational boundaries. Even with OAuth 2.1 in place, the MCP specification still says it "cannot enforce these security principles at the protocol level." OAuth secures the pipe. It does not decide what should flow through it.

Think of it as a building keycard system. The keycard controls who enters the building and which floors they can access. It does not decide whether an employee should operate a specific machine on that floor, whether someone reviewed their work, or what happens to the work product when they hand it to a colleague.

## The research-vs-operator split

Academic research on multi-agent systems is solving protocol enactment. The [Kiko paper](https://arxiv.org/abs/2606.26156) — Christie V, Singh, and Chopra, June 2026 — presents "a protocol-based programming model for agents" and proves its agents are protocol compliant: they can faithfully execute any protocol enactment. The paper "completely abstracts away the underlying communication service" and focuses on the decision-making abstraction within protocol compliance.

That is real, rigorous work. But it is a different problem from governance. Kiko asks: can an agent faithfully follow a protocol's rules? It does not ask: who decided the agent was allowed to act, who reviewed the result, how state persisted across the interaction, or what happened when authority was revoked.

Operator coverage solves the other side — chat-style handoff narratives. "The agent hands off to the next agent." This collapses the state-transfer, authority, and review problems into a conversational metaphor that sounds clean but hides the engineering underneath.

Neither side addresses governance. Research is below the gap, proving protocols can be executed. Operator narratives are above the gap, describing smooth handoffs. The gap itself — who decides, who reviews, what persists, what transfers — is where the next year of durable work lives.

## The concrete failure

I have seen this failure mode directly. An agent was authorized to call a tool. The protocol delivered the request and the response correctly — authenticated, well-formed, no transport error. The agent called the tool with valid parameters on a legitimate connection. But the action was outside the scope the task context actually required. The tool was real, the call succeeded, and nothing about the protocol layer flagged the mismatch because the protocol had no opinion about whether the action was appropriate.

The failure was invisible until a human inspected the output and noticed the agent had done something technically correct but operationally wrong. The transport was perfect. The governance layer — the scope check, the review gate, the authority boundary — was absent, and the protocol could not substitute for it. I wrote about a specific instance of this in my post on [what breaks when AI agents access production databases](/posts/what-breaks-when-ai-agents-access-production-databases/).

This is the pattern: the protocol does its job, the agent does something within its tool access but outside its task scope, and the gap between "technically authorized" and "operationally appropriate" is where production incidents are born.

## Four questions before you deploy

The [OWASP Top 10 for Agentic Applications](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) (2026) maps every one of the following to a named risk category. It was built independently by 100+ practitioners who arrived at the same gap. Before you deploy any agent stack, you should be able to answer all four:

**1. Authority.** Which agent is allowed to call which tool, with what parameters, under what conditions? If the answer lives in the agent's prompt and not in an enforceable boundary, you do not have authority — you have a suggestion.

**2. Review.** Before an agent's output propagates to the next step, is there a verification gate? If the protocol delivers the result and nothing reviews it, you have transport without trust.

**3. Memory.** When an agent writes to a persistent store, who owns the write? How long does it live? What happens when it is wrong? If memory is a shared bucket with no provenance, no decay, and no isolation, you have a poisoning surface.

**4. Handoff.** When one agent hands work to another, does the receiving agent inherit task state, authority boundaries, and evidence of prior work? If the handoff is a message and not a state transfer, context is lost and the failure is invisible.

<figure class="diagram">
<img src="/assets/blog/protocols-saturating-governance-gap-not-transport/governance-questions-checklist.svg" alt="Numbered checklist of four governance questions for agent stack deployment: authority, review, memory, and handoff, each with a concrete verification prompt." title="Four questions to ask before deploying any agent stack. If you cannot answer all four in enforceable terms, you do not have governance, you have suggestions." />
<figcaption>Four questions to ask before deploying any agent stack. If you cannot answer all four in enforceable terms, you do not have governance — you have suggestions.</figcaption>
</figure>

## The quotable close

Protocols are the road. Governance is the rules of the road. You can pave every mile and still not know who has the right of way.

The next time someone pitches you an agent stack, ask where the governance layer lives. If the answer is "in the protocol," they are showing you the road, not the rules. The operators who build the governance layer — the authority, review, memory, and handoff decisions that no spec hands them — are the ones whose stacks will be safe to run in production a year from now. The rest will have very good roads to very bad outcomes.
