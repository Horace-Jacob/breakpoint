import { createServerClient, getUser, type InspectionEvent } from "@breakpoint/lib"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1)
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "20") || 20))
    const start = (page - 1) * limit
    const end = page * limit - 1

    const supabase = await createServerClient()
    const { data, count, error } = (await supabase
      .from("inspection_events" as never)
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(start, end)) as {
      data: InspectionEvent[] | null
      count: number | null
      error: { message: string } | null
    }

    if (error) {
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      data: data ?? [],
      total,
      page,
      totalPages,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
