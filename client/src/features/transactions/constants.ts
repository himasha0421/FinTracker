import {
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  HeartPulse,
  Home,
  PiggyBank,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';

export const iconOptions = [
  { value: 'shopping-bag', label: 'Shopping', Icon: ShoppingBag },
  { value: 'shopping-cart', label: 'Groceries', Icon: ShoppingCart },
  { value: 'briefcase', label: 'Salary/Work', Icon: Briefcase },
  { value: 'piggy-bank', label: 'Savings', Icon: PiggyBank },
  { value: 'credit-card', label: 'Bills', Icon: CreditCard },
  { value: 'home', label: 'Housing', Icon: Home },
  { value: 'car', label: 'Transport', Icon: Car },
  { value: 'heart-pulse', label: 'Health', Icon: HeartPulse },
  { value: 'coffee', label: 'Dining Out', Icon: Coffee },
  { value: 'plane', label: 'Vacations', Icon: Plane },
  { value: 'users', label: 'Friends & Gatherings', Icon: Users },
] as const;

export const categoryOptions = [
  { value: 'Income', label: 'Income' },
  { value: 'Salary', label: 'Salary/Work' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Bills', label: 'Bills & Utilities' },
  { value: 'Housing', label: 'Housing' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Vacations', label: 'Vacations' },
  { value: 'Groceries', label: 'Groceries' },
  { value: 'Dining Out', label: 'Dining Out' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Friends & Gatherings', label: 'Friends & Gatherings' },
] as const;

export const categoryToIcon: Record<string, IconValue> = {
  Income: 'briefcase',
  'Salary/Work': 'briefcase',
  Savings: 'piggy-bank',
  'Bills & Utilities': 'credit-card',
  Housing: 'home',
  Transport: 'car',
  Vacations: 'plane',
  Groceries: 'shopping-cart',
  'Dining Out': 'coffee',
  Shopping: 'shopping-bag',
  'Health & Wellness': 'heart-pulse',
  'Friends & Gatherings': 'users',
};

export type IconValue = (typeof iconOptions)[number]['value'];
