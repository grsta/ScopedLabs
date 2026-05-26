# ScopedLabs Current Scope and Handoff

Last updated: 2026-05-25  
Project: ScopedLabs  
Site: scopedlabs.com  
Repo: grsta/ScopedLabs  

## Purpose

ScopedLabs is a live engineering planning toolkit for real-world infrastructure systems. The site is moving beyond isolated calculators and toward guided design workflows that preserve assumptions, carry results forward, validate design decisions, and produce report-ready outputs.

The long-term product direction is:

- Help users plan before anything is installed.
- Make assumptions visible instead of hidden.
- Carry important values from one step to the next.
- Show whether a result is healthy, watch-level, or risky.
- Explain what to change when a result is not healthy.
- Produce documentation that can be reviewed, exported, saved, or handed off.

ScopedLabs should feel like a practical engineering planning environment, not a collection of loose calculators.

## Product Positioning

Use language like:

- planning tools
- design workflows
- validation tools
- guided design flow
- assumption-aware reports
- engineering planning toolkit

Avoid making the site sound like a basic calculator site.

The core value is not only the math. The value is the workflow, assumptions, interpretation, recommendations, source integrity, and documentation.

## Current Site Model

ScopedLabs is organized by tool categories. A category can include both free and Pro tools. Pro unlocks are category-based, meaning a user unlocks a category rather than one isolated tool.

Major shared systems include:

- Supabase auth and entitlement checks
- Stripe checkout and webhook flow
- Category unlock UI
- Guided pipeline state
- Knowledge Base system
- Analyzer/results engine
- Export/report system
- Graphics/CAD visual system
- Tool Shell diagnostics
- Modernizer/audit modules
- User Assistant Guidance contract foundation

Preserve these systems unless a change is explicitly scoped.

## Durable Engineering Rules

Use these rules for future code work:

- Use Node.js scripts from the repo root for bulk edits and audits.
- Use UTF-8-safe file writes.
- Avoid PowerShell Set-Content for HTML, CSS, and JS rewrites.
- Prefer small, reversible patches.
- Preserve IDs, class names, script order, auth flow, checkout flow, pipeline behavior, export behavior, snapshot behavior, Knowledge Base behavior, and area-state behavior.
- Do not redesign locked pages unless explicitly asked.
- Keep cache-bust versions consistent within each update.
- Remove temporary ZIPs and temporary scripts before commit.
- Run node --check on touched JavaScript.
- Run relevant audits before commit.
- Commit and push before live verification, because live checking depends on GitHub/Cloudflare deployment.

## Locked or Protected Areas

Lens Selection is protected as the current Physical Security assistant gold standard. Do not redesign it casually.

The Design Pipeline nav and existing pipeline IDs are protected. Do not break carry-forward, continue/back behavior, or hidden-by-default continue rows.

Auth, checkout, entitlement checks, export, snapshot, and Knowledge Base behavior must be preserved during UI or assistant work.

## Current Major Phase

The current major phase is Physical Security V2 cleanup and foundation building.

This phase is not just visual polish. It is building reusable foundations for future categories:

- CAD-style graphics
- Tool Shell diagnostics
- Modernizer audit modules
- User-facing assistant guidance contracts
- Adapter proofs
- Future shared assistant renderer pattern

Physical Security is being used as the proving ground before scaling the same standards across other categories.

## Current Physical Security State

Physical Security has a guided design flow with core tools and optional specialist validation branches.

Main pipeline tools include:

1. Area Planner
2. Scene Illumination
3. Mounting Height
4. Field of View
5. Coverage Area
6. Camera Spacing
7. Blind Spot Check
8. Pixel Density
9. Lens Selection

Specialist validation tools include:

- Face Recognition Range
- License Plate Capture Range

Face Recognition and License Plate should not be forced into every general coverage pipeline. They are optional specialist validations used when the area requires those assumptions.

## Graphics and Visual Direction

ScopedLabs visuals should move toward a consistent CAD-style engineering look.

Preferred visual language:

- thin CAD-style lines
- subtle fills
- clean target markers
- measured dimension lines
- semantic status colors
- restrained labels
- engineering-stage feel
- export-safe SVGs
- readable report graphics

