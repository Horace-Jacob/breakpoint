"use client"

import type { UserSettings } from "@breakpoint/lib"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ExportTab } from "./ExportTab"
import { NotificationsTab } from "./NotificationsTab"
import { SettingsTab } from "./SettingsTab"
import { UsageTab } from "./UsageTab"

interface SettingsTabsProps {
  userId: string
  appUrl: string
  initialSettings: UserSettings
  initialUsage: {
    currentCount: number
    limit: number
    monthLabel: string
    resetDate: string
  }
}

type TabKey = "notifications" | "export" | "usage" | "settings"

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "notifications", label: "Notifications" },
  { key: "export", label: "Export & Audit" },
  { key: "usage", label: "Usage" },
  { key: "settings", label: "Settings" },
]

function normalizeTab(tab: string | null): TabKey {
  const value = (tab ?? "").toLowerCase()
  if (value === "notification" || value === "notifications") return "notifications"
  if (value === "export") return "export"
  if (value === "usage") return "usage"
  if (value === "settings") return "settings"
  return "notifications"
}

export function SettingsTabs({ userId, appUrl, initialSettings, initialUsage }: SettingsTabsProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabFromUrl = useMemo(() => normalizeTab(searchParams.get("tab")), [searchParams])
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl)
  const [settings, setSettings] = useState<UserSettings>(initialSettings)

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  useEffect(() => {
    if (searchParams.get("tab")) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "notifications")
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const onTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => onTabChange(tab.key)}
              className="transition-colors duration-150"
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div key={activeTab} className="animate-in fade-in-50 duration-150">
        {activeTab === "notifications" && (
          <NotificationsTab
            slackWebhookUrl={settings.slack_webhook_url}
            slackVerified={settings.slack_webhook_verified}
            slackVerifiedAt={settings.slack_verified_at}
            slackAlertsEnabled={settings.slack_alerts_enabled}
            onSettingsUpdated={(next) => setSettings((prev) => ({ ...prev, ...next }))}
          />
        )}

        {activeTab === "export" && <ExportTab userId={userId} />}

        {activeTab === "usage" && (
          <UsageTab
            currentCount={initialUsage.currentCount}
            limit={initialUsage.limit}
            monthLabel={initialUsage.monthLabel}
            resetDate={initialUsage.resetDate}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            appUrl={appUrl}
            failBehavior={settings.fail_behavior}
            onSave={(value) => setSettings((prev) => ({ ...prev, fail_behavior: value }))}
          />
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Settings</Badge>
        Preferences are saved per account.
      </div>
    </div>
  )
}
