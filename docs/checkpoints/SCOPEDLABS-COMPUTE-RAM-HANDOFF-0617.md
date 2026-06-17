# SCOPEDLABS-COMPUTE-RAM-HANDOFF-0617

Checkpoint anchor: **SCOPEDLABS-COMPUTE-RAM-HANDOFF-0617**

Date: 2026-06-17  
Repo: `E:\ScopedLabs`  
Site: `scopedlabs.com`  
Current lane: **Compute RAM Sizing shared capacity visual module**

---

## Hard project rules

- Use Node.js scripts from the repo root for bulk edits and audits.
- Use UTF-8-safe writes only.
- Do not use PowerShell `Set-Content` for HTML/JS/CSS rewrites.
- Do not use fragile manual patches when a safe Node script can do it.
- Preserve existing layouts, IDs, class names, script order, auth flow, checkout flow, pipeline behavior, export behavior, snapshot behavior, and Knowledge Base behavior.
- Prefer small, reversible changes.
- Prefer reusable/factory-style modules over page-local one-offs.
- Keep cache-bust versions consistent within a given update.
- If a shared module/export route/category shell/special path/audit is added or changed, update `docs/scopedlabs-module-map.md` and run:
  ```powershell
  node .\scripts\audit-scopedlabs-module-map-v1.js
  ```
- Remove temporary scripts before commit.
- User can only live-verify after commit/push to GitHub/Cloudflare.
- Use PowerShell commands with separate lines or semicolons, not `&&`.

---

## Current user instruction / correction

The user stopped the session because the browser is bloated.

The next agent must continue from this checkpoint and **must not continue one-off local patching**.

The user explicitly corrected the workflow:

- Use the module map.
- Plug into modules.
- No one-off page renderers.
- CPU already had accepted marker colors and proof styling.
- RAM must use the accepted CPU proof marker palette through the shared module:
  - `*1 = #38d9ff`
  - `*2 = #a78bfa`
  - `*3 = #f59e0b`
- The RAM visual currently shows problems:
  - no useful numeric labels on the chart
  - looks like a color board
  - bottom footnotes have/previously had a giant pill/footer strip
  - footnotes should be centered and not inside a pill
  - top status should not be a rounded pill; use rectangular engineering chip style
- The next work should be a clean shared-module visual polish, not a RAM page hack.

---

## Current uncommitted state expected

Run:

```powershell
git status --short
```

Expected before further work:

```text
 M assets/scopedlabs-compute-result-visuals.css
 M docs/scopedlabs-module-map.md
 M scripts/audit-compute-ram-planning-upgrade-v1.js
 M tools/compute/ram-sizing/index.html
 M tools/compute/ram-sizing/script.js
?? assets/scopedlabs-compute-capacity-visuals.js
?? docs/checkpoints/SCOPEDLABS-COMPUTE-RAM-HANDOFF-0617.md
```

No temp scripts should remain. Remove these if present:

```powershell
Remove-Item .\scripts\replace-compute-capacity-visual-module-0617c.js -Force -ErrorAction SilentlyContinue
Remove-Item .\scripts\fix-ram-shared-capacity-visual-cleanup-0617a.js -Force -ErrorAction SilentlyContinue
Remove-Item .\scripts\fix-ram-shared-capacity-visual-cleanup-0617b.js -Force -ErrorAction SilentlyContinue
Remove-Item .\scripts\polish-shared-ram-visual-small-0617d.js -Force -ErrorAction SilentlyContinue
Remove-Item .\scripts\fix-compute-capacity-marker-palette-0616aq.js -Force -ErrorAction SilentlyContinue
```

---

## Files involved

### New shared module

`assets/scopedlabs-compute-capacity-visuals.js`

Purpose:
- Own shared Compute capacity-envelope SVG renderers.
- RAM should consume this module through:
  ```js
  window.ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope(...)
  ```
- RAM page must not own local capacity SVG/table proof renderers.

Current issue:
- The module exists and is wired, but the visual still needs shared-module polish.
- Do not replace RAM page logic to fix visual issues.
- Fix the renderer inside this shared module.

### Shared visual CSS

`assets/scopedlabs-compute-result-visuals.css`

Purpose:
- Shared Compute result visual surface.
- CPU was the first consumer.
- RAM now loads this CSS too.
- Only small shared visual CSS additions were made.

### Module map

`docs/scopedlabs-module-map.md`

Current additions:
- `assets/scopedlabs-compute-capacity-visuals.js` added under Compute modules.
- Added Compute shared capacity visuals section.
- Added rule:
  - Do not add page-local one-off capacity SVG/table stacks when a shared Compute visual renderer can be used or promoted.

Audit:
```powershell
node .\scripts\audit-scopedlabs-module-map-v1.js
```

Last known result:
```text
SUMMARY
PASS: 412
FAIL: 0
```

### RAM page

`tools/compute/ram-sizing/index.html`

Current changes:
- Loads `/assets/scopedlabs-compute-result-visuals.css`.
- Adds visual card/mount:
  - `computeRamVisualCard`
  - `computeRamVisual`
- Loads `/assets/scopedlabs-compute-capacity-visuals.js` before RAM page script.
- RAM page script cache bust changed to `compute-ram-shared-capacity-0616am`.

Important:
- Preserve export/report/snapshot/pipeline behavior.
- Do not redesign the page.
- Do not add one-off local visual sections.

### RAM script

`tools/compute/ram-sizing/script.js`

