import { createServerClient, getUser, type InspectionEvent, type PolicyViolation } from "@breakpoint/lib"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: event, error: eventError } = (await supabase
      .from("inspection_events" as never)
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()) as {
      data: InspectionEvent | null
      error: { message: string } | null
    }

    if (eventError) {
      return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { data: violations, error: violationsError } = (await supabase
      .from("policy_violations" as never)
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true })) as {
      data: PolicyViolation[] | null
      error: { message: string } | null
    }

    if (violationsError) {
      return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 })
    }

    return NextResponse.json({
      event,
      violations: violations ?? [],
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
