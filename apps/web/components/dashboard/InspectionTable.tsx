"use client"

import { useQuery } from "@tanstack/react-query"
import type { InspectionEvent } from "@breakpoint/lib"
import { Check, Copy, ShieldCheck } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { EmptyState } from "./EmptyState"
import { FilterBar, type RiskFilter, type VerdictFilter } from "./FilterBar"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

interface InspectionTableProps {
  initialData: InspectionEvent[]
  totalCount: number
  userId: string
  setSelectedEventId: (id: string | null) => void
}

interface EventsResponse {
  data: InspectionEvent[]
  total: number
  page: number
  totalPages: number
}

const PAGE_SIZE = 20

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value
}

function matchesVerdict(verdict: InspectionEvent["verdict"], filter: VerdictFilter) {
  if (filter === "all") return true
  if (filter === "allow") return verdict === "allow"
  if (filter === "fixed") return verdict === "mask" || verdict === "fix"
  return verdict === "block"
}

function matchesRisk(risk: InspectionEvent["risk_level"], filter: RiskFilter) {
  if (filter === "all") return true
  return risk === filter
}

function verdictClass(verdict: InspectionEvent["verdict"]) {
  if (verdict === "allow")
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent"
  if (verdict === "mask" || verdict === "fix")
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent"
  if (verdict === "block")
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent"
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-transparent"
}

function riskClass(risk: InspectionEvent["risk_level"]) {
  if (risk === "low")
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent"
  if (risk === "medium")
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent"
  if (risk === "high")
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-transparent"
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent"
}

function scoreClass(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400"
  if (score >= 50) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function formatTimestamp(input: string) {
  const date = new Date(input)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

async function fetchEvents(page: number): Promise<EventsResponse> {
  const response = await fetch(`/api/events?page=${page}&limit=${PAGE_SIZE}`, {
    method: "GET",
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error("Failed to fetch events")
  }
  return (await response.json()) as EventsResponse
}

// function ApiInspectGuideModal() {
//   const [copied, setCopied] = useState(false)
//   const code = `curl -X POST https://your-domain.com/api/inspect \\
//   -H "Authorization: Bearer bp_live_..." \\
//   -H "Content-Type: application/json" \\
//   -d '{"action_type":"message","payload":{"text":"Hello world"}}'`

//   const copy = async () => {
//     await navigator.clipboard.writeText(code)
//     setCopied(true)
//     window.setTimeout(() => setCopied(false), 2000)
//   }

//   return (
//     <Dialog>
//       <DialogTrigger asChild>
//         <Button variant="outline" size="sm" className="transition-colors duration-150">
//           Inspect API Guide
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-2xl">
//         <DialogHeader>
//           <DialogTitle>How to Call /api/inspect</DialogTitle>
//           <DialogDescription>
//             Use your API key as a Bearer token, then send an action payload for rule evaluation.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="space-y-3">
//           <pre className="font-mono text-xs bg-muted rounded-lg p-4 overflow-x-auto">{code}</pre>
//           <Button variant="outline" size="sm" onClick={copy} className="transition-colors duration-150">
//             {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
//             {copied ? "Copied" : "Copy command"}
//           </Button>
//         </div>
//         <div className="space-y-2 text-sm text-muted-foreground">
//           <p>1. Create an API key from the API Keys page and copy it immediately.</p>
//           <p>2. Replace `bp_live_...` with your full key value.</p>
//           <p>3. Set `action_type` and `payload` to match your agent action.</p>
//           <p>4. Check the response for verdict, risk level, violations, and transformed payload.</p>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }

export function InspectionTable({
  initialData,
  totalCount,
  userId,
  setSelectedEventId,
}: InspectionTableProps) {
  const [page, setPage] = useState(1)
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all")
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all")
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const tableRef = useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: ["events", userId, page],
    queryFn: () => fetchEvents(page),
    initialData: page === 1 ? { data: initialData, total: totalCount, page: 1, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) } : undefined,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (query.dataUpdatedAt > 0) {
      setLastRefresh(query.dataUpdatedAt)
      setSecondsAgo(0)
    }
  }, [query.dataUpdatedAt])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lastRefresh])

  const data = query.data?.data ?? []
  const total = query.data?.total ?? 0
  const totalPages = query.data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filteredData = useMemo(
    () =>
      data.filter(
        (event) =>
          matchesVerdict(event.verdict, verdictFilter) && matchesRisk(event.risk_level, riskFilter)
      ),
    [data, verdictFilter, riskFilter]
  )

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return
    setPage(nextPage)
    tableRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleVerdictChange = (value: VerdictFilter) => {
    setVerdictFilter(value)
    setPage(1)
  }

  const handleRiskChange = (value: RiskFilter) => {
    setRiskFilter(value)
    setPage(1)
  }

  if (total === 0 && !query.isFetching) {
    return (
      <div className="mt-8" data-user-id={userId}>
        {/* <div className="flex items-center justify-end mb-4">
          <ApiInspectGuideModal />
        </div> */}
        <EmptyState
          icon={ShieldCheck}
          heading="No inspections yet"
          description="Send your first request to /api/inspect to see activity here."
          hideAction
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 mt-8" data-user-id={userId}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Inspection Log</h2>
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">Updated {secondsAgo} seconds ago</p>
          {/* <ApiInspectGuideModal /> */}
        </div>
      </div>

      <FilterBar
        verdictFilter={verdictFilter}
        riskFilter={riskFilter}
        onVerdictChange={handleVerdictChange}
        onRiskChange={handleRiskChange}
      />

      <div ref={tableRef} className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] divide-y divide-border">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground text-left">
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2">Agent ID</th>
              <th className="px-3 py-2">Action Type</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Rules Fired</th>
              <th className="px-3 py-2">Verdict</th>
              <th className="px-3 py-2">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.map((event) => (
              <tr
                key={event.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-150"
                onClick={() => setSelectedEventId(event.id)}
              >
                <td className="px-3 py-3 text-sm">{formatTimestamp(event.created_at)}</td>
                <td className="px-3 py-3 text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{truncate(event.agent_id ?? "-", 20)}</span>
                      </TooltipTrigger>
                      <TooltipContent>{event.agent_id ?? "-"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-3 py-3">
                  <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">
                    {event.action_type}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{truncate(event.target ?? "-", 30)}</span>
                      </TooltipTrigger>
                      <TooltipContent>{event.target ?? "-"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className={`px-3 py-3 font-mono font-medium ${scoreClass(event.score)}`}>
                  {event.score}
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {event.rules_fired}/{event.rules_checked}
                </td>
                <td className="px-3 py-3">
                  <Badge
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdictClass(event.verdict)}`}
                  >
                    {event.verdict}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${riskClass(
                      event.risk_level
                    )}`}
                  >
                    {event.risk_level}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => changePage(page - 1)}
          disabled={page <= 1}
          className="transition-colors duration-150"
        >
          {"<- Previous"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => changePage(page + 1)}
          disabled={page >= totalPages}
          className="transition-colors duration-150"
        >
          {"Next ->"}
        </Button>
      </div>
    </div>
  )
}
