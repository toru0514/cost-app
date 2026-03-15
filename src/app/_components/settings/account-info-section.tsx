"use client"

import { useAuth } from "@/lib/auth"
import { Mail, User } from "lucide-react"

export function AccountInfoSection() {
  const { state: authState } = useAuth()

  if (authState.status !== "authenticated") {
    return null
  }

  const user = authState.user

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">アカウント情報</h2>
      <div className="space-y-3">
        {user?.name && (
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{user.name}</span>
          </div>
        )}
        {user?.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{user.email}</span>
          </div>
        )}
      </div>
    </div>
  )
}
