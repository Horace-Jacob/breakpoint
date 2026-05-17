import { createServerClient, getUser, type ApiKey } from "@breakpoint/lib"
import { redirect } from "next/navigation"

import { ApiKeyList } from "../../../components/dashboard/ApiKeyList"

export const metadata = {
  title: "API Keys - Breakpoint",
}

export default async function ApiKeysPage() {
  const user = await getUser()
  if (!user) {
    redirect("/")
  }

  const supabase = await createServerClient()
  const { data } = await supabase
    .from("api_keys" as never)
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  return <ApiKeyList initialKeys={(data ?? []) as ApiKey[]} />
}
