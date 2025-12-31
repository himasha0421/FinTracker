import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { GoalFormControl, GoalIcon, GoalColor } from './GoalForm';

const ICON_OPTIONS: { value: GoalIcon; label: string }[] = [
  { value: 'shield', label: 'Emergency' },
  { value: 'trending-up', label: 'Investment' },
  { value: 'credit-card', label: 'Debt' },
];

const COLOR_OPTIONS: { value: GoalColor; label: string }[] = [
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'red', label: 'Red' },
];

type Props = {
  control: GoalFormControl;
};

export function IconColorFields({ control }: Props) {
  return (
    <div className="flex gap-4">
      <FormField
        control={control}
        name="icon"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Icon</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ICON_OPTIONS.map(icon => (
                  <SelectItem key={icon.value} value={icon.value}>
                    {icon.label}
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
        name="color"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Color</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {COLOR_OPTIONS.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
