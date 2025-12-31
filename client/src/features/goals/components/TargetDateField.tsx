import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { GoalFormControl } from './GoalForm';

type Props = {
  control: GoalFormControl;
};

export function TargetDateField({ control }: Props) {
  return (
    <FormField
      control={control}
      name="targetDate"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Target Date</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                >
                  {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={date => {
                  if (date) {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    field.onChange(formattedDate);
                  }
                }}
                disabled={date => date < new Date() || date > new Date('2100-01-01')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
