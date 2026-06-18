---
title: "Image Manifest Audit — Strategic Brief"
pubDatetime: 2026-06-18T09:15:00+07:00
tags:
  - internal
  - image-manifest
  - bd-site
---

**Task ID:** t_cd37beb
**Flow:** blog_post_create | Step 2 of 9 — Strategic Brief
**Mode:** Strategist
**Previous step:** Intake (execute) — completed; manifest already accurate

---

## Strategic Brief: Image Manifest Audit

### The job

Verify the completeness and accuracy of `image-manifest.json` as the canonical registry for original post images, and record all original SVG diagram assets with complete metadata.

This is an audit-and-registry task, not a content-creation task. The goal is correctness and future-proofing — not a new post.

### What the audit found

The manifest was in good structural shape but had one gap: `img-001` (test-post-image-workflow.svg) existed in the repo with a valid per-post image-pack and was embedded in its draft post, but had no manifest entry. The prior session's intake corrected that. Both img-001 and img-002 are now properly documented.

Current manifest state (verified fresh at intake execution):

- 2 original SVG assets registered (img-001, img-002)
- Both SVGs: valid XML, correct byte counts, embedded in draft posts
- All 4 per-post image-pack.json files: valid JSON, correct paths
- Policy fields: generative imagery blocked, all assets owned by Matt/berryhill.dev
- Workflow rules: sound and aligned with brand/content rules

No structural problems. No orphaned assets. No missing entries.

### What action is needed

1. **Commit the manifest update** — The `image-manifest.json` has been updated (img-001 added, verification_record populated) but is currently untracked. This needs to be committed and pushed.
2. **No other changes required** — The manifest format, policy fields, and workflow rules are sound.

### Why this matters for the brand

Matt's site should be operator-grade: every asset documented, nothing ad-hoc, nothing that could be lost or forgotten. The manifest is the record that prevents future assets from slipping through. The fact that this audit found only one minor gap — and that it was caught and corrected — validates the workflow. Keeping the manifest accurate is operational hygiene.

### Constraints

- No generative imagery (standing directive)
- No external stock images
- Assets remain in draft state alongside underscore-prefixed draft posts
- API safety: no production API calls; all work is local filesystem
- PR-boundary: this is content-only (manifest is content data, not app source)

### Risks

| Risk                                    | Likelihood | Mitigation                                          |
| --------------------------------------- | ---------- | --------------------------------------------------- |
| Manifest update not committed/pushed    | Low        | Commit now; Matt can review before merge            |
| Future assets not added to manifest     | Medium     | Enforce checklist in workflow_rules; Luca owns this |
| Per-post image-pack drift from manifest | Low        | Verify alignment during each image planning step    |

### Recommendation

Approve the manifest as-is (it is already correct). Proceed to commit the update and close the audit. No structural changes needed.

### What happens next if approved

- Luca commits `image-manifest.json` and opens a PR to `main` (path_boundary: content-only)
- The 2 original SVG assets remain documented in the manifest
- Future image planning steps will reference the workflow_rules checklist

If Matt wants structural changes to the manifest format, scope that as a follow-on task.

_Strategic brief prepared by Luca Vale | Mode: Strategist | Flow: blog_post_create | Step 2 | Task: t_cd37beb_
