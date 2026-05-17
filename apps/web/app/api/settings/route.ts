import { createServerClient, getUser, type UserSettings } from "@breakpoint/lib"
import { NextResponse } from "next/server"
import { z } from "zod"

const UpdateSettingsSchema = z
  .object({
    fail_behavior: z.enum(["closed", "open"]).optional(),
    slack_webhook_url: z.string().nullable().optional(),
    slack_alerts_enabled: z.boolean().optional(),
    slack_webhook_verified: z.boolean().optional(),
    slack_verified_at: z.string().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "No settings provided" })

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
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

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServerClient()
  const month = monthKey()

  const [{ data: settingsRow }, { data: usageRow }] = await Promise.all([
    supabase.from("user_settings" as never).select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("usage_counters" as never)
      .select("month, inspection_count")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle(),
  ])

  const settings = (settingsRow as UserSettings | null) ?? defaultSettings(user.id)

  return NextResponse.json({
    settings,
    usage: {
      current_count: (usageRow as { inspection_count: number } | null)?.inspection_count ?? 0,
      month,
      limit: settings.monthly_inspection_limit,
    },
  })
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = UpdateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const now = new Date().toISOString()

  const payload = {
    user_id: user.id,
    updated_at: now,
    ...parsed.data,
  }

  const { data, error } = await supabase
    .from("user_settings" as never)
    .upsert(payload as never, { onConflict: "user_id" })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }

  return NextResponse.json({ success: true, settings: data })
}