Current changes:
- Removed page-local one-off proof renderer residue.
- RAM script now has adapter calls:
  ```js
  clearRamCapacityVisual()
  renderRamCapacityVisual(result)
  window.ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope(...)
  window.ScopedLabsComputeCapacityVisuals.clear(...)
  ```
- RAM builds:
  ```js
  const ramCapacityEnvelope = { ... }
  ```
- RAM writes:
  ```js
  capacityEnvelope: ramCapacityEnvelope
  ```
  into flow payload.
- Select-String for these should return nothing from RAM script:
  ```text
  function buildRamCapacityEnvelopeSvg
  renderRamProofSections
  buildRamRecommendationReferences
  buildRamDecisionSchedule
  ```

### RAM audit

`scripts/audit-compute-ram-planning-upgrade-v1.js`

Current status:
- Updated to audit shared-module wiring.
- Last known result:
  ```text
  PASS : 44
  WATCH: 4
  FAIL : 0
  OVERALL: PASS_WITH_WATCH
  ```

Remaining WATCH items are intentional:
- RAM does not yet use custom export payload.
- RAM does not yet load Compute assistant contract.
- RAM does not yet load user tool notes.
- RAM does not yet expose custom chart image export route.

Do not close those until after the shared RAM visual is accepted live.

---

## Last known clean checks

Run:

```powershell
node --check .\assets\scopedlabs-compute-capacity-visuals.js
node --check .\tools\compute\ram-sizing\script.js
node --check .\scripts\audit-compute-ram-planning-upgrade-v1.js
node .\scripts\audit-compute-ram-planning-upgrade-v1.js
node .\scripts\audit-scopedlabs-module-map-v1.js
```

Expected:
- JS syntax checks pass.
- RAM audit = `PASS_WITH_WATCH`, `FAIL 0`.
- Module map audit = `PASS 412`, `FAIL 0`.

---

## Do not repeat these mistakes

The previous session made these mistakes:
- Built a page-local RAM proof SVG/table stack first. This was rejected.
- Created a shared module but initially used wrong marker colors instead of CPU’s accepted proof marker colors.
- Tried brittle full function replacement scripts that failed.
- Kept patching instead of providing push commands when user asked.

Next agent must:
- Inspect current files first.
- Use small Node scripts.
- Keep fixes in shared module.
- Provide push commands once checks pass.
- Stop and ask for pasted error output if any script fails.

---

## Next recommended patch

Patch only:

```text
assets/scopedlabs-compute-capacity-visuals.js
scripts/audit-compute-ram-planning-upgrade-v1.js
```

Goal:
- Add readable Y-axis numeric tick labels to the shared RAM visual.
- Keep the CPU-approved marker colors:
  - `#38d9ff`
  - `#a78bfa`
  - `#f59e0b`
- Remove any footer pill/strip around the `*1/*2/*3` notes.
- Center footnotes plainly across the bottom.
- Change top-right status from pill to rectangular engineering chip.
- Preserve RAM math and pipeline payload.
- Preserve module map state unless a new module path is added.

Suggested safe inspection before patch:

```powershell
cd E:\ScopedLabs

Select-String -Path .\assets\scopedlabs-compute-capacity-visuals.js -Pattern "buildRamCapacityEnvelopeSvg","footer-strip","marker-current","marker-growth","marker-failover","#38d9ff","#a78bfa","#f59e0b","status-chip","rx=\"" -Context 3,8

Select-String -Path .\tools\compute\ram-sizing\script.js -Pattern "ScopedLabsComputeCapacityVisuals","ramCapacityEnvelope","capacityEnvelope: ramCapacityEnvelope","function buildRamCapacityEnvelopeSvg","renderRamProofSections"

git status --short
```

---

## Commit/push once fixed and accepted for live review

After patch and checks pass:

```powershell
cd E:\ScopedLabs

git add .\assets\scopedlabs-compute-capacity-visuals.js
git add .\assets\scopedlabs-compute-result-visuals.css
git add .\docs\scopedlabs-module-map.md
git add .\scripts\audit-compute-ram-planning-upgrade-v1.js
git add .\tools\compute\ram-sizing\index.html
git add .\tools\compute\ram-sizing\script.js
git add .\docs\checkpoints\SCOPEDLABS-COMPUTE-RAM-HANDOFF-0617.md

git diff --cached --stat

git commit -m "Add shared RAM capacity visual module"
git push

git status --short
git log -3 --oneline
```

If only the visual polish is added later as a separate commit, use:

```powershell
git commit -m "Polish shared RAM capacity visual module"
```

---

## Live verification target

After push/deploy:

```text
/tools/compute/ram-sizing/
```

Verify:
- Calculate still works.
- Existing RAM result rows still appear.
- RAM Capacity Envelope renders from shared module.
- Axis/tick numbers are readable.
- `*1/*2/*3` marker colors match CPU:
  - cyan / purple / amber
- Footnotes are centered, plain, and not inside a giant pill.
- Status chip is rectangular, not pill-like.
- Reset clears/hides visual.
- Continue still goes to Storage IOPS.
- Export custom payload is not expected yet.

---

## Next lane after live visual acceptance

Only after user accepts RAM visual:
1. Add RAM custom export payload route:
   - `customPayloadBuilder: "ScopedLabsComputeRamExport.buildPayload"`
   - `window.ScopedLabsComputeRamExport.buildPayload`
   - Use shared capacity visual module to build chart image.
2. Add export extra sections as needed.
3. Then connect Compute assistant contract and user notes.
4. Update module map and audits for each shared route.
