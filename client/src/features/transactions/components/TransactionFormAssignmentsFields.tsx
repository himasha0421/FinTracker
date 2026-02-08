import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assigneeOptions } from '@/features/transactions/constants';
import type { TransactionFormValues } from './transactionFormSchema';

type TransactionFormAssignmentsFieldsProps = {
  form: UseFormReturn<TransactionFormValues>;
  assignmentFields: FieldArrayWithId<TransactionFormValues, 'assignments', 'id'>[];
  onAddSplit: () => void;
  onRemove: (index: number) => void;
  totalAssigned: number;
  assignmentsError?: string;
};

export default function TransactionFormAssignmentsFields({
  form,
  assignmentFields,
  onAddSplit,
  onRemove,
  totalAssigned,
  assignmentsError,
}: TransactionFormAssignmentsFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel>Split Between</FormLabel>
        <Button type="button" variant="secondary" size="sm" onClick={onAddSplit}>
          <Plus className="mr-1 h-4 w-4" />
          Add Split
        </Button>
      </div>
      <div className="space-y-2">
        {assignmentFields.map((assignmentField, index) => (
          <div key={assignmentField.id} className="flex items-end gap-3">
            <FormField
              control={form.control}
              name={`assignments.${index}.assignee`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Assignee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assigneeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`assignments.${index}.sharePercent`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percent</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={field.value ?? 0}
                      onChange={event =>
                        field.onChange(
                          event.target.value === '' ? 0 : Number(event.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {assignmentFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-1"
                onClick={() => onRemove(index)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <div className="text-sm text-muted-foreground">
          Total assigned: {totalAssigned.toFixed(2)}%
        </div>
        {assignmentsError && <p className="text-sm text-destructive">{assignmentsError}</p>}
      </div>
    </div>
  );
}
