import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { GoalFormControl } from './GoalForm';

type Props = {
  control: GoalFormControl;
};

export function BasicGoalDetails({ control }: Props) {
  return (
    <>
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
