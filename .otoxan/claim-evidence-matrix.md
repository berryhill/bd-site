# Claim/Evidence Matrix — berryhill.dev Brand Audit
*Canonical: `/home/silas/.hermes/profiles/luca/home/claim-evidence-matrix.md`*
*Updated: 2026-07-20 | Luca Vale — Brand Architect*

---

## Executive Summary

**Brand state:** Aspirational positioning with minimal brand-aligned content.

**Posts in scope (3):**
- aliens draft: brand-aligned, pending 2 fixes + Matt review
- Polish Pilots: off-brand, contains false citation claim
- Welcome: off-brand test/demo

**Brand lane coverage:** 4 of 6 lanes have zero published content.

**Critical finding:** The Polish Pilots post claims "All factual claims properly cited" in its Quality Checklist but has zero inline citations despite a 7-source bibliography. This is an active credibility risk on a live URL.

---

## Brand Pillars (from config.ts + about.md)

| # | Pillar | Config Language | About Page Language |
|---|--------|-----------------|---------------------|
| 1 | Agentic-first development | "agentic-first development" | "agentic-first digital builder" |
| 2 | AI/ML systems | "AI/ML systems" | "AI, machine learning" |
| 3 | Blockchain | "blockchain" | implicit |
| 4 | Crypto markets | "crypto markets" | "crypto" |
| 5 | Digital music | "digital music" | "digital music" |
| 6 | Intelligent automation | "intelligent automation" | implicit |

---

## Posts in Scope

| # | Filename | Draft? | Brand Lane | Directive |
|---|----------|--------|------------|-----------|
| 1 | `aliens-are-a-useful-test-for-thinking-about-intelligence.md` | `true` | AI/ML, Agentic | **Fix 2 weak spots → Matt publish review** |
| 2 | `the-polish-pilots-who-fought-for-britain-wwi-is-unsung-heroes.md` | `false` | **NONE** | **Set `draft: true` via PR** — off-brand + false citation claim |
| 3 | `welcome-to-dynamic-blog.md` | `false` | **NONE** | **Set `draft: true` via PR** — test/demo post |

---

## Claim-Evidence Matrix: Individual Posts

### Post 1: aliens-are-a-useful-test-for-thinking-about-intelligence.md

**Status:** `draft: true` | **Brand lane:** AI/ML Systems, Agentic-First Development

| Claim | Type | Evidence | Gap |
|-------|------|----------|-----|
| "Most alien conversations collapse into the same two camps: believers collecting every strange signal, and skeptics flattening every unknown into noise" | Empirical generalization | None | **FIX:** Soften to "common pattern" or add hedge |
| "We want intelligence to show up in the formats we already know how to parse" | Psychological claim | None | Needs example or soften |
| "AI is creating more of those situations, not fewer" | Trend claim | None | **FIX:** Add concrete observation or soften |
| "A routing system can be intelligent without having beliefs" | Philosophical claim | None | N/A — appropriate for content type |
| "A market can coordinate without having a mind" | Philosophical claim | None | N/A |
| "Unknown does not mean unconstrained" | Epistemic claim | None | N/A |

**Assessment:** Analytical/philosophical post. Brand voice present. Two fixable weak spots before publish.

**Pre-publish actions:**
1. Soften "two camps" generalization to "common pattern" or add hedge
2. Add concrete observation or soften "AI is creating more situations"

---

### Post 2: the-polish-pilots-who-fought-for-britain-wwi-is-unsung-heroes.md

**Status:** `draft: false` → **ACTION: set `draft: true`** | **Brand lane:** NONE

**Critical issue:** Quality Checklist contains false claim: "All factual claims properly cited" — body has zero inline citations despite bibliography with 7 sources.

| Claim | Type | Evidence | Gap |
|-------|------|----------|-----|
| "Around 8,000 Polish airmen had crossed the English Channel" | Factual | Bibliography source exists | **NOT CITED INLINE** |
| "146 pilots participated in the Battle of Britain" | Factual | Bibliography source exists | **NOT CITED INLINE** |
| "Over 200 confirmed kills against the Luftwaffe" | Factual | Bibliography source exists | **NOT CITED INLINE** |
| "No. 303 Squadron became operational on August 31, 1940" | Factual/dates | Bibliography source exists | **NOT CITED INLINE** |
| "No. 303 became one of the most decorated units in RAF history" | Historical judgment | Bibliography source exists | **NOT CITED INLINE** |
| "The contribution of Polish pilots was undeniable, yet often overlooked" | Narrative claim | Bibliography source exists | **NOT CITED INLINE** |

**Assessment:** Off-brand. WWII history is not a stated brand lane. Quality Checklist claim is factually false. Active credibility risk.

