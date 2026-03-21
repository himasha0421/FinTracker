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

export type IconValue = (typeof iconOptions)[number]['value'];

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

const noneSubcategoryOption = { value: 'None', label: 'None' } as const;

export const subcategoryOptionsByCategory: Record<string, { value: string; label: string }[]> = {
  Transport: [
    { value: 'Fuel', label: 'Fuel' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Parking', label: 'Parking' },
    { value: 'Public Transit', label: 'Public Transit' },
    { value: 'Loan', label: 'Loan' },
    { value: 'Extra', label: 'Extra' },
  ],
  Groceries: [
    { value: 'Produce', label: 'Produce' },
    { value: 'Meat & Seafood', label: 'Meat & Seafood' },
    { value: 'Dairy', label: 'Dairy' },
    { value: 'Beverages', label: 'Beverages' },
    { value: 'Household Supplies', label: 'Household Supplies' },
    { value: 'Other', label: 'Other' },
  ],
  Vacations: [
    { value: 'Flights', label: 'Flights' },
    { value: 'Lodging', label: 'Lodging' },
    { value: 'Food', label: 'Food' },
    { value: 'Activities', label: 'Activities' },
    { value: 'Transportation', label: 'Transportation' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Souvenirs', label: 'Souvenirs' },
    { value: 'Other', label: 'Other' },
  ],
  Bills: [
    { value: 'Electricity', label: 'Electricity' },
    { value: 'Water', label: 'Water' },
    { value: 'Gas', label: 'Gas' },
    { value: 'Internet', label: 'Internet' },
    { value: 'Phone', label: 'Phone' },
    { value: 'Streaming', label: 'Streaming' },
    { value: 'Subscriptions', label: 'Subscriptions' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Other', label: 'Other' },
  ],
  Housing: [
    { value: 'Rent/Mortgage', label: 'Rent/Mortgage' },
    { value: 'Repairs', label: 'Repairs' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Home Supplies', label: 'Home Supplies' },
    { value: 'Property Tax', label: 'Property Tax' },
    { value: 'Home Insurance', label: 'Home Insurance' },
    { value: 'Other', label: 'Other' },
  ],
  'Dining Out': [
    { value: 'Restaurants', label: 'Restaurants' },
    { value: 'Cafe', label: 'Cafe' },
    { value: 'Delivery', label: 'Delivery' },
    { value: 'Fast Food', label: 'Fast Food' },
    { value: 'Bars', label: 'Bars' },
    { value: 'Other', label: 'Other' },
  ],
  Shopping: [
    { value: 'Clothing', label: 'Clothing' },
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Home Goods', label: 'Home Goods' },
    { value: 'Personal Care', label: 'Personal Care' },
    { value: 'Gifts', label: 'Gifts' },
    { value: 'Other', label: 'Other' },
  ],
  'Health & Wellness': [
    { value: 'Doctor', label: 'Doctor' },
    { value: 'Pharmacy', label: 'Pharmacy' },
    { value: 'Dental', label: 'Dental' },
    { value: 'Vision', label: 'Vision' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Therapy', label: 'Therapy' },
    { value: 'Supplements', label: 'Supplements' },
    { value: 'Other', label: 'Other' },
  ],
  'Friends & Gatherings': [
    { value: 'Gifts', label: 'Gifts' },
    { value: 'Events', label: 'Events' },
    { value: 'Dining', label: 'Dining' },
    { value: 'Hosting', label: 'Hosting' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Other', label: 'Other' },
  ],
  Savings: [
    { value: 'Emergency Fund', label: 'Emergency Fund' },
    { value: 'Retirement', label: 'Retirement' },
    { value: 'Investments', label: 'Investments' },
    { value: 'Vacation Fund', label: 'Vacation Fund' },
    { value: 'Education', label: 'Education' },
    { value: 'Other', label: 'Other' },
  ],
  Income: [
    { value: 'Bonus', label: 'Bonus' },
    { value: 'Interest', label: 'Interest' },
    { value: 'Dividends', label: 'Dividends' },
    { value: 'Refunds', label: 'Refunds' },
    { value: 'Other', label: 'Other' },
  ],
  Salary: [
    { value: 'Base Pay', label: 'Base Pay' },
    { value: 'Bonus', label: 'Bonus' },
    { value: 'Overtime', label: 'Overtime' },
    { value: 'Commission', label: 'Commission' },
    { value: 'Other', label: 'Other' },
  ],
};

export const getSubcategoryOptions = (category?: string | null) => {
  if (!category) return [noneSubcategoryOption];
  const options = subcategoryOptionsByCategory[category] ?? [];
  return [noneSubcategoryOption, ...options];
};

export const expenseCategoryOptions = categoryOptions.filter(
  option => option.value !== 'Income' && option.value !== 'Salary'
);

export const categoryToIcon: Record<string, IconValue> = {
  Income: 'briefcase',
  Salary: 'briefcase',
  'Salary/Work': 'briefcase',
  Savings: 'piggy-bank',
  Bills: 'credit-card',
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

const categoryValueMap = new Map<string, string>(
  categoryOptions.map(option => [option.label, option.value])
);

export const normalizeCategoryValue = (category?: string | null) => {
  if (!category) return '';
  const trimmed = category.trim();
  if (!trimmed) return '';
  return categoryValueMap.get(trimmed) ?? trimmed;
};

const iconValueSet = new Set<IconValue>(iconOptions.map(option => option.value));
const placeholderIcons: IconValue[] = ['shopping-bag', 'credit-card'];

export function resolveTransactionIconValue(transaction: {
  category?: string | null;
  icon?: string | null;
}): IconValue {
  const savedIcon = transaction.icon as IconValue | undefined;
  const categoryIcon = transaction.category ? categoryToIcon[transaction.category] : undefined;

  const hasValidSavedIcon = Boolean(savedIcon && iconValueSet.has(savedIcon));
  const isCustomSavedIcon = hasValidSavedIcon && !placeholderIcons.includes(savedIcon as IconValue);

  if (isCustomSavedIcon) return savedIcon as IconValue;
  if (categoryIcon && iconValueSet.has(categoryIcon)) return categoryIcon;
  if (hasValidSavedIcon) return savedIcon as IconValue;
  return 'shopping-bag';
}

export const assigneeOptions = [
  { value: 'None', label: 'None' },
  { value: 'Hima', label: 'Hima' },
  { value: 'Thami', label: 'Thami' },
] as const;

export type AssigneeValue = (typeof assigneeOptions)[number]['value'];
