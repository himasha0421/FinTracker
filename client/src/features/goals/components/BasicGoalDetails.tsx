import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { GoalFormControl } from './GoalForm';

const GOAL_TYPE_OPTIONS: { value: 'generic' | 'home-purchase'; label: string }[] = [
  { value: 'generic', label: 'Generic' },
  { value: 'home-purchase', label: 'Home Purchase' },
];

type Props = {
  control: GoalFormControl;
};

export function BasicGoalDetails({ control }: Props) {
  return (
    <>
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Goal Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {GOAL_TYPE_OPTIONS.map(option => (
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
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Goal Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter goal name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter description"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={field.disabled}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
