import { createServerClient, getUser } from "@breakpoint/lib"
import { NextResponse } from "next/server"
import { z } from "zod"

const VerifySchema = z.object({
  url: z.url(),
})

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ verified: false, error: "Invalid webhook URL" }, { status: 400 })
  }

  const webhookUrl = parsed.data.url.trim()
  if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({ verified: false, error: "Invalid Slack webhook URL" }, { status: 400 })
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "? Breakpoint webhook verified. Slack alerts are now active." }),
  }).catch(() => null)

  if (!response || !response.ok) {
    return NextResponse.json({ verified: false, error: "Could not reach webhook URL" }, { status: 400 })
  }

  const verifiedAt = new Date().toISOString()
  const supabase = await createServerClient()

  const { error } = await supabase.from("user_settings" as never).upsert(
    {
      user_id: user.id,
      slack_webhook_url: webhookUrl,
      slack_webhook_verified: true,
      slack_verified_at: verifiedAt,
      updated_at: verifiedAt,
    } as never,
    { onConflict: "user_id" }
  )

  if (error) {
    return NextResponse.json({ verified: false, error: "Failed to store webhook verification" }, { status: 500 })
  }

  return NextResponse.json({ verified: true, verified_at: verifiedAt })
}
