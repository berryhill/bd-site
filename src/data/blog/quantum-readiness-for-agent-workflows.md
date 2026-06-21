---
title: "Quantum is coming. Agent workflows should start leaving breadcrumbs."
description: "Quantum will matter for agent systems, but not by replacing the whole agent stack. The practical move is to make today’s workflows measurable enough to route tomorrow’s formal subproblems."
pubDatetime: 2026-06-21T01:07:50Z
tags: ["quantum", "agentic", "automation", "infrastructure"]
featured: false
draft: false
hideEditPost: false
---

Quantum is going to matter.

Not as a magic replacement for LLM agents. Not as a branding layer for normal automation. Not as a near-term excuse to call every planner, scheduler, or task queue a quantum system.

But as a future compute layer for a narrower class of problems: bounded search, combinatorial optimization, sampling, and estimation problems that can be formalized well enough to route to a specialized optimizer.

That is the optimistic version of the argument.

Quantum is coming. There is time. Not everything goes quantum. My read: the teams that benefit later will be the teams that make their classical workflows legible now.

## The operating read

Agent workflows should start leaving breadcrumbs because future optimization layers will need something cleaner than vibes.

The winning posture is not quantum hype, and it is not quantum dismissal. It is disciplined preparation: identify which parts of an agent workflow are messy judgment, which parts are ordinary classical engineering, and which parts might eventually become formal enough to accelerate.

Put differently:

- The LLM handles language, context, tool use, and judgment.
- Classical systems handle most scheduling, caching, retrying, ranking, and verification.
- Quantum-inspired or quantum-accelerated methods only become interesting when the subproblem has the right shape.

That is a hopeful position. It says operators can do useful work now without pretending the future hardware is already here.

---

## What the research actually supports

The public sources below support a narrower read: useful speedups appear under formal problem assumptions, not as an end-to-end “quantum agents” replacement story. It supports a more specific claim: some algorithms can produce speedups when the problem is encoded in the right form and the system has the right oracle, verifier, or objective function.

