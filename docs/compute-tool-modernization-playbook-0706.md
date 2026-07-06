# Compute Tool Modernization Playbook 0706

Checkpoint passphrase: `SCOPEDLABS-COMPUTE-STORAGE-THROUGHPUT-PROMOTION-0706`

This document records the exact promotion workflow for Compute tools after the Storage IOPS / Storage Throughput modernization work. The purpose is to avoid one-off page fixes and keep shared shell/module ownership clear.

## Core rule

Do not solve repeated UI, assistant, export, CTA, or visual behavior with page-local workaround scripts unless it is a temporary diagnostic. Promote the behavior into the correct shared owner, then remove the temporary/local page patch.

## Correct shared owners

| Area | Shared owner |
| --- | --- |
| Capacity envelope SVGs | `assets/scopedlabs-compute-capacity-visuals.js` |
| Footer chip/icon styling under capacity charts | `computeCapacityFooterIconStyles()` and `buildCapacityFooterStat()` in `assets/scopedlabs-compute-capacity-visuals.js` |
| Compute Back / Continue flow CTA row creation, labels, and guided routing overrides | `assets/scopedlabs-compute-shell-contract.js` |
| Active Workflow / page shell behavior that repeats across Compute tools | `assets/scopedlabs-compute-shell-contract.js` or a future shared Compute workflow-shell module |
| Assistant status/proof card markup | `assets/scopedlabs-compute-assistant-contract.js` |
| Tool-specific payload/calculation data | Tool `script.js` |
| Export payload builder | Tool `script.js` unless promoted to a shared export owner |
| KB card rendering | `assets/help.js`; do not suppress the whole KB card from tool pages |
| Module inventory | `docs/scopedlabs-module-map.md` |

## Storage Throughput accepted target behavior

Storage Throughput must match the RAM / Storage IOPS shell pattern:

1. KB card remains visible.
2. The small `Knowledge Base` pill may be hidden if needed, but the KB card itself must not be suppressed.
3. Active Workflow card appears directly below the KB card.
4. Active Workflow eyebrow is green, not bold-heavy.
5. Input card heading reads `Planning Inputs`.
6. Legacy `Flow Context` text is hidden.
7. Legacy result/status summary card under Calculate is hidden.
8. After Calculate, the first card shown under the buttons is the shared assistant status/proof card.
9. The capacity chart uses the shared Capacity Envelope renderer.
10. Chart footer chips use the shared capacity footer/icon helper and should not look like filled blue cards.
11. Recommendation References, Assistant Recommended Actions, Decision Schedule, export payload, snapshot, and summary-ready data remain intact.
12. Back/Continue CTAs render inside the main card row.
13. Storage Throughput Continue routes to VM Density.
14. Storage IOPS Continue routes to Storage Throughput.
15. GPU VRAM remains a specialty branch that routes to Summary.

## Tool modernization sequence

Use this sequence for each Compute tool.

### 1. Freeze and inspect

Run:

```powershell
cd E:\ScopedLabs
git status --short
git log -8 --oneline
```

Do not patch if the working tree is dirty unless the dirty files are the current lane.

### 2. Identify the owner before patching

Search the tool page, tool script, and shared assets before editing.

Examples:

```powershell
Select-String -SimpleMatch -Path .\tools\compute\<tool>\index.html,.\tools\compute\<tool>\script.js,.\assets\*.js,.\assets\*.css -Pattern `
  "computeAssistantCard",`
  "computeAssistantMount",`
  "data-compute-flow-actions",`
  "data-compute-continue-href",`
  "Recommendation",`
  "Decision Flags",`
  "Primary Risk"
