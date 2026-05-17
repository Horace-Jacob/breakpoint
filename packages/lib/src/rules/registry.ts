import type { InspectRequest, RuleDefinition, RuleMatch } from "./types"

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(\+?[\d\s\-().]{7,})/g
const NAME_REGEX = /\b(Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+\b|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g
const AWS_ACCESS_KEY_REGEX = /AKIA[0-9A-Z]{16}/g
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g
const SQL_INJECTION_REGEX_1 = /(\bUNION\b.*\bSELECT\b|\bDROP\b.*\bTABLE\b|\bINSERT\b.*\bINTO\b|\bDELETE\b.*\bFROM\b)/i
const SQL_INJECTION_REGEX_2 = /('.*--)|(--.*)|(\/\*.*\*\/)/
const SQL_INJECTION_REGEX_3 = /\b(EXEC|EXECUTE|xp_|sp_)\b/i
const PROMPT_INJECTION_PATTERNS = [
  "ignore previous instructions",
  "ignore all previous",
  "disregard previous",
  "forget your instructions",
  "you are now",
  "new persona",
  "system prompt",
  "jailbreak",
]
const NAME_EXCLUSION_LIST = new Set([
  "new york",
  "los angeles",
  "san francisco",
  "united states",
  "united kingdom",
  "southeast asia",
  "north america",
  "south america",
  "hong kong",
  "new zealand",
  "saudi arabia",
])

const DESTINATION_DENYLIST = [
  "pastebin.com",
  "ngrok.io",
  "requestbin.com",
  "webhook.site",
  "pipedream.net",
]

const PHONE_CONTEXT_HINTS = /\b(phone|mobile|tel|telephone|contact|call|whatsapp|sms|reach)\b/i

function isLikelyPhoneMatch(fullText: string, match: string): boolean {
  const trimmed = match.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length < 7 || digits.length > 15) {
    return false
  }

  const hasFormatting = /[+\s\-().]/.test(trimmed)
  const isPureDigits = /^\d+$/.test(trimmed)

  if (!isPureDigits && hasFormatting) {
    return true
  }

  if (isPureDigits) {
    if (digits.length >= 10) {
      return true
    }
    return PHONE_CONTEXT_HINTS.test(fullText)
  }

  return false
}

function maskPhoneNumbers(text: string): { found: boolean; masked: string } {
  let found = false
  const masked = text.replace(PHONE_REGEX, (match) => {
    if (isLikelyPhoneMatch(text, match)) {
      found = true
      return "[PHONE REDACTED]"
    }
    return match
  })

  return { found, masked }
}

function walkStrings(
  value: unknown,
  path: string,
  visitor: (input: { text: string; fieldPath: string }) => RuleMatch[]
): RuleMatch[] {
  if (typeof value === "string") {
    return visitor({ text: value, fieldPath: path })
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, idx) => walkStrings(item, `${path}.${idx}`, visitor))
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      walkStrings(child, `${path}.${key}`, visitor)
    )
  }

  return []
}

const piiEmailRule: RuleDefinition = {
  id: "pii-email-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      if (!EMAIL_REGEX.test(text)) {
        EMAIL_REGEX.lastIndex = 0
        return []
      }
      EMAIL_REGEX.lastIndex = 0
      return [
        {
          verdict: "mask",
          violation: {
            type: "warning",
            category: "pii",
            description: "Email address detected in payload",
            direction: "outbound",
            field_path: fieldPath,
            original_value: text,
            masked_value: text.replace(EMAIL_REGEX, "[EMAIL REDACTED]"),
            rule_id: "pii-email-001",
          },
          transform: {
            field_path: fieldPath,
            apply: (value) => value.replace(EMAIL_REGEX, "[EMAIL REDACTED]"),
          },
        },
      ]
    })
  },
}

const piiPhoneRule: RuleDefinition = {
  id: "pii-phone-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      const result = maskPhoneNumbers(text)
      if (!result.found) {
        return []
      }

      return [
        {
          verdict: "mask",
          violation: {
            type: "warning",
            category: "pii",
            description: "Phone number detected in payload",
            direction: "outbound",
            field_path: fieldPath,
            original_value: text,
            masked_value: result.masked,
            rule_id: "pii-phone-001",
          },
          transform: {
            field_path: fieldPath,
            apply: (value) => maskPhoneNumbers(value).masked,
          },
        },
      ]
    })
  },
}

const piiNameRule: RuleDefinition = {
  id: "pii-name-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      const matches = Array.from(text.matchAll(NAME_REGEX))
      NAME_REGEX.lastIndex = 0
      if (matches.length === 0) {
        return []
      }

      const redactable = matches
        .map((m) => m[0])
        .filter((name) => {
          const normalized = name.trim().toLowerCase()
          if (NAME_EXCLUSION_LIST.has(normalized)) {
            return false
          }
          const parts = name.trim().split(/\s+/).filter(Boolean)
          if (parts.length < 2) {
            return false
          }
          const firstPart = parts[0] ?? ""
          const candidateParts =
            /^(mr|mrs|ms|dr)\.?$/i.test(firstPart) && parts.length >= 3 ? parts.slice(1, 3) : parts.slice(0, 2)
          return candidateParts.length === 2 && candidateParts.every((part) => part.length >= 3)
        })

      if (redactable.length === 0) {
        return []
      }

      const redactionPattern = new RegExp(
        redactable.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
        "g"
      )

      return [
        {
          verdict: "mask",
          violation: {
            type: "warning",
            category: "pii",
            description: "Possible full name detected in payload",
            direction: "outbound",
            field_path: fieldPath,
            original_value: text,
            masked_value: text.replace(redactionPattern, "[NAME REDACTED]"),
            rule_id: "pii-name-001",
          },
          transform: {
            field_path: fieldPath,
            apply: (value) => value.replace(redactionPattern, "[NAME REDACTED]"),
          },
        },
      ]
    })
  },
}

