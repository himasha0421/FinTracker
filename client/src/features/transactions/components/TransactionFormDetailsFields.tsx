import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { TransactionFormValues } from './transactionFormSchema';

type TransactionFormDetailsFieldsProps = {
  form: UseFormReturn<TransactionFormValues>;
};

export default function TransactionFormDetailsFields({ form }: TransactionFormDetailsFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input placeholder="Enter description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full flex justify-between font-normal">
                      {field.value ? (
                        format(new Date(field.value), 'MMMM do, yyyy')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    defaultMonth={field.value ? new Date(field.value) : undefined}
                    modifiersClassNames={{
                      selected: 'bg-primary text-primary-foreground',
                      today: 'bg-accent text-accent-foreground',
                    }}
                    fromDate={new Date('1900-01-01')}
                    toDate={new Date('2100-01-01')}
                    fixedWeeks
                    onSelect={date => {
                      if (date) {
                        const day = date.getDate();
                        const month = date.getMonth() + 1;
                        const year = date.getFullYear();
                        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        field.onChange(formattedDate);
                      }
                    }}
                    disabled={date =>
                      date > new Date('2100-01-01') || date < new Date('1900-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
