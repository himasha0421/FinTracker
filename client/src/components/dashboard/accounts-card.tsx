import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Send, Upload, MoreHorizontal } from 'lucide-react';
import { useFinance } from '@/lib/context';
import { Skeleton } from '@/components/ui/skeleton';
import AccountForm from '@/components/forms/account-form';
import type { Account } from '@shared/schema';

const accountIcons: Record<string, JSX.Element> = {
  wallet: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path
        fillRule="evenodd"
        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  scale: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  'credit-card': (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path
        fillRule="evenodd"
        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  'plus-square': (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
    </svg>
  ),
};

const colorClasses: Record<string, string> = {
  green: 'bg-green-500 bg-opacity-20 text-green-400',
  blue: 'bg-blue-500 bg-opacity-20 text-blue-400',
  purple: 'bg-purple-500 bg-opacity-20 text-purple-400',
  red: 'bg-red-500 bg-opacity-20 text-red-400',
  yellow: 'bg-yellow-500 bg-opacity-20 text-yellow-400',
};

type AccountItemProps = {
  account: Account;
  onEdit: (account: Account) => void;
};

const AccountItem = ({ account, onEdit }: AccountItemProps) => {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(account.balance));

  return (
    <div className="flex items-center justify-between py-3 border-b border-border group">
      <div className="flex items-center">
        <div
          className={`w-8 h-8 rounded-md ${colorClasses[account.color]} flex items-center justify-center mr-3`}
        >
          {accountIcons[account.icon] || <div className="h-4 w-4" />}
        </div>
        <div>
          <h3 className="font-medium">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{account.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right font-mono">
          <span className="font-medium">{formattedBalance}</span>
        </div>
        <button
          onClick={() => onEdit(account)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-md"
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
  const { deleteAccount } = useFinance();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const handleEditClick = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
    } else {
      setEditingAccount(null);
    }
    setIsAccountFormOpen(true);
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setIsAccountFormOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsAccountFormOpen(true);
  };

  const handleFormClose = () => {
    setIsAccountFormOpen(false);
    setEditingAccount(null);
  };

  return (
    <>
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Accounts</CardTitle>
          <Button variant="outline" onClick={handleAddAccount} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Account
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-border"
                >
                  <div className="flex items-center">
                    <Skeleton className="w-8 h-8 rounded-md mr-3" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : accounts && accounts.length > 0 ? (
              accounts.map((account: Account) => (
                <AccountItem
                  key={account.id}
                  account={account}
                  onEdit={() => handleEditAccount(account)}
                />
              ))
            ) : (
              <div className="py-3 text-center text-muted-foreground">
                No accounts found. Add an account to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AccountForm isOpen={isAccountFormOpen} onClose={handleFormClose} account={editingAccount} />
    </>
  );
}
