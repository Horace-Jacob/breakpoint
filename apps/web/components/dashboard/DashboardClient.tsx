"use client"

import type { InspectionEvent } from "@breakpoint/lib"
import { useState } from "react"

import { InspectionDrawer } from "./InspectionDrawer"
import { InspectionTable } from "./InspectionTable"

interface DashboardClientProps {
  initialData: InspectionEvent[]
  totalCount: number
  userId: string
}

export function DashboardClient({ initialData, totalCount, userId }: DashboardClientProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  return (
    <>
      <InspectionTable
        initialData={initialData}
        totalCount={totalCount}
        userId={userId}
        setSelectedEventId={setSelectedEventId}
      />
      <InspectionDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
    </>
  )
}
