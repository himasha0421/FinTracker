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
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/context";
import { useQuery } from "@tanstack/react-query";
import type { Transaction, Account } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

// Form schema for transactions
const transactionFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  accountId: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Please select an account",
    }),
  category: z.string().optional(),
  type: z.enum(["income", "expense"]),
  icon: z.enum([
    "shopping-bag",
    "briefcase",
    "film",
    "database",
    "server",
    "shopping-cart",
  ]),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date",
    }),
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

export default function TransactionForm({
  isOpen,
  onClose,
  transaction = null,
}: TransactionFormProps) {
  const { addTransaction, updateTransaction, deleteTransaction, isLoading } =
    useFinance();

  // Fetch accounts for the account selection
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Format date for form default value with CST timezone adjustment
  const formatDateForInput = (date: string | Date) => {
    // Create a new Date object
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Get date parts in CST timezone by creating a date with explicit parts
    // This ensures we're working with the actual date the user wants
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    // Return a date string in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  };

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    values: transaction
      ? {
          description: transaction.description,
          amount: transaction.amount.toString(),
          accountId: transaction.accountId.toString(),
          category: transaction.category || "",
          type: transaction.type as "income" | "expense",
          icon:
            (transaction.icon as
              | "shopping-bag"
              | "briefcase"
              | "film"
              | "database"
              | "server"
              | "shopping-cart") || "shopping-bag",
          date: formatDateForInput(transaction.date),
        }
      : {
          description: "",
          amount: "0",
          type: "expense" as const,
          date: formatDateForInput(new Date()),
          icon: "shopping-bag" as const,
          category: "",
          accountId: accounts.length > 0 ? accounts[0].id.toString() : "",
        },
  });

  const onSubmit = async (data: z.infer<typeof transactionFormSchema>) => {
    // Make sure the date string is in YYYY-MM-DD format for consistent server-side parsing
    const dateStr = data.date
      ? formatDateForInput(new Date(data.date))
      : formatDateForInput(new Date());

    // Prepare the data with proper type handling
    const formattedData = {
      description: data.description,
      amount: data.amount.toString(),
      accountId: Number(data.accountId),
      date: dateStr, // Ensure consistent YYYY-MM-DD format for server-side parsing
      category: data.category || undefined,
      type: data.type,
      icon: data.icon,
    };

    console.log("Submitting transaction with date:", dateStr);

    try {
      if (transaction) {
        await updateTransaction(transaction.id, formattedData as any);
      } else {
        await addTransaction(formattedData as any);
      }
      onClose();
    } catch (error) {
      console.error("Error submitting transaction:", error);
    }
  };

  const handleDelete = async () => {
    if (transaction) {
      try {
        await deleteTransaction(transaction.id);
        onClose();
      } catch (error) {
        console.error("Error deleting transaction:", error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
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
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
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
                          <Button
                            variant="outline"
                            className="w-full flex justify-between font-normal"
                          >
                            {field.value ? (
                              format(new Date(field.value), "MMMM do, yyyy")
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
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          defaultMonth={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Important: DO NOT manipulate the date object's day here
                              // Use the exact selected date to avoid off-by-one errors
                              
                              // Format the exact selected date to YYYY-MM-DD
                              const day = date.getDate();
                              const month = date.getMonth() + 1;
                              const year = date.getFullYear();
                              
                              // Create our date string in YYYY-MM-DD format
                              const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              
                              console.log(
                                "Selected exact date:",
                                date,
                                "Day:", day,
                                "Month:", month,
                                "Year:", year,
                                "Formatted:", formattedDate
                              );
                              
                              field.onChange(formattedDate);
                            }
                          }}
                          disabled={(date) =>
                            date > new Date("2100-01-01") ||
                            date < new Date("1900-01-01")
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
                      {accounts.map((account: Account) => (
                        <SelectItem
                          key={account.id}
                          value={account.id.toString()}
                        >
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
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
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

            <DialogFooter className="flex justify-between">
              <div className="flex gap-2 items-center">
                {transaction && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="mr-auto"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {transaction ? "Update" : "Create"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
