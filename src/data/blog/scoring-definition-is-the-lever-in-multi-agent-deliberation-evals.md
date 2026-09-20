---
title: "Scoring Definition Is the Lever in Agent Evals"
description: "A 24.0%-57.0% consensus swing on identical held-out data is a property of the scoring definition, not the agents. Lock the definition before reading the number."
pubDatetime: "2026-09-20T15:30:00Z"
draft: true
featured: false
slug: "scoring-definition-is-the-lever-in-multi-agent-deliberation-evals"
canonicalURL: "https://berryhill.dev/posts/scoring-definition-is-the-lever-in-multi-agent-deliberation-evals"
tags: ["AI Agents", "Agent Operations", "Multi-Agent Systems", "Evaluation", "AI Governance"]
---

A consensus rate that moves by 33 percentage points across scoring definitions is not a measurement of agents. It is a measurement of how the test counts agreement. Treat the number as a lever, not as a fact.

That is the read of a v1 preprint that just landed on arXiv.[^shao-2026] The author, Tengfei Shao, replayed 100 held-out human Wason groups with matched LLM agent groups and scored both populations with the same code. Across the human-side scoring definitions, full-consensus estimates ranged from 24.0% to 57.0%. Both endpoints are author-reported at the abstract level; both are tagged v1 preprint.[^shao-2026]

This post is an operator read of that result. The paper facts live in attributed prose. The Scoring Definition Inventory, the replay-vs-baseline diagnostic, and the operator checklist below are mine. They are how I would use the paper, and they are not findings I am attributing to the author.[^shao-2026]

## What the range actually proves

The 24.0%-57.0% range is not the headline. The range is the lever demonstration. If "full consensus" can swing 33 percentage points because the operator changed how participation and final states were operationalized, then any single reported consensus number is a property of the scoring definition that produced it — not a property of the agents under test.[^shao-2026]

This matters for two reasons.

First, the number is not transferable. Two reported consensus rates from two different scoring definitions cannot be compared without the operator first aligning the definitions — and even then, only when the underlying participation rule and final-state operationalization are the same. Most cross-paper comparisons in the multi-agent deliberation literature skip that step. The comparison collapses into number-shape rather than measurement.

Second, the lever is in the operator's hand. The scoring definition is not a property of the model. It is a property of the harness. The harness can pick the scoring definition before running the eval. That is the move: lock the scoring definition first, then read the consensus number.

<figure class="diagram">
  <img src="/assets/blog/scoring-definition-is-the-lever-in-multi-agent-deliberation-evals/range-versus-baseline.svg" alt="Two horizontal bars share a 0%-100% scale. The top bar shows one reported consensus number as one slice of the scoring-definition lever. The bottom bar shows the full 24.0%-57.0% range produced when the same held-out Wason data is rescored under different scoring definitions." title="A reported consensus number is a property of the scoring definition that produced it. The 24.0%-57.0% range is the size of the lever." width="390" height="540" loading="lazy" decoding="async" />
  <figcaption>The headline number is a property of the scoring definition that produced it. The 24.0%-57.0% range is the size of the lever, not the size of the agents.</figcaption>
</figure>

## The replay, in attributed prose

The paper setup is unusually clean for this literature, and worth quoting in attributed form.[^shao-2026]

The author held out 100 human Wason groups and constructed matched LLM agent groups. Seeding used one belief-anchored agent per participant's pre-discussion answer. Agents and people were scored with the same code. That last clause is the one that makes the comparison meaningful: it forces the scoring definition to be the only structural difference between the two populations.[^shao-2026]

Two complementary sensitivity analyses survived author review at the abstract level. The submit-based post-unblinding analysis (n=98) yielded a chat-mode gap of 34.0 percentage points and a reasoning-mode gap of 43.9 percentage points. The participation-matched post-unblinding analysis (n=45) yielded a chat-mode gap of 34.1 percentage points and a reasoning-mode gap of 44.4 percentage points. The two routes converged within 0.5 percentage points despite reducing different measurement asymmetries.[^shao-2026]

<figure class="diagram">
  <img src="/assets/blog/scoring-definition-is-the-lever-in-multi-agent-deliberation-evals/two-route-convergence.svg" alt="Two vertical rails hold the submit-based n=98 route and the participation-matched n=45 route. Each rail shows chat-mode and reasoning-mode agent-vs-human consensus gaps. The two rails converge within 0.5 percentage points despite reducing different measurement asymmetries." title="Two complementary routes converging within 0.5pp is the strongest evidence the result is robust to scoring-definition choice." width="390" height="640" loading="lazy" decoding="async" />
  <figcaption>The convergence within 0.5pp across the two routes is the strongest evidence the result is robust to scoring-definition choice.</figcaption>
