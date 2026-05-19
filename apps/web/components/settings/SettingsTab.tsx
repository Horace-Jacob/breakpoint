"use client"

import { AlertTriangle, Check, Copy } from "lucide-react"
import { useState } from "react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

type FailBehavior = "closed" | "open"

interface SettingsTabProps {
  failBehavior: string
  appUrl: string
  onSave: (failBehavior: FailBehavior) => void
}

export function SettingsTab({ failBehavior, appUrl, onSave }: SettingsTabProps) {
  const [selected, setSelected] = useState<FailBehavior>(failBehavior === "open" ? "open" : "closed")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const endpoint = `${appUrl || ""}/api/inspect`

  const requestBodyExample = `{
  "action_type": "http_call",    // http_call | db_write | message | file_write
  "target": "https://...",       // URL or identifier of the destination (optional)
  "payload": { ... },            // The data your agent is about to send (required)
  "agent_id": "my-agent",        // A name for your agent (optional)
  "context": {
    "env": "production"          // production | staging | development (optional)
  }
}`

  const responseExample = `{
  "verdict": "mask",             // allow | mask | fix | block | ask
  "modified_payload": { ... },   // Use this instead of original if verdict is mask/fix
  "rule_fired": "pii-email-001", // Which rule determined the verdict
  "reason": "Email address detected in payload",
  "score": 90,                   // 0-100 safety score
  "risk_level": "low",           // low | medium | high | critical
  "event_id": "evt_abc123",      // Use for audit trail reference
  "usage": {
    "current": 45,               // Inspections used this month
    "limit": 100                // Your monthly limit
  },
  "fail_behavior": "open"       // open | closed  
}`

  const savePreference = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fail_behavior: selected }),
      })
      if (!response.ok) {
        throw new Error("Failed to save")
      }
      onSave(selected)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  const authSnippet = "Authorization: Bearer bp_live_your_api_key_here"

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Fail Behavior</h2>
          <p className="text-sm text-muted-foreground">
            Controls what your pipeline should do if Breakpoint is unreachable or times out.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setSelected("closed")}
            className={`rounded-xl border p-4 text-left transition-colors duration-150 ${
              selected === "closed" ? "border-primary ring-1 ring-primary/30" : "border-border"
            }`}
          >
            <p className="inline-flex items-center gap-2 font-medium">
              Fail Closed
              <Badge className="badge-success">
                Recommended
              </Badge>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If Breakpoint is unreachable, your pipeline stops and returns an error. Safer - no uninspected actions
              reach the real world.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelected("open")}
            className={`rounded-xl border p-4 text-left transition-colors duration-150 ${
              selected === "open" ? "border-primary ring-1 ring-primary/30" : "border-border"
            }`}
          >
            <p className="font-medium">Fail Open</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If Breakpoint is unreachable, your pipeline continues without inspection. Use only if uptime is more
              critical than safety for your use case.
            </p>
          </button>
        </div>

        {selected === "open" ? (
          <div className="inline-flex items-start gap-2 rounded-lg border border-amber-200/50 bg-amber-100/40 p-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4" />
            When fail open is enabled, your actions will not be inspected if Breakpoint is down.
          </div>
        ) : null}

        <Button onClick={() => void savePreference()} disabled={isSaving} className="transition-colors duration-150">
          {saved ? <Check className="size-4" /> : null}
          Save preference
        </Button>
      </section>

      <section className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">API Reference</h2>
          <p className="text-sm text-muted-foreground">
            Use this reference to configure your n8n HTTP Request node or any HTTP client.
          </p>
        </div>

        <ReferenceBlock
          title="Endpoint"
          content={endpoint}
          badge="POST"
          onCopy={() => void copyText("endpoint", endpoint)}
          copied={copiedId === "endpoint"}
        />

        <div className="space-y-2">
          <CodeBlock
            id="auth"
            title="Authentication"
            code={authSnippet}
            copied={copiedId === "auth"}
            onCopy={() => void copyText("auth", authSnippet)}
          />
          <p className="text-sm text-muted-foreground">
            Get your API key from the API Keys page.{" "}
            <a href="/dashboard/api-keys" className="underline">
              Go to API Keys
            </a>
          </p>
        </div>

        <CodeBlock
          id="request"
          title="Request Body"
          code={requestBodyExample}
          copied={copiedId === "request"}
          onCopy={() => void copyText("request", requestBodyExample)}
        />

        <CodeBlock
          id="response"
          title="Response"
          code={responseExample}
          copied={copiedId === "response"}
          onCopy={() => void copyText("response", responseExample)}
        />
      </section>
    </div>
  )
}

function ReferenceBlock({
  title,
  content,
  badge,
  onCopy,
  copied,
}: {
  title: string
  content: string
  badge: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <CopyButton copied={copied} onClick={onCopy} />
      </div>
      <div className="flex items-center gap-2 bg-muted px-4 py-3 font-mono text-xs">
        <Badge variant="outline" className="font-mono text-[10px]">
          {badge}
        </Badge>
        <span className="truncate">{content}</span>
      </div>
    </div>
  )
}

function CodeBlock({
  id,
  code,
  copied,
  onCopy,
  title,
}: {
  id: string
  code: string
  copied: boolean
  onCopy: () => void
  title?: string
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <CopyButton copied={copied} onClick={onCopy} />
      </div>
      <pre className="overflow-x-auto bg-muted p-4 font-mono text-xs border-hidden">{code}</pre>
    </div>
  )
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      className="transition-colors duration-150"
      aria-label="Copy"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  )
}
