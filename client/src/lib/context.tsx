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
import { createGoal, deleteGoal, goalKeys, updateGoal } from '@/features/goals/api';
import type { GoalPayload, UpdateGoalPayload } from '@/features/goals/api';
import {
  createInvestment,
  createInvestmentGroup,
  deleteInvestment as deleteInvestmentApi,
  deleteInvestmentGroup as deleteInvestmentGroupApi,
  investmentContributionKeys,
  investmentGroupKeys,
  investmentKeys,
  updateInvestment as updateInvestmentApi,
  updateInvestmentGroup as updateInvestmentGroupApi,
  createInvestmentContribution,
  updateInvestmentContribution as updateInvestmentContributionApi,
  deleteInvestmentContribution as deleteInvestmentContributionApi,
} from '@/features/investment/api';
import type { Account } from '@shared/schema';
import type { CreateTransactionPayload, UpdateTransactionPayload } from '@/features/transactions/types';
import type {
  CreateInvestmentPayload,
  UpdateInvestmentPayload,
  CreateInvestmentGroupPayload,
  UpdateInvestmentGroupPayload,
  CreateContributionPayload,
  UpdateContributionPayload,
} from '@/features/investment/types';

type FinanceContextType = {
  isLoading: boolean;
  totalBalance: number;
  // Action functions
  refreshData: () => Promise<void>;
  addAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: number, data: Partial<Omit<Account, 'id'>>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  addTransaction: (data: CreateTransactionPayload) => Promise<void>;
  updateTransaction: (id: number, data: UpdateTransactionPayload) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  addFinancialGoal: (data: GoalPayload) => Promise<void>;
  updateFinancialGoal: (id: number, data: UpdateGoalPayload) => Promise<void>;
  deleteFinancialGoal: (id: number) => Promise<void>;
  addInvestment: (data: CreateInvestmentPayload) => Promise<void>;
  updateInvestment: (id: number, data: UpdateInvestmentPayload) => Promise<void>;
  deleteInvestment: (id: number) => Promise<void>;
  addInvestmentGroup: (data: CreateInvestmentGroupPayload) => Promise<void>;
  updateInvestmentGroup: (id: number, data: UpdateInvestmentGroupPayload) => Promise<void>;
  deleteInvestmentGroup: (id: number) => Promise<void>;
  addInvestmentContribution: (data: CreateContributionPayload) => Promise<void>;
  updateInvestmentContribution: (id: number, data: UpdateContributionPayload) => Promise<void>;
  deleteInvestmentContribution: (id: number) => Promise<void>;
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
      await queryClient.invalidateQueries({ queryKey: investmentGroupKeys.all });
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      await queryClient.invalidateQueries({ queryKey: investmentContributionKeys.all });
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
  const addTransaction = async (data: CreateTransactionPayload) => {
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

  const updateTransaction = async (id: number, data: UpdateTransactionPayload) => {
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
  const addFinancialGoal = async (data: GoalPayload) => {
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

  const updateFinancialGoal = async (id: number, data: UpdateGoalPayload) => {
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

  // Investment operations
  const addInvestment = async (data: CreateInvestmentPayload) => {
    setIsLoading(true);
    try {
      await createInvestment(data);
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      toast({
        title: 'Success',
        description: 'Investment added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add investment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvestment = async (id: number, data: UpdateInvestmentPayload) => {
    setIsLoading(true);
    try {
      await updateInvestmentApi(id, data);
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      toast({
        title: 'Success',
        description: 'Investment updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update investment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvestment = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteInvestmentApi(id);
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      await queryClient.invalidateQueries({ queryKey: investmentContributionKeys.all });
      toast({
        title: 'Success',
        description: 'Investment deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete investment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addInvestmentGroup = async (data: CreateInvestmentGroupPayload) => {
    setIsLoading(true);
    try {
      await createInvestmentGroup(data);
      await queryClient.invalidateQueries({ queryKey: investmentGroupKeys.all });
      toast({
        title: 'Success',
        description: 'Investment group added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add investment group',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvestmentGroup = async (
    id: number,
    data: UpdateInvestmentGroupPayload
  ) => {
    setIsLoading(true);
    try {
      await updateInvestmentGroupApi(id, data);
      await queryClient.invalidateQueries({ queryKey: investmentGroupKeys.all });
      toast({
        title: 'Success',
        description: 'Investment group updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update investment group',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvestmentGroup = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteInvestmentGroupApi(id);
      await queryClient.invalidateQueries({ queryKey: investmentGroupKeys.all });
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      toast({
        title: 'Success',
        description: 'Investment group deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete investment group',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addInvestmentContribution = async (data: CreateContributionPayload) => {
    setIsLoading(true);
    try {
      await createInvestmentContribution(data);
      await queryClient.invalidateQueries({ queryKey: investmentContributionKeys.all });
      toast({
        title: 'Success',
        description: 'Contribution added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add contribution',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvestmentContribution = async (
    id: number,
    data: UpdateContributionPayload
  ) => {
    setIsLoading(true);
    try {
      await updateInvestmentContributionApi(id, data);
      await queryClient.invalidateQueries({ queryKey: investmentContributionKeys.all });
      toast({
        title: 'Success',
        description: 'Contribution updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contribution',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvestmentContribution = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteInvestmentContributionApi(id);
      await queryClient.invalidateQueries({ queryKey: investmentContributionKeys.all });
      toast({
        title: 'Success',
        description: 'Contribution deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contribution',
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
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addInvestmentGroup,
    updateInvestmentGroup,
    deleteInvestmentGroup,
    addInvestmentContribution,
    updateInvestmentContribution,
    deleteInvestmentContribution,
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
