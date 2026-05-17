import { createServerClient, getUser } from "@breakpoint/lib"
import { NextResponse } from "next/server"

const STATUS_MAP = new Set(["all", "allow", "mask", "fix", "block"])
const FORMAT_MAP = new Set(["csv", "json", "ndjson"])

interface InspectionEventRow {
  id: string
  created_at: string
  agent_id: string | null
  action_type: string
  target: string | null
  score: number
  verdict: "allow" | "mask" | "fix" | "block" | "ask"
  risk_level: string
  rules_checked: number
  rules_fired: number
  duration_ms: number | null
  inbound_payload: unknown
  outbound_payload: unknown
}

interface ViolationRow {
  event_id: string
  type: string
  category: string
  description: string
  direction: string
  rule_id: string
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function fileName(format: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `breakpoint-export-${date}.${format}`
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase()
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const status = (url.searchParams.get("status") ?? "all").toLowerCase()

  if (!FORMAT_MAP.has(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }
  if (!STATUS_MAP.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const supabase = await createServerClient()

  let query = supabase
    .from("inspection_events" as never)
    .select(
      "id, created_at, agent_id, action_type, target, score, verdict, risk_level, rules_checked, rules_fired, duration_ms, inbound_payload, outbound_payload"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (from) {
    query = query.gte("created_at", `${from}T00:00:00.000Z`)
  }
  if (to) {
    query = query.lte("created_at", `${to}T23:59:59.999Z`)
  }
  if (status !== "all") {
    query = query.eq("verdict", status)
  }

  const { data: eventRows, error: eventsError } = (await query) as {
    data: InspectionEventRow[] | null
    error: { message: string } | null
  }

  if (eventsError) {
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 })
  }

  const events = eventRows ?? []
  const eventIds = events.map((event) => event.id)

  let violationsByEvent: Record<string, ViolationRow[]> = {}
  if (eventIds.length > 0) {
    const { data: violationRows } = (await supabase
      .from("policy_violations" as never)
      .select("event_id, type, category, description, direction, rule_id")
      .in("event_id", eventIds)) as { data: ViolationRow[] | null; error: { message: string } | null }

    violationsByEvent = (violationRows ?? []).reduce<Record<string, ViolationRow[]>>((acc, violation) => {
      const bucket = acc[violation.event_id]
      if (!bucket) {
        acc[violation.event_id] = [violation]
        return acc
      }
      bucket.push(violation)
      return acc
    }, {})
  }

  if (format === "csv") {
    const header = [
      "id",
      "timestamp",
      "agent_id",
      "action_type",
      "target",
      "score",
      "verdict",
      "risk_level",
      "rules_checked",
      "rules_fired",
      "duration_ms",
      "violations_count",
    ]

    const rows = events.map((event) =>
      [
        event.id,
        event.created_at,
        event.agent_id,
        event.action_type,
        event.target,
        event.score,
        event.verdict,
        event.risk_level,
        event.rules_checked,
        event.rules_fired,
        event.duration_ms,
        violationsByEvent[event.id]?.length ?? 0,
      ]
        .map(csvEscape)
        .join(",")
    )

    const csv = [header.join(","), ...rows].join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName("csv")}"`,
      },
    })
  }

  const payload = events.map((event) => ({
    id: event.id,
    timestamp: event.created_at,
    agent_id: event.agent_id,
    action_type: event.action_type,
    target: event.target,
    score: event.score,
    verdict: event.verdict,
    risk_level: event.risk_level,
    rules_checked: event.rules_checked,
    rules_fired: event.rules_fired,
    duration_ms: event.duration_ms,
    inbound_payload: event.inbound_payload,
    outbound_payload: event.outbound_payload,
    violations: (violationsByEvent[event.id] ?? []).map((violation) => ({
      type: violation.type,
      category: violation.category,
      description: violation.description,
      direction: violation.direction,
      rule_id: violation.rule_id,
    })),
  }))

  if (format === "json") {
    return new NextResponse(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName("json")}"`,
      },
    })
  }

  const ndjson = payload.map((row) => JSON.stringify(row)).join("\n")
  return new NextResponse(ndjson, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Content-Disposition": `attachment; filename="${fileName("ndjson")}"`,
    },
  })
}
