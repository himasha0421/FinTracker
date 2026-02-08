import { z } from 'zod';
import {
  assigneeOptions,
  iconOptions,
  type AssigneeValue,
  type IconValue,
} from '@/features/transactions/constants';

export const iconValues = iconOptions.map(option => option.value) as [IconValue, ...IconValue[]];
export const assigneeValues = assigneeOptions.map(option => option.value) as [
  AssigneeValue,
  ...AssigneeValue[],
];

const assignmentSchema = z.object({
  assignee: z.enum(assigneeValues),
  sharePercent: z
    .number({ required_error: 'Share percentage is required' })
    .min(0, 'Share must be at least 0%')
    .max(100, 'Share cannot exceed 100%'),
});

export const transactionFormSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  accountId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Please select an account',
  }),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  type: z.enum(['income', 'expense']),
  icon: z.enum(iconValues),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date',
  }),
  assignments: z
    .array(assignmentSchema)
    .min(1, 'At least one assignee is required')
    .superRefine((assignments, ctx) => {
      const total = assignments.reduce((sum, assignment) => sum + assignment.sharePercent, 0);
      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Assignment percentages must total 100%',
        });
      }
    }),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
