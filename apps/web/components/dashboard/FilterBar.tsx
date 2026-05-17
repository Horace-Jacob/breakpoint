"use client"

import { Button } from "../ui/button"

export type VerdictFilter = "all" | "allow" | "fixed" | "block"
export type RiskFilter = "all" | "low" | "medium" | "high" | "critical"

interface FilterBarProps {
  verdictFilter: VerdictFilter
  riskFilter: RiskFilter
  onVerdictChange: (value: VerdictFilter) => void
  onRiskChange: (value: RiskFilter) => void
}

const verdictItems: Array<{ label: string; value: VerdictFilter }> = [
  { label: "All", value: "all" },
  { label: "Passed", value: "allow" },
  { label: "Fixed", value: "fixed" },
  { label: "Blocked", value: "block" },
]

const riskItems: Array<{ label: string; value: RiskFilter }> = [
  { label: "All Risk", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
]

function pillClasses(active: boolean) {
  return active
    ? "bg-primary text-primary-foreground transition-colors duration-150"
    : "border border-border text-muted-foreground hover:bg-muted transition-colors duration-150"
}

export function FilterBar({ verdictFilter, riskFilter, onVerdictChange, onRiskChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {verdictItems.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant="ghost"
            className={pillClasses(verdictFilter === item.value)}
            onClick={() => onVerdictChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {riskItems.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant="ghost"
            className={pillClasses(riskFilter === item.value)}
            onClick={() => onRiskChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