```

Patch the owner, not the symptom.

### 3. Capacity chart promotion

If the tool needs a capacity/envelope chart, implement it in:

```text
assets/scopedlabs-compute-capacity-visuals.js
```

Required pattern:

- `build<Tool>CapacityEnvelopeSvg(result)`
- `render<Tool>CapacityEnvelope(options)`
- Export route through `buildCapacityEnvelopeSvg(config)`
- Tool page calls the shared renderer from its script
- Chart uses shared footer icon helper when footer chips exist

Do not place SVG chart logic directly in the page.

### 4. Footer chip promotion

Use the shared helper:

```text
computeCapacityFooterIconStyles()
buildCapacityFooterStat(...)
```

Do not make tool-local footer chip CSS unless the helper cannot support the tool. If chip appearance is wrong, patch `computeCapacityFooterIconStyles()` or extend the helper.

### 5. Assistant card promotion

Assistant cards must be rendered by:

```text
assets/scopedlabs-compute-assistant-contract.js
```

For a new tool, add a shared renderer:

```text
renderCompute<Tool>AssistantStatusCard(data)
```

Export it on:

```text
window.ScopedLabsComputeAssistant
```

Then call it from the tool script.

Correct tool script pattern:

```js
function render<Tool>SharedAssistant(flowPayload) {
  if (!els.assistantCard || !els.assistantMount) return;
  if (!window.ScopedLabsComputeAssistant || typeof window.ScopedLabsComputeAssistant.render<Tool>AssistantStatusCard !== "function") return;

  els.assistantMount.innerHTML = window.ScopedLabsComputeAssistant.render<Tool>AssistantStatusCard({
    outputs: flowPayload || {},
    workloadType: els.workloadType ? els.workloadType.value : "active workload"
  });

  els.assistantCard.hidden = false;
  els.assistantCard.removeAttribute("hidden");
  els.assistantCard.style.display = "";

  if (els.resultCard) {
    els.resultCard.hidden = true;
    els.resultCard.setAttribute("hidden", "");
    els.resultCard.style.display = "none";
  }
}
```

Do not keep page-local assistant renderers such as:

```text
data-storage-throughput-assistant-renderer-0705
data-storage-throughput-assistant-ram-parity-0705
```

### 6. CTA routing promotion

CTA label and click behavior belongs to:

```text
assets/scopedlabs-compute-shell-contract.js
```

Storage routing contract:

```text
Storage IOPS -> Storage Throughput
Storage Throughput -> VM Density
GPU VRAM -> Summary
```

Important lesson: changing only the button label is not enough. The click owner may still use:

```js
window.location.href = decision.nextHref;
```

Explicit next-tool CTAs need the shared shell owner to route before guided Summary overrides.

### 7. KB card handling

Do not suppress the KB card.

Bad pattern:

```text
data-storage-throughput-kb-card-suppressor-0705
data-storage-throughput-kb-card-suppressed
```

Acceptable behavior:

- KB card remains visible.
- If the small `Knowledge Base` pill must be hidden, do that in the shared shell/KB owner without hiding the card.

### 8. Active Workflow card placement

Active Workflow should appear:

```text
KB card
Active Workflow card
Planning Inputs card
```

Do not insert the Active Workflow card above the KB card.

If the card depends on runtime KB rendering from `help.js`, the shared shell contract should place the workflow card after the KB card once the KB card exists.

### 9. Planning Inputs title

Input card title should read:

```text
Planning Inputs
```

If the page uses `Inputs`, normalize it in the shared shell when possible, or change page markup if the heading is truly page-owned.

### 10. Export and report

If the tool has custom visuals/proof sections, the export payload should include:

- Visual section
- Recommendation References
- Assistant Recommended Actions
- Decision Schedule
- Engineering interpretation
- Report metadata fields
- User Tool Notes when applicable

Use per-tool export builders when needed. Avoid global export hacks.

### 11. Module map

Any new or promoted shared behavior must update:

```text
docs/scopedlabs-module-map.md
```

Then run:

```powershell
node .\scripts\audit-scopedlabs-module-map-v1.js
```

### 12. Promotion closeout audit

Before calling a tool done, run a tool-specific promotion closeout check that proves:

- Shared capacity chart owner exists.
- Shared assistant owner exists.
- Shared CTA owner exists.
- GPU Summary branch is not contaminated by core storage routing.
- Page-local workaround scripts/styles are removed.
- KB card is not suppressed.
- Module map includes the promoted ownership entries.

### 13. Commit pattern

Use small commits by lane.

Example:

```powershell
git add .\assets\scopedlabs-compute-capacity-visuals.js
git add .\tools\compute\storage-throughput\index.html

git commit -m "Darken Storage Throughput chart footer chips"
git push