Avoid:

- blog-style diagrams
- oversized labels
- inconsistent one-off graphics
- thick decorative visuals
- hiding old charts offscreen instead of excluding them properly

When a new assistant SVG or graphics-engine visual owns the report visual, legacy analyzer charts should be removed, disabled, or excluded from export to prevent blank or duplicate report sections.

## Shared Graphics Architecture

The shared graphics approach is:

- ScopedLabs graphics engine provides generic rendering contracts and CAD primitives.
- Physical Security graphics library provides category-specific components.
- Tool math stays local/tool-owned.
- Graphics render model truth; they must not secretly change engineering formulas.

Physical Security graphics library components now include accepted proof points for tools such as Coverage Area, Field of View, Pixel Density, Camera Spacing, Blind Spot Check, Scene Illumination, Face Recognition, and License Plate Capture Range.

## Tool Shell Direction

Tool Shell is a shared helper foundation, not a full page owner yet.

Current Tool Shell direction:

- diagnostics first
- safe runtime helpers
- no automatic DOM ownership until proven
- no visual rewrite without an explicit phase
- no math/pipeline/export/KB/auth/checkout changes from diagnostics

The Tool Shell diagnostic stack includes helper functions for describing tool/page readiness, assistant shell readiness, diagnostics summaries, and printable diagnostics.

Future Tool Shell extraction should remain tiny and reversible.

## Modernizer Direction

The Modernizer is a category-aware audit and patch framework.

Current direction:

- audit-only modules first
- no-op baselines before apply mode
- role-aware audits
- intentional WATCH states are allowed when they represent future improvement gaps rather than broken tools
- pending safe patches should stay zero unless explicitly applying a scoped patch

Modernizer modules currently include audit coverage for assistant shell, input presets, export visuals, source integrity, and user guidance.

## User Assistant Guidance Contract

The newest active foundation is the User Assistant Guidance Contract.

The goal is to create a normalized user-facing guidance object that can later be rendered consistently by tools and reports.

The guidance contract should include:

- status
- source mode
- primary recommended action
- reason
- expected corrected result
- confidence
- next step
- secondary options
- source integrity
- report summary
- carry-forward message

This is different from developer diagnostics. Developer diagnostics explain whether the page is wired correctly. User assistant guidance explains what the user should do next and why.

## Current User Guidance State

The shared helper exists at:

    assets/user-assistant-guidance.js

Current helper version:

    user-assistant-guidance-001-schema-foundation

It exports:

- createGuidance
- validateGuidance
- explainGuidance
- sourceLabelForMode
- sourceMessageForMode

The current contract doc exists at:

    docs/scopedlabs-user-assistant-guidance-contract-v1.md

The Modernizer user guidance module is audit-only:

    user-guidance@user-guidance-module-001-audit-only

Expected intentional Modernizer baseline around this phase:

    Module results: 187
    SAFE: 162
    WATCH: 8
    SKIP: 17
    FAIL: 0
    Pending safe patches: 0
    Applied patches: 0

WATCH items in this module generally mean future smart-assistant guidance gaps, not broken tools.

## Adapter Proofs

The first successful user guidance adapter proof is Camera Spacing.

Camera Spacing now:

- loads the shared user assistant guidance helper
- exposes ScopedLabsCameraSpacingGuidance
- generates normalized guidance after successful calculation
- keeps the adapter invisible
- does not rewrite visible UI
- does not mutate pipeline payloads with the new guidance object
- has a guardrail audit

Camera Spacing proved the pattern.

The second successful adapter proof is License Plate Capture Range.

License Plate now:

- loads the shared user assistant guidance helper
- exposes ScopedLabsLicensePlateGuidance
- generates normalized guidance after successful calculation
- keeps the adapter invisible
- does not rewrite visible UI
- does not change export, snapshot, KB, auth, checkout, or pipeline behavior

Next step for License Plate is to add a License Plate Guidance Adapter Audit V1 guardrail, similar to the Camera Spacing audit.

## Short-Term Scope

The short-term scope is to finish the current Physical Security guidance-adapter lane safely.

Immediate next steps:

