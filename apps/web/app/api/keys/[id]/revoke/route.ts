import { createServerClient, getUser } from "@breakpoint/lib"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(_: Request, { params }: RouteParams) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createServerClient()

  const now = new Date()
  const graceExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { error } = await supabase
    .from("api_keys" as never)
    .update(
      {
        revoked_at: now.toISOString(),
        grace_expires_at: graceExpiresAt.toISOString(),
        is_active: true,
      } as never
    )
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
