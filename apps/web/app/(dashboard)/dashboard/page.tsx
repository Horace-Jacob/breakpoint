import { createServerClient, getUser, type InspectionEvent } from "@breakpoint/lib"
import { redirect } from "next/navigation"

import { DashboardClient } from "../../../components/dashboard/DashboardClient"
import { StatCard } from "../../../components/dashboard/StatCard"

export const metadata = {
  title: "Dashboard - Breakpoint",
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) {
    redirect("/")
  }

  const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? "there"
  const supabase = await createServerClient()

  const startOfTodayUtc = new Date()
  startOfTodayUtc.setUTCHours(0, 0, 0, 0)
  const since = startOfTodayUtc.toISOString()

  const [totalRunsResult, avgScoreResult, fixesTodayResult, blockedTodayResult, firstPageEventsResult] =
    await Promise.all([
      supabase
        .from("inspection_events" as never)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("inspection_events" as never)
        .select("score")
        .eq("user_id", user.id),
      supabase
        .from("inspection_events" as never)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since)
        .in("verdict", ["mask", "fix"]),
      supabase
        .from("inspection_events" as never)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since)
        .eq("verdict", "block"),
      supabase
        .from("inspection_events" as never)
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(0, 19),
    ])

  const totalRuns = totalRunsResult.count ?? 0
  const avgSource = ((avgScoreResult.data as Array<{ score: number }> | null) ?? []).map(
    (row) => row.score
  )
  const avgScore =
    avgSource.length > 0
      ? avgSource.reduce((sum, score) => sum + score, 0) / avgSource.length
      : 0
  const fixesToday = fixesTodayResult.count ?? 0
  const blockedToday = blockedTodayResult.count ?? 0

  const initialData = (firstPageEventsResult.data as InspectionEvent[] | null) ?? []
  const totalCount = firstPageEventsResult.count ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, {firstName}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={String(totalRuns)} icon="activity" />
        <StatCard label="Avg Score" value={avgScore.toFixed(1)} icon="target" />
        <StatCard label="Fixes Today" value={String(fixesToday)} icon="wrench" />
        <StatCard label="Blocked Today" value={String(blockedToday)} icon="shieldOff" />
      </div>

      <DashboardClient initialData={initialData} totalCount={totalCount} userId={user.id} />
    </div>
  )
}