1. Add License Plate Guidance Adapter Audit V1.
2. Verify helper include, adapter global, success hook, and no pipeline payload mutation.
3. Commit and push the audit.
4. Checkpoint both adapter proofs.
5. Decide whether the third adapter proof should be another optional specialist tool or a core pipeline step.
6. Keep the adapters invisible until at least two or three tools prove the schema.

Do not start a shared visible guidance renderer until the adapter contract is proven across multiple tools.

## Near-Term Scope

After Camera Spacing and License Plate are locked with audits, the near-term work is:

- improve guidance contract audits
- select the third adapter proof
- decide which guidance fields belong only in runtime inspection versus exports
- keep source integrity clear
- avoid stuffing new guidance objects into pipeline payloads until deliberately scoped
- preserve existing reports
- continue treating Lens Selection as protected

Possible next proof candidates:

- Face Recognition, because it mirrors License Plate as a specialist validation
- Pixel Density, because it is a core detail-quality step
- Blind Spot Check, because it already benefits from clear corrective guidance

Choose based on risk and how clean the existing tool logic is.

## Long-Term Scope

The long-term ScopedLabs direction is to turn each category into a guided planning environment with:

- category-specific pipelines
- assumption carry-forward
- source integrity tracking
- assistant recommendations
- CAD-style visuals
- report-ready exports
- account snapshots
- final pipeline summaries
- optional specialist validation branches
- reusable category libraries
- reusable Tool Shell behaviors
- reusable User Assistant Guidance rendering

The final product should help a user understand:

- what they entered
- where the assumptions came from
- what the result means
- what is healthy or risky
- what to change
- what the next step is
- what changed if they used manual overrides
- what branch of the design they are validating

## Future Pipeline Report Direction

Final pipeline reports should eventually include an assumption integrity/source summary.

Overall report states should include:

- Clean Pipeline
- Manual Override
- Assisted Scenario
- Mixed Scenario

Clean Pipeline means values came from the guided pipeline with no midstream edits.

Manual Override means one or more carried-over values were edited inside normal tool pages.

Assisted Scenario means a design assistant or custom scenario branch was intentionally used.

Mixed Scenario means both manual overrides and assistant/custom scenario values are present.

Final reports should list affected tools, edited fields, imported values, edited values, and guidance explaining whether the result is pure pipeline truth or a valid what-if branch.

## Future Gold Tier Direction

A future Gold tier may connect design pipelines across categories.

Possible Gold direction:

- cross-category workflows
- global design summaries
- saved project workspaces
- advanced snapshots
- stronger report packs
- multi-category planning
- more assistant-driven correction paths

Do not build Gold tier features yet unless explicitly scoped.

## Future Supabase Brain Idea

Because ChatGPT memory is limited, the repo should be the primary project memory.

Future option: add a Supabase-backed internal project memory or admin note system.

Possible table:

    project_notes
    - id
    - type
    - area
    - title
    - body
    - status
    - created_at
    - updated_at

Possible note types:

- checkpoint
- todo
- decision
- warning
- audit-baseline
- handoff

This is not a current implementation task. Treat it as a possible future internal admin feature.

## Open TODOs and Refinements

### License Plate classification boundary polish

Current issue:

A perfect threshold case such as delivered pixels-per-plate equal to target pixels-per-plate and margin exactly 0 ft is currently classified as RISK.

Example:

    Delivered: 80 px
    Target: 80 px
    Margin: +0 ft

Likely desired behavior:

    Delivered < target OR margin < 0 = Risk
    Delivered == target AND margin == 0 = Watch / At Limit
    Delivered > target AND margin > 0 = Healthy

Scope later:

- classification/status boundary only
- not a guidance adapter issue
- preserve the current adapter proof
- audit and test separately
- do not change math casually

### Pixel Density future enhancement

Pixel Density currently treats an active area with multiple cameras as one shared pixel-density scenario.

Future version should support per-area camera roles or detail profiles, such as:

- overview camera
- gate/detail camera
- entry face-recognition camera
- license-plate lane camera

This should eventually display separate camera/detail profiles in visuals, results, reports, and downstream handoff.

### Final pipeline export

