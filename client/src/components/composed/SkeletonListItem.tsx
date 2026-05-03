import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonListItemProps {
  /** Extra classes on the row wrapper */
  className?: string;
}

/** Single skeleton row: icon + two text lines + right value — matches AccountsCard / TransactionsCard list item shape */
export function SkeletonListItem({ className }: SkeletonListItemProps) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}
