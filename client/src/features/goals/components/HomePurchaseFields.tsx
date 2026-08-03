import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { usePersonLabels } from '@/hooks/usePersonLabels';
import type { GoalFormControl } from './GoalForm';

type Props = {
  control: GoalFormControl;
};

export function HomePurchaseFields({ control }: Props) {
  const personLabels = usePersonLabels();

  return (
    <div className="space-y-4 rounded-md border p-3">
      <p className="text-sm font-medium">Home purchase details</p>

      <div className="flex gap-4">
        <FormField
          control={control}
          name="targetHomePrice"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Target Home Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="downPaymentPercent"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Down Payment %</FormLabel>
              <FormControl>
                <Input type="number" step="1" min="1" max="100" placeholder="20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="closingCostsEstimate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Closing Costs Estimate</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
            </FormControl>
            <FormDescription>
              Land titles fees, legal fees, inspection, etc. — not down payment itself.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-4">
        <FormField
          control={control}
          name="contributorAmountPersonA"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{personLabels.personA} Monthly Contribution</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="contributorAmountPersonB"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{personLabels.personB} Monthly Contribution</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
