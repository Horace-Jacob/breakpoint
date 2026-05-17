"use client"

import type { LucideIcon } from "lucide-react"
import { Plus } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

const WaitingIllustration = () => (
  <svg
    width="120"
    height="96"
    viewBox="0 0 120 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="mb-6"
  >
    <rect
      x="46"
      y="32"
      width="28"
      height="32"
      rx="4"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-primary"
    />
    <line
      x1="60"
      y1="32"
      x2="60"
      y2="64"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-primary"
    />
    <line
      x1="20"
      y1="48"
      x2="46"
      y2="48"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="4 3"
      className="text-muted-foreground"
    />
    <line
      x1="74"
      y1="48"
      x2="100"
      y2="48"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="4 3"
      className="text-muted-foreground"
    />
    <circle
      cx="14"
      cy="48"
      r="6"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-muted-foreground"
    />
    <circle
      cx="106"
      cy="48"
      r="6"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-muted-foreground"
    />
    <line
      x1="60"
      y1="10"
      x2="60"
      y2="32"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="4 3"
      className="text-muted-foreground"
    />
    <circle
      cx="60"
      cy="6"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-muted-foreground"
    />
    <line
      x1="60"
      y1="64"
      x2="60"
      y2="86"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="4 3"
      className="text-muted-foreground"
    />
    <circle
      cx="60"
      cy="90"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-muted-foreground"
    />
    <line
      x1="52"
      y1="44"
      x2="52"
      y2="52"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-primary"
    />
    <line
      x1="60"
      y1="42"
      x2="60"
      y2="54"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-primary"
    />
    <line
      x1="68"
      y1="44"
      x2="68"
      y2="52"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-primary"
    />
  </svg>
)

interface EmptyStateProps {
  icon?: LucideIcon
  heading?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  actionIcon?: ReactNode
  hideAction?: boolean
}

export function EmptyState({
  icon: Icon,
  heading = "Connect your first agent",
  description = "Your agent activity will appear here once you connect your first agent.",
  actionLabel = "Connect an Agent",
  onAction,
  actionDisabled = true,
  actionIcon = <Plus className="w-4 h-4" />,
  hideAction = false,
}: EmptyStateProps = {}) {
  return (
    <div className="flex flex-col items-center text-center py-16 max-w-sm mx-auto">
      {Icon ? <Icon className="w-10 h-10 text-muted-foreground mb-4" /> : <WaitingIllustration />}
      <h2 className="text-lg font-semibold text-foreground mt-2">{heading}</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6 leading-relaxed">{description}</p>
      {!hideAction && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block" tabIndex={0}>
                <Button
                  disabled={actionDisabled}
                  onClick={onAction}
                  variant="outline"
                  className="gap-2 transition-colors duration-150"
                >
                  {actionIcon}
                  {actionLabel}
                </Button>
              </span>
            </TooltipTrigger>
            {actionDisabled && (
              <TooltipContent>
                <p>Coming soon</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
