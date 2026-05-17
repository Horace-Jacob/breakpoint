import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"

const UpdateUsageLimitSchema = z.object({
  user_id: z.uuid(),
  inspection_limit: z.number().int().min(1).max(1_000_000),
})

export async function PATCH(request: Request) {
  const adminSecret = process.env.NEXT_PUBLIC_BREAKPOINT_ADMIN_SECRET

  if (!adminSecret) {
    return NextResponse.json({ error: "Server is missing admin configuration" }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
  }

  const providedSecret = authHeader.slice("Bearer ".length).trim()
  if (!providedSecret || providedSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = UpdateUsageLimitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server is missing Supabase configuration" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("user_settings" as never)
    .upsert(
      {
        user_id: parsed.data.user_id,
        monthly_inspection_limit: parsed.data.inspection_limit,
        updated_at: now,
      } as never,
      { onConflict: "user_id" }
    )
    .select("user_id, monthly_inspection_limit, updated_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update inspection limit" }, { status: 500 })
  }

  return NextResponse.json({ success: true, settings: data })
}
