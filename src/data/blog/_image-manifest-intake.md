---
title: "Image Manifest Audit — Intake Artifact"
pubDatetime: 2026-06-18T09:00:00+07:00
tags:
  - internal
  - image-manifest
  - asset-audit
  - bd-site
---
**Task ID:** t_cd37beb
**Flow:** blog_post_create | Step 1 of 9 — Intake
**Mode:** Strategist + Analyst
**Onboarding verification:** Complete. Repo on `main`, clean worktree. pnpm 10.x, Node 20.x verified.

### Live verification (step 1 execution)

Fresh checks run at intake execution:

- `test-post-image-workflow.svg`: 3519 bytes — matches manifest
- `_t_81cdae4-compounding-error-curve.svg`: 4987 bytes — matches manifest
- Both SVGs: valid XML via Python xml.etree (xmllint unavailable)
- All 4 per-post image-pack.json files: valid JSON, correct paths
- `image-manifest.json`: 2 assets, both with verification_record populated

Conclusion: the manifest is already accurate and complete. img-001 was added by the prior session's intake. img-002 was already present. No further corrections needed.
---

## Intake: Image Manifest Audit + Original Diagram Record

### What this task is asking for

"Create the original diagram and image manifest" maps to two jobs:

1. **Audit the existing `image-manifest.json`** — verify its completeness against the actual asset files present in the repo, and fix any gaps found.
2. **Record original diagram assets** — confirm all original SVG files are documented with the right metadata (alt text, ownership, placement rationale, verification record).

### Source material reviewed

| File | Purpose | Status |
|------|---------|--------|
| `src/data/blog/image-manifest.json` | Canonical registry of original post images | Reviewed |
| `src/data/blog/test-post-image-workflow.svg` | Workflow diagram SVG | 3519 bytes, valid XML |
| `src/data/blog/_t_81cdae4-compounding-error-curve.svg` | Decay curve SVG | 4987 bytes, valid XML |
| `src/data/blog/test-post-image-workflow.image-pack.json` | Per-post image pack | Exists |
| `src/data/blog/_ai-agents-make-some-developers-more-valuable.image-pack.json` | Per-post image pack | Exists |
| `src/data/blog/_smoke-test-what-breaks-when-agents-access-production-database.image-pack.json` | Per-post image pack | Exists |
| `src/data/blog/_t_81cdae4-what-breaks-when-ai-agents-access-production-databases.image-pack.json` | Per-post image pack | Exists |
| `src/data/blog/test-post-image-workflow.md` | Draft post embedding test-post-image-workflow.svg | Verified embed |

### What the manifest gets right

- Policy fields are correct: generative imagery requires Matt's explicit greenlight; all assets are owned by Matt/berryhill.dev.
- `img-002` (compounding error curve) is properly documented with verification record, alt text, placement rationale, and visual style notes.
- Workflow rules for new asset checklist are sound and match brand/content rules.
- `masthead_guidance` correctly separates post-body diagrams from brand identity assets.

### What is missing: img-001

The `test-post-image-workflow.svg` diagram (3519 bytes) exists in the repo and is embedded in `test-post-image-workflow.md`, but it is **not in the manifest assets array**. The per-post image-pack exists, the SVG exists, the draft post exists, but the master registry has no entry for it.

**Missing entry should document:**
- `id`: img-001 (next sequential ID)
- `post_slug`: test-post-image-workflow
- `post_title`: Test post: the image path should be boring
- `role`: diagram
- `asset_type`: workflow_diagram
- `path`: src/data/blog/test-post-image-workflow.svg
- `public_path_on_publish`: same
- `alt_text`: Five labeled boxes... (matches image-pack.json)
- `date_created`: 2026-06-17
- `usage_rationale`: Shows the draft-first image workflow...
- `visual_style`: Dark blue background, sky-blue borders and arrows...
- `placement_in_post`: Immediately after opening paragraph
- `masthead_eligible`: false
- `notes`: Created as smoke-test. The post is draft-only. The diagram serves as template for future workflow illustrations.
- `verification_record`: needs fresh SVG validation

### Per-post packs and their relationship to the manifest

Three per-post image-pack.json files document "no images" decisions:

| File | Post | Decision |
|------|------|----------|
| `_ai-agents-make-some-developers-more-valuable.image-pack.json` | AI agents + developer value | dynamic_og_only; no inline images |
| `_smoke-test-what-breaks-when-agents-access-production-database.image-pack.json` | Agent DB access smoke test | auto_og_only; no inline images |
| `_t_81cdae4-what-breaks-when-ai-agents-access-production-databases.image-pack.json` | Agent DB access (phase 2) | 1 diagram: compounding error curve |

The manifest's `per_post_image_packs` list is accurate. These packs do not add assets to the manifest — they document why no assets were needed for their posts.

### Original diagram — what counts

"Original" in the brand context means: **hand-authored SVG data visualizations and structural diagrams, owned by Matt/berryhill.dev, created by Luca Vale**.

Two SVGs currently qualify:

1. **test-post-image-workflow.svg** — workflow diagram showing the draft-first image pipeline
2. **_t_81cdae4-compounding-error-curve.svg** — decay curve for the compounding accuracy post

Both were created as part of Luca content workflow operations and are owned by Matt/berryhill.dev. Neither uses generative AI imagery.

### Constraints

- No generative imagery (Matt has not greenlit that phase)
- No external stock images
- Assets must stay in draft state alongside their underscore-prefixed draft posts until Matt approves publishing
- API safety rules: no production API calls during asset creation; assets are local filesystem objects

### Brand/reputation risk

Low. This is an internal audit and registry correction. Fixing the manifest before any new post goes through the image planning step prevents future gaps.

### Recommendation

Update `image-manifest.json` to add the missing `img-001` entry. No structural changes to the manifest format are needed — the current v1.0.0 structure is sound.

Proceed to Step 2 (Strategic Brief) once Matt approves this intake.

_Intake prepared by Luca Vale | Mode: Strategist + Analyst | Flow: blog_post_create | Step 1 | Task: t_cd37beb_
