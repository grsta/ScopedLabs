# ScopedLabs Snapshot Engine

## Status

The account-backed snapshot engine MVP is working and should be treated as a reusable factory-style engine for future niche tool sites.

## Core Files

- /assets/export.js
- /account/index.html
- Cloudflare Worker snapshot endpoints
- Supabase table: tool_snapshots

## Worker Endpoints

- POST /api/snapshots/save
- GET /api/snapshots/list
- GET /api/snapshots/:id
- DELETE /api/snapshots/:id

## Frontend Responsibilities

/assets/export.js handles:

- export/report card behavior
- printable report generation
- Save Snapshot behavior
- authenticated account-backed saves
- local/browser fallback when signed out or remote save fails
- report payload creation

Snapshot payloads should include:

- report title
- project/client/prepared-by fields
- custom notes
- category
- tool slug/name
- status
- summary
- inputs
- outputs/results
- engineering interpretation/guidance
- chart snapshot when available

## Account Viewer

/account/index.html handles:

- signed-in account state
- unlocked category display
- saved tool report list
- snapshot detail view
- snapshot deletion

## Supabase

Primary table: tool_snapshots

Expected behavior:

- RLS enabled
- users can only access their own snapshots
- snapshots are tied to the authenticated Supabase user

## Save Snapshot Flow

1. User signs in.
2. User calculates a tool.
3. Export card becomes available.
4. User clicks Save Snapshot.
5. export.js builds the report payload.
6. Frontend sends payload to POST /api/snapshots/save.
7. Worker verifies the Supabase session.
8. Worker inserts the snapshot into tool_snapshots.
9. Account page can list, view, and delete the saved report.

## Factory Reuse Notes

To duplicate this system into another niche tool site, carry over:

- /assets/export.js
- account page snapshot viewer pattern
- Cloudflare Worker snapshot endpoints
- Supabase snapshot table
- RLS policies
- tool page export config pattern

Then customize:

- site name
- category labels
- tool slugs
- report wording
- account page copy
- Worker origin/environment variables
- Supabase project/table names if needed

## Current Known Notes

- Compute and Infrastructure have passed shared export rollout.
- Access Control still has older/manual export behavior and may need careful migration later.
- Temporary rollout scripts were removed after the snapshot MVP was confirmed working.
- Cache busting around the MVP was approximately account acct-504 and export shared-export-005.

## Final Validation Checklist

1. Sign in.
2. Open a tool with shared export enabled.
3. Calculate results.
4. Save Snapshot.
5. Open /account/.
6. Confirm the saved report appears.
7. View snapshot detail.
8. Delete snapshot.
9. Confirm deleted snapshot disappears.
10. Test signed-out behavior and confirm no private account snapshots are exposed.
