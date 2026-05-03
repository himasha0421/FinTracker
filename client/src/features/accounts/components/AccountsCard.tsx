import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Car, ChevronDown, Pencil, Plus } from 'lucide-react';
import { SectionCard, SectionCardHeader, SectionCardContent } from '@/components/composed/SectionCard';
import { SkeletonListItem } from '@/components/composed/SkeletonListItem';
import { EmptyState } from '@/components/composed/EmptyState';
import AccountForm from '@/features/accounts/components/AccountForm';
import type { Account } from '@shared/schema';
import { accountsListQuery } from '@/features/accounts/api';
import { entityColourClasses } from '@/design/tokens';
import { formatCurrency } from '@/lib/formatters';

const accountIcons: Record<string, JSX.Element> = {
  wallet: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  ),
  scale: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
  'credit-card': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  ),
  'plus-square': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
    </svg>
  ),
  car: <Car className="h-4 w-4" />,
};

type AccountItemProps = {
  account: Account;
  onEdit: (account: Account) => void;
};

const liabilityTypes = new Set(['credit', 'loan']);

const AccountItem = ({ account, onEdit }: AccountItemProps) => {
  const iconKey = account.icon ?? 'wallet';
  const colorKey = account.color ?? 'green';
  const numericBalance = Number(account.balance);
  const displayBalance = liabilityTypes.has(account.type) ? -numericBalance : numericBalance;

  return (
    <div className="group flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
      <div className="flex items-center">
        <div className={`mr-3 flex h-8 w-8 items-center justify-center rounded-md ${entityColourClasses[colorKey] ?? entityColourClasses.green}`}>
          {accountIcons[iconKey] || <div className="h-4 w-4" />}
        </div>
        <div>
          <h3 className="font-medium">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{account.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{formatCurrency(displayBalance)}</span>
        <button
          onClick={() => onEdit(account)}
          className="rounded-md p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default function AccountsCard() {
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: accounts, isLoading } = useQuery(accountsListQuery());

  const groupedAccounts = useMemo(() => {
    if (!accounts?.length) return [];
    const groups: Record<string, { accounts: Account[]; totalBalance: number }> = {};

    accounts.forEach(account => {
      const groupKey = account.type || 'other';
      const numericBalance = Number(account.balance);
      const signedBalance = liabilityTypes.has(account.type) ? -numericBalance : numericBalance;
      if (!groups[groupKey]) groups[groupKey] = { accounts: [], totalBalance: 0 };
      groups[groupKey].accounts.push(account);
      groups[groupKey].totalBalance += signedBalance;
    });

    return Object.entries(groups)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [accounts]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleAddAccount = () => { setEditingAccount(null); setIsAccountFormOpen(true); };
  const handleEditAccount = (account: Account) => { setEditingAccount(account); setIsAccountFormOpen(true); };
  const handleFormClose = () => { setIsAccountFormOpen(false); setEditingAccount(null); };

  return (
    <>
      <SectionCard className="col-span-2">
        <SectionCardHeader
          title="Your Accounts"
          action={
            <Button variant="outline" size="sm" onClick={handleAddAccount} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          }
        />
        <SectionCardContent className="p-5">
          <div className="space-y-4">
            {isLoading && (
              Array.from({ length: 5 }, (_, i) => <SkeletonListItem key={`skel-${i}`} className="py-3" />)
            )}
            {!isLoading && groupedAccounts.length === 0 && (
              <EmptyState text="No accounts found. Add an account to get started." />
            )}
            {!isLoading && groupedAccounts.length > 0 && groupedAccounts.map(({ type, accounts: grouped, totalBalance }) => {
                const isExpanded = expandedGroups[type] ?? false;
                const groupLabel = `${type.charAt(0).toUpperCase()}${type.slice(1)} Accounts`;
                return (
                  <div key={type} className="overflow-hidden rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => toggleGroup(type)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <div>
                        <p className="font-semibold">{groupLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {grouped.length} {grouped.length === 1 ? 'account' : 'accounts'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{formatCurrency(totalBalance)}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="bg-card">
                        {grouped.map(account => (
                          <AccountItem key={account.id} account={account} onEdit={() => handleEditAccount(account)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </SectionCardContent>
      </SectionCard>

      <AccountForm isOpen={isAccountFormOpen} onClose={handleFormClose} account={editingAccount} />
    </>
  );
}
