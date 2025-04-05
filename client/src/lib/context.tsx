import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from './queryClient';
import { apiRequest } from './queryClient';
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
      const res = await fetch('/api/balance', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch balance');
      const data = await res.json();
      setTotalBalance(data.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
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
      // Invalidate all relevant queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      await fetchTotalBalance();
    } catch (error) {
      console.error('Error refreshing data:', error);
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
      await apiRequest('POST', '/api/accounts', data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Account added successfully',
      });
    } catch (error) {
      console.error('Error adding account:', error);
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
      await apiRequest('PATCH', `/api/accounts/${id}`, data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Account updated successfully',
      });
    } catch (error) {
      console.error('Error updating account:', error);
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
      await apiRequest('DELETE', `/api/accounts/${id}`);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting account:', error);
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
      console.log('Adding transaction to backend:', data); // Debug log
      await apiRequest('POST', '/api/transactions', data);
      console.log('Successfully added transaction, refreshing data...'); // Debug log

      // Invalidate transactions query specifically
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      // Refresh total balance
      await fetchTotalBalance();

      toast({
        title: 'Success',
        description: 'Transaction added successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add transaction: ' + (error as Error).message,
        variant: 'destructive',
        duration: 5000,
      });
      throw error; // Re-throw the error so it can be caught by the caller
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = async (id: number, data: Partial<Omit<Transaction, 'id'>>) => {
    setIsLoading(true);
    try {
      await apiRequest('PATCH', `/api/transactions/${id}`, data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Transaction updated successfully',
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
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
      await apiRequest('DELETE', `/api/transactions/${id}`);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
      await apiRequest('POST', '/api/goals', data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Financial goal added successfully',
      });
    } catch (error) {
      console.error('Error adding financial goal:', error);
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
      await apiRequest('PATCH', `/api/goals/${id}`, data);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Financial goal updated successfully',
      });
    } catch (error) {
      console.error('Error updating financial goal:', error);
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
      await apiRequest('DELETE', `/api/goals/${id}`);
      await refreshData();
      toast({
        title: 'Success',
        description: 'Financial goal deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting financial goal:', error);
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
