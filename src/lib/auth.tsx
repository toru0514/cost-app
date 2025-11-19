"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import { supabaseClient } from "./supabase-client"

type LoadingState = { status: "loading" }
type GuestState = { status: "guest" }
type AuthenticatedState = {
  status: "authenticated"
  user: {
    id: string
    email: string
    name?: string
  }
}

export type AuthState = LoadingState | GuestState | AuthenticatedState

type AuthContextValue = {
  state: AuthState
  login: (payload: { email: string; password: string }) => Promise<void>
  signup: (payload: { email: string; password: string; name: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" })
  const guestDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commitState = useCallback((next: AuthState) => {
    if (guestDelayRef.current) {
      clearTimeout(guestDelayRef.current)
      guestDelayRef.current = null
    }
    if (next.status === "guest") {
      guestDelayRef.current = setTimeout(() => {
        setState({ status: "guest" })
        guestDelayRef.current = null
      }, 1000)
    } else {
      setState(next)
    }
  }, [])

  const ensureSheetSettings = useCallback(async (userId: string) => {
    const { data, error } = await supabaseClient
      .from("sheet_settings")
      .select("spreadsheet_id")
      .eq("user_id", userId)
      .maybeSingle()
    if (error && error.code !== "PGRST116") {
      console.error("Failed to load sheet settings", error)
      return
    }
    if (data?.spreadsheet_id) {
      return
    }
    const {
      data: { session },
    } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) {
      return
    }
    try {
      const response = await fetch("/api/import/create-sheet", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.error("Failed to auto-create sheet", payload.error)
      }
    } catch (error) {
      console.error("Failed to auto-create sheet", error)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("user_id", userId).single()
    if (error && error.code !== "PGRST116") {
      console.error("Failed to fetch profile", error)
    }
    const name = data?.name ?? email
    commitState({ status: "authenticated", user: { id: userId, email, name } })
    await ensureSheetSettings(userId)
  }, [commitState, ensureSheetSettings])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email ?? "")
      } else {
        commitState({ status: "guest" })
      }
    }
    void init()
    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session?.user) {
        void fetchProfile(session.user.id, session.user.email ?? "")
      } else {
        commitState({ status: "guest" })
      }
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
      if (guestDelayRef.current) {
        clearTimeout(guestDelayRef.current)
        guestDelayRef.current = null
      }
    }
  }, [fetchProfile, commitState])

  const ensureProfile = useCallback(async (userId: string, name: string, email: string) => {
    const { error } = await supabaseClient
      .from("profiles")
      .upsert({ user_id: userId, name: name || email, email }, { onConflict: "user_id" })
    if (error) {
      console.error("Failed to upsert profile", error)
    }
  }, [])

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const { error, data } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        throw error
      }
      if (data.user) {
        await ensureProfile(data.user.id, data.user.user_metadata?.name ?? "", data.user.email ?? email)
      }
    },
    [ensureProfile]
  )

  const signup = useCallback(
    async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const { error, data } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })
      if (error) {
        throw error
      }
      if (data.user) {
        await ensureProfile(data.user.id, name, data.user.email ?? email)
      }
    },
    [ensureProfile]
  )

  const logout = useCallback(async () => {
    await supabaseClient.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      logout,
      signup,
    }),
    [state, login, logout, signup]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
