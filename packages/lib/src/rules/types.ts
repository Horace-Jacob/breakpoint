export type ActionType = "http_call" | "db_write" | "message" | "file_write"
export type Verdict = "allow" | "mask" | "fix" | "block" | "ask"
export type RiskLevel = "low" | "medium" | "high" | "critical"
export type ViolationType = "error" | "warning" | "info"
export type ViolationCategory = "pii" | "destination" | "environment" | "size" | "rate_limit" | "schema"
export type Direction = "inbound" | "outbound"

export interface InspectRequest {
  action_type: ActionType
  target?: string
  payload: Record<string, unknown>
  agent_id?: string
  context?: {
    env?: "production" | "staging" | "development"
    timestamp?: string
  }
}

export interface Violation {
  type: ViolationType
  category: ViolationCategory
  description: string
  direction: Direction
  field_path?: string
  original_value?: string
  masked_value?: string
  rule_id: string
}

export interface RuleResult {
  verdict: Verdict
  violations: Violation[]
  modified_payload: Record<string, unknown> | null
  rule_fired: string | null
  reason: string | null
  score: number
  risk_level: RiskLevel
  rules_checked: number
  rules_fired: number
}

export interface MaskTransform {
  field_path: string
  apply: (value: string) => string
}

export interface RuleMatch {
  violation: Violation
  verdict: Exclude<Verdict, "allow">
  transform?: MaskTransform
}

export interface RuleDefinition {
  id: string
  evaluate: (request: InspectRequest) => RuleMatch[]
}
