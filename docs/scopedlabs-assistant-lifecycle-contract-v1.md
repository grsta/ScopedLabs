# ScopedLabs Assistant Lifecycle Contract V1

Status: active proof contract after Compute CPU assistant lifecycle work.

## Purpose

This contract prevents old calculator pages from keeping the legacy visible Results card as the primary result surface after the assistant is introduced.

## Required lifecycle

Modernized tool pages must follow this visible/runtime lifecycle:

1. Inputs are edited.
2. Any stale assistant output is cleared.
3. User clicks Calculate / Evaluate.
4. Tool math runs exactly as before.
5. Result payload is written to the category ledger/state.
6. Internal result values remain available for export, snapshot, report, and diagnostics.
7. Legacy Results / chart surfaces are hidden from the visible UI.
8. Assistant becomes the primary visible result surface.
9. Continue/export refresh runs after the assistant receives the result.

## DOM contract

A modernized assistant-owned result page should have:

- Hidden internal result ledger:
  - #results
  - #analysis-copy when applicable
  - data-internal-results-ledger
  - hidden and aria-hidden="true"

- Visible assistant surface:
  - category assistant card
  - assistant mount
  - hidden on page load
  - visible only after a calculation/evaluation result handoff

## Script contract

A modernized tool script should have:

- A clearAssistant helper.
- A renderAssistant helper.
- Input/reset invalidation must clear assistant output.
- Calculate must call assistant after result save and context refresh.
- Calculate order should be:
  - save result
  - refresh active context
  - render assistant
  - show continue / refresh export

## Ownership contract

- Tool script owns math and result payload creation.
- Category state owns active scope/workload/result ledger.
- Category assistant contract owns assistant model building.
- Shared local assistant owns rendering only.
- Export/report continues to use structured hidden values or saved result payloads.

## Clone rule

Do not clone a modernized tool by copying one-off DOM patches. Clone the lifecycle:

legacy visible Results card -> hidden internal ledger
assistant card -> primary visible result surface
category contract -> model owner
tool script -> explicit result handoff

## First-tool legend rule

A status/decision legend belongs only on the first tool in a pipeline unless a category contract explicitly allows it elsewhere.
