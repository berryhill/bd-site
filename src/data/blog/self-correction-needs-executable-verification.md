---
title: "AI Self-Correction Needs Executable Verification"
description: "A practical verification promotion gate for deciding when an AI agent correction has enough evidence to replace prior state or trigger action."
author: "Matt Berryhill"
pubDatetime: 2026-08-03T22:41:39Z
featured: false
draft: true
tags:
  - AI agents
  - agent verification
  - self-correction
  - AI operations
canonicalURL: "https://berryhill.dev/posts/self-correction-needs-executable-verification/"
---

Reflection can propose a correction. It cannot authorize one.

That distinction gets lost in a lot of agent design. A model critiques its answer, produces a cleaner second answer, and sounds more certain. The system treats the revision as progress because the text changed in the right direction.

But a second fluent answer is still an answer. It may be better. It may also preserve the original mistake, introduce a new one, or optimize for whatever the critique happened to notice.

A trustworthy agent needs two separate operations:

- **Correction generation:** propose a changed answer, plan, or action.
- **Correction promotion:** decide whether that proposal has earned the right to replace prior state or trigger action.

The first is a model behavior. The second is a system policy.

If you collapse them, confidence becomes authority. If you separate them, evidence can sit between a proposed correction and its consequences.

<figure class="diagram"><img src="/assets/blog/self-correction-needs-executable-verification/correction-is-not-authority.svg" alt="Two paths compare self-critique with governed correction: a revised answer remains blocked, while a proposed correction can advance only through a relevant check, evidence receipt, and adjudication." title="Correction is not authority: a revised answer remains untrusted until evidence and adjudication make it eligible for promotion." width="390" height="610" loading="lazy" decoding="async"/><figcaption>A better-sounding revision is still untrusted state. Authority begins only after the evidence path is complete.</figcaption></figure>

## Self-critique changes text. Verification changes evidence.

Natural-language reflection is useful. It can expose assumptions, find inconsistencies, and generate better hypotheses. The mistake is treating that usefulness as proof.

Suppose an agent says a deployment failed because an environment variable is missing. On reflection, it changes its diagnosis to a database timeout. Nothing about the second explanation makes it more trustworthy unless the system checks evidence relevant to the disputed claim.

That check might be executable: query deployment status, inspect a bounded log window, or test connectivity without mutation. It might be independently inspectable: compare the claim against a signed record or the current source. It might require human adjudication: interpret an authorization boundary or decide whether a visual result matches a design.

The evidence class changes with the claim. The promotion rule should not.

**A correction should not advance solely because the agent produced it twice.**

## What AMTFV actually built

A July 31, 2026 arXiv v1 preprint by Rui Zou, Yutao Zhu, Mengqi Wei, and Ji-Rong Wen offers a useful example inside a deliberately narrow domain: mathematical self-correction.

