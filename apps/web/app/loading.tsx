import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Card className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-12 w-full max-w-2xl" />
        <Skeleton className="h-24 w-full" />
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card className="space-y-4" key={index}>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
