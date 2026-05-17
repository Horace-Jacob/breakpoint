import { createServerSupabaseClient } from "../supabase/server"

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data.user ?? null
}