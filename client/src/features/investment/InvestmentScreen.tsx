import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InvestmentItem, InvestmentContributionItem } from '@/features/investment/types';
import {
  investmentsListQuery,
  investmentContributionsListQuery,
} from '@/features/investment/api';
import InvestmentForm from '@/features/investment/components/InvestmentForm';
import ContributionForm from '@/features/investment/components/ContributionForm';
import { accountsListQuery } from '@/features/accounts/api';
import InvestmentHeader from '@/features/investment/components/InvestmentHeader';
import InvestmentOverview from '@/features/investment/components/InvestmentOverview';
import InvestmentHoldings from '@/features/investment/components/InvestmentHoldings';
import InvestmentContributions from '@/features/investment/components/InvestmentContributions';
import InvestmentAssets from '@/features/investment/components/InvestmentAssets';
import { assetTypeSet, contributionAssetTypeSet } from '@/features/investment/constants';
import {
  allocationPalette,
  buildMonthlyContributionSeries,
  formatTypeLabel,
  getSignedContributionAmount,
} from '@/features/investment/utils';

export default function InvestmentScreen() {
  const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentItem | null>(null);
  const [editingContribution, setEditingContribution] =
    useState<InvestmentContributionItem | null>(null);
  const [defaultContributionInvestmentId, setDefaultContributionInvestmentId] =
    useState<number | undefined>(undefined);

  const { data: investments = [], isLoading: isLoadingInvestments } = useQuery(
    investmentsListQuery()
  );
  const { data: contributions = [], isLoading: isLoadingContributions } = useQuery(
    investmentContributionsListQuery()
  );
  const { data: accounts = [] } = useQuery(accountsListQuery());

  const accountsById = useMemo(() => {
    const map = new Map<number, string>();
    accounts.forEach(account => map.set(account.id, account.name));
    return map;
  }, [accounts]);

  const investmentsById = useMemo(() => {
    const map = new Map<number, InvestmentItem>();
    investments.forEach(investment => map.set(investment.id, investment));
    return map;
  }, [investments]);

  const totalInvestmentValue = useMemo(
    () =>
      investments.reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0),
    [investments]
  );

  const totalMonthlyContribution = useMemo(
    () =>
      investments.reduce(
        (sum, investment) => sum + Number(investment.monthlyContribution || 0),
        0
      ),
    [investments]
  );

  const monthlyContributionAssets = useMemo(
    () =>
      investments.reduce((sum, investment) => {
        if (contributionAssetTypeSet.has(investment.type)) {
          return sum + Number(investment.monthlyContribution || 0);
        }
        return sum;
      }, 0),
    [investments]
  );

  const monthlyContributionHoldings = useMemo(
    () =>
      investments.reduce((sum, investment) => {
        if (!contributionAssetTypeSet.has(investment.type)) {
          return sum + Number(investment.monthlyContribution || 0);
        }
        return sum;
      }, 0),
    [investments]
  );

  const contributionsByInvestment = useMemo(() => {
    const map = new Map<number, number>();
    contributions.forEach(contribution => {
      const signedAmount = getSignedContributionAmount(contribution);
      map.set(
        contribution.investmentId,
        (map.get(contribution.investmentId) ?? 0) + signedAmount
      );
    });
    return map;
  }, [contributions]);

  const netContributions = useMemo(() => {
    return contributions.reduce((sum, contribution) => {
      return sum + getSignedContributionAmount(contribution);
    }, 0);
  }, [contributions]);

  const currentBalanceAssets = useMemo(
    () =>
      investments.reduce((sum, investment) => {
        if (contributionAssetTypeSet.has(investment.type)) {
          return sum + Number(investment.currentValue || 0);
        }
        return sum;
      }, 0),
    [investments]
  );

  const currentBalanceHoldings = useMemo(
    () =>
      investments.reduce((sum, investment) => {
        if (!contributionAssetTypeSet.has(investment.type)) {
          return sum + Number(investment.currentValue || 0);
        }
        return sum;
      }, 0),
    [investments]
  );

  const gainLoss = totalInvestmentValue - netContributions;
  const gainLossPercent =
    netContributions > 0 ? ((gainLoss / netContributions) * 100).toFixed(1) : null;

  const allocationData = useMemo(() => {
    const totals = new Map<string, number>();
    investments.forEach(investment => {
      const value = Number(investment.currentValue || 0);
      totals.set(investment.type, (totals.get(investment.type) ?? 0) + value);
    });

    return Array.from(totals.entries()).map(([type, value], index) => ({
      name: formatTypeLabel(type),
      value,
      color: allocationPalette[index % allocationPalette.length],
    }));
  }, [investments]);

  const totalAllocationValue = allocationData.reduce((sum, item) => sum + item.value, 0);

  const contributionSeries = useMemo(
    () => buildMonthlyContributionSeries(contributions),
    [contributions]
  );

  const assetInvestments = useMemo(
    () => investments.filter(investment => assetTypeSet.has(investment.type)),
    [investments]
  );
  const nonAssetInvestments = useMemo(
    () => investments.filter(investment => !assetTypeSet.has(investment.type)),
    [investments]
  );

  const handleAddInvestment = () => {
    setEditingInvestment(null);
    setIsInvestmentFormOpen(true);
  };

  const handleEditInvestment = (investment: InvestmentItem) => {
    setEditingInvestment(investment);
    setIsInvestmentFormOpen(true);
  };

  const handleAddContribution = (investmentId?: number) => {
    setEditingContribution(null);
    setDefaultContributionInvestmentId(investmentId);
    setIsContributionFormOpen(true);
  };

  const handleEditContribution = (contribution: InvestmentContributionItem) => {
    setEditingContribution(contribution);
    setDefaultContributionInvestmentId(undefined);
    setIsContributionFormOpen(true);
  };

  const handleCloseInvestmentForm = () => {
    setIsInvestmentFormOpen(false);
    setEditingInvestment(null);
  };

  const handleCloseContributionForm = () => {
    setIsContributionFormOpen(false);
    setEditingContribution(null);
    setDefaultContributionInvestmentId(undefined);
  };

  const isLoading = isLoadingInvestments || isLoadingContributions;
  const canAddContribution = investments.length > 0;

  return (
    <div className="space-y-6">
      <InvestmentHeader
        canAddContribution={canAddContribution}
        onAddContribution={() => handleAddContribution()}
        onAddInvestment={handleAddInvestment}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <InvestmentOverview
            isLoading={isLoading}
            totalInvestmentValue={totalInvestmentValue}
            totalMonthlyContribution={totalMonthlyContribution}
            monthlyContributionAssets={monthlyContributionAssets}
            monthlyContributionHoldings={monthlyContributionHoldings}
            currentBalanceAssets={currentBalanceAssets}
            currentBalanceHoldings={currentBalanceHoldings}
            gainLoss={gainLoss}
            gainLossPercent={gainLossPercent}
            allocationData={allocationData}
            totalAllocationValue={totalAllocationValue}
            contributionSeries={contributionSeries}
          />
        </TabsContent>

        <TabsContent value="holdings" className="space-y-6">
          <InvestmentHoldings
            isLoading={isLoadingInvestments}
            investments={nonAssetInvestments}
            contributionsByInvestment={contributionsByInvestment}
            accountsById={accountsById}
            onEditInvestment={handleEditInvestment}
            onAddContribution={handleAddContribution}
          />
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <InvestmentAssets
            isLoading={isLoadingInvestments}
            investments={assetInvestments}
            contributionsByInvestment={contributionsByInvestment}
            accountsById={accountsById}
            onEditInvestment={handleEditInvestment}
            onAddContribution={handleAddContribution}
          />
        </TabsContent>

        <TabsContent value="contributions" className="space-y-6">
          <InvestmentContributions
            isLoading={isLoadingContributions}
            contributions={contributions}
            investmentsById={investmentsById}
            canAddContribution={canAddContribution}
            onAddContribution={() => handleAddContribution()}
            onEditContribution={handleEditContribution}
          />
        </TabsContent>
      </Tabs>

      <InvestmentForm
        isOpen={isInvestmentFormOpen}
        onClose={handleCloseInvestmentForm}
        investment={editingInvestment}
      />
      <ContributionForm
        isOpen={isContributionFormOpen}
        onClose={handleCloseContributionForm}
        investments={investments}
        contribution={editingContribution}
        defaultInvestmentId={defaultContributionInvestmentId}
      />
    </div>
  );
}
