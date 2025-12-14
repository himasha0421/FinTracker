import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from './queryClient';
import { apiClient } from '@/services/apiClient';
import {
  accountKeys,
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from '@/features/accounts/api';
import {
  createTransaction as createTransactionApi,
  deleteTransaction as deleteTransactionApi,
  transactionKeys,
  updateTransaction as updateTransactionApi,
} from '@/features/transactions/api';
import {
  createGoal,
  deleteGoal,
  goalKeys,
  updateGoal,
} from '@/features/goals/api';
import type { Account, Transaction, FinancialGoal } from '@shared/schema';

type FinanceContextType = {
  isLoading: boolean;
  totalBalance: number;
  // Action functions
  refreshData: () => Promise<void>;
  addAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: number, data: Partial<Omit<Account, 'id'>>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: number, data: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  addFinancialGoal: (data: Omit<FinancialGoal, 'id'>) => Promise<void>;
  updateFinancialGoal: (id: number, data: Partial<Omit<FinancialGoal, 'id'>>) => Promise<void>;
  deleteFinancialGoal: (id: number) => Promise<void>;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const { toast } = useToast();

  // Fetch total balance initially
  useEffect(() => {
    fetchTotalBalance();
  }, []);

  const fetchTotalBalance = async () => {
    try {
      const data = await apiClient<{ balance: number }>('/api/balance');
      setTotalBalance(data.balance);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch account balance',
        variant: 'destructive',
      });
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
      await fetchTotalBalance();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Account operations
  const addAccount = async (data: Omit<Account, 'id'>) => {
    setIsLoading(true);
    try {
      await createAccountApi(data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Account added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccount = async (id: number, data: Partial<Omit<Account, 'id'>>) => {
    setIsLoading(true);
    try {
      await updateAccountApi(id, data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Account updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteAccountApi(id);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Transaction operations
  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
    setIsLoading(true);
    try {
      await createTransactionApi(data);
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await fetchTotalBalance();

      toast({
        title: 'Success',
        description: 'Transaction added successfully',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add transaction: ' + (error as Error).message,
        variant: 'destructive',
        duration: 5000,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = async (id: number, data: Partial<Omit<Transaction, 'id'>>) => {
    setIsLoading(true);
    try {
      await updateTransactionApi(id, data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Transaction updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update transaction',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTransaction = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteTransactionApi(id);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Financial Goal operations
  const addFinancialGoal = async (data: Omit<FinancialGoal, 'id'>) => {
    setIsLoading(true);
    try {
      await createGoal(data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Financial goal added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add financial goal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFinancialGoal = async (id: number, data: Partial<Omit<FinancialGoal, 'id'>>) => {
    setIsLoading(true);
    try {
      await updateGoal(id, data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Financial goal updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update financial goal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFinancialGoal = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteGoal(id);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Financial goal deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete financial goal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isLoading,
    totalBalance,
    refreshData,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addFinancialGoal,
    updateFinancialGoal,
    deleteFinancialGoal,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
