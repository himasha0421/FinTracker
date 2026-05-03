import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InvestmentItem, InvestmentContributionItem } from '@/features/investment/types';
import {
  investmentGroupsListQuery,
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
  buildAllocationSlices,
  buildMonthlyContributionSeries,
  getSignedContributionAmount,
} from '@/features/investment/utils';
import { useFinance } from '@/lib/context';

export default function InvestmentScreen() {
  const { addInvestmentGroup, updateInvestment, isLoading: isMutating } = useFinance();
  const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentItem | null>(null);
  const [editingContribution, setEditingContribution] = useState<InvestmentContributionItem | null>(
    null
  );
  const [defaultContributionInvestmentId, setDefaultContributionInvestmentId] = useState<
    number | undefined
  >(undefined);

  const { data: investments = [], isLoading: isLoadingInvestments } =
    useQuery(investmentsListQuery());
  const { data: investmentGroups = [], isLoading: isLoadingGroups } = useQuery(
    investmentGroupsListQuery()
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
    () => investments.reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0),
    [investments]
  );

  const totalMonthlyContribution = useMemo(
    () =>
      investments.reduce((sum, investment) => sum + Number(investment.monthlyContribution || 0), 0),
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
      map.set(contribution.investmentId, (map.get(contribution.investmentId) ?? 0) + signedAmount);
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

  const allocationData = useMemo(() => buildAllocationSlices(investments), [investments]);

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

  const handleCreateGroup = async (name: string, description: string) => {
    await addInvestmentGroup({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
    });
  };

  const handleMoveInvestmentToGroup = async (investmentId: number, groupId: number | null) => {
    await updateInvestment(investmentId, { groupId });
  };

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
            contributionsByInvestment={contributionsByInvestment}
            accountsById={accountsById}
            onEditInvestment={handleEditInvestment}
            onAddContribution={handleAddContribution}
          />
        </TabsContent>

        <TabsContent value="holdings" className="space-y-6">
          <InvestmentHoldings
            isLoading={isLoadingInvestments || isLoadingGroups}
            investments={nonAssetInvestments}
            groups={investmentGroups}
            contributionsByInvestment={contributionsByInvestment}
            accountsById={accountsById}
            isMutating={isMutating}
            onCreateGroup={handleCreateGroup}
            onMoveInvestmentToGroup={handleMoveInvestmentToGroup}
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
