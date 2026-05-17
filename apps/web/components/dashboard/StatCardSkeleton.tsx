import { Card, CardContent, CardHeader } from "../ui/card"

interface StatCardSkeletonProps {
  label: string
}

export function StatCardSkeleton({ label }: StatCardSkeletonProps) {
  return (
    <Card className="bg-card border-border relative overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="absolute top-3 right-3 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-none">
          Soon
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="h-8 w-20 rounded-md bg-muted animate-pulse mb-2" />
        <div className="h-3 w-28 rounded-md bg-muted animate-pulse opacity-60" />
      </CardContent>
    </Card>
  )
}
