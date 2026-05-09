"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react"

interface ExchangeContextType {
  selectedExchange: string | null
  setSelectedExchange: (exchange: string | null) => void
  selectedConnectionId: string | null
  setSelectedConnectionId: (connectionId: string | null) => void
  selectedConnection: any | null
  activeConnections: any[]
  loadActiveConnections: (options?: { force?: boolean }) => Promise<void>
  isLoading: boolean
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: ReactNode }) {
  const [selectedExchange, setSelectedExchangeState] = useState<string | null>(null)
  const [selectedConnectionId, setSelectedConnectionIdState] = useState<string | null>(null)
  const [activeConnections, setActiveConnections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const loadingRef = useRef(false)
  const lastLoadRef = useRef(0)
  const selectedConnectionIdRef = useRef<string | null>(null)
  const LOAD_COOLDOWN = 10000

  const loadActiveConnections = useCallback(async (options?: { force?: boolean }) => {
    if (loadingRef.current) return
    if (!options?.force && Date.now() - lastLoadRef.current < LOAD_COOLDOWN) return

    loadingRef.current = true
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings/connections", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      if (response.ok) {
        const data = await response.json()
        const connections = data.connections || []
        
        const toBoolean = (v: unknown) => v === true || v === 1 || v === "1" || v === "true"

        const mainConnections = connections.filter((c: any) => {
          const isInserted = toBoolean(c.is_active_inserted) || toBoolean(c.is_dashboard_inserted) || toBoolean(c.is_assigned)
          const isDashboardActive = toBoolean(c.is_enabled_dashboard)
          return isInserted || isDashboardActive
        })
        
        setActiveConnections(mainConnections)
        
        if (mainConnections.length > 0 && !selectedConnectionIdRef.current) {
          const preferred = mainConnections.find((c: any) => (c.exchange || "").toLowerCase() === "bingx") || mainConnections[0]
          setSelectedConnectionIdState(preferred.id)
          setSelectedExchangeState(preferred.exchange || null)
          selectedConnectionIdRef.current = preferred.id
        }
      }
    } catch (error) {
      console.error("[ExchangeContext] Failed to load connections:", error)
    } finally {
      loadingRef.current = false
      setIsLoading(false)
      lastLoadRef.current = Date.now()
    }
  }, [])

  useEffect(() => {
    loadActiveConnections()

    const handleConnectionChange = () => {
      loadActiveConnections({ force: true })
    }

    if (typeof window !== "undefined") {
      window.addEventListener("connection-toggled", handleConnectionChange)
      window.addEventListener("connection-removed", handleConnectionChange)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("connection-toggled", handleConnectionChange)
        window.removeEventListener("connection-removed", handleConnectionChange)
      }
    }
  }, [loadActiveConnections])

  const setSelectedExchange = useCallback((exchange: string | null) => {
    setSelectedExchangeState(exchange)
    const matching = activeConnections.find((connection: any) => connection.exchange === exchange)
    if (matching) {
      setSelectedConnectionIdState(matching.id)
      selectedConnectionIdRef.current = matching.id
    } else {
      setSelectedConnectionIdState(null)
      selectedConnectionIdRef.current = null
    }
  }, [activeConnections])

  const setSelectedConnectionId = useCallback((connectionId: string | null) => {
    setSelectedConnectionIdState(connectionId)
    selectedConnectionIdRef.current = connectionId
    const matching = activeConnections.find((connection: any) => connection.id === connectionId)
    setSelectedExchangeState(matching?.exchange || null)
  }, [activeConnections])

  const selectedConnection = activeConnections.find((connection: any) => connection.id === selectedConnectionId) || null

  const contextValue = useMemo<ExchangeContextType>(() => ({
    selectedExchange,
    setSelectedExchange,
    selectedConnectionId,
    setSelectedConnectionId,
    selectedConnection,
    activeConnections,
    loadActiveConnections,
    isLoading,
  }), [
    selectedExchange,
    selectedConnectionId,
    selectedConnection,
    activeConnections,
    loadActiveConnections,
    isLoading,
    setSelectedExchange,
    setSelectedConnectionId,
  ])

  return (
    <ExchangeContext.Provider value={contextValue}>
      {children}
    </ExchangeContext.Provider>
  )
}

export function useExchange() {
  const context = useContext(ExchangeContext)
  if (context === undefined) {
    throw new Error("useExchange must be used within an ExchangeProvider")
  }
  return context
}