</figure>

The chat-vs-reasoning gap persisted without early stopping and under a reparameterization removing the memorizable answer. In that reparameterization, reasoning-mode groups agreed nearly unanimously, mostly on incorrect answers. That is a strong qualitative finding at the abstract level — it is not a universal overconfidence claim, and it is scoped to this Wason-group setting.[^shao-2026]

The overall verdict from the abstract: simulated consensus did not track collective accuracy, and belief-anchored agent groups were biased estimators of the human group-outcome distribution in this setting. The author frames the work as a scoring-explicit basis for assessing simulated-group estimates of human deliberative outcomes.[^shao-2026]

## What the paper is not

The paper does not prove LM groups are unreliable in production. It does not generalize beyond the Wason-group replay. It does not stand for peer review, journal acceptance, or independent replication — this is a v1 preprint, not peer-reviewed.[^shao-2026]

A few additional boundaries from the abstract level. About one fifth of human participants never posted, whereas agents almost always did. That is participation asymmetry at the abstract level; I am not asserting a precise percentage from outside the paper.[^shao-2026]

The scoring-explicit framing is the contribution, not the headline number. The headline number is a demonstration that the lever exists. The framing is the lever itself.

## The Scoring Definition Inventory (operator side)

The six items below are mine. They are an operator rubric for picking a scoring definition before running or reading a deliberation eval. They are not in the paper. They are how I would use the paper.[^shao-2026]

1. **Participation rule.** What counts as a participant? A posted message? A read-only observer? A late joiner? A silent holdout? The 24.0%-57.0% range depends on this rule. State it before you run the eval, not after.
2. **Final-state operationalization.** What is a "final answer"? The last message any participant sent? The last message from the loudest participant? The modal answer across the group? The consensus definition changes the consensus number. Pick it before you score.
3. **Submission-vs-participation alignment.** How do you score a participant who never submits? The paper used two complementary routes (submit-based and participation-matched) and got within 0.5 percentage points of each other. Both routes are valid; not picking one is not valid.[^shao-2026]
4. **Pre-discussion anchoring.** Did each participant hold a pre-discussion position, and did each agent get seeded from one? The paper used belief-anchored agents. That is a deliberate choice; without it, you are scoring a different population.
5. **Chat-vs-reasoning mode.** Is each group run in chat mode, reasoning mode, or both? The paper reports a 34.0-vs-43.9 percentage point gap (n=98, submit-based) and a 34.1-vs-44.4 percentage point gap (n=45, participation-matched) between modes. The mode is part of the scoring definition, not a confound to be averaged out.[^shao-2026]
6. **Memorability control.** Can the agents memorize the answer? The paper reparameterized to remove the memorizable answer and the reasoning-mode gap persisted, with reasoning-mode groups agreeing nearly unanimously, mostly on incorrect answers. If your eval does not control for memorability, you are not measuring what you think you are measuring.[^shao-2026]

Six items. Six decisions before the eval runs. The order matters — pick participation first, final-state second, alignment third, anchoring fourth, mode fifth, memorability sixth. Reverse the order and you will be re-deriving the scoring definition inside the post-hoc analysis.

<figure class="diagram">
  <img src="/assets/blog/scoring-definition-is-the-lever-in-multi-agent-deliberation-evals/scoring-definition-inventory.svg" alt="Six numbered operator gates: participation rule, final-state operationalization, submission-versus-participation alignment, pre-discussion anchoring, chat-versus-reasoning mode, and memorability control. Each is a scoring-definition decision that must be locked before the consensus number is read." title="Six scoring-definition gates the operator must lock before reading any reported consensus number." width="390" height="900" loading="lazy" decoding="async" />
  <figcaption>Six gates, one rail. Lock the definition, then read the number — never the reverse.</figcaption>
</figure>

## Replay vs baseline as a portable diagnostic

The paper's design choice — replay held-out human groups with matched agent groups, scored by the same code — is portable. It is the cleanest way to expose a scoring definition lever.[^shao-2026]

The operator move is to require a replay-vs-baseline comparison for any consensus-vs-accuracy claim. Not because every eval must include human groups — most operator evals will not. But because a baseline without a replay cannot distinguish "the agents changed the outcome" from "the scoring definition changed the number."

Three checks follow.

First, does the eval report consensus under at least two scoring definitions? If the answer is no, the paper is reporting one slice of the lever, not a measurement. The 24.0%-57.0% range is the size of the lever on this Wason-group dataset; the slice the eval reports may sit anywhere inside that range without the operator knowing.[^shao-2026]

