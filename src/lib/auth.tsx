"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

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

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("user_id", userId).single()
    if (error && error.code !== "PGRST116") {
      console.error("Failed to fetch profile", error)
    }
    const name = data?.name ?? email
    setState({ status: "authenticated", user: { id: userId, email, name } })
  }, [])

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
        setState({ status: "guest" })
      }
    }
    void init()
    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session?.user) {
        void fetchProfile(session.user.id, session.user.email ?? "")
      } else {
        setState({ status: "guest" })
      }
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [fetchProfile])

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
