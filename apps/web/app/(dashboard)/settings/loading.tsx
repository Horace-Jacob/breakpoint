import { Skeleton } from "../../../components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-[560px] w-full rounded-xl" />
    </div>
  )
}
