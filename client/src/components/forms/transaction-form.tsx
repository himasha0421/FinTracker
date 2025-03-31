import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useFinance } from "@/lib/context";
import { useQuery } from "@tanstack/react-query";
import type { Transaction, Account } from "@shared/schema";

// Form schema for transactions
const transactionFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  accountId: z.string().refine(
    (val) => !isNaN(Number(val)),
    { message: "Please select an account" }
  ),
  category: z.string().optional(),
  type: z.enum(["income", "expense"]),
  icon: z.enum(["shopping-bag", "briefcase", "film", "database", "server", "shopping-cart"]),
  date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" }
  )
});

const transactionTypes = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const iconOptions = [
  { value: "shopping-bag", label: "Shopping" },
  { value: "briefcase", label: "Income" },
  { value: "film", label: "Entertainment" },
  { value: "database", label: "Technology" },
  { value: "server", label: "Services" },
  { value: "shopping-cart", label: "Groceries" },
];

const categoryOptions = [
  { value: "Income", label: "Income" },
  { value: "Food", label: "Food" },
  { value: "Shopping", label: "Shopping" },
  { value: "Entertainment", label: "Entertainment" },
  { value: "Bills", label: "Bills" },
  { value: "Transport", label: "Transport" },
  { value: "Health", label: "Health" },
  { value: "Electronics", label: "Electronics" },
  { value: "Software", label: "Software" },
];

type TransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
};

export default function TransactionForm({ isOpen, onClose, transaction = null }: TransactionFormProps) {
  const { addTransaction, updateTransaction, isLoading } = useFinance();

  // Fetch accounts for the account selection
  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Format date for form default value
  const formatDateForInput = (date: string | Date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    values: transaction ? {
      description: transaction.description,
      amount: transaction.amount.toString(),
      accountId: transaction.accountId.toString(),
      category: transaction.category || "",
      type: transaction.type,
      icon: transaction.icon || "shopping-bag",
      date: formatDateForInput(transaction.date),
    } : {
      description: "",
      amount: "0",
      type: "expense",
      date: formatDateForInput(new Date()),
      icon: "shopping-bag",
      category: "",
      accountId: accounts?.[0]?.id?.toString() || "",
    },
  });

  const onSubmit = async (data: z.infer<typeof transactionFormSchema>) => {
    const formattedData = {
      ...data,
      amount: Number(data.amount),
      accountId: Number(data.accountId),
      date: new Date(data.date),
    };

    if (transaction) {
      await updateTransaction(transaction.id, formattedData);
    } else {
      await addTransaction(formattedData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="flex gap-4">
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionTypes.map((type) => (
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts && accounts.map((account: Account) => (
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

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((category) => (
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
                name="icon"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Icon</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map((icon) => (
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
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {transaction ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}