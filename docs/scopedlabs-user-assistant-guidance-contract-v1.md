# ScopedLabs User Assistant Guidance Contract V1

## Purpose

The User Assistant Guidance Contract defines the structured reasoning pattern that future ScopedLabs tool assistants should follow.

This is the user-facing counterpart to the Tool Shell admin diagnostics stack.

Admin diagnostics answer:

```text
What broke?
Where is it?
What file or signal should a developer inspect?
```

User assistant guidance answers:

```text
What should the user do next?
Why does that action matter?
What result should improve?
What are the secondary options?
Is this clean pipeline truth or a local what-if branch?
```

## Current Proof Point

Camera Spacing is the current best proof point because it already contains the strongest version of the pattern:

- primary recommendation logic
- reason / why language
- expected result language
- secondary correction branches
- source mode handling
- report / carry-forward wording
- assistant scenario handling
- custom what-if branch handling

Camera Spacing should be treated as the reference model for the first shared contract, not as a page to immediately redesign.

## Core Guidance Object

Future assistant guidance should be able to produce an object shaped like this:

```js
{
  status: "healthy | watch | risk",
  mode: "pipeline | manual-override | assistant-scenario | mixed | setup",
  primaryRecommendation: {
    action: "",
    reason: "",
    expectedResult: "",
    confidence: "",
    nextStep: ""
  },
  secondaryOptions: [
    {
      label: "",
      intent: "",
      expectedResult: "",
      tradeoff: "",
      canApply: true
    }
  ],
  sourceIntegrity: {
    label: "",
    mode: "",
    affectedFields: [],
    message: ""
  },
  reportSummary: "",
  carryForward: {
    allowed: true,
    nextTool: "",
    message: ""
  }
}
```

## Required User-Facing Sections

A mature assistant should present these concepts, even if the exact visual layout differs by tool.

### 1. Primary recommended action

One clear first action.

Examples:

```text
Reduce HFOV to improve delivered plate detail.
Add one camera to reduce spacing pressure.
Review upstream coverage assumptions before continuing.
```

### 2. Why it matters

Explain the engineering reason without requiring the user to understand the formula.

Examples:

```text
The current spacing is wider than the usable camera footprint.
The available pixels are spread too wide for the requested detail target.
The overlap target is improving continuity but making the layout camera-heavy.
```

### 3. Expected corrected result

Describe what should improve after applying the recommendation.

Examples:

```text
The layout should move back into a safer spacing range.
Delivered detail should move closer to the target pixels-per-plate.
The design should reduce seam risk before Blind Spot Check.
```

### 4. Secondary options

Show alternatives only after the primary path.

Secondary options should be framed as tradeoffs, not equal guesses.

Examples:

```text
Add one camera for continuity.
Reduce overlap for efficiency.
Review upstream HFOV or protected length if local spacing changes do not solve the issue.
```

### 5. Source integrity

Make it clear whether the user is looking at:

```text
Clean pipeline
Manual override
Assisted scenario
Mixed scenario
Setup / planning entry
```

This must align with the final pipeline report source-integrity direction.

### 6. Report-ready summary

The same reasoning should be suitable for exports and future pipeline reports.

The assistant should not generate one explanation for the screen and a different unrelated explanation for the report.

## Contract Modes

### pipeline

Values are carried from upstream pipeline steps.

Use language like:

```text
This recommendation is based on the active pipeline assumptions.
```

### manual-override

A carried value was edited locally.

Use language like:

```text
This is a local what-if branch. Recalculate upstream if this value should become the clean pipeline assumption.
```

### assistant-scenario

The assistant intentionally applied a branch or scenario.

Use language like:

```text
This recommendation reflects the selected assistant scenario.
```

### mixed

Manual override and assistant scenario logic are both active.

Use language like:

```text
This result combines manual edits and an assistant scenario. Treat it as a local design branch until upstream assumptions are reconciled.
```

### setup

Used for pipeline-entry tools like Area Planner.

Setup tools should not be forced to produce corrected-result language if they are defining the project context rather than validating a calculated result.

## Audit Baseline

The first User Guidance Contract audit is intentionally allowed to produce WATCH items.

A WATCH result means:

```text
The tool works today, but does not fully satisfy the future smart assistant guidance contract yet.
```

It does not mean the tool is broken.

Current intended interpretation:

- SAFE means the tool already has the major guidance signals.
- WATCH means future user-assistant guidance should be strengthened.
- SKIP means protected or intentionally excluded.
- FAIL means an actual missing file or hard audit failure.

## Protected Page

Lens Selection remains protected as the current gold-standard page.

Do not redesign or migrate Lens Selection into a shared assistant contract until the shared contract can reproduce the Lens experience without regression.

## Implementation Rules

Do not start by rewriting every assistant.

Preferred path:

1. Audit current guidance signals.
2. Document the shared contract.
3. Use Camera Spacing as the first adapter/proof point.
4. Extract a small shared guidance object builder.
5. Keep rendering local until the schema is stable.
6. Only then consider shared renderer ownership.

## Guardrails

Do not change:

- formulas or math
- existing IDs
- auth / checkout
- pipeline behavior
- export behavior
- snapshot behavior
- Knowledge Base behavior
- Lens Selection behavior
- script order without inspection
- source integrity semantics

All future patches should be:

- small
- reversible
- Node-scripted
- cache-busted when runtime files change
- audit-verified
- dry-run first where possible