Second, does the eval report both chat-mode and reasoning-mode consensus? The paper's gap is structural, not noise. An eval that reports one mode without the other is reporting half a measurement.[^shao-2026]

Third, does the eval report a post-unblinding sensitivity analysis under both submit-based and participation-matched routes? The paper's two routes converged within 0.5 percentage points despite reducing different measurement asymmetries. That convergence is the strongest evidence the result is robust to scoring definition. An eval that skips both routes is asserting robustness it has not measured.[^shao-2026]

If a paper, a vendor benchmark, or an internal harness cannot answer yes to all three, the consensus number is shape, not measurement.

## Operator checklist for reading a deliberation eval

When an operator reads a reported consensus number from a multi-agent deliberation eval, the checklist is short.

1. **What scoring definition was used?** If the answer is unclear or hidden, stop reading the number and ask for the definition. The number is a property of the definition; without it, the number is undefined.
2. **What other scoring definitions were tried, and what range did they produce?** If the answer is "none," the paper is reporting one slice of the lever. Treat the number as illustrative, not as a measurement.
3. **Was chat mode and reasoning mode both reported?** If the answer is no, the gap is hidden. Treat the number as half a measurement.
4. **Was the result robust under submit-based and participation-matched post-unblinding?** If the answer is no, the robustness is asserted, not measured. Treat the number as a single-route claim.
5. **Is the dataset held out from the agent training?** The paper held out 100 Wason groups. A non-held-out dataset measures memorization as much as deliberation. Treat the number as contaminated.
6. **Is the paper a v1 preprint or peer-reviewed?**[^shao-2026] The author frames the work as a v1 preprint.[^shao-2026] Treat the number as conditional on the v1 record; later revisions may shift it.

Six items. The order is the order of decreasing dealbreaker. A scoring definition that is hidden kills the number on item 1. A non-held-out dataset kills it on item 5. Peer review status is the smallest concern; v1 preprints are valid evidence, just with the label attached.

## What this changes for an operator harness

Three practical moves follow.

First, instrument the scoring definition, not just the consensus number. The lever is the scoring definition. An operator harness should log the participation rule, the final-state operationalization, the alignment route, the anchoring choice, the chat-vs-reasoning mode, and the memorability control. Those six items are the lever. The consensus number is downstream of them.

Second, run replay-vs-baseline whenever consensus-vs-accuracy is the question. The paper's design is portable: matched human and agent groups, scored by the same code, under at least two scoring definitions, in both chat and reasoning mode, with both submit-based and participation-matched post-unblinding. An operator harness that cannot run that comparison cannot distinguish "agents changed the outcome" from "scoring definition changed the number."

Third, label the lever and the measurement separately. The 24.0%-57.0% range is the lever demonstration. The 34.0/43.9 percentage point chat-vs-reasoning gap (n=98) and the 34.1/44.4 percentage point gap (n=45) are the measurement under specific scoring definitions. The convergence within 0.5 percentage points across the two sensitivity routes is the robustness claim. Keep those labels adjacent to the claims they qualify. The Scoring Definition Inventory, the replay-vs-baseline diagnostic, and the operator checklist are mine. The retention model, the n=100 / n=98 / n=45 sample sizes, the 24.0%-57.0% range, the 34.0/43.9 and 34.1/44.4 percentage point gaps, the 0.5 percentage point convergence, the Wason-group replay, the belief-anchored seeding, and the single-scoring-code design are the author's.[^shao-2026] Keeping those labels adjacent to the claims they qualify is what stops this post from sliding into "LM groups are unreliable" or a paper recap.

That framing is also why this is a draft. The paper is a v1 preprint, not peer-reviewed.[^shao-2026] The author has not asserted the result generalizes beyond the Wason-group replay. The numbers are conditional on the scoring definitions the author chose, and an independent replication is not in evidence. Treat the lever demonstration as evidence the lever exists; treat the measurement as evidence on this dataset, with this scoring code, with this v1 record.

The work to do next is the operator's: pick a scoring definition from the Inventory, run a replay-vs-baseline comparison under it, and see where the lever sits in the operator's own harness.

[^shao-2026]: Shao, T. (2026). Language-model groups overstate consensus when replaying human deliberation on a reasoning task. arXiv preprint arXiv:2609.20543v1 [cs.AI], submitted 17 September 2026, 37 pages, 4 figures. Cited as a v1 preprint under review; figures and modeling claims are bound to the v1 record at <https://arxiv.org/abs/2609.20543v1> and may shift in later revisions.