Grover-style search is the clean example. It gives a quadratic query speedup for unstructured search under oracle assumptions, which is powerful, but also very conditional. IBM’s Grover overview is explicit about the setup: the algorithm amplifies the probability of measuring a marked item rather than evaluating every possible answer and simply returning the best one. [IBM Grover overview](https://quantum.cloud.ibm.com/docs/tutorials/grovers-algorithm) is useful here because it keeps the operator honest about what the algorithm does and does not do.

Amplitude amplification and amplitude estimation generalize that idea. Brassard, Høyer, Mosca, and Tapp describe how quantum procedures can amplify success probabilities and estimate amplitudes with fewer samples under coherent-access assumptions. That matters for agent systems only if the workflow can expose a compact stochastic estimation problem, not a live mess of API calls and human approvals. [Brassard et al.](https://arxiv.org/abs/quant-ph/0005055) is the source worth anchoring to.

QAOA is another serious pattern, but it is not a magic planner. Farhi, Goldstone, and Gutmann introduced QAOA as an approximate optimization algorithm for combinatorial problems. The important word is “combinatorial.” A workflow has to become a formal optimization object before QAOA is even in the conversation. [Farhi et al.](https://arxiv.org/abs/1411.4028)

Quantum walk and backtracking work points in the same direction. Montanaro’s backtracking paper shows speedups for structured search trees, again under a formal problem model. [Montanaro on quantum walk speedup of backtracking algorithms](https://arxiv.org/abs/1509.02374)

Monte Carlo-style acceleration is also plausible in the right cases. Montanaro’s work on quantum speedups of Monte Carlo methods is relevant to stochastic rollout and risk estimation, but only if the agent system can expose the simulation in a form the quantum procedure can use. [Montanaro on quantum speedup of Monte Carlo methods](https://arxiv.org/abs/1504.06987)

That is the through-line: the acceleration is real enough to prepare for, but specific enough that most present workflows are not ready to use it.

---

## Not everything in an agent workflow is a quantum problem

Most real agent workflows are messy.

They involve LLM calls, tool failures, web pages, humans, rate limits, credentials, partial context, irreversible side effects, and evaluation loops that are still more art than instrumentation.

A planning agent deciding what to do next is rarely solving one pristine optimization problem. It is juggling language, uncertainty, permissions, and consequences.

That matters because quantum acceleration is not magic dust. The cited patterns point toward formalized problem shapes: bounded search, combinatorial optimization, stochastic estimation, constraint satisfaction, sampling, or some other structure where the cost of search is the bottleneck.

An agent workflow might contain those shapes.

But the whole workflow is not automatically one of those shapes.

The operator question is not, “Can quantum run my agents?”

The better question is, “Which subproblems inside my agent system could become formal enough, painful enough, and valuable enough to deserve a different optimizer?”

That shift changes the roadmap.

<figure class="not-prose my-8 rounded-2xl border border-skin-line/60 bg-skin-card p-3">
  <img src="data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221200%22%20height=%22620%22%20viewBox=%220%200%201200%20620%22%20role=%22img%22%20aria-labelledby=%22title%20desc%22%3E%20%3Ctitle%20id=%22title%22%3EAgent%20workflow%20map%20with%20extractable%20quantum%20candidate%20subproblems%3C/title%3E%20%3Cdesc%20id=%22desc%22%3EA%20left-to-right%20map%20separates%20messy%20agent%20operations%20from%20bounded%20optimization%20candidates%20such%20as%20search,%20scheduling,%20sampling,%20and%20estimation.%3C/desc%3E%20%3Crect%20width=%221200%22%20height=%22620%22%20rx=%2232%22%20fill=%22%230b1020%22/%3E%20%3Ctext%20x=%2260%22%20y=%2274%22%20fill=%22%23f8fafc%22%20font-family=%22Inter,%20Arial,%20sans-serif%22%20font-size=%2234%22%20font-weight=%22700%22%3EQuantum%20readiness%20is%20a%20routing%20problem,%20not%20a%20replacement%20story%3C/text%3E%20%3Ctext%20x=%2260%22%20y=%22114%22%20fill=%22%2394a3b8%22%20font-family=%22Inter,%20Arial,%20sans-serif%22%20font-size=%2218%22%3EThe%20whole%20agent%20workflow%20stays%20messy.%20The%20extractable%20subproblems%20need%20names,%20bounds,%20and%20telemetry.%3C/text%3E%20%3Cg%20font-family=%22Inter,%20Arial,%20sans-serif%22%3E%20%3Crect%20x=%2260%22%20y=%22176%22%20width=%22250%22%20height=%22310%22%20rx=%2222%22%20fill=%22%23111827%22%20stroke=%22%23334155%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%2288%22%20y=%22220%22%20fill=%22%23e2e8f0%22%20font-size=%2223%22%20font-weight=%22700%22%3EMessy%20agent%20loop%3C/text%3E%20%3Ctext%20x=%2288%22%20y=%22262%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3ELanguage%20+%20context%3C/text%3E%20%3Ctext%20x=%2288%22%20y=%22298%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3ETool%20calls%20+%20failures%3C/text%3E%20%3Ctext%20x=%2288%22%20y=%22334%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3EHumans%20+%20permissions%3C/text%3E%20%3Ctext%20x=%2288%22%20y=%22370%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3EPartial%20evidence%3C/text%3E%20%3Ctext%20x=%2288%22%20y=%22406%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3EIrreversible%20actions%3C/text%3E%20%3Ctext%20x=%2288%22%20y=%22448%22%20fill=%22%2338bdf8%22%20font-size=%2216%22%20font-weight=%22700%22%3ENot%20a%20clean%20math%20object%3C/text%3E%20%3Cpath%20d=%22M330%20331%20L442%20331%22%20stroke=%22%2364748b%22%20stroke-width=%225%22%20marker-end=%22url%28%23arrow%29%22/%3E%20%3Crect%20x=%22462%22%20y=%22154%22%20width=%22300%22%20height=%22356%22%20rx=%2222%22%20fill=%22%23172554%22%20stroke=%22%2338bdf8%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22493%22%20y=%22198%22%20fill=%22%23f8fafc%22%20font-size=%2223%22%20font-weight=%22700%22%3EBreadcrumb%20telemetry%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22240%22%20fill=%22%23dbeafe%22%20font-size=%2217%22%3ECandidate%20action%20space%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22276%22%20fill=%22%23dbeafe%22%20font-size=%2217%22%3EConstraints%20and%20objectives%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22312%22%20fill=%22%23dbeafe%22%20font-size=%2217%22%3EVerifier%20scoring%20signal%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22348%22%20fill=%22%23dbeafe%22%20font-size=%2217%22%3EClassical%20pain%20score%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22384%22%20fill=%22%23dbeafe%22%20font-size=%2217%22%3ERepeat%20frequency%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22420%22%20fill=%22%23dbeafe%22%20font-size=%2217%22%3EEconomic%20value%3C/text%3E%20%3Ctext%20x=%22493%22%20y=%22462%22%20fill=%22%237dd3fc%22%20font-size=%2216%22%20font-weight=%22700%22%3EThis%20is%20the%20prep%20layer%3C/text%3E%20%3Cpath%20d=%22M782%20331%20L894%20331%22%20stroke=%22%2364748b%22%20stroke-width=%225%22%20marker-end=%22url%28%23arrow%29%22/%3E%20%3Crect%20x=%22914%22%20y=%22176%22%20width=%22226%22%20height=%22310%22%20rx=%2222%22%20fill=%22%23052e16%22%20stroke=%22%2322c55e%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22942%22%20y=%22220%22%20fill=%22%23f0fdf4%22%20font-size=%2223%22%20font-weight=%22700%22%3EExtractable%20shapes%3C/text%3E%20%3Ctext%20x=%22942%22%20y=%22262%22%20fill=%22%23bbf7d0%22%20font-size=%2217%22%3EBounded%20search%3C/text%3E%20%3Ctext%20x=%22942%22%20y=%22298%22%20fill=%22%23bbf7d0%22%20font-size=%2217%22%3EScheduling%3C/text%3E%20%3Ctext%20x=%22942%22%20y=%22334%22%20fill=%22%23bbf7d0%22%20font-size=%2217%22%3EConstraint%20solving%3C/text%3E%20%3Ctext%20x=%22942%22%20y=%22370%22%20fill=%22%23bbf7d0%22%20font-size=%2217%22%3ESampling%3C/text%3E%20%3Ctext%20x=%22942%22%20y=%22406%22%20fill=%22%23bbf7d0%22%20font-size=%2217%22%3EEstimation%3C/text%3E%20%3Ctext%20x=%22942%22%20y=%22448%22%20fill=%22%2386efac%22%20font-size=%2216%22%20font-weight=%22700%22%3EOptimizer%20candidates%3C/text%3E%20%3C/g%3E%20%3Cdefs%3E%3Cmarker%20id=%22arrow%22%20viewBox=%220%200%2010%2010%22%20refX=%229%22%20refY=%225%22%20markerWidth=%228%22%20markerHeight=%228%22%20orient=%22auto-start-reverse%22%3E%3Cpath%20d=%22M%200%200%20L%2010%205%20L%200%2010%20z%22%20fill=%22%2364748b%22/%3E%3C/marker%3E%3C/defs%3E%20%3C/svg%3E" alt="A left-to-right map separates a messy agent loop from breadcrumb telemetry and extractable optimization shapes such as bounded search, scheduling, constraint solving, sampling, and estimation." loading="lazy" />
  <figcaption class="mt-3 text-sm text-skin-base/75">The whole workflow does not become quantum. The useful work is naming the bounded subproblems that could be routed later.</figcaption>
</figure>

---

## The quantum-readiness test

Here is the concrete test I would use before calling any agent workflow “quantum-ready.”

### 1. Is the candidate space bounded?

A vague planning problem is not enough. The system needs a describable space of candidate plans, routes, schedules, patches, templates, or actions. If the candidate space cannot be named, counted, sampled, or constrained, there is nothing clean to accelerate.

### 2. Is the verifier real?

A useful optimizer needs a way to score or reject candidates. In agent workflows, I would look for a test suite, policy checker, simulator, constraint engine, human-review rubric, or deterministic validation step. If success is only “the LLM thinks it looks good,” the problem is not ready.

### 3. Is the output compact?

Quantum algorithms do not give you a free transcript of every explored path. Measurement produces samples. The useful output has to be something compact: a route, schedule, candidate solution, risk estimate, or ranked subset.

### 4. Are classical baselines actually painful?

Classical first. CP-SAT, MILP, beam search, tree search, cached heuristics, learned rerankers, and ordinary engineering should be the baseline. A quantum route only becomes interesting when the classical route is measurably expensive or strategically limiting.

### 5. Does the pattern repeat enough to justify formalization?

One painful workflow is not a platform. Repeated planning failures, repeated scheduling conflicts, repeated verification bottlenecks, or repeated rollout-estimation problems are where the investment starts to make sense.

That checklist is the useful bridge between “quantum someday” and “operator work today.”

---

## The near-term work is making planning pain visible

If you run agents in production, you already have places where the system feels expensive or brittle.

A planner considers too many candidate branches. A scheduler has too many constraints. A verifier cannot cheaply rank outcomes. A task queue burns attempts because the search space is bigger than the agent can reason about in one pass. A workflow has economic value, but nobody has measured where the computational pain actually sits.

That is the gap.

Before you can route a problem to a better optimizer, you need to know what problem you have.

I want agent workflows to start producing metadata like this:

- candidate action space size
- constraints that shaped the decision
- verifier or objective function used
- repeat frequency
- cost of a bad branch
- classical pain score
- boundedness of the extracted problem
- economic value of better routing
- audit trail for why the route was chosen

That sounds mundane next to the quantum headline.

It is also the actual preparation layer.

If quantum hardware improves on the optimistic timeline, this telemetry becomes routing infrastructure. If it takes longer, the same telemetry still makes classical agent systems better. You get cleaner planning traces, better evaluators, more honest bottleneck maps, and less magical thinking about what the agent is doing.

That is a good bet either way.

---

## Hybrid systems will matter before pure quantum systems do

The first serious pattern will probably not be “the quantum agent.”

It will be hybrid routing.

The LLM handles language, context, tool use, and messy judgment. Classical systems handle ordinary scheduling, ranking, caching, and verification. Quantum-inspired or quantum-accelerated methods get called only when a subproblem has the right shape and the expected value is high enough.

That is less cinematic than replacing the whole stack.

It is also more believable.

Most infrastructure evolves through routing layers. You do not send every query to the most expensive model. You do not run every job on a GPU. You do not ask a human to inspect every output. You route based on cost, latency, confidence, risk, and value.

Future agent systems should do the same with optimization.

<figure class="not-prose my-8 rounded-2xl border border-skin-line/60 bg-skin-card p-3">
  <img src="data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221200%22%20height=%22620%22%20viewBox=%220%200%201200%20620%22%20role=%22img%22%20aria-labelledby=%22title%20desc%22%3E%20%3Ctitle%20id=%22title%22%3EHybrid%20optimizer%20routing%20stack%20for%20future%20agent%20systems%3C/title%3E%20%3Cdesc%20id=%22desc%22%3EA%20routing%20layer%20sends%20normal%20work%20to%20classical%20systems,%20shaped%20hard%20subproblems%20to%20quantum-inspired%20methods,%20and%20later%20specialized%20workloads%20to%20fault-tolerant%20quantum%20hardware.%3C/desc%3E%20%3Crect%20width=%221200%22%20height=%22620%22%20rx=%2232%22%20fill=%22%230f172a%22/%3E%20%3Ctext%20x=%2260%22%20y=%2276%22%20fill=%22%23f8fafc%22%20font-family=%22Inter,%20Arial,%20sans-serif%22%20font-size=%2234%22%20font-weight=%22700%22%3EThe%20near-term%20architecture%20is%20hybrid%20routing%3C/text%3E%20%3Ctext%20x=%2260%22%20y=%22116%22%20fill=%22%2394a3b8%22%20font-family=%22Inter,%20Arial,%20sans-serif%22%20font-size=%2218%22%3EDo%20not%20quantum-wash%20the%20whole%20stack.%20Route%20only%20when%20shape,%20pain,%20and%20value%20justify%20it.%3C/text%3E%20%3Cg%20font-family=%22Inter,%20Arial,%20sans-serif%22%3E%20%3Crect%20x=%2270%22%20y=%22176%22%20width=%22250%22%20height=%22290%22%20rx=%2222%22%20fill=%22%23111827%22%20stroke=%22%23475569%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22100%22%20y=%22222%22%20fill=%22%23f8fafc%22%20font-size=%2224%22%20font-weight=%22700%22%3ELLM%20agent%3C/text%3E%20%3Ctext%20x=%22100%22%20y=%22266%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3ELanguage%3C/text%3E%20%3Ctext%20x=%22100%22%20y=%22302%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3EContext%3C/text%3E%20%3Ctext%20x=%22100%22%20y=%22338%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3ETool%20use%3C/text%3E%20%3Ctext%20x=%22100%22%20y=%22374%22%20fill=%22%23cbd5e1%22%20font-size=%2217%22%3EJudgment%3C/text%3E%20%3Ctext%20x=%22100%22%20y=%22424%22%20fill=%22%2338bdf8%22%20font-size=%2216%22%20font-weight=%22700%22%3EKeeps%20the%20messy%20work%3C/text%3E%20%3Cpath%20d=%22M340%20321%20L450%20321%22%20stroke=%22%2364748b%22%20stroke-width=%225%22%20marker-end=%22url%28%23arrow%29%22/%3E%20%3Crect%20x=%22470%22%20y=%22146%22%20width=%22260%22%20height=%22350%22%20rx=%2224%22%20fill=%22%23312e81%22%20stroke=%22%23818cf8%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22505%22%20y=%22195%22%20fill=%22%23eef2ff%22%20font-size=%2224%22%20font-weight=%22700%22%3ERouting%20layer%3C/text%3E%20%3Ctext%20x=%22505%22%20y=%22240%22%20fill=%22%23c7d2fe%22%20font-size=%2217%22%3ECost%3C/text%3E%20%3Ctext%20x=%22505%22%20y=%22276%22%20fill=%22%23c7d2fe%22%20font-size=%2217%22%3ELatency%3C/text%3E%20%3Ctext%20x=%22505%22%20y=%22312%22%20fill=%22%23c7d2fe%22%20font-size=%2217%22%3ERisk%3C/text%3E%20%3Ctext%20x=%22505%22%20y=%22348%22%20fill=%22%23c7d2fe%22%20font-size=%2217%22%3EProblem%20shape%3C/text%3E%20%3Ctext%20x=%22505%22%20y=%22384%22%20fill=%22%23c7d2fe%22%20font-size=%2217%22%3EExpected%20value%3C/text%3E%20%3Ctext%20x=%22505%22%20y=%22438%22%20fill=%22%23a5b4fc%22%20font-size=%2216%22%20font-weight=%22700%22%3EMakes%20optimizer%20choice%20explicit%3C/text%3E%20%3Cpath%20d=%22M750%20230%20L885%20178%22%20stroke=%22%2364748b%22%20stroke-width=%224%22%20marker-end=%22url%28%23arrow%29%22/%3E%20%3Cpath%20d=%22M750%20321%20L885%20321%22%20stroke=%22%2364748b%22%20stroke-width=%224%22%20marker-end=%22url%28%23arrow%29%22/%3E%20%3Cpath%20d=%22M750%20412%20L885%20464%22%20stroke=%22%2364748b%22%20stroke-width=%224%22%20marker-end=%22url%28%23arrow%29%22/%3E%20%3Crect%20x=%22905%22%20y=%22130%22%20width=%22230%22%20height=%2292%22%20rx=%2218%22%20fill=%22%23082f49%22%20stroke=%22%2338bdf8%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22932%22%20y=%22166%22%20fill=%22%23e0f2fe%22%20font-size=%2221%22%20font-weight=%22700%22%3EClassical%20first%3C/text%3E%20%3Ctext%20x=%22932%22%20y=%22196%22%20fill=%22%23bae6fd%22%20font-size=%2215%22%3Echeap,%20proven,%20default%3C/text%3E%20%3Crect%20x=%22905%22%20y=%22275%22%20width=%22230%22%20height=%2292%22%20rx=%2218%22%20fill=%22%234a044e%22%20stroke=%22%23e879f9%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22932%22%20y=%22311%22%20fill=%22%23fae8ff%22%20font-size=%2221%22%20font-weight=%22700%22%3EQuantum-inspired%3C/text%3E%20%3Ctext%20x=%22932%22%20y=%22341%22%20fill=%22%23f5d0fe%22%20font-size=%2215%22%3Ewhen%20structure%20helps%3C/text%3E%20%3Crect%20x=%22905%22%20y=%22420%22%20width=%22230%22%20height=%22104%22%20rx=%2218%22%20fill=%22%23052e16%22%20stroke=%22%2322c55e%22%20stroke-width=%222%22/%3E%20%3Ctext%20x=%22932%22%20y=%22456%22%20fill=%22%23dcfce7%22%20font-size=%2221%22%20font-weight=%22700%22%3EFault-tolerant%3C/text%3E%20%3Ctext%20x=%22932%22%20y=%22486%22%20fill=%22%23bbf7d0%22%20font-size=%2215%22%3Elater,%20if%20economics%20win%3C/text%3E%20%3C/g%3E%20%3Cdefs%3E%3Cmarker%20id=%22arrow%22%20viewBox=%220%200%2010%2010%22%20refX=%229%22%20refY=%225%22%20markerWidth=%228%22%20markerHeight=%228%22%20orient=%22auto-start-reverse%22%3E%3Cpath%20d=%22M%200%200%20L%2010%205%20L%200%2010%20z%22%20fill=%22%2364748b%22/%3E%3C/marker%3E%3C/defs%3E%20%3C/svg%3E" alt="A hybrid routing stack sends normal agent work through classical systems, shaped hard subproblems to quantum-inspired methods, and later specialized workloads to fault-tolerant quantum hardware." loading="lazy" />
  <figcaption class="mt-3 text-sm text-skin-base/75">Hybrid routing is the practical bet: classical first, quantum-inspired where structure helps, fault-tolerant quantum later where the economics justify it.</figcaption>
</figure>

Classical first. Quantum-inspired where it helps. Fault-tolerant quantum later, where the problem and economics justify it.

Babbush and collaborators make a similar point from the other side: even fault-tolerant quantum heuristics for combinatorial optimization need careful problem structure and realistic resource accounting. The serious conversation is not “turn on quantum.” It is “which problem, encoded how, at what cost, against which baseline?” [Babbush et al.](https://arxiv.org/abs/2007.07391)

I think the winners will not be the teams chanting quantum over every workflow. The winners will be the teams that know exactly which parts of the workflow should stay classical and which parts are candidates for acceleration.

---

## What I would build now

I would not build a “quantum agent.”

I would build the boring connective tissue that makes future acceleration possible:

- a taxonomy of planning bottlenecks
- traces that preserve candidate spaces and rejected branches
- verifier maps that show what can be scored deterministically
- classical baseline measurements
- encodings for scheduling, routing, allocation, and template selection
- routing policies that choose classical, quantum-inspired, or future quantum paths based on cost and expected value
- audit logs that explain why a specialized optimizer was called

That work pays twice.

It improves classical agent systems now because it makes failures visible. It also preserves optionality if quantum acceleration becomes practical for a subset of those formal problems later.

That is why the post is not bleak. The point is not “wait for quantum.” The point is “make the work measurable enough that future compute layers have somewhere to plug in.”

---

## The wrong bet is quantum replacing agents

The wrong bet is: quantum replaces LLM agents.

I think the right bet is this: agent systems generate enough structured planning telemetry to route hard formal subproblems to the optimizer selected for that job.

That optimizer might be classical today.

It might be quantum-inspired soon.

It might be fault-tolerant quantum later.

The important thing is that the workflow knows enough about itself to make the choice.

That is where I think serious operators should focus now. Not on pretending the future hardware is already here. Not on dismissing quantum because today’s systems are still constrained. On building the connective tissue that lets future compute layers plug into real workflows without rewriting the whole operating model.

Quantum is coming.

There is time.

Not everything goes quantum.

But the parts that might go quantum need breadcrumbs now.
