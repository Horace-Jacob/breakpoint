"use client"

import { CheckCircle2, Loader2, MessageSquare, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

interface NotificationsTabProps {
  slackWebhookUrl: string | null
  slackVerified: boolean
  slackVerifiedAt: string | null
  slackAlertsEnabled: boolean
  onSettingsUpdated: (patch: {
    slack_webhook_url?: string | null
    slack_webhook_verified?: boolean
    slack_verified_at?: string | null
    slack_alerts_enabled?: boolean
  }) => void
}

export function NotificationsTab({
  slackWebhookUrl,
  slackVerified,
  slackVerifiedAt,
  slackAlertsEnabled,
  onSettingsUpdated,
}: NotificationsTabProps) {
  const [inputUrl, setInputUrl] = useState("")
  const [alertsEnabled, setAlertsEnabled] = useState(slackAlertsEnabled)
  const [loadingAction, setLoadingAction] = useState<"save" | "test" | "remove" | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const verifiedDateLabel = useMemo(() => {
    if (!slackVerifiedAt) return null
    return new Date(slackVerifiedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [slackVerifiedAt])

  const setTimedFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message })
    window.setTimeout(() => setFeedback(null), 3000)
  }

  const patchSettings = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error("Failed to update settings")
    }

    return (await response.json()) as {
      success: boolean
      settings: {
        slack_webhook_url: string | null
        slack_webhook_verified: boolean
        slack_verified_at: string | null
        slack_alerts_enabled: boolean
      }
    }
  }

  const handleSave = async () => {
    if (!inputUrl.trim()) return
    setLoadingAction("save")
    try {
      const data = await patchSettings({
        slack_webhook_url: inputUrl.trim(),
        slack_webhook_verified: false,
        slack_verified_at: null,
      })
      onSettingsUpdated({
        slack_webhook_url: data.settings.slack_webhook_url,
        slack_webhook_verified: data.settings.slack_webhook_verified,
        slack_verified_at: data.settings.slack_verified_at,
      })
      setInputUrl("")
      setTimedFeedback("success", "Webhook saved")
    } catch {
      setTimedFeedback("error", "Failed to save webhook")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRemove = async () => {
    setLoadingAction("remove")
    try {
      const data = await patchSettings({
        slack_webhook_url: null,
        slack_webhook_verified: false,
        slack_verified_at: null,
        slack_alerts_enabled: false,
      })
      onSettingsUpdated(data.settings)
      setAlertsEnabled(false)
      setTimedFeedback("success", "Webhook removed")
    } catch {
      setTimedFeedback("error", "Failed to remove webhook")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTest = async () => {
    const urlToTest = inputUrl.trim() || slackWebhookUrl
    if (!urlToTest) return

    setLoadingAction("test")
    try {
      const response = await fetch("/api/settings/slack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToTest }),
      })

      if (!response.ok) {
        throw new Error("Failed to verify")
      }

      const data = (await response.json()) as { verified: boolean; verified_at: string }
      onSettingsUpdated({
        slack_webhook_url: urlToTest,
        slack_webhook_verified: true,
        slack_verified_at: data.verified_at,
      })
      setInputUrl("")
      setTimedFeedback("success", "Test message sent")
    } catch {
      setTimedFeedback("error", "Failed to reach webhook")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleToggleAlerts = async (next: boolean) => {
    const previous = alertsEnabled
    setAlertsEnabled(next)
    onSettingsUpdated({ slack_alerts_enabled: next })

    try {
      await patchSettings({ slack_alerts_enabled: next })
    } catch {
      setAlertsEnabled(previous)
      onSettingsUpdated({ slack_alerts_enabled: previous })
      setTimedFeedback("error", "Could not update alert preference")
    }
  }

  const hasWebhook = Boolean(slackWebhookUrl)

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-muted">
            <MessageSquare className="size-4" />
          </div>
          <h2 className="text-lg font-semibold">Slack Notifications</h2>
          {slackVerified ? (
            <Badge className="badge-success">
              Verified
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          When enabled, Breakpoint sends a message to your Slack channel after every inspection. {" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noreferrer"
            className="underline transition-colors duration-150"
          >
            How to create an incoming webhook ?
          </a>
        </p>
      </div>

      {hasWebhook ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-sm text-foreground inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-500" />
              Webhook configured · {slackVerified ? `Verified ${verifiedDateLabel ?? ""}` : "Not verified"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRemove()}
              disabled={loadingAction === "remove"}
              className="transition-colors duration-150"
            >
              {loadingAction === "remove" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Remove
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Paste a new URL to replace..."
              value={inputUrl}
              onChange={(event) => setInputUrl(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => void handleTest()}
              disabled={loadingAction === "test" || (!inputUrl.trim() && !slackWebhookUrl)}
              className="transition-colors duration-150"
            >
              {loadingAction === "test" && <Loader2 className="size-4 animate-spin" />}
              Test
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Paste your Slack webhook URL"
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
          />
          <Button onClick={() => void handleSave()} disabled={loadingAction === "save" || !inputUrl.trim()}>
            {loadingAction === "save" && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-2">
        <button
          type="button"
          role="switch"
          aria-checked={alertsEnabled}
          onClick={() => void handleToggleAlerts(!alertsEnabled)}
          className="group flex w-full items-center justify-between transition-colors duration-150"
        >
          <div className="text-left">
            <p className="font-medium">Enable Slack alerts</p>
            <p className="text-sm text-muted-foreground">
              Send a message for every agent run — passed, fixed, or blocked
            </p>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-150 ${
              alertsEnabled
                ? "border-emerald-600 bg-emerald-500/90 dark:border-emerald-500 dark:bg-emerald-500"
                : "border-slate-400 bg-slate-200 dark:border-slate-500 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block size-5 rounded-full shadow transition-transform duration-150 ${
                alertsEnabled ? "translate-x-5 bg-white" : "translate-x-0.5 bg-white dark:bg-slate-100"
              }`}
            />
          </span>
        </button>
      </div>

      {feedback ? (
        <p className={feedback.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  )
}

