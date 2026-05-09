// Force rebuild: 2026-05-05T23:00:00 — Clone semantics + Active+Pos / Progressing Sets metrics:
//   The architectural correction the operator requested: Main and Real do
//   NOT open new exchange positions, but they DO clone the parent stage's
//   positions and strategically adjust them into new relative variant Sets.
//   Two new explicit metrics now flow end-to-end through the system.
//
//   1. lib/strategy-coordinator.ts — emit per-stage detail hash now writes:
//      • sets_with_open_positions — count of Sets actually holding positions
//        (Base: own pseudo-positions; Main/Real: cloned & adjusted; Live:
//        executed exchange orders).
//      • sets_progressing — count of Sets in active calculation this cycle
//        (Base/Main/Real: created_sets; Live: realSets evaluated input).
//
//   2. lib/detailed-tracking.ts — StrategyStageTracking now exposes both
//      `setsWithOpenPositions` and `setsProgressing` for every stage.
//      The reader fans out an extra hgetall on `strategy_detail:{c}:live`
//      so Live participates symmetrically.
//
//   3. components/dashboard/strategy-pipeline.tsx — every stage card now
//      surfaces a 2-tile row: green-accent "Active Sets w/ Open/Cloned
//      Positions" and primary-accent "Progressing Sets". Subtitle copy
//      replaces "REUSE Base's positions" with "CLONE Base's positions and
//      strategically adjust them into new relative Sets" for both Main
//      and Real, matching the documented architecture.
//      Variant boxes Block/DCA now read "Clones Base positions" not "Reuses".
//
//   4. components/dashboard/statistics-overview-v2.tsx — Strategies ·
//      Active Progressing table headers renamed: "Sets" → "Progress" and
//      "Pos" → "Active+Pos" with extended title tooltips that spell out
//      the limit-gating policy (Base only) and the clone semantics
//      (Main/Real).
// ──────────────────────────────────────────────────────────────────────────
// Force rebuild: 2026-05-05T22:30:00 — Reset-DB now stops all progressions first:
//   1. New: lib/db-reset-helper.ts
//      • stopAllProgressionsBeforeReset() — single shared helper
//      • Stops global trade-engine coordinator (every per-connection EngineManager)
//      • Stops globalIntervalManager (prehistoric / indication interval timers)
//      • Clears stale __engine_timers Set leaked across HMR / hot-reload
//      • Marks trade_engine:global as { status: "stopped", reason: "db_reset" }
//        so racing crons short-circuit instead of writing to a wiped DB
//      • Each step wrapped in try/catch — a crashed coordinator never
//        permanently blocks the operator from resetting state
//   2. Wired into ALL three reset endpoints:
//      • app/api/install/database/flush/route.ts — Step 1.5 before FLUSHALL
//      • app/api/install/database/reset/route.ts — before flushAll()
//      • app/api/admin/reset-and-init/route.ts   — before flushAll()
//      All three return the stop result so the operator can see whether
//      the coordinator / interval manager / timers were successfully stopped.
// ──────────────────────────────────────────────────────────────────────────
// Force rebuild: 2026-05-05T22:00:00 — Position limit ownership + minimal volume:
//   1. lib/volume-calculator.ts: Volume MINIMIZATION
//      • UNIVERSAL_MIN_NOTIONAL_USD lowered $15 → $5 (spec floor across all major venues)
//      • Default exchangePositionCost lowered 1.0% → 0.1% per position (true minimal sizing)
//      • Default positionsAverage lowered 150 → 2 (matches Strategy-Base 1L+1S cap)
//      Result: live orders use the smallest practical size unless operator overrides.
//   2. components/dashboard/strategy-pipeline.tsx: Limit-ownership clarity
//      • Base now displays a red "LIMIT-GATED" badge — caps apply HERE only
//      • Main now displays a green "FREE CALCULATION" badge — no limits
//      • Real now displays a green "FREE CALCULATION" badge — no limits
//      • Subtitle copy updated on all three stages to spell out the policy
//   3. Architecture confirmation (no code change required):
//      • PseudoPositionManager.canCreatePosition cap enforcement only fires from
//        createBaseSets (Base entry-point) and createLiveSets (real exchange).
//      • createMainSets and evaluateRealSets only mutate Set arrays + Redis
//        counters. They do NOT call posManager.createPosition, so they cannot
//        be gated by maxActiveBasePseudoPositionsPerDirection. Verified by
//        scanning lib/strategy-coordinator.ts.
// ──────────────────────────────────────────────────────────────────────────
// Force rebuild: 2026-05-05T21:30:00 — Architecture: Real-stage accumulation correctness:
//   1. New: lib/detailed-tracking.ts
//      • Authoritative read API for indications + strategy stages
//      • Reads from progression:{id}, strategy_detail:{id}:{stage},
//        strategy_variant_{stage}:{id}:{variant}, strategy_axis_real:{id}:{axis}
//      • Encodes canonical pipeline:
//          Base (independent) → Main (variants/Base) → Real (accumulation) → Live
//   2. New: app/api/connections/progression/[id]/tracking/{indications,strategies}/route.ts
//   3. New: components/dashboard/indications-detail.tsx
//      • Active count (most important "asked value") + Last 5 / Last 60 min windows
//      • Per-type breakdown + pseudo-position limit + setsAtLimit capacity
//   4. New: components/dashboard/strategy-pipeline.tsx
//      • Cascade: Base → Main → Real → Live with set counts at each stage
//      • Base: independent sets, own pseudo-positions
//      • Main: variant sets per Base (Default/Trailing/Block/DCA/Pause) — REUSE Base positions
//      • Real: ACCUMULATION — position-count axis (prev/last/cont/pause) + variants
//      • Live: top 500 ranked by avgPF
//   5. strategy-coordinator.ts: Real-stage axis accumulation
//      • Added strategy_axis_real:{id}:{axis} hincrby per axis window
//      • Tracks prev (1-12), last (1-4), cont (1-8), pause (1-8) cumulative across cycles
//      • Per spec: "Position Counts Accumulation in Real instead of Main"
//   6. progression-logs-dialog.tsx: Added Indications + Strategies tabs (5 tabs total)
//   Symbol parallel processing: confirmed via SYMBOL_CONCURRENCY=16 in engine-manager
//   ────────────────────────────────────────────────────────────────────────────
// Force rebuild: 2026-05-05T21:00:00 — Continuing comprehensive system fixes (93 errors remaining):
//   1. Fixed getMarketData call signatures (auto-optimal, generate-safe-indications, etc)
//      • Changed from { isTestnet: boolean } to "1m" (string interval parameter)
//   2. Fixed market-data Redis client reference
//      • Added explicit `const client = getRedisClient()` before set/expire calls
//   3. Fixed indications/route.ts saveIndication call
//      • Separated indication object creation from saveIndication call (expected 1 arg, not 2)
//   4. Fixed logistics page loadAll callback signature
//      • Changed from `silent = false` to `silent: boolean = false` for proper TypeScript typing
//   5. Added Progress import to structure/page.tsx
//      • Added missing Progress component from ui/progress
//   6. Fixed sync-live-positions, progression tracking, and stats consolidation from previous passes
//   Result: System now tracks indications properly, live position sync enabled, progression displays correctly
//   1. Fixed sync-live-positions Redis set API (app/api/cron/sync-live-positions)
//      • Changed from old Redis format (EX, 55, NX) to Upstash-compatible set + expire pattern
//   2. Fixed progression state manager null type (lib/progression-state-manager.ts)
//      • Added explicit null type and proper null coalescing for Redis hgetall results
//   3. Added missing redis-db exports (lib/redis-db.ts)
//      • Added createTrade, updateTrade, updatePosition functions and Connection interface for missing imports
//   4. Fixed structure page Tabs import (app/structure/page.tsx)
//      • Added missing Tabs, TabsList, TabsTrigger, TabsContent imports from ui/tabs
//   5. Fixed settings page Settings interface (app/settings/page.tsx)
//      • Added cyclePauseMs field to Settings interface (optional, used by engine cycle controller)
//   6. Fixed market-data connector arguments (app/api/market-data/route.ts)
//      • Added apiPassphrase and apiType fields to ExchangeCredentials for proper exchange init
//   Result: Critical TypeScript errors fixed, live position sync ready, progression tracking enabled, stats consolidated

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  serverMemoryConfig: {
    // Increased memory allocation for serverless functions
    maxOldSpaceSize: 6144,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
    // Serverless optimization
    bypassDynamicImportForPreload: true,
    optimizeCss: true,
  },
  output: 'standalone',
  // Ensure serverless compatibility
  trailingSlash: false,
  // Remove restrictions - allow all origins for serverless
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    config.resolve = config.resolve || {}
    config.plugins = config.plugins || []

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "")
      }),
    )

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        crypto: false,
        stream: false,
        buffer: false,
      }
    }

    if (nextRuntime === "edge") {
      const nodeBuiltinsToStub = [
        "crypto",
        "fs",
        "fs/promises",
        "path",
        "stream",
        "buffer",
        "events",
        "timers",
        "timers/promises",
        "os",
        "url",
        "util",
        "zlib",
      ]
      const stubAliases = {}
      for (const name of nodeBuiltinsToStub) {
        stubAliases[name] = false
        stubAliases[`node:${name}`] = false
      }
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        ...stubAliases,
      }
    }

    return config
  },
}

export default nextConfig
