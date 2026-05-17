import type { ActionType, RiskLevel, Verdict } from "./rules/types"

export interface SlackAlertData {
  verdict: Verdict
  score: number
  risk_level: RiskLevel
  agent_id?: string
  action_type: ActionType
  target?: string
  rule_fired?: string
  reason?: string
  event_id: string
  violations_count: number
}

function verdictLabel(verdict: Verdict): string {
  if (verdict === "allow") return "✅ Passed"
  if (verdict === "mask") return "🔧 Fixed (PII masked)"
  if (verdict === "fix") return "🔧 Fixed"
  if (verdict === "block") return "🚫 Blocked"
  return "⏸️ Flagged for Review"
}

function truncateTarget(target?: string): string {
  if (!target) return "Not specified"
  return target.length > 50 ? `${target.slice(0, 47)}...` : target
}

function capitalize(value: string): string {
  if (!value) return value
  const first = value.charAt(0)
  return `${first.toUpperCase()}${value.slice(1)}`
}

export async function sendSlackAlert(webhookUrl: string, data: SlackAlertData): Promise<void> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const traceUrl = appUrl ? `${appUrl}/dashboard?event=${data.event_id}` : ""
    const shouldShowTraceButton = (data.verdict === "block" || data.verdict === "ask") && Boolean(traceUrl)

    const payload: Record<string, unknown> = {
      text: `Breakpoint inspection: ${verdictLabel(data.verdict)}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: verdictLabel(data.verdict),
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Agent:*\n${data.agent_id ?? "Unknown"}` },
            { type: "mrkdwn", text: `*Action:*\n${data.action_type}` },
            { type: "mrkdwn", text: `*Target:*\n${truncateTarget(data.target)}` },
            { type: "mrkdwn", text: `*Score:*\n${data.score}/100` },
            { type: "mrkdwn", text: `*Risk:*\n${capitalize(data.risk_level)}` },
            { type: "mrkdwn", text: `*Rule:*\n${data.rule_fired ?? "—"}` },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Reason: ${data.reason ?? "No reason provided"} • Violations: ${data.violations_count}`,
            },
          ],
        },
      ],
    }

    if (shouldShowTraceButton) {
      payload.blocks = [
        ...(payload.blocks as Array<Record<string, unknown>>),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Trace",
                emoji: true,
              },
              url: traceUrl,
            },
          ],
        },
      ]
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if(response.ok){
      console.log('[breakpoint] slack alert sent')
    }

    if (!response.ok) {
      console.error("[breakpoint] slack alert failed:", response.status, response.statusText)
    }
  } catch (error) {
    console.error("[breakpoint] slack alert error:", error)
  }
}
