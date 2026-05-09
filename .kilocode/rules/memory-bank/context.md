# Context

## 2026-05-09 - Fixed Doubled Progression (Non-Unique Frame Counts)
- **Root cause**: All THREE processors (indication, strategy, realtime) independently incremented `frames_processed` on every tick, causing multiplied/doubled counts when running concurrently at different cadences
- **Impact**: Progression counters showed ~3x more frames than actual ticks, appearing unstable and non-unique
- **Fix**: Removed `frames_processed` increment from strategy and realtime processors - only indication processor now increments this counter, ensuring unique progression per connection
- **Result**: `frames_processed` now accurately represents cumulative tick count, unique to each connection

## 2026-05-09 - Fixed Historical Progress Stuck (Infinite Retry Loops)
- **Root cause**: When `loadHistoricalDataRangeForSymbol()` returned empty data, `logSync` was called with status "partial" which doesn't mark the range as synced in `DataSyncManager`
- **Impact**: Missing ranges were never marked as processed, causing infinite retry loops and historical progress stuck at same percentage
- **Fix**: Changed to always use "success" status in `logSync` so ranges are properly marked as synced, preventing infinite retry loops
- **Result**: Historical progress completes successfully even with empty data ranges

## 2026-05-09 - Fixed Live Positions Not Closing When Exchange Position Disappears
- **Root cause**: `syncWithExchange()` in `live-stage.ts` did not detect when positions with `executedQuantity > 0` no longer existed on the exchange (SL/TP hit, manual close, liquidation)
- **Previous behavior**: Positions stayed open until the next `reconcileLivePositions` cron cycle (up to 1 minute delay)
- **Fix**: Added `else if` branch in `syncWithExchange()` (line 2545) to immediately detect and close positions where `getPosition()` returns null but `executedQuantity > 0`
- **Additional fix**: Added moved marker check and index list manipulation (lrem/lpush/ltrim) to prevent double-counting with reconcile cycle
- **Impact**: Live positions now close immediately when control orders execute or exchange closes them externally, instead of waiting up to 60 seconds

## 2026-05-09 - Fixed Main Connection Stability During Progression
- **Root cause**: Progression API phase detection at lines 137-183 used `isActiveInserted` and `isEnabled` checks that caused phase jitter
- **Issues**:
  1. `isEnabled` checked `is_enabled` field which is separate from dashboard enable state
  2. Phase logic forced `phase="idle"` when `!isEnabled || (!isActiveInserted && !isInserted)`
  3. Engine running check used `isActiveInserted` instead of stable `isMainEnabled` check
- **Fix**:
  1. Added `isAssigned` and `isMainEnabled` (assigned + dashboard-enabled) state tracking
  2. Changed phase detection to use `!isAssigned` for idle, `!isMainEnabled` for ready state
  3. Updated `engineRunning` check to use `isMainEnabled && isAssigned` instead of `isActiveInserted`
- **Impact**: Main Connection now stays stable at "ready" state when assigned but not enabled, and transitions smoothly to processing phases during engine operation

## 2026-05-09 - Fixed Premature Engine Startup in QuickStart
- **Root cause**: Multiple issues in quick-start/route.ts:
  1. `startAll()` and `refreshEngines()` were called unconditionally, starting engines for ALL "assigned+enabled" connections
  2. QuickStart set `is_enabled_dashboard: "1"` and `is_active: "1"`, making the connection qualify as "enabled" via `getAssignedAndEnabledConnections()` check
  3. The auto-start one-shot sweep (`trade-engine-auto-start.ts`) would start the engine via `startMissingEngines()` since `isConnectionMainProcessing()` returned true
- **Fix**: 
  1. Removed `startAll()` and `refreshEngines()` calls
  2. Removed `is_enabled_dashboard: "1"` and `is_active: "1"` from updated connection state - connection is now only assigned (`is_assigned: "1"`), not enabled
  3. Engine only starts when `isAssigned && isMainEnabled` is true, ensuring explicit user enable via Main Slider
- **Impact**: Connection and Progression now only start after user explicitly enables via Main Slider, preventing premature processing

## 2026-05-09 - Sidebar Collapsible Mode Fixed
- Changed `collapsible="icon"` to `collapsible="offcanvas"` in `components/app-sidebar.tsx:151` to fix sidebar not hiding when collapsed
- The `icon` mode only shrinks the sidebar width, while `offcanvas` slides it off-screen completely