The final pipeline export should eventually summarize the entire design branch, including assumptions, source mode, tool results, optional validations, and correction guidance.

## Current Recommended Next Command Flow

Start with:

    git status --short

Run relevant checks:

    node --check .\assets\user-assistant-guidance.js
    node --check .\tools\physical-security\license-plate-range\script.js
    node --check .\scripts\modernize-category-tools-v1.js
    node .\scripts\audit-camera-spacing-guidance-adapter-v1.js
    node .\scripts\modernize-category-tools-v1.js --module user-guidance
    node .\scripts\modernize-category-tools-v1.js --summary-only

Next create:

    scripts/audit-license-plate-guidance-adapter-v1.js

That audit should check:

- shared helper exists
- License Plate loads helper before local script
- local script cache is bumped to guidance adapter version
- latestLicensePlateGuidance state exists
- buildLicensePlateUserGuidance exists
- updateLicensePlateUserGuidance exists
- ScopedLabsLicensePlateGuidance global exists
- renderSuccess calls updateLicensePlateUserGuidance after a successful calculation
- writeFlow payload is not mutated with the normalized guidance object
- adapter builder does not own DOM rendering

## Commit Hygiene

Before committing:

- remove temporary inspection and patch scripts
- keep permanent audit scripts
- run node --check on touched JS
- run relevant audits
- run git diff --stat
- run git status --short

Typical commit pattern:

    git add .\docs\scopedlabs-current-scope-and-handoff.md
    git commit -m "Add ScopedLabs current scope handoff"
    git push
    git status --short

## Resume Phrase

SCOPEDLABS-CURRENT-SCOPE-HANDOFF-0525

## Guiding Principle

ScopedLabs should become a reusable engineering planning system.

Do not chase one-off fixes when a shared engine, audit, or contract can safely preserve the work for the next category.

Move slowly enough that auth, checkout, pipeline, export, snapshot, Knowledge Base, and report behavior stay intact.

Move steadily enough that the site keeps getting closer to a real professional planning toolkit.

---

## SCOPEDLABS-PHYSICAL-SECURITY-GUARDRAIL-PROOF-0526

### Camera Spacing guardrail proof

Camera Spacing visible Physical Security category guidance proof is working.

The local Camera Spacing Design Assistant remains the validator. The Physical Security master/category guidance now behaves like a quiet guardrail supervisor instead of a duplicate assistant.

### Proven behavior

- Healthy/current-tool-only guidance stays hidden.
- Watch/Risk/out-of-guardrail guidance appears.
- The category card no longer duplicates normal healthy local assistant advice.
- The category card appears when validated guidance crosses guardrail expectations.
- Manual render proved the renderer itself was good.
- Scenario/preset CTA path issue was identified and understood.
- Stale memory mismatch was identified as the likely cause when local assistant showed Healthy but master still showed Risk.

### Architecture lesson

Do not list every CTA across the category long-term.

The correct reusable model is:

```text
Raw input/value changes
→ clear stale master/category guidance

Validated tool assistant guidance changes
→ save normalized guidance memory
→ re-check category value gate
→ show master card only if it adds guardrail/pipeline value
```

The master should not care whether the result came from Calculate, Apply, preset/scenario CTA, imported pipeline value, or manual input changes.

It should only care whether validated normalized guidance changed and whether that guidance is Healthy, Watch, Risk, stale, or conflicting with pipeline assumptions.

### Current proof lane

- Camera Spacing is the only visible proof page.
- Area Planner remains skipped.
- Lens Selection remains protected and untouched.
- Only Camera Spacing is currently saving visible proof memory, so Generated 1 / 9 is expected.

### Next step

Do not roll visible cards across the category yet.

Next build should be a reusable guidance-change/event bridge so tools can emit validated guidance updates, and the category memory/master guidance can decide whether to show.

Preferred next lane:

1. Freeze/commit current Camera Spacing proof.
2. Keep this checkpoint in the repo handoff doc.
3. Build reusable guidance-change watcher/event bridge.
4. Prove it on Camera Spacing.
5. Then wire upstream non-visible memory saving, likely Camera Coverage Area → Camera Spacing.

