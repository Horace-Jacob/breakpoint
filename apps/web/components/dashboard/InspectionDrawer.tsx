"use client"

import type { InspectionEvent, PolicyViolation } from "@breakpoint/lib"
import { AlertCircle, ChevronDown, ChevronRight, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"

interface InspectionDrawerProps {
  eventId: string | null
  onClose: () => void
}

interface EventResponse {
  event: InspectionEvent
  violations: PolicyViolation[]
}

function scoreClass(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400"
  if (score >= 50) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function progressClass(score: number) {
  if (score >= 80) return "bg-green-500"
  if (score >= 50) return "bg-amber-500"
  return "bg-red-500"
}

function verdictClass(verdict: InspectionEvent["verdict"]) {
  if (verdict === "allow") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  if (verdict === "mask" || verdict === "fix") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
  if (verdict === "block") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
}

function riskClass(risk: InspectionEvent["risk_level"]) {
  if (risk === "low") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  if (risk === "medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
  if (risk === "high") return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
}

function violationBorder(type: PolicyViolation["type"]) {
  if (type === "error") return "border-l-red-500"
  if (type === "warning") return "border-l-amber-500"
  return "border-l-blue-500"
}

function categoryClass(category: PolicyViolation["category"]) {
  if (category === "pii") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
  if (category === "destination") return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
  if (category === "environment") return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
  if (category === "size") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  if (category === "rate_limit") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
  return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
}

function directionClass(direction: PolicyViolation["direction"]) {
  if (direction === "inbound") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
  return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
}

function formatTimestamp(input: string) {
  const date = new Date(input)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", " at")
}

function summarize(event: InspectionEvent, violationsCount: number) {
  const agent = event.agent_id ?? "unknown"
  const target = event.target ?? "an unknown target"
  const actionTail =
    event.verdict === "block"
      ? "blocked the action entirely."
      : event.verdict === "mask"
        ? "masked sensitive data before allowing it through."
        : event.verdict === "fix"
          ? "fixed the payload before allowing it through."
          : event.verdict === "ask"
            ? "flagged it for human review."
            : "allowed the action through."
  return `The agent ${agent} attempted a ${event.action_type} to ${target}. Breakpoint detected ${violationsCount} violation(s) and ${actionTail}`
}

function safeHighlightJson(payload: unknown) {
  const escaped = JSON.stringify(payload, null, 2)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

  return escaped
    .replace(/"([^"\\]*(?:\\.[^"\\]*)*)":/g, '<span class="text-blue-600 dark:text-blue-400">"$1"</span>:')
    .replace(/:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, ': <span class="text-green-600 dark:text-green-400">"$1"</span>')
    .replace(
      /:\s(-?\d+(?:\.\d+)?|true|false|null)/g,
      ': <span class="text-amber-600 dark:text-amber-400">$1</span>'
    )
}

export function InspectionDrawer({ eventId, onClose }: InspectionDrawerProps) {
  const [event, setEvent] = useState<InspectionEvent | null>(null)
  const [violations, setViolations] = useState<PolicyViolation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPayload, setShowPayload] = useState(false)
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({})
  const [scoreBarWidth, setScoreBarWidth] = useState(0)
  const isOpen = eventId !== null

  const fetchTrace = async () => {
    if (!eventId) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error("Failed")
      const json = (await response.json()) as EventResponse
      setEvent(json.event)
      setViolations(json.violations)
    } catch {
      setError("Failed to load trace")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setEvent(null)
      setViolations([])
      setShowPayload(false)
      setOpenDetails({})
      setScoreBarWidth(0)
      return
    }
    void fetchTrace()
  }, [eventId, isOpen])

  useEffect(() => {
    if (!isOpen || !event) return
    setScoreBarWidth(0)
    const t = window.setTimeout(() => setScoreBarWidth(Math.max(0, Math.min(100, event.score))), 50)
    return () => window.clearTimeout(t)
  }, [isOpen, event])

  useEffect(() => {
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden")
    } else {
      document.body.classList.remove("overflow-hidden")
    }
    return () => document.body.classList.remove("overflow-hidden")
  }, [isOpen])

  const payloadTitle = event
    ? event.verdict === "block"
      ? "Blocked Payload"
      : event.verdict === "mask" || event.verdict === "fix"
        ? "Outbound Payload"
        : "Original Payload"
    : "Payload"

  const payloadValue = useMemo(() => {
    if (!event) return null
    if (event.verdict === "mask" || event.verdict === "fix") return event.outbound_payload ?? event.inbound_payload
    return event.inbound_payload
  }, [event])

  const fixes = violations.filter((v) => v.masked_value)

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 h-full w-[480px] max-w-full bg-background border-l border-border shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 z-10 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : event ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Run Trace</p>
                  <p className="font-mono text-sm">
                    {event.id.slice(0, 8)}…{event.id.slice(-4)}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Badge className={verdictClass(event.verdict)}>{event.verdict}</Badge>
                <Badge className={riskClass(event.risk_level)}>{event.risk_level}</Badge>
              </div>

              <p className="text-sm text-muted-foreground">{formatTimestamp(event.created_at)}</p>
              {event.agent_id ? (
                <div>
                  <p className="text-xs text-muted-foreground">Agent</p>
                  <p className="text-sm font-mono">{event.agent_id}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {loading ? (
          <div className="px-6 py-5 space-y-6">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="font-medium">Failed to load trace</p>
            <Button variant="outline" onClick={() => void fetchTrace()}>
              Try again
            </Button>
          </div>
        ) : event ? (
          <div className="px-6 py-5 space-y-6">
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">{summarize(event, violations.length)}</p>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Safety Score</p>
                  <p className={`font-mono font-bold ${scoreClass(event.score)}`}>{event.score}</p>
                </div>
                <div className="w-full h-2 rounded-full bg-muted mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${progressClass(event.score)}`}
                    style={{ width: `${scoreBarWidth}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border rounded-lg border">
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">Rules Checked</p>
                  <p className="text-sm font-medium">{event.rules_checked}</p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">Rules Fired</p>
                  <p className="text-sm font-medium">{event.rules_fired}</p>
                </div>
              </div>
            </section>

            {violations.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Violations</p>
                  <Badge variant="outline">{violations.length}</Badge>
                </div>

                {violations.map((violation, idx) => {
                  const key = `${violation.rule_id}-${idx}`
                  const open = Boolean(openDetails[key])
                  return (
                    <div key={key} className={`rounded-lg border-l-4 bg-muted/30 p-4 space-y-3 ${violationBorder(violation.type)}`}>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryClass(violation.category)}`}>
                          {violation.category}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${directionClass(violation.direction)}`}>
                          {violation.direction}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium mt-2">{violation.description}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{violation.rule_id}</p>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        onClick={() =>
                          setOpenDetails((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                      >
                        Technical detail
                        <ChevronDown className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${open ? "max-h-40" : "max-h-0"}`}>
                        <div className="space-y-1">
                          {violation.field_path ? (
                            <p className="text-xs font-mono">Path: {violation.field_path}</p>
                          ) : null}
                          {violation.original_value ? (
                            <p className="text-xs font-mono">Original: {violation.original_value}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </section>
            ) : null}

            {fixes.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Fixes Applied</p>
                  <Badge variant="outline">{fixes.length}</Badge>
                </div>
                {fixes.map((violation, idx) => (
                  <div key={`${violation.rule_id}-fix-${idx}`} className="rounded-lg bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{violation.description}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${directionClass(violation.direction)}`}>
                        {violation.direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-sm line-through text-red-500 dark:text-red-400">
                        {violation.original_value ?? "—"}
                      </p>
                      <ChevronRight className="size-4 text-muted-foreground" />
                      <p className="font-mono text-sm text-green-600 dark:text-green-400">
                        {violation.masked_value}
                      </p>
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{payloadTitle}</p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground flex items-center gap-1"
                  onClick={() => setShowPayload((prev) => !prev)}
                >
                  {showPayload ? "Hide JSON" : "Show JSON"}
                  <ChevronDown className={`size-3 transition-transform duration-200 ${showPayload ? "rotate-180" : "rotate-0"}`} />
                </button>
              </div>
              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${showPayload ? "max-h-64" : "max-h-0"}`}>
                <div className="max-h-64 overflow-y-auto rounded-lg bg-muted p-4">
                  <pre className="font-mono text-xs whitespace-pre-wrap">
                    <code dangerouslySetInnerHTML={{ __html: safeHighlightJson(payloadValue) }} />
                  </pre>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </>
  )
}
