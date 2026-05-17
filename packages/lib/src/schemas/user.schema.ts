import { z } from "zod"

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  full_name: z.string().optional(),
  avatar_url: z.url().optional(),
})

export type User = z.infer<typeof userSchema>