**Action:** Set `draft: true` immediately via PR.

---

### Post 3: welcome-to-dynamic-blog.md

**Status:** `draft: false` → **ACTION: set `draft: true`** | **Brand lane:** NONE

| Claim | Type | Evidence | Gap |
|-------|------|----------|-----|
| "No rebuild required" | Technical/feature | None — feature documentation | N/A |
| "Add posts dynamically" | Technical/feature | None — feature documentation | N/A |
| "Instant updates" | Technical/feature | None — feature documentation | N/A |

**Assessment:** Demo/test post. No factual claims needing evidence. Off-brand lane for a personal brand site.

**Action:** Set `draft: true` immediately via PR.

---

## Brand-Lane Coverage Matrix

| Stated Lane | Coverage Status | Evidence Type | Gap Severity |
|-------------|----------------|--------------|--------------|
| Agentic-first development | Partial | aliens draft touches reasoning discipline | Needs dedicated post |
| AI/ML systems | Yes (draft) | aliens draft ready after two fixes | Needs dedicated post |
| Blockchain | **None** | — | Major gap |
| Crypto markets | **None** | — | Major gap |
| Digital music | **None** | — | Major gap |
| Intelligent automation | Partial | aliens draft touches evaluation | Needs dedicated post |

---

## Credibility Gaps

| Gap | Blocking? | Evidence Needed | Priority |
|-----|-----------|-----------------|----------|
| No published operator posts | **YES** | aliens post + agentic development post | Immediate |
| Crypto market content despite pillar | **PARTIAL** | Decide if this is real lane or remove from config | Decision required |
| Digital music lane completely absent | **NO** | Requires Matt direction | Deferred |
| No visible build process | **NO** | Screencasts would close efficiently | Medium |
| Blockchain lane completely absent | **YES** | Positioning decision needed | Decision required |

---

## Immediate Actions

| # | Action | Owner | Status | Path |
|---|--------|-------|--------|------|
| 1 | Set Polish Pilots post to `draft: true` | Luca | Required | issue→branch→PR |
| 2 | Set Welcome post to `draft: true` | Luca | Required | issue→branch→PR |
| 3 | Fix aliens post "two camps" claim | Luca | Short-term | Update draft |
| 4 | Fix aliens post "AI creating more situations" | Luca | Short-term | Update draft |
| 5 | Matt publish review for aliens post | Matt | Awaiting | PR approval |
| 6 | Matt decision: crypto/blockchain/music lanes | Matt | Awaiting | Scope or remove |

---

## Strategic Recommendations

### Immediate (unblock draft content)

**Aliens post** — Fix two weak spots, then Matt publishes. This is the only brand-aligned content ready.

### Short-term (next content cycle)

1. **Agentic development post** — Show real operator perspective. Specific failures, specific wins, specific tooling choices.
2. **Polish/Welcome posts** — Hide via PR. These actively damage brand coherence.
3. **Crypto/blockchain decision** — Matt needs to decide: real lane or remove from config/about? Currently 4 of 6 lanes are empty.

### Medium-term (brand expansion)

4. **Screencasts** — Build process visibility closes operator-credibility gap efficiently.
5. **Automation workflow post** — Show the work. What's automated, what's not, what broke.
6. **Crypto markets post** — Only if lane is confirmed real.

---

## Summary

**Current state:** Brand pillars are aspirational. Published content is mostly off-brand. One draft post (aliens) is brand-aligned.

**The matrix reveals:**
- Matt cannot credibly claim "agentic-first developer" without published operator posts
- The crypto/blockchain pillar is a claim without evidence
- The digital music pillar is unconfirmed
- Polish pilots post actively damages brand coherence
- aliens draft is the most valuable content asset currently in the repo

**Strategic implication:** Ship the aliens post first, then build the agentic development content lane before expanding. Crypto and music require explicit Matt decisions.

---

## Appendix: Site Config + About Page Claims

| Source | Claim | Evidence Needed |
|--------|-------|-----------------|
| `config.ts` | "Exploring agentic-first development, AI/ML systems, blockchain, crypto markets, digital music, and intelligent automation" | Same as brand lanes above |
| `about.md` | "agentic-first digital builder" | Lane posts needed |
| `about.md` | "focused on creating intelligent products at the intersection of AI, ML, blockchain, crypto, and digital music" | AI/ML lane partial; all others empty |

---

*This matrix is a living document. Update as new posts are added or existing posts are revised.*
*Luca will use this to brief future content against specific brand gaps.*
*Canonical source: `/home/silas/.hermes/profiles/luca/home/claim-evidence-matrix.md`*
