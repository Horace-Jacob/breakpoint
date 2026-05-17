"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BreakpointThemeProvider } from "@breakpoint/ui"
import { useState } from "react"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BreakpointThemeProvider>{children}</BreakpointThemeProvider>
    </QueryClientProvider>
  )
}
