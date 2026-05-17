import { BreakpointLogo } from "@breakpoint/ui"
import { getUser } from "@breakpoint/lib"
import { redirect } from "next/navigation"
import { SignInButton } from "../components/auth/SignInButton"

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const user = await getUser()
  if (user) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const hasError = params.error === "auth_error"

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex items-center gap-2 mb-8">
        <BreakpointLogo size={36} />
        <span className="font-semibold text-lg text-foreground">Breakpoint</span>
      </div>

      <div className="bg-card border border-border rounded-lg p-8 shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Catch bad agent actions before they run.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-6">
          A rule engine that sits between your AI agents and the outside world. Validate payloads,
          enforce policies, score risk, and log every decision before execution.
        </p>

        <SignInButton />

        {hasError && (
          <p className="text-sm text-danger text-center mt-3">
            Authentication failed. Please try again.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-5">Built for teams shipping AI agents.</p>
    </div>
  )
}
