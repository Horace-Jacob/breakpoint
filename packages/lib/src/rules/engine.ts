import { RULES_REGISTRY } from "./registry"
import type { InspectRequest, RiskLevel, RuleMatch, RuleResult, Verdict } from "./types"

const TYPE_DEDUCTIONS = {
  error: 25,
  warning: 10,
  info: 5,
} as const

const VERDICT_PRIORITY: Record<Verdict, number> = {
  allow: 0,
  fix: 1,
  mask: 2,
  ask: 3,
  block: 4,
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function setByPath(root: Record<string, unknown>, path: string, updater: (value: string) => string): boolean {
  const parts = path.split(".")
  if (parts.length === 0) {
    return false
  }
  let current: unknown = root
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    if (!key) {
      return false
    }
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[key]
      continue
    }
    return false
  }

  const leaf = parts[parts.length - 1]
  if (!leaf) {
    return false
  }
  if (current && typeof current === "object") {
    const target = current as Record<string, unknown>
    if (typeof target[leaf] === "string") {
      target[leaf] = updater(target[leaf] as string)
      return true
    }
  }

  return false
}

function scoreToRisk(score: number): RiskLevel {
  if (score >= 80) return "low"
  if (score >= 50) return "medium"
  if (score >= 25) return "high"
  return "critical"
}

function reasonForVerdict(verdict: Verdict, violations: number): string | null {
  if (verdict === "allow") return null
  if (verdict === "block") return "Blocked by security policy checks"
  if (verdict === "ask") return "Requires manual approval before processing"
  if (verdict === "mask") return "Sensitive data was redacted from payload"
  if (verdict === "fix") return "Payload was automatically fixed"
  return violations > 0 ? "Policy checks triggered" : null
}

export function runEngine(request: InspectRequest): RuleResult {
  const matches: RuleMatch[] = RULES_REGISTRY.flatMap((rule) => rule.evaluate(request))
  const violations = matches.map((match) => match.violation)

  const score = Math.max(
    0,
    100 - violations.reduce((sum, violation) => sum + TYPE_DEDUCTIONS[violation.type], 0)
  )
  const risk_level = scoreToRisk(score)

  let verdict: Verdict = "allow"
  let highestPriority = 0
  let highestPriorityRuleId: string | null = null

  for (const match of matches) {
    const priority = VERDICT_PRIORITY[match.verdict]
    if (priority > highestPriority) {
      highestPriority = priority
      verdict = match.verdict
      highestPriorityRuleId = match.violation.rule_id
    }
  }

  const cloned = deepClone(request.payload)
  const payloadRoot: Record<string, unknown> = { payload: cloned }
  let transformsApplied = false
  for (const match of matches) {
    if (!match.transform) continue
    const didApply = setByPath(payloadRoot, match.transform.field_path, match.transform.apply)
    transformsApplied = transformsApplied || didApply
  }

  const rulesFiredDistinct = new Set(violations.map((violation) => violation.rule_id)).size

  return {
    verdict,
    violations,
    modified_payload: verdict === "block" ? null : transformsApplied ? cloned : null,
    rule_fired: highestPriorityRuleId,
    reason: reasonForVerdict(verdict, violations.length),
    score,
    risk_level,
    rules_checked: RULES_REGISTRY.length,
    rules_fired: rulesFiredDistinct,
  }
}
