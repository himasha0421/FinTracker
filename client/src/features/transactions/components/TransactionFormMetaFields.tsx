import type { UseFormReturn } from 'react-hook-form';
import type { Account } from '@shared/schema';
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
import type { TransactionFormValues } from './transactionFormSchema';

const transactionTypes = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

type TransactionFormMetaFieldsProps = {
  form: UseFormReturn<TransactionFormValues>;
  accounts: Account[];
};

export default function TransactionFormMetaFields({
  form,
  accounts,
}: TransactionFormMetaFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Transaction Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {transactionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
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
        name="accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