const envProdStagingRule: RuleDefinition = {
  id: "env-prod-staging-001",
  evaluate(request) {
    const target = request.target?.toLowerCase() ?? ""
    if (request.context?.env === "staging" && (target.includes("prod") || target.includes("production"))) {
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "environment",
            description: "Staging agent attempted to reach a production target",
            direction: "inbound",
            rule_id: "env-prod-staging-001",
          },
        },
      ]
    }

    return []
  },
}

const destinationDenyRule: RuleDefinition = {
  id: "destination-deny-001",
  evaluate(request) {
    const target = request.target?.toLowerCase() ?? ""
    if (DESTINATION_DENYLIST.some((domain) => target.includes(domain))) {
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "destination",
            description: "Target destination is on the deny list",
            direction: "outbound",
            rule_id: "destination-deny-001",
          },
        },
      ]
    }
    return []
  },
}

const sizePayloadRule: RuleDefinition = {
  id: "size-payload-001",
  evaluate(request) {
    if (JSON.stringify(request.payload).length > 50000) {
      return [
        {
          verdict: "ask",
          violation: {
            type: "warning",
            category: "size",
            description: "Payload exceeds 50KB - requires approval before processing",
            direction: "inbound",
            rule_id: "size-payload-001",
          },
        },
      ]
    }
    return []
  },
}

const credentialAwsRule: RuleDefinition = {
  id: "credential-aws-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      if (!AWS_ACCESS_KEY_REGEX.test(text)) {
        AWS_ACCESS_KEY_REGEX.lastIndex = 0
        return []
      }
      AWS_ACCESS_KEY_REGEX.lastIndex = 0
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "pii",
            description: "AWS access key detected in payload",
            direction: "outbound",
            field_path: fieldPath,
            original_value: text,
            rule_id: "credential-aws-001",
          },
        },
      ]
    })
  },
}

const credentialJwtRule: RuleDefinition = {
  id: "credential-jwt-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      if (!JWT_REGEX.test(text)) {
        JWT_REGEX.lastIndex = 0
        return []
      }
      JWT_REGEX.lastIndex = 0
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "pii",
            description: "JWT token detected in payload",
            direction: "outbound",
            field_path: fieldPath,
            original_value: text,
            rule_id: "credential-jwt-001",
          },
        },
      ]
    })
  },
}

const credentialPrivateKeyRule: RuleDefinition = {
  id: "credential-private-key-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      if (
        !text.includes("-----BEGIN PRIVATE KEY-----") &&
        !text.includes("-----BEGIN RSA PRIVATE KEY-----") &&
        !text.includes("-----BEGIN EC PRIVATE KEY-----")
      ) {
        return []
      }
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "pii",
            description: "Private key detected in payload",
            direction: "outbound",
            field_path: fieldPath,
            original_value: text,
            rule_id: "credential-private-key-001",
          },
        },
      ]
    })
  },
}

function isPrivateHostname(hostname: string): boolean {
  const lowered = hostname.toLowerCase()
  if (lowered === "localhost" || lowered === "127.0.0.1" || lowered === "0.0.0.0" || lowered === "::1") {
    return true
  }
  if (/^10\./.test(lowered)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(lowered)) return true
  if (/^192\.168\./.test(lowered)) return true
  if (/^169\.254\./.test(lowered)) return true
  return false
}

const destinationInternalNetworkRule: RuleDefinition = {
  id: "destination-internal-network-001",
  evaluate(request) {
    if (!request.target) return []
    let hostname = ""
    try {
      hostname = new URL(request.target).hostname
    } catch {
      return []
    }
    if (!isPrivateHostname(hostname)) return []
    return [
      {
        verdict: "block",
        violation: {
          type: "error",
          category: "destination",
          description: "Target resolves to an internal or private network address",
          direction: "outbound",
          rule_id: "destination-internal-network-001",
        },
      },
    ]
  },
}

const injectionPromptRule: RuleDefinition = {
  id: "injection-prompt-001",
  evaluate(request) {
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      const lowered = text.toLowerCase()
      if (!PROMPT_INJECTION_PATTERNS.some((pattern) => lowered.includes(pattern))) {
        return []
      }
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "schema",
            description: "Potential prompt injection pattern detected in payload",
            direction: "inbound",
            field_path: fieldPath,
            original_value: text,
            rule_id: "injection-prompt-001",
          },
        },
      ]
    })
  },
}

const injectionSqlRule: RuleDefinition = {
  id: "injection-sql-001",
  evaluate(request) {
    if (request.action_type !== "db_write") return []
    return walkStrings(request.payload, "payload", ({ text, fieldPath }) => {
      if (
        !SQL_INJECTION_REGEX_1.test(text) &&
        !SQL_INJECTION_REGEX_2.test(text) &&
        !SQL_INJECTION_REGEX_3.test(text)
      ) {
        return []
      }
      return [
        {
          verdict: "block",
          violation: {
            type: "error",
            category: "schema",
            description: "SQL injection pattern detected in database write payload",
            direction: "inbound",
            field_path: fieldPath,
            original_value: text,
            rule_id: "injection-sql-001",
          },
        },
      ]
    })
  },
}

export const RULES_REGISTRY: RuleDefinition[] = [
  piiEmailRule,
  piiPhoneRule,
  piiNameRule,
  envProdStagingRule,
  destinationDenyRule,
  credentialAwsRule,
  credentialJwtRule,
  credentialPrivateKeyRule,
  destinationInternalNetworkRule,
  injectionPromptRule,
  injectionSqlRule,
  sizePayloadRule,
]
