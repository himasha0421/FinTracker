import type { UseFormReturn } from 'react-hook-form';
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
import {
  categoryOptions,
  categoryToIcon,
  getSubcategoryOptions,
  iconOptions,
} from '@/features/transactions/constants';
import type { TransactionFormValues } from './transactionFormSchema';

type TransactionFormCategoryIconFieldsProps = {
  form: UseFormReturn<TransactionFormValues>;
};

export default function TransactionFormCategoryIconFields({
  form,
}: TransactionFormCategoryIconFieldsProps) {
  const selectedCategory = form.watch('category');
  const subcategoryOptions = getSubcategoryOptions(selectedCategory);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Category</FormLabel>
            <Select
              onValueChange={value => {
                field.onChange(value);
                const mappedIcon = categoryToIcon[value];
                if (mappedIcon) {
                  form.setValue('icon', mappedIcon, { shouldDirty: true });
                }
                const nextOptions = getSubcategoryOptions(value);
                const currentSubcategory = form.getValues('subcategory');
                const hasSubcategory = nextOptions.some(
                  option => option.value === currentSubcategory
                );
                if (!hasSubcategory) {
                  form.setValue('subcategory', 'None', { shouldDirty: true });
                }
              }}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categoryOptions.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
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
        name="subcategory"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Subcategory</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {subcategoryOptions.map(option => (
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
        name="icon"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Icon</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {iconOptions.map(icon => {
                  const IconComponent = icon.Icon;
                  return (
                    <SelectItem key={icon.value} value={icon.value}>
                      <span className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        {icon.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
