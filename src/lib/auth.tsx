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
  resetPassword: (email: string) => Promise<void>
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

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("user_id", userId).single()
    if (error && error.code !== "PGRST116") {
      console.error("Failed to fetch profile", error)
    }
    const name = data?.name ?? email
    commitState({ status: "authenticated", user: { id: userId, email, name } })
  }, [commitState])

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
    const { data: subscription } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      // TOKEN_REFRESHED only refreshes the JWT silently — the user identity doesn't change.
      // Skipping it avoids unnecessary authState object re-creation, which would otherwise
      // trigger a full DB reload in useAppData and risk a race condition with in-flight saves.
      if (event === "TOKEN_REFRESHED") return
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

  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      throw new Error("メールアドレスを入力してください。")
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      normalizedEmail,
      redirectTo ? { redirectTo } : undefined
    )
    if (error) {
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      logout,
      signup,
      resetPassword,
    }),
    [state, login, logout, signup, resetPassword]
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
