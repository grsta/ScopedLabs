# SCOPEDLABS-TOOL-MODERNIZATION-STRATEGY-0617

Checkpoint anchor: **SCOPEDLABS-TOOL-MODERNIZATION-STRATEGY-0617**

Date: 2026-06-17
Repo: E:\ScopedLabs
Site: scopedlabs.com

---

## Strategy reset

The user decided to step back from one-off RAM visual patching and create a repo-level modernization strategy first.

Reason:
- Many tools started as basic calculators.
- ScopedLabs is moving toward planning workflows.
- Tools may need deeper inputs, assistant reasoning, export/report sections, carry-forward fields, and visual families.
- The user does not want to revisit the same tools repeatedly for days just to modernize them.

---

## New preferred workflow

Audit and map every tool by category before wiring more modules.

For each tool, document:

- What it currently does.
- Current inputs.
- Current outputs.
- Existing formulas/decision logic.
- Current visual/export/snapshot/pipeline/assistant behavior.
- Missing planner inputs.
- Missing domain factors.
- Needed visual family.
- Needed shared modules.
- Needed assistant/export/snapshot/pipeline changes.

Then wire the shell and selected modules once for that tool, run audits, live review, commit/lock, and move on.

---

## Universal shell, specific modules

ScopedLabs should have:

- A universal tool shell contract.
- Category-level module families.
- Tool-level contracts declaring which modules are needed.

The universal shell should not force every tool into the same visual style.

Visuals should be grouped by reusable family.

---

## Visual family rule

One module per reusable visual family, not one module per tool.

Examples:
- Compute capacity envelope.
- Compute IOPS/latency curve.
- Compute throughput envelope.
- Compute resource/icon diagram.
- Physical Security CAD layouts.
- Access Control door/panel/lock diagrams.
- Access Control assistant proof visuals.

---

## RAM/CPU lesson

RAM should not be patched page-locally to imitate CPU.

If RAM and CPU share the same capacity-envelope visual family, the accepted CPU style should be promoted into the shared Compute capacity visual module, then CPU/RAM should consume that shared family with different labels/units.

---

## Next recommended lane

Create and commit documentation/audit foundation:

- docs/scopedlabs-tool-modernization-master-plan.md
- docs/scopedlabs-category-visual-family-map.md
- scripts/audit-scopedlabs-tool-planning-profile-v1.js

Then use Compute as the proof category.

---

## Current local warning

At the time this strategy was created, the user had one modified file:

```text
 M tools/compute/ram-sizing/index.html
```

Do not accidentally mix unrelated RAM shell recovery changes with the strategy documentation unless intentionally committing them together.

## Added Guardrail: Read-Only Audit Before Wiring

The user clarified that audits should not immediately trigger page rewrites.

The correct workflow is:

1. Read/audit the tool/category.
2. Discuss what the tool needs.
3. Decide required planner inputs, modules, assistant behavior, export/snapshot/pipeline behavior, visual family, and icon needs.
4. Document the decision in the category planning profile.
5. Then wire the shell and selected modules.
6. Run audits/live review.
7. Commit and lock.

Also include icon/graphics decisions in the planning profile.

For every tool, decide whether it uses:

- Existing shared icon.
- New shared icon.
- Existing visual family.
- New visual family.
- No visual/icon with documented reason.

Do not create page-local one-off icons or graphics when the asset may belong in a shared library.

## Added Guardrail: Layout Consistency

The user clarified that category/tool pages may have small differences, but the overall layout rhythm should remain consistent across categories.

Future modernization should preserve consistent shells for:

- Category planner/command pages.
- Individual tool pages.
- Category summary/master assistant pages.

Category-specific modules, tool-specific planner sections, and different visual families are allowed when needed.

However, future agents should not redesign every page independently.

A page should only break the standard layout when it is intentionally marked SPECIAL_PATH or SKIP_SPECIAL_PATH with a written reason.

## Added Guardrail: Profile Approval And Data Contract First

The user locked in additional modernization rules:

- Profile Approval Gate.
- Data Contract First.
- Tool Lock Checklist.
- No Mixed Commits.
- Module Maturity Status.

Before modifying a tool page, create or update its planning profile and data contract.

The intended sequence is:

1. Read.
2. Profile.
3. Discuss.
4. Approve.
5. Plan modules.
6. Implement.
7. Audit.
8. Live review.
9. Lock.

Do not start with page patches.

A tool is not complete until planner inputs, data contract, module wiring, visual/icon decision, assistant/export/snapshot/pipeline decisions, summary/master assistant publishing, audits, live review, named WATCH/SKIP items, commit, and clean working tree are addressed.

Shared modules should be labeled as:

- PROPOSED
- PROOF
- ACTIVE
- LOCKED
- LEGACY
- DEPRECATED

Keep commits scoped to one intentional lane.
