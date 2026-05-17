import { createServerClient, getUser, type UsageCounter, type UserSettings } from "@breakpoint/lib"
import { redirect } from "next/navigation"

import { SettingsTabs } from "../../../components/settings/SettingsTabs"

function getMonthKey(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function getMonthLabel(date = new Date()) {
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}

function getResetDateLabel(date = new Date()) {
  const resetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  return resetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function defaultSettings(userId: string): UserSettings {
  return {
    id: "",
    user_id: userId,
    fail_behavior: "closed",
    slack_webhook_url: null,
    slack_webhook_verified: false,
    slack_alerts_enabled: false,
    slack_verified_at: null,
    monthly_inspection_limit: 100,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  }
}

export const metadata = {
  title: "Settings - Breakpoint",
}

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) {
    redirect("/")
  }

  const supabase = await createServerClient()
  const month = getMonthKey()

  const [{ data: settingsData }, { data: usageData }] = await Promise.all([
    supabase.from("user_settings" as never).select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("usage_counters" as never)
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle(),
  ])

  const settings = (settingsData as UserSettings | null) ?? defaultSettings(user.id)
  const usage = usageData as UsageCounter | null

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage notifications, usage limits, and audit exports.</p>
      </div>
      <SettingsTabs
        userId={user.id}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
        initialSettings={settings}
        initialUsage={{
          currentCount: usage?.inspection_count ?? 0,
          limit: settings.monthly_inspection_limit,
          monthLabel: getMonthLabel(),
          resetDate: getResetDateLabel(),
        }}
      />
    </div>
  )
}

