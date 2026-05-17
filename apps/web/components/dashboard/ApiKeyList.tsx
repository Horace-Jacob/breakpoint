"use client"

import type { ApiKey } from "@breakpoint/lib"
import { Clock, KeyRound, Loader2, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { EmptyState } from "./EmptyState"
import { CreateKeyModal } from "./CreateKeyModal"
import { RevokeKeyPopover } from "./RevokeKeyPopover"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

interface ApiKeyListProps {
  initialKeys: ApiKey[]
}

type KeyState = "active" | "grace" | "revoked"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatRelativeTime(value: string) {
  const now = Date.now()
  const then = new Date(value).getTime()
  const seconds = Math.round((then - now) / 1000)

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ]

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  for (const [unit, divisor] of units) {
    if (Math.abs(seconds) >= divisor || unit === "minute") {
      return rtf.format(Math.round(seconds / divisor), unit)
    }
  }

  return "just now"
}

function getKeyState(key: ApiKey, nowMs: number): KeyState {
  if (!key.is_active) {
    return "revoked"
  }
  if (key.revoked_at && key.grace_expires_at && new Date(key.grace_expires_at).getTime() > nowMs) {
    return "grace"
  }
  return "active"
}

function formatGraceCountdown(graceExpiresAt: string, nowMs: number) {
  const diffMs = new Date(graceExpiresAt).getTime() - nowMs
  if (diffMs <= 0) {
    return "Expired"
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return "< 1m"
}

export function ApiKeyList({ initialKeys }: ApiKeyListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())
  const [cancelLoadingByKeyId, setCancelLoadingByKeyId] = useState<Record<string, boolean>>({})
  const router = useRouter()

  const keys = useMemo(() => initialKeys.filter((key) => key.is_active), [initialKeys])
  const hasGraceKeys = useMemo(() => keys.some((key) => getKeyState(key, nowMs) === "grace"), [keys, nowMs])

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!hasGraceKeys) {
      return
    }

    const hasExpiredGraceKey = keys.some((key) => {
      if (!key.is_active || !key.revoked_at || !key.grace_expires_at) {
        return false
      }
      return new Date(key.grace_expires_at).getTime() <= nowMs
    })

    if (hasExpiredGraceKey) {
      router.refresh()
    }
  }, [hasGraceKeys, keys, nowMs, router])

  const handleCancelRevoke = async (keyId: string) => {
    setCancelLoadingByKeyId((prev) => ({ ...prev, [keyId]: true }))
    try {
      const response = await fetch(`/api/keys/${keyId}/cancel-revoke`, { method: "PATCH" })
      if (!response.ok) {
        throw new Error("Failed to cancel key revocation")
      }
      router.refresh()
    } finally {
      setCancelLoadingByKeyId((prev) => ({ ...prev, [keyId]: false }))
    }
  }

  if (keys.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">API Keys</h1>
          <Button onClick={() => setCreateOpen(true)} className="transition-colors duration-150">
            <Plus className="size-4" />
            Create API Key
          </Button>
        </div>

        <EmptyState
          icon={KeyRound}
          heading="No API keys yet"
          description="Create an API key to authenticate your n8n pipeline with Breakpoint."
          actionLabel="Create your first key"
          actionDisabled={false}
          onAction={() => setCreateOpen(true)}
          actionIcon={<Plus className="w-4 h-4" />}
        />

        <CreateKeyModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => router.refresh()}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">API Keys</h1>
        <Button onClick={() => setCreateOpen(true)} className="transition-colors duration-150">
          <Plus className="size-4" />
          Create API Key
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const keyState = getKeyState(key, nowMs)
              const revoked = keyState === "revoked"
              const isGrace = keyState === "grace"
              const isCancelLoading = Boolean(cancelLoadingByKeyId[key.id])
              const graceCountdown =
                isGrace && key.grace_expires_at ? formatGraceCountdown(key.grace_expires_at, nowMs) : null
              return (
                <tr
                  key={key.id}
                  className="border-t hover:bg-muted/50 transition-colors duration-150 data-[revoked=true]:opacity-60"
                  data-revoked={revoked}
                >
                  <td className="px-4 py-4">
                    <p className={`font-medium ${revoked ? "line-through" : ""}`}>{key.name}</p>
                  </td>
                  <td className="px-4 py-4 font-mono text-sm">{key.key_prefix}********</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(key.created_at)}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {key.last_used_at ? formatRelativeTime(key.last_used_at) : "Never"}
                  </td>
                  <td className="px-4 py-4">
                    {keyState === "active" ? (
                      <Badge className="border-green-200 bg-green-100 text-green-800 dark:border-green-800/40 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </Badge>
                    ) : isGrace && key.grace_expires_at ? (
                      <div className="flex items-center gap-2">
                        <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Revoking
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          {graceCountdown === "Expired" ? "Expired" : `Expires in ${graceCountdown}`}
                        </span>
                      </div>
                    ) : (
                      <Badge className="border-transparent bg-muted text-muted-foreground">Revoked</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {isGrace ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isCancelLoading}
                        onClick={() => void handleCancelRevoke(key.id)}
                      >
                        {isCancelLoading && <Loader2 className="size-4 animate-spin" />}
                        Cancel Revoke
                      </Button>
                    ) : keyState === "active" ? (
                      <RevokeKeyPopover keyId={key.id} onRevoked={() => router.refresh()} />
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <CreateKeyModal open={createOpen} onOpenChange={setCreateOpen} onCreated={() => router.refresh()} />
    </div>
  )
}
