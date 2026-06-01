# ScopedLabs Checkpoint - Physical Security Category Completion

Date: 2026-05-31  
Lane: Physical Security category closeout / reusable category-factory proof

## Completion state

The Physical Security category is accepted as the first completed category-factory model.

This category now has:

- A planning/control-center entry flow through Area / Zone Planner.
- Core Physical Security tool pipeline behavior preserved.
- Optional specialty branch zones for Face Recognition and License Plate Capture.
- Lens Selection aligned to the final category flow.
- A permanent Physical Security Summary page acting as the category master/report host.
- A category master assistant that reads local tool guidance and prioritizes Risk, Watch, and missing core steps.
- Tool Notes and area/zone context carried into Summary and report output.
- Report metadata, print/save report behavior, account snapshot readability, and export wrapping polished.
- Reset Area Plan behavior that clears Physical Security planning data, guidance memory, tool notes, metadata, and saved Physical Security report records while preserving account snapshots.
- Camera Spacing demoted back to local-only behavior after the master assistant moved to Summary.
- Area Planner frozen as the control center unless a real bug is reopened.

## Final Physical Security architecture

The accepted long-term model is:

- Each individual tool has one local assistant/validator.
- The Physical Security category has one master/category assistant, displayed on Summary only.
- Local tool assistants publish validated guidance silently into shared category memory.
- Summary reads area/zone context, local tool guidance, tool notes, and report readiness.
- Summary acts as the category review board, final report/export host, and future Site Assistant feed.
- Face Recognition and License Plate Capture remain optional specialty branches, not required core pipeline steps.

## Completed category flow

The intended user flow is:

1. Area / Zone Planner
2. Core Physical Security tools
3. Lens Selection
4. Physical Security Summary
5. Optional Face Recognition / License Plate zones attach back into Summary

## Accepted Summary behavior

Physical Security Summary is now the permanent category-level host for:

- Master assistant guidance
- Area/zone rollup
- Tool guidance rollup
- Selected area guidance/details
- Area/zone report sections
- Final report export
- Tool Notes
- Future cross-category payloads

The master assistant does not change tool formulas or math. It reviews validated local outputs and helps the user correct category-level risks and watch items.

## Guardrails

- Do not create duplicate Physical Security master assistants on individual tools.
- Do not duplicate the category master brain asset.
- Preserve deterministic tool math.
- Preserve auth, checkout, export, snapshot, Knowledge Base, and pipeline behavior.
- Keep Area Planner frozen unless a real bug is reopened.
- Keep Camera Spacing local-only unless explicitly reopened.
- Treat Summary as the permanent Physical Security master/report host.
- Future categories should reuse this architecture as the category-factory model.
