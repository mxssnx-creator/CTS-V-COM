import { NextResponse } from "next/server"
import { ensureDefaultExchangesExist } from "@/lib/default-exchanges-seeder"
import { initRedis, getAllConnections } from "@/lib/redis-db"
import { initProgressManagerSystem } from "@/lib/engine-progress-manager"

function toBoolean(value: unknown): boolean {
  return value === true || value === "1" || value === "true"
}

export async function GET() {
  console.log("[v0] /api/init: System initialization starting...")

  try {
    await initRedis()
    console.log("[v0] /api/init: Redis initialized")

    // Seed progress manager registry from Redis to restore in-memory state on hot reload
    await initProgressManagerSystem()
    console.log("[v0] /api/init: Progress manager system seeded")

    const seedResult = await ensureDefaultExchangesExist()
    if (!seedResult.success) {
      console.warn("[v0] /api/init: Warning - could not seed default exchanges:", seedResult.error)
    }

    const allConnections = await getAllConnections()
    const enabledConnections = allConnections?.filter((c) => toBoolean(c.is_enabled)) || []
    const predefinedConnections = allConnections?.filter((c) => toBoolean(c.is_predefined)) || []

    console.log("[v0] /api/init: Found", allConnections?.length || 0, "connections,", enabledConnections.length, "enabled,", predefinedConnections.length, "predefined")

    return NextResponse.json({
      success: true,
      message: "System initialized successfully",
      initializedAt: new Date().toISOString(),
      connections: {
        total: allConnections?.length || 0,
        enabled: enabledConnections.length,
        predefined: predefinedConnections.length,
      },
      defaultExchangesSeeded: seedResult.success,
    })
  } catch (error) {
    console.error("[v0] /api/init: Failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "System initialization failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}