## 2026-05-09 - Serverless Deployment with 6GB Memory
- Configured fully serverless deployment on Vercel with **6GB memory per function** and **no restrictions**
- Updated `vercel.json`: increased memory from 3008MB → 6144MB, maxDuration from 300s → 900s (15min)
- Updated `next.config.mjs`: added `serverMemoryConfig.maxOldSpaceSize: 6144`, `output: 'standalone'`, CORS headers for all origins
- Updated `package.json`: dev/start scripts use `--max-old-space-size=6144` (was 4096)
- Updated `Dockerfile`: all build/run steps use 6GB memory limit, non-root user, standalone output
- Updated `docker-compose.yml`: added memory limits (6GB app, 2GB Redis) and proper resource reservations
- Updated `vercel-deploy.sh`: automated serverless deployment with 6GB memory configuration
- Added `SERVERLESS_DEPLOYMENT.md`: comprehensive guide for serverless architecture, memory tuning, monitoring
- Fixed `tsconfig.json`: removed invalid `ignoreDeprecations` option causing build errors
- Deployment now supports: unlimited serverless functions, 900s timeouts, global CDN, automatic SSL, Redis KV persistence
- All API routes now have 6GB RAM allocation, enabling heavy data processing without restrictions
- Created production-ready serverless configuration for both Vercel and Docker deployments

## 2026-03-31
- Updated QuickStart engine setup to explicitly assign and enable connection state during quickstart.
- QuickStart now writes assignment/activation flags (`is_active_inserted`, `is_dashboard_inserted`, `is_enabled_dashboard`, `is_assigned`, `is_active`) before startup checks.
- Updated quickstart readiness/selection checks to rely on Main Connections assignment (`is_assigned`) for startup flow eligibility.
- Updated quickstart user-facing wording to refer to Main Connections (assignment-based) instead of Active panel terminology.
- Updated quickstart runtime variable naming to use "main" wording for main-connection enablement checks.
- Removed "quickstart_engine_not_started" passive branch so quickstart attempts engine startup directly when credentials/testing pass.
- Updated `nextSteps` messaging to reflect automatic assignment/enabling behavior.
- Fixed dashboard shell/header layout to remove duplicate sidebar trigger and normalize mobile trigger layering.
- Refactored exchange selector UX: removed refresh button, switched to automatic forced load on access, no "Exchange:" label line break, and added dedicated sidebar variant styling.
- Reduced outer wrapper padding on dashboard root to prevent double-wrapping/outer-spacing issues.
- Updated `npm test` to kill previous process on port `3001` and enforce a 90-second timeout.
- Removed duplicate route-group pages under `app/(main)` to avoid Next.js traced-file copy failures for `page_client-reference-manifest.js` during standalone/deployment builds.
- Fixed React runtime crash (`Minified React error #321`) by removing invalid hook calls inside `useEffect` in live-trading/strategies/indications pages and subscribing via hooks at top level.
- Hardened SSE hook behavior to safely skip empty connection IDs and correctly recreate client subscriptions per connection change.
- Adjusted shell/header spacing with light paddings and non-overflowing trigger placement to keep menu-button/title alignment stable across pages.
- Updated top-layer style to align with reference layout pattern (header-level `SidebarTrigger` + separator), removing shell-overlay trigger so header/title/menu alignment is consistent across pages using `PageHeader`.
- Fixed appearance switching effectiveness by mounting `StyleInitializer` globally and adding concrete CSS theme/style variant rules in `app/globals.css` so theme/style toggles visibly affect UI.
- Removed the top Global Trade Coordinator info box from the main dashboard as requested.
- Improved monitoring/services/modules status reliability by normalizing boolean-like API payload values (`"true"/"false"`, `"online"/"offline"`, `1/0`) before rendering status badges.
- Re-enabled trade-engine synchronization in `trade-engine-auto-start` monitor by invoking coordinator `refreshEngines()` whenever global state is running (recovers missed toggles/restarts).
- Expanded `/api/trade-engine/diagnostic` with runtime/global-state/data-coverage details (market data, prehistoric, engine-state keys, coordinator active engines) for deeper engine troubleshooting.
- Fixed `/api/trade-engine/functional-overview` to use assigned+enabled connection filtering and robustly parse strategy-set counts from both `strategies:*` and `strategy_set:*` key formats.
- Enforced hierarchy outputs for strategy/pseudo summaries in detailed logs (`base` much higher than `main`, `real` below `main`) and exposed raw counts for debugging.
- Updated strategy set defaults and thresholds so Base produces substantially more candidates than Main, while Real remains the strictest/lowest volume tier.

- Added backward-compatible `PUT` handler alias for `/api/settings/connections/{id}/toggle-dashboard` so legacy clients no longer fail with 405 when enabling/disabling processing.
- Corrected complete-workflow API documentation to list `POST /api/settings/connections/{id}/toggle-dashboard` as the canonical toggle endpoint.
- Added high-performance sync-range coordination in `DataSyncManager` with merged coverage intervals and true missing-range detection, enabling partial backfills instead of full reloads.
- Updated symbol data loading to fetch/store only missing market-data ranges, append range metadata, and keep incremental sync logs for faster repeated runs.
- Integrated preset historical loading with batched symbol coordination, `DataSyncManager` range checks, per-range sync logging, and progression events for large-scale backfill visibility.
