import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useFinance } from '@/lib/context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AccountResponse } from '@/features/accounts/api';
import { ACCOUNT_REGISTERED_TYPES } from '@shared/goals';
import { TAX_PERSON_KEYS } from '@shared/taxPlanning';
import { usePersonLabels } from '@/hooks/usePersonLabels';

// 'none' is a form-only sentinel for "unset" — Radix Select can't use an
// empty string as an item value. Converted to null before submit.
const NONE = 'none';

// Form schema extending the insertAccountSchema from shared/schema
const accountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  description: z.string().optional(),
  balance: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Balance must be a positive number',
  }),
  type: z.enum(['savings', 'checking', 'credit', 'investment', 'loan']),
  icon: z.enum(['wallet', 'scale', 'credit-card', 'plus-square', 'car']),
  color: z.enum(['green', 'blue', 'purple', 'red', 'yellow']),
  registeredType: z.enum([NONE, ...ACCOUNT_REGISTERED_TYPES]),
  ownerPersonKey: z.enum([NONE, ...TAX_PERSON_KEYS]),
});

const accountTypes = [
  { value: 'savings', label: 'Savings' },
  { value: 'checking', label: 'Checking' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan (Liability)' },
];

const registeredTypeOptions = [
  { value: NONE, label: 'Not registered' },
  { value: 'tfsa', label: 'TFSA' },
  { value: 'fhsa', label: 'FHSA' },
  { value: 'rrsp', label: 'RRSP' },
];

const iconOptions = [
  { value: 'wallet', label: 'Wallet' },
  { value: 'scale', label: 'Scale' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'plus-square', label: 'Investment' },
  { value: 'car', label: 'Auto Loan' },
];

const colorOptions = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
];

type AccountFormProps = {
  isOpen: boolean;
  onClose: () => void;
  account: AccountResponse | null;
};

type AccountFormValues = z.infer<typeof accountFormSchema>;
type AccountType = AccountFormValues['type'];
type AccountIcon = AccountFormValues['icon'];
type AccountColor = AccountFormValues['color'];

const accountTypesSet: AccountType[] = ['savings', 'checking', 'credit', 'investment', 'loan'];
const accountIconsSet: AccountIcon[] = ['wallet', 'scale', 'credit-card', 'plus-square', 'car'];
const accountColorsSet: AccountColor[] = ['green', 'blue', 'purple', 'red', 'yellow'];
const registeredTypeSet = ACCOUNT_REGISTERED_TYPES as readonly string[];
const ownerPersonKeySet = TAX_PERSON_KEYS as readonly string[];

const getDefaultValues = (account?: AccountResponse | null): AccountFormValues => {
  const type = accountTypesSet.includes(account?.type as AccountType)
    ? (account?.type as AccountType)
    : 'savings';
  const icon = accountIconsSet.includes(account?.icon as AccountIcon)
    ? (account?.icon as AccountIcon)
    : 'wallet';
  const color = accountColorsSet.includes(account?.color as AccountColor)
    ? (account?.color as AccountColor)
    : 'green';
  const registeredType = registeredTypeSet.includes(account?.registeredType ?? '')
    ? (account!.registeredType as AccountFormValues['registeredType'])
    : NONE;
  const ownerPersonKey = ownerPersonKeySet.includes(account?.ownerPersonKey ?? '')
    ? (account!.ownerPersonKey as AccountFormValues['ownerPersonKey'])
    : NONE;

  return {
    name: account?.name ?? '',
    description: account?.description ?? '',
    balance: (account?.balance ?? '0').toString(),
    type,
    icon,
    color,
    registeredType,
    ownerPersonKey,
  };
};

export default function AccountForm({ isOpen, onClose, account }: AccountFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { addAccount, updateAccount, deleteAccount, isLoading } = useFinance();
  const personLabels = usePersonLabels();

  const ownerPersonKeyOptions = [
    { value: NONE, label: 'Joint / unassigned' },
    { value: 'personA', label: personLabels.personA },
    { value: 'personB', label: personLabels.personB },
  ];

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    values: getDefaultValues(account),
  });

  const onSubmit = async (data: AccountFormValues) => {
    const payload = {
      ...data,
      description: data.description ?? null,
      registeredType: data.registeredType === NONE ? null : data.registeredType,
      ownerPersonKey: data.ownerPersonKey === NONE ? null : data.ownerPersonKey,
    };

    if (account) {
      await updateAccount(account.id, payload);
    } else {
      await addAccount(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (account) {
      await deleteAccount(account.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{account ? 'Edit Account' : 'Add New Account'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter account name" {...field} />
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
                      <Input placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        disabled={account?.linkedInvestmentsTotal !== undefined || field.disabled}
                      />
                    </FormControl>
                    {account?.linkedInvestmentsTotal !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Tracked automatically from this account's linked investments.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountTypes.map(type => (
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

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="registeredType"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Registered type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select registered type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {registeredTypeOptions.map(option => (
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
                  name="ownerPersonKey"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Owner</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ownerPersonKeyOptions.map(option => (
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
              </div>

              <div className="flex gap-4">
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
                          {iconOptions.map(icon => (
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map(color => (
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
                {account && (
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
                    {account ? 'Update' : 'Create'}
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
              This will permanently delete the account "{account?.name}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
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
