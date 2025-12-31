import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateRangeSelectorProps = {
  dateRange: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
};

export default function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full sm:w-[260px] justify-start text-left font-normal',
            !dateRange?.from && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
            ) : (
              format(dateRange.from, 'LLL dd, y')
            )
          ) : (
            'Select date range'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={dateRange}
          onSelect={onChange}
          defaultMonth={dateRange?.from}
          initialFocus
        />
        {dateRange?.from && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {dateRange.to ? 'Range selected' : 'Single day selected'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
