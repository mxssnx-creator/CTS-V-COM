"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"

interface User {
  id: number
  username: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: 1,
    username: "Administrator",
    email: "mxssnx@gmail.com",
    role: "admin",
  })
  const [token, setToken] = useState<string | null>("admin-token-disabled")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setUser({
      id: 1,
      username: "Administrator",
      email: "mxssnx@gmail.com",
      role: "admin",
    })
    setToken("admin-token-disabled")
    return { success: true }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    setUser({
      id: 1,
      username: "Administrator",
      email: "mxssnx@gmail.com",
      role: "admin",
    })
    setToken("admin-token-disabled")
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    // User remains logged in as admin
  }, [])

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  }), [user, token, login, register, logout, isLoading])

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
