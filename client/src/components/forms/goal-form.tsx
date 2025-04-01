import { useState, useEffect } from "react";
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
import { Loader2, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FinancialGoal } from "@shared/schema";

// Form schema for financial goals
// Define types for goal status, icon, and color
type GoalStatus = "in-progress" | "completed" | "pending";
type GoalIcon = "shield" | "trending-up" | "credit-card";
type GoalColor = "blue" | "green" | "yellow" | "purple" | "red";

const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  description: z.string(), // Changed to just string to avoid null in form
  targetAmount: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Target amount must be a positive number" }
  ),
  currentAmount: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    { message: "Current amount must be a non-negative number" }
  ),
  targetDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Target date must be a valid date" }
  ),
  status: z.enum(["in-progress", "completed", "pending"]),
  icon: z.enum(["shield", "trending-up", "credit-card"]),
  color: z.enum(["blue", "green", "yellow", "purple", "red"]),
});

const statusOptions = [
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
];

const iconOptions = [
  { value: "shield", label: "Emergency" },
  { value: "trending-up", label: "Investment" },
  { value: "credit-card", label: "Debt" },
];

const colorOptions = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "purple", label: "Purple" },
  { value: "red", label: "Red" },
];

type GoalFormProps = {
  isOpen: boolean;
  onClose: () => void;
  goal: FinancialGoal | null;
};

export default function GoalForm({ isOpen, onClose, goal }: GoalFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { addFinancialGoal, updateFinancialGoal, deleteFinancialGoal, isLoading } = useFinance();

  // Format date for form default value
  const formatDateForInput = (date: string | Date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Calculate future date for default target (6 months from now)
  const getFutureDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return formatDateForInput(date);
  };

  const form = useForm<z.infer<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: goal?.name || "",
      description: goal?.description || "", // If description is null, use empty string
      targetAmount: goal?.targetAmount ? goal.targetAmount.toString() : "",
      currentAmount: goal?.currentAmount ? goal.currentAmount.toString() : "0",
      targetDate: goal ? formatDateForInput(goal.targetDate) : getFutureDate(),
      status: (goal?.status === "in-progress" || goal?.status === "completed" || goal?.status === "pending") 
        ? goal.status as GoalStatus 
        : "in-progress",
      icon: (goal?.icon === "shield" || goal?.icon === "trending-up" || goal?.icon === "credit-card") 
        ? goal.icon as GoalIcon 
        : "shield",
      color: (goal?.color === "blue" || goal?.color === "green" || goal?.color === "yellow" || 
              goal?.color === "purple" || goal?.color === "red") 
        ? goal.color as GoalColor 
        : "blue",
    },
  });
  
  // Reset form when goal changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: goal?.name || "",
        description: goal?.description || "",
        targetAmount: goal?.targetAmount ? goal.targetAmount.toString() : "",
        currentAmount: goal?.currentAmount ? goal.currentAmount.toString() : "0",
        targetDate: goal ? formatDateForInput(goal.targetDate) : getFutureDate(),
        status: (goal?.status === "in-progress" || goal?.status === "completed" || goal?.status === "pending") 
          ? goal.status as GoalStatus 
          : "in-progress",
        icon: (goal?.icon === "shield" || goal?.icon === "trending-up" || goal?.icon === "credit-card") 
          ? goal.icon as GoalIcon 
          : "shield",
        color: (goal?.color === "blue" || goal?.color === "green" || goal?.color === "yellow" || 
                goal?.color === "purple" || goal?.color === "red") 
          ? goal.color as GoalColor 
          : "blue",
      });
    }
  }, [form, goal, isOpen]);

  const onSubmit = async (data: z.infer<typeof goalFormSchema>) => {
    // Convert empty string description to null to match the schema
    const formattedData = {
      ...data,
      targetDate: new Date(data.targetDate),
      description: data.description || null,
    };
    
    if (goal) {
      await updateFinancialGoal(goal.id, formattedData);
    } else {
      await addFinancialGoal(formattedData);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (goal) {
      await deleteFinancialGoal(goal.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{goal ? "Edit Financial Goal" : "Add New Financial Goal"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter description"
                        value={field.value || ""}
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
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Target Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="currentAmount"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Current Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                  name="icon"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Icon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
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
                
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Color</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((color) => (
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
              
              <DialogFooter className="gap-2 sm:gap-0">
                {goal && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {goal ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the financial goal "{goal?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
