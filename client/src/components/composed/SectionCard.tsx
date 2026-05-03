import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
export { CardContent as SectionCardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sectionCard, sectionCardHeader, type SectionCardVariants } from '@/design/variants';

type SectionCardProps = ComponentPropsWithoutRef<typeof Card> &
  Pick<SectionCardVariants, 'radius'> & {
    hover?: boolean;
    className?: string;
  };

export function SectionCard({
  radius,
  hover = true,
  className,
  children,
  ...rest
}: SectionCardProps) {
  return (
    <Card
      className={cn(sectionCard({ radius, hover }), className)}
      {...rest}
    >
      {children}
    </Card>
  );
}

type SectionCardHeaderProps = ComponentPropsWithoutRef<typeof CardHeader> & {
  title: string;
  titleClassName?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionCardHeader({
  title,
  titleClassName,
  action,
  className,
  children,
  ...rest
}: SectionCardHeaderProps) {
  return (
    <CardHeader className={cn(sectionCardHeader(), className, 'p-5')} {...rest}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <CardTitle className={cn('text-lg font-bold', titleClassName)}>{title}</CardTitle>}
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </CardHeader>
  );
}

