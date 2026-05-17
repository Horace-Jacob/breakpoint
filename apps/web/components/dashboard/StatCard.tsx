"use client"

import { Activity, ShieldOff, Target, Wrench } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "../ui/card"

type StatIcon = "activity" | "target" | "wrench" | "shieldOff"

interface StatCardProps {
  label: string
  value: string
  icon: StatIcon
  trend?: string
}

const iconMap = {
  activity: Activity,
  target: Target,
  wrench: Wrench,
  shieldOff: ShieldOff,
} as const

function parseNumericDisplay(value: string): { target: number; decimals: number; suffix: string } {
  const match = value.match(/-?\d+(\.\d+)?/)
  if (!match) {
    return { target: 0, decimals: 0, suffix: "" }
  }
  const parsed = Number(match[0])
  const decimals = match[0].includes(".") ? 1 : 0
  return { target: Number.isFinite(parsed) ? parsed : 0, decimals, suffix: value.replace(match[0], "") }
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  const IconComponent = iconMap[Icon]
  const parsed = useMemo(() => parseNumericDisplay(value), [value])
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let frame = 0
    const duration = 600

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)
      setDisplay(parsed.target * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [parsed.target])

  return (
    <Card className="border-border transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex justify-end">
          <IconComponent className="size-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {display.toFixed(parsed.decimals)}
          {parsed.suffix}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
