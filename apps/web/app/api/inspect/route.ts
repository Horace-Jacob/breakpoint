import { runEngine, sendSlackAlert, type InspectRequest } from "@breakpoint/lib"
import { createClient } from "@supabase/supabase-js"
import crypto from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

const InspectRequestSchema = z.object({
  action_type: z.enum(["http_call", "db_write", "message", "file_write"]),
  target: z.url().optional(),
  payload: z
    .record(z.string(), z.unknown())
    .refine((val) => JSON.stringify(val).length <= 100000, {
      message: "Payload exceeds maximum allowed size of 100KB",
    }),
  agent_id: z.string().max(100).optional(),
  context: z
    .object({
      env: z.enum(["production", "staging", "development"]).optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
})

type ApiKeyLookup = {
  id: string
  user_id: string
  is_active: boolean
  revoked_at: string | null
  grace_expires_at: string | null
}

type UsageRpcResult = {
  allowed: boolean
  current_count: number
  limit: number
}

type UserSettingsRow = {
  monthly_inspection_limit: number
  fail_behavior: "closed" | "open" | null
}

type SlackSettingsRow = {
  slack_alerts_enabled: boolean
  slack_webhook_url: string | null
  slack_webhook_verified: boolean
}

function maxDepth(value: unknown, max = 10, depth = 0): boolean {
  if (depth > max) return false
  if (!value || typeof value !== "object") return true
  if (Array.isArray(value)) {
    return value.every((item) => maxDepth(item, max, depth + 1))
  }
  return Object.values(value as Record<string, unknown>).every((item) => maxDepth(item, max, depth + 1))
}

function partialMask(value: string): string {
  if (value.length <= 8) {
    return "********"
  }
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

function parseTruncatedPayload(payloadString: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadString)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Best effort fallback below.
  }
  return { _truncated: true, preview: payloadString }
}

function getResetDateIso(): string {
  const now = new Date()
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return nextMonthStart.toISOString()
}

function addGraceHeaders(response: NextResponse, gracePeriod: boolean): NextResponse {
  if (gracePeriod) {
    response.headers.set("X-Breakpoint-Key-Status", "grace-period")
  }
  return response
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server is missing Supabase configuration" }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const rawKey = authHeader.slice("Bearer ".length).trim()
    if (!rawKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 })
    }

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const nowIso = new Date().toISOString()

    const { data: apiKey, error: keyLookupError } = (await supabase
      .from("api_keys" as never)
      .select("id, user_id, is_active, revoked_at, grace_expires_at")
      .eq("key_hash", keyHash)
      .or(`is_active.eq.true,and(revoked_at.not.is.null,grace_expires_at.gt.${nowIso})`)
      .maybeSingle()) as { data: ApiKeyLookup | null; error: { message: string } | null }

    if (keyLookupError || !apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inGracePeriod = Boolean(apiKey.revoked_at && apiKey.grace_expires_at && apiKey.grace_expires_at > nowIso)

    const body = await request.json().catch(() => null)
    const parsedBody = InspectRequestSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsedBody.error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      )
    }

    if (!maxDepth(parsedBody.data.payload, 10)) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: ["Payload exceeds maximum nesting depth of 10"],
        },
        { status: 400 }
      )
    }

    const inspectRequest: InspectRequest = parsedBody.data

    const payloadStr = JSON.stringify(inspectRequest.payload)
    const truncated = payloadStr.length > 10240
    const payloadForStorage = truncated
      ? parseTruncatedPayload(payloadStr.substring(0, 10240))
      : inspectRequest.payload

    const { data: userSettings } = (await supabase
      .from("user_settings" as never)
      .select("monthly_inspection_limit, fail_behavior")
      .eq("user_id", apiKey.user_id)
      .maybeSingle()) as { data: UserSettingsRow | null; error: { message: string } | null }

    const limit = userSettings?.monthly_inspection_limit ?? 100
    const failBehavior = userSettings?.fail_behavior === "open" ? "open" : "closed"

    const { data: usageData, error: usageError } = (await supabase.rpc("increment_usage_and_check" as never, {
      p_user_id: apiKey.user_id,
      p_limit: limit,
    } as never)) as { data: UsageRpcResult | null; error: { message: string } | null }

    if (usageError || !usageData) {
      return NextResponse.json({ error: "Failed to check usage limits" }, { status: 500 })
    }

    if (!usageData.allowed) {
      const limitedResponse = NextResponse.json(
        {
          error: "Monthly inspection limit reached",
          limit: usageData.limit,
          current_count: usageData.current_count,
          reset_date: getResetDateIso(),
          upgrade_url: "https://your-domain.com/settings?tab=usage",
        },
        { status: 429 }
      )
      return addGraceHeaders(limitedResponse, inGracePeriod)
    }

    const startMs = Date.now()
    const result = runEngine(inspectRequest)
    const durationMs = Date.now() - startMs

    const eventId = crypto.randomUUID()
    const successResponse = NextResponse.json({
      verdict: result.verdict,
      modified_payload: result.modified_payload,
      rule_fired: result.rule_fired,
      reason: result.reason,
      score: result.score,
      risk_level: result.risk_level,
      event_id: eventId,
      violations: result.violations,
      rules_checked: result.rules_checked,
      rules_fired: result.rules_fired,
      usage: {
        current: usageData.current_count,
        limit: usageData.limit,
      },
      fail_behavior: failBehavior,
      ...(inGracePeriod
        ? {
            key_status: "grace_period",
            grace_expires_at: apiKey.grace_expires_at,
          }
        : {}),
    })

    const writeAuditLog = async () => {
      try {
        const { error: eventError } = await supabase.from("inspection_events" as never).insert({
          id: eventId,
          user_id: apiKey.user_id,
          api_key_id: apiKey.id,
          agent_id: inspectRequest.agent_id ?? null,
          action_type: inspectRequest.action_type,
          target: inspectRequest.target ?? null,
          inbound_payload: payloadForStorage as never,
          payload_truncated: truncated,
          duration_ms: durationMs,
          outbound_payload: result.modified_payload as never,
          verdict: result.verdict,
          risk_level: result.risk_level,
          score: result.score,
          rules_checked: result.rules_checked,
          rules_fired: result.rules_fired,
          rule_fired: result.rule_fired,
          reason: result.reason,
        } as never)

        if (eventError) {
          throw eventError
        }

        if (result.violations.length > 0) {
          const violationsToInsert = result.violations.map((violation) => ({
            event_id: eventId,
            user_id: apiKey.user_id,
            type: violation.type,
            category: violation.category,
            description: violation.description,
            direction: violation.direction,
            field_path: violation.field_path ?? null,
            original_value: violation.original_value ? partialMask(violation.original_value) : null,
            masked_value: violation.masked_value ?? null,
            rule_id: violation.rule_id,
          }))

          const { error: violationError } = await supabase
            .from("policy_violations" as never)
            .insert(violationsToInsert as never)

          if (violationError) {
            throw violationError
          }
        }

        const { error: updateError } = await supabase
          .from("api_keys" as never)
          .update({ last_used_at: new Date().toISOString() } as never)
          .eq("id", apiKey.id)

        if (updateError) {
          throw updateError
        }

        const { data: slackSettings } = (await supabase
          .from("user_settings" as never)
          .select("slack_alerts_enabled, slack_webhook_url, slack_webhook_verified")
          .eq("user_id", apiKey.user_id)
          .maybeSingle()) as { data: SlackSettingsRow | null; error: { message: string } | null }

        if (
          slackSettings?.slack_alerts_enabled &&
          slackSettings.slack_webhook_url &&
          slackSettings.slack_webhook_verified
        ) {
          await sendSlackAlert(slackSettings.slack_webhook_url, {
            verdict: result.verdict,
            score: result.score,
            risk_level: result.risk_level,
            agent_id: inspectRequest.agent_id,
            action_type: inspectRequest.action_type,
            target: inspectRequest.target,
            rule_fired: result.rule_fired ?? undefined,
            reason: result.reason ?? undefined,
            event_id: eventId,
            violations_count: result.violations.length,
          })
        }
      } catch (err) {
        console.error("[breakpoint] audit log write failed:", err)
      }
    }

    void writeAuditLog()
    return addGraceHeaders(successResponse, inGracePeriod)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
