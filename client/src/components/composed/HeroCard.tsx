import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { heroCard } from '@/design/variants';
import type { HeroAccent } from '@/design/tokens';

interface HeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: HeroAccent;
  contentClassName?: string;
}

export function HeroCard({ accent = 'blue', contentClassName, className, children, ...props }: HeroCardProps) {
  return (
    <Card className={cn(heroCard({ accent }), className)} {...props}>
      <CardContent className={cn('p-6 sm:p-8', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
