"use client"

import { Clock3, Loader2, TriangleAlert, Zap } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "../ui/button"

interface UsageTabProps {
  currentCount: number
  limit: number
  monthLabel: string
  resetDate: string
}

export function UsageTab({ currentCount, limit, monthLabel, resetDate }: UsageTabProps) {
  const [count, setCount] = useState(currentCount)
  const [monthlyLimit, setMonthlyLimit] = useState(limit)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const percent = useMemo(() => {
    if (monthlyLimit <= 0) return 0
    return Math.min(100, Math.round((count / monthlyLimit) * 100))
  }, [count, monthlyLimit])

  const remaining = Math.max(0, monthlyLimit - count)
  const warning = percent >= 90
  const progressColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-green-500"

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/settings", { method: "GET" })
      if (!response.ok) {
        throw new Error("Failed to refresh")
      }
      const data = (await response.json()) as {
        usage: { current_count: number; limit: number }
      }
      setCount(data.usage.current_count)
      setMonthlyLimit(data.usage.limit)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-amber-200/40 bg-card p-5">
        <div className="flex items-start gap-3">
          <Zap className="size-5 text-amber-500" />
          <div className="space-y-1">
            <p className="font-semibold">Free Tier</p>
            <p className="text-sm text-muted-foreground">
              100 inspections per month. Resets on the first of each month at midnight UTC.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Monthly Inspections</p>
            <p className="text-sm text-muted-foreground">Inspections used this month ({monthLabel})</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={isRefreshing}>
            {isRefreshing && <Loader2 className="size-4 animate-spin" />}
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-4xl font-bold">
            {count.toLocaleString()} <span className="text-base font-normal text-muted-foreground">/ {monthlyLimit.toLocaleString()} inspections</span>
          </p>
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className={`h-3 rounded-full ${progressColor} transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(100, (count / Math.max(1, monthlyLimit)) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <p>{percent}% used</p>
            <p>{remaining.toLocaleString()} remaining</p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Resets on {resetDate} (midnight UTC)
          </p>
        </div>

        {warning ? (
          <div className="rounded-lg border border-amber-200/50 bg-amber-100/40 p-3 text-sm text-amber-800 dark:text-amber-300">
            You're approaching your monthly limit. Contact us to discuss your needs.
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-4 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">About the usage limit</p>
            <p className="text-sm text-muted-foreground">
              Each inspection runs your payload through the full rule engine. Your monthly limit of 100 inspections
              resets on the first of each month. Need more? Reach out and we'll work something out.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}