Their framework, [AMTFV](https://arxiv.org/abs/2607.29549), uses a Mathematical Tool Flow with an interrupt-execute-resume interaction. A verification agent constructs the verification workflow and specifies the computational intent: the context, mathematical object, and return operation needed for a check. A separate toolbox agent translates that intent into an executable call, dispatches it to a bounded mathematical backend, and returns the result.

The reasoning process pauses for execution instead of pretending the calculation happened in prose. The returned record can then support adjudication, answer revision, or revision of the verification workflow itself.

That last path matters. A tool can execute a bad check perfectly. If the workflow tested only local consistency when the claim required global optimality, successful execution is not relevant proof. The verifier may need to change what it asks before it changes the answer.

AMTFV's toolbox is also concrete and bounded. The paper describes SymPy for symbolic computation and equation solving, itertools for enumeration, and Fraction for exact rational arithmetic. This is not a claim that arbitrary agent work can be made exact. It is an architecture for connecting reasoning to executable evidence where the domain supports it.

<figure class="diagram"><img src="/assets/blog/self-correction-needs-executable-verification/amtfv-interrupt-execute-resume.svg" alt="AMTFV pauses reasoning while a verification agent defines computational intent, a toolbox agent invokes a bounded mathematical backend, and the returned receipt supports answer or workflow revision." title="AMTFV interrupt-execute-resume flow: a bounded mathematical check returns an inspectable receipt for adjudication." width="390" height="720" loading="lazy" decoding="async"/><figcaption>Execution makes the check inspectable. It does not make a badly chosen check relevant.</figcaption></figure>

## What the evaluation supports—and what it does not

The evaluation covers 170 competition-style mathematics problems across five datasets and seven model configurations from DeepSeek, GPT, and Gemini. That is 1,190 model-problem instances for the paper's aggregate transition analysis. It is not an evaluation of software deployment, browser state, database mutation, policy interpretation, or other production-agent workloads.

Within that mathematical setting, the authors report that the largest sample-weighted average-accuracy gain over the stronger evaluated ProgCo-family baseline was **8.3 percentage points under one model configuration**.

The transition results are more useful when read in both directions. In the paper's row-normalized aggregate analysis, AMTFV moved **18.4% of initially wrong cases to correct**. It also moved **2.8% of initially correct cases to wrong**.

Those rates are not shares of all 1,190 instances; each is conditioned on the starting correctness state. More importantly, they show why executable verification should not be sold as a certainty machine. The method improved correction behavior in the evaluated setting, but correction remained non-monotonic. Some right answers became wrong.

The paper is a preprint, not independent replication or peer-reviewed consensus. Its authors identify extension beyond mathematical toolboxes as future work. The production model below is my operator synthesis informed by the architecture—not a production-reliability result demonstrated by AMTFV.

## Separate correction from promotion

For an agent system, I would model a proposed correction as untrusted state.

It can be inspected. It can request checks. It can produce a verification plan. It cannot replace the known-good state or trigger a consequential action until a promotion gate adjudicates evidence tied to the disputed claim.

That state boundary changes the design conversation.

Instead of asking, “Did the agent reflect?” ask:

- What exact claim changed?
- What evidence could establish or falsify it?
- Did the check actually run?
- Was it authorized to run against those inputs?
- What did it return?
- Who or what interpreted the result?
- What already-correct behavior could the correction break?
- What happens when the evidence is unavailable or inconclusive?

This is the difference between a critique loop and an evidence system.

## The Verification Promotion Gate

Here is a practical operating artifact for making that boundary explicit.

### 1. Disputed claim

Name the proposition that changed, not the whole answer.

“Deployment is broken” is too broad. “The current release is unhealthy because its readiness check fails” is testable. A precise disputed claim makes irrelevant evidence easier to reject.

### 2. Evidence class

Choose the strongest appropriate route:

- **Executable evidence** when a bounded computation or runtime check can test the claim.
- **Independently inspectable evidence** when a source, record, screenshot, or current-state readback can be compared directly.
- **Human-adjudicated evidence** when meaning, authorization, risk, or judgment cannot be reduced safely to a tool result.

Human review is not a failure of automation. Sometimes it is the correct evidence class.

### 3. Computational intent

If the check is executable, state what it must establish before selecting a tool.

The intent might be: verify that every expected route returns the current content version, prove two symbolic expressions are equivalent, or confirm that a proposed schedule has no overlap. “Run tests” is an activity. Computational intent defines the claim the activity must answer.

### 4. Tool authority

Bound what may run, against which data, with which side effects.

A correction verifier usually needs less authority than an executor. A read-only status check should not inherit permission to restart a service. Separating verification authority from mutation authority limits the damage from a bad hypothesis or a badly formed check.

### 5. Evidence receipt

Keep a durable record of what actually happened.

At minimum, the receipt should identify the disputed claim, inputs or versions, tool or source, returned output, failure state, and enough timing context to judge freshness. A narrated check is not a receipt. “I verified it” does not show what ran.

### 6. Adjudication

Convert the receipt into one explicit outcome:

- promote the correction;
- revise the correction;
- refuse the correction; or
- require a human decision.

Execution alone is not adjudication. A command can succeed while testing the wrong property. The evaluator must decide whether the evidence is relevant and sufficient for this claim and consequence.

### 7. Regression check

Test what was already correct before the correction was proposed.

Self-correction is not monotonic. A narrow fix can invalidate a true fact elsewhere, break a working route, or erase a necessary constraint. Preserve the prior known-good state until the proposed correction passes both its target check and the relevant regression checks.

### 8. Fallback

Decide the safe outcome before verification fails.

When evidence is missing, stale, contradictory, unauthorized, or inconclusive, the system can retain prior state, narrow the claim, revise the verification workflow, defer, escalate, or refuse. For high-consequence work, “the agent still seems confident” is not a fallback.

The promotion rule is simple:

> Promote only when relevant evidence exists, adjudication explicitly says promote, and the regression check passes.

<figure class="diagram"><img src="/assets/blog/self-correction-needs-executable-verification/verification-promotion-gate.svg" alt="An eight-stage verification promotion gate moves from a disputed claim through evidence selection, authority, receipt, adjudication, regression testing, and fallback before promotion is allowed." title="Verification Promotion Gate: eight stages lead to a three-condition promotion decision, while every failed condition keeps the correction from advancing." width="390" height="940" loading="lazy" decoding="async"/><figcaption>Promotion is a three-part decision: relevant evidence, an explicit promote judgment, and no broken known-good behavior.</figcaption></figure>

## Not every claim is executable

Executable verification is strongest when the disputed claim maps cleanly to computation: symbolic equivalence, schema validity, route status, an invariant, an exact count, or a deterministic test.

Other claims resist that treatment. A policy may be ambiguous. A screenshot may technically render while visibly missing the design. A source may support a sentence only when read in context. A user may have authority that no local check can infer.

The wrong response is to force those claims through a tool and call the output objective. Use independently inspectable evidence or qualified human adjudication instead. If the consequence is high and no adequate evidence class is available, refuse promotion.

This is not less rigorous. It is more honest about what the system can establish.

## Evidence should authorize action

The useful self-correcting system is not the one that produces the most revisions. It is the one that can show why a particular revision earned the right to act.

Reflection proposes. Verification changes the evidence state. Promotion turns that evidence into authority.

Keep those operations separate, and a correction becomes more than a better-sounding answer. It becomes a governed state transition with a claim, a receipt, an adjudication, and a safe way not to proceed.

## Source

- Zou, Rui, Yutao Zhu, Mengqi Wei, and Ji-Rong Wen. “[AMTFV: Agentic Mathematical Tool-Flow Verification for LLM Self-Correction](https://arxiv.org/abs/2607.29549).” arXiv:2607.29549v1, submitted July 31, 2026.
