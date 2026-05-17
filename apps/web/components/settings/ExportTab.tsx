"use client"

import { Download, FileJson, FileSpreadsheet, FileText, Loader2, Shield } from "lucide-react"
import { useState } from "react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

interface ExportTabProps {
  userId: string
}

type ExportFormat = "csv" | "json" | "ndjson"
type StatusFilter = "all" | "allow" | "mask" | "fix" | "block"

export function ExportTab({ userId }: ExportTabProps) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null)

  const handleDownload = async (format: ExportFormat) => {
    setLoadingFormat(format)
    try {
      const params = new URLSearchParams({ format, status, user_id: userId })
      if (from) params.set("from", from)
      if (to) params.set("to", to)

      const response = await fetch(`/api/settings/export?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to export")
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get("content-disposition") ?? ""
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/)
      const fileName = fileNameMatch?.[1] ?? `breakpoint-export.${format}`

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Filter</p>
          <p className="text-sm text-muted-foreground">Leave blank to export all runs.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors duration-150"
            >
              <option value="all" className="text-black">All</option>
              <option value="allow" className="text-black">Passed</option>
              <option value="fix" className="text-black">Fixed</option>
              <option value="block" className="text-black">Blocked</option>
              <option value="mask" className="text-black">Mask</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Download Audit Log</p>
          <p className="text-sm text-muted-foreground">
            Exports include: run ID, timestamps, scores, verdict, risk, agent ID, rules fired, fixes applied, and
            violations.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FormatCard
            title="CSV"
            extension=".csv"
            description="Flat spreadsheet — ID, timestamp, score, verdict, risk, agent, duration"
            icon={<FileSpreadsheet className="size-5 text-emerald-500" />}
            loading={loadingFormat === "csv"}
            onDownload={() => void handleDownload("csv")}
          />
          <FormatCard
            title="JSON"
            extension=".json"
            description="Full export including all violations, fixes, and payload details"
            icon={<FileJson className="size-5 text-blue-500" />}
            loading={loadingFormat === "json"}
            onDownload={() => void handleDownload("json")}
          />
          <FormatCard
            title="NDJSON"
            extension=".ndjson"
            description="Newline-delimited JSON — compatible with BigQuery and log pipelines"
            icon={<FileText className="size-5 text-violet-500" />}
            loading={loadingFormat === "ndjson"}
            onDownload={() => void handleDownload("ndjson")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 size-5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Tamper-evident audit trail</p>
            <p className="text-sm text-muted-foreground">
              Every run includes a SHA-256 hash of the request and verdict. Cross-reference these in your export to
              verify log integrity.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function FormatCard({
  title,
  extension,
  description,
  icon,
  loading,
  onDownload,
}: {
  title: string
  extension: string
  description: string
  icon: React.ReactNode
  loading: boolean
  onDownload: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-medium">{title}</p>
        <Badge variant="outline" className="font-mono text-[10px]">
          {extension}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" onClick={onDownload} disabled={loading} className="w-full transition-colors duration-150">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download
      </Button>
    </div>
  )
}


