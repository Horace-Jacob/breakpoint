import { createServerClient, getUser } from "@breakpoint/lib"
import crypto from "node:crypto"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name) {
    return NextResponse.json({ error: "Missing key name" }, { status: 400 })
  }

  const key = `bp_live_${crypto.randomBytes(32).toString("hex")}`
  const keyHash = crypto.createHash("sha256").update(key).digest("hex")
  const prefix = key.substring(0, 12)

  const supabase = await createServerClient()
  const { count: activeKeyCount, error: countError } = await supabase
    .from("api_keys" as never)
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true)

  if (countError) {
    return NextResponse.json({ error: "Failed to validate API key limit" }, { status: 500 })
  }

  if ((activeKeyCount ?? 0) >= 2) {
    return NextResponse.json(
      { error: "You can only have 2 active API keys at a time. Revoke one key before creating another." },
      { status: 409 }
    )
  }

  const { data, error } = (await supabase
    .from("api_keys" as never)
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: prefix,
      is_active: true,
    } as never)
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    key,
    prefix,
  })
}