git status --short
```

Do not commit temporary patch scripts. Remove any `scripts/tmp-*.js` before commit.

## Category closeout after all tools are modernized

After every tool in a category has been modernized, do not move to a new category until the category-level closeout pass is complete.

### 1. Update the category planner

Circle back to the category planner page and verify it knows the final state of every tool:

- Correct core tool order
- Correct optional/specialty branch order
- Correct Continue behavior for guided flow
- Correct Summary routing only when the applicable path is complete
- Correct specialty branch behavior, such as GPU VRAM going to Summary when it is the selected branch
- Correct labels, LEDs, branch status, and workload context
- Correct planner copy for what each tool validates

For Compute, the planner must reflect:

```text
CPU -> RAM -> Storage IOPS -> Storage Throughput -> VM Density -> Summary
Optional/specialty branches remain separate:
GPU VRAM -> Summary when selected after RAM
Power / Thermal
RAID Rebuild
Backup Window
NIC Bonding
```

### 2. Update the category summary

Circle back to the category Summary page after tool modernization. The Summary must read each completed tool contribution and render the final category-level proof stack.

Verify the Summary consumes:

- Tool result status
- Tool recommendation
- Decision flags
- Primary risk
- References
- Recommended actions
- Decision schedule
- Export payload
- Snapshot/ledger payload
- Carry-forward assumptions
- Branch/specialty status
- Missing or skipped tools

### 3. Build or update the tool ledger

Every tool in the category must be mapped in a category ledger. The ledger is the proof that each tool has a known role, owner, shared module pattern, CTA route, export behavior, and summary contribution.

Each ledger row should include:

| Field | Meaning |
| --- | --- |
| Tool slug | URL/tool identifier |
| Tool label | User-facing name |
| Path role | Core, optional, specialty branch, or summary |
| Previous tool | Back/previous step |
| Next tool | Normal Continue target |
| Summary behavior | When the tool should route to Summary |
| Shared visual owner | Capacity/chart/SVG module owner |
| Shared assistant owner | Assistant card/guidance module owner |
| Shared CTA owner | Flow/route module owner |
| Export owner | Export payload/report owner |
| Snapshot/ledger owner | Saved-result payload owner |
| KB status | KB visible, guide linked, no suppressed KB |
| Planner status | Represented in category planner |
| Summary status | Contributes to category summary |
| Audit status | Pass/fail/watch and audit script |
| Notes | Known exceptions or intentional special paths |

### 4. Ledger rule

No category is done until every tool is either:

```text
PASS_SHARED_OWNER
PASS_SPECIAL_PATH_DOCUMENTED
SKIP_INTENTIONAL_WITH_REASON
FAIL_NEEDS_REWORK
```

Do not leave tools in an undocumented gray state.

### 5. Required closeout commands

At category closeout, run the category planner/summary audits plus the module map audit.

For Compute, use or create audits that prove:

```text
- each Compute tool is listed in the tool ledger
- each core tool has the correct previous/next route
- each specialty branch has the correct Summary behavior
- the planner reflects the same route map as the ledger
- the Summary consumes every completed tool payload
- no page-local workaround remains where a shared owner exists
```

Always finish with:

```powershell
node .\scripts\audit-scopedlabs-module-map-v1.js
git status --short
```

### 6. Commit closeout

Category closeout commits should mention the category-level owner, not just a single page.

Example:

```powershell
git add .\docs\compute-tool-modernization-playbook-0706.md
git add .\docs\scopedlabs-module-map.md
git add .\docs\scopedlabs-pattern-promotion-ledger.md
git add .\tools\compute\index.html
git add .\tools\compute\summary\index.html
git add .\scripts\audit-compute-category-ledger-v1.js

git commit -m "Close Compute planner and ledger modernization"
git push

git status --short
```


## Current Storage Throughput closeout checklist

Before moving to the next Compute tool, verify these exact items:

- [ ] Storage Throughput page loads.
- [ ] KB card is visible.
- [ ] Knowledge Base pill above the KB title is removed or hidden.
- [ ] Active Workflow card appears directly below KB.
- [ ] Active Workflow eyebrow is green and not heavy-bold.
- [ ] Input card title is `Planning Inputs`.
- [ ] Legacy Flow Context is not visible.
- [ ] Result/status summary card is not visible under Calculate.
- [ ] Shared assistant card appears after Calculate and matches RAM structure.
- [ ] Chart footer chips are dark/transparent, not filled blue.
- [ ] Storage Throughput Continue routes to VM Density.
- [ ] Storage IOPS Continue routes to Storage Throughput.
- [ ] GPU VRAM Continue routes to Summary.
- [ ] Module map includes all promoted ownership entries.
- [ ] Working tree is clean.

## Current known passphrase

```text
SCOPEDLABS-COMPUTE-STORAGE-THROUGHPUT-PROMOTION-0706
```
