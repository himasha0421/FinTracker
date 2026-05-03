import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  text: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ text, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground', className)}>
      {icon && <div className="mb-1 opacity-40">{icon}</div>}
      <p>{text}</p>
    </div>
  );
}
