"use client"

import { CardDescription } from "@/components/ui/card"
import { useTimezone } from "@/components/timezone-provider"

export function TimeTrackerDescription() {
  const { timezone, isLoading } = useTimezone()

  return (
    <CardDescription>
      Track your time entries, breaks, and exits
      {!isLoading && ` • Timezone: ${timezone}`}
    </CardDescription>
  )
}
