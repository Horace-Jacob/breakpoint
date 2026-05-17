import { getUser, runEngine, type InspectRequest } from "@breakpoint/lib"
import { NextResponse } from "next/server"

type Scenario = "pii" | "env" | "destination" | "size" | "clean"

function scenarioRequest(scenario: Scenario): InspectRequest {
  if (scenario === "pii") {
    return {
      action_type: "message",
      payload: {
        text: "Hi, John Smith called from +1-555-0168. His email is john.smith@acme.com",
      },
    }
  }

  if (scenario === "env") {
    return {
      action_type: "http_call",
      target: "https://prod-db.internal/query",
      payload: { query: "select 1" },
      context: { env: "staging" },
    }
  }

  if (scenario === "destination") {
    return {
      action_type: "http_call",
      target: "https://pastebin.com/post",
      payload: { data: "some content" },
    }
  }

  if (scenario === "size") {
    return {
      action_type: "http_call",
      target: "https://api.example.com",
      payload: { data: "x".repeat(60000) },
    }
  }

  return {
    action_type: "http_call",
    target: "https://api.example.com",
    payload: { message: "Process this order", order_id: "ord_123" },
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { scenario?: Scenario }
    const scenario: Scenario = body.scenario ?? "clean"
    if (!["pii", "env", "destination", "size", "clean"].includes(scenario)) {
      return NextResponse.json({ error: "Invalid scenario" }, { status: 400 })
    }

    const result = runEngine(scenarioRequest(scenario))

    return NextResponse.json({
      verdict: result.verdict,
      modified_payload: result.modified_payload,
      rule_fired: result.rule_fired,
      reason: result.reason,
      score: result.score,
      risk_level: result.risk_level,
      event_id: null,
      violations: result.violations,
      rules_checked: result.rules_checked,
      rules_fired: result.rules_fired,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
