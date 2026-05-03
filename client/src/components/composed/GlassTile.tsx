import React from 'react';
import { cn } from '@/lib/utils';
import { glassTile, type GlassTileVariants } from '@/design/variants';

interface GlassTileProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: GlassTileVariants['size'];
  className?: string;
}

export function GlassTile({ size = 'sm', className, children, ...props }: GlassTileProps) {
  return (
    <div className={cn(glassTile({ size }), className)} {...props}>
      {children}
    </div>
  );
}
