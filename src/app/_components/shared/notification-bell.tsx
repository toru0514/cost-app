"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Bell, Check, Trash2 } from "lucide-react"

type InAppNotification = {
  id: string
  title: string
  message: string
  notification_category: string
  read: boolean
  created_at: string
}

interface NotificationBellProps {
  isAuthenticated: boolean
}

export function NotificationBell({ isAuthenticated }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      const response = await fetch("/api/notifications/list?limit=20", {
        credentials: "include",
      })
      if (!response.ok) return

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotifications()
    // 30秒ごとに更新
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notification_ids: [notificationId] }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mark_all_read: true }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notification_ids: [notificationId] }),
      })

      if (response.ok) {
        const notification = notifications.find((n) => n.id === notificationId)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "たった今"
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString("ja-JP")
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* ドロップダウン */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg sm:w-96">
            <div className="flex items-center justify-between border-b p-3">
              <h3 className="font-semibold">通知</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <Check className="mr-1 h-3 w-3" />
                  すべて既読
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  読み込み中...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  通知はありません
                </div>
              ) : (
                <ul className="divide-y">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`group relative p-3 ${
                        notification.read ? "bg-background" : "bg-blue-50 dark:bg-blue-950/30"
                      }`}
                    >
                      <div className="pr-8">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="既読にする"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(notification.id)}
                          title="削除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t p-2">
              <a
                href="/settings"
                className="block rounded-md px-3 py-2 text-center text-sm text-muted-foreground hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                通知設定を開く
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
