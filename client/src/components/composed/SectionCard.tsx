import { type ComponentPropsWithoutRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      className={cn(sectionCard({ radius, hover: hover ? 'true' : 'false' }), className)}
      {...rest}
    >
      {children}
    </Card>
  );
}

type SectionCardHeaderProps = ComponentPropsWithoutRef<typeof CardHeader> & {
  title: string;
  className?: string;
};

export function SectionCardHeader({
  title,
  className,
  children,
  ...rest
}: SectionCardHeaderProps) {
  return (
    <CardHeader className={cn(sectionCardHeader(), className, 'p-5')} {...rest}>
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {children}
    </CardHeader>
  );
}

export { CardContent as SectionCardContent };
