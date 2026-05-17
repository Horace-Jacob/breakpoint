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

  const { error } = await supabase
    .from("api_keys" as never)
    .update(
      {
        revoked_at: null,
        grace_expires_at: null,
      } as never
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)

  if (error) {
    return NextResponse.json({ error: "Failed to cancel key revocation" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
