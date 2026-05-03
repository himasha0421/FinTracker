import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroCard } from '@/components/composed/HeroCard';
import { GlassTile } from '@/components/composed/GlassTile';
import { SectionCard, SectionCardHeader } from '@/components/composed/SectionCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { InvestmentGroupItem, InvestmentItem } from '@/features/investment/types';
import { formatCurrency, formatTypeLabel } from '@/features/investment/utils';
import {
  FolderKanban,
  Grip,
  Layers3,
  Pencil,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

type InvestmentHoldingsProps = {
  isLoading: boolean;
  investments: InvestmentItem[];
  groups: InvestmentGroupItem[];
  contributionsByInvestment: Map<number, number>;
  accountsById: Map<number, string>;
  isMutating: boolean;
  onCreateGroup: (name: string, description: string) => Promise<void>;
  onMoveInvestmentToGroup: (investmentId: number, groupId: number | null) => Promise<void>;
  onEditInvestment: (investment: InvestmentItem) => void;
  onAddContribution: (investmentId?: number) => void;
};

type GroupStats = {
  totalNetValue: number;
  totalContribution: number;
  growth: number;
  growthPercent: number | null;
};

const getGroupStats = (
  groupInvestments: InvestmentItem[],
  contributionsByInvestment: Map<number, number>
): GroupStats => {
  const totalNetValue = groupInvestments.reduce(
    (sum, investment) => sum + Number(investment.currentValue || 0),
    0
  );
  const totalContribution = groupInvestments.reduce(
    (sum, investment) => sum + (contributionsByInvestment.get(investment.id) ?? 0),
    0
  );
  const growth = totalNetValue - totalContribution;
  const growthPercent =
    totalContribution > 0 ? Number(((growth / totalContribution) * 100).toFixed(1)) : null;

  return { totalNetValue, totalContribution, growth, growthPercent };
};

const formatGrowthPercent = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export default function InvestmentHoldings({
  isLoading,
  investments,
  groups,
  contributionsByInvestment,
  accountsById,
  isMutating,
  onCreateGroup,
  onMoveInvestmentToGroup,
  onEditInvestment,
  onAddContribution,
}: InvestmentHoldingsProps) {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [draggingInvestmentId, setDraggingInvestmentId] = useState<number | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<number | 'ungrouped' | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);

  const groupedInvestments = useMemo(() => {
    const map = new Map<number, InvestmentItem[]>();
    groups.forEach(group => map.set(group.id, []));

    const ungrouped: InvestmentItem[] = [];
    investments.forEach(investment => {
      if (investment.groupId !== null && investment.groupId !== undefined) {
        const existing = map.get(investment.groupId);
        if (existing) {
          existing.push(investment);
          return;
        }
      }
      ungrouped.push(investment);
    });

    return { map, ungrouped };
  }, [groups, investments]);

  const investmentById = useMemo(() => {
    const map = new Map<number, InvestmentItem>();
    investments.forEach(investment => map.set(investment.id, investment));
    return map;
  }, [investments]);

  const groupCards = useMemo(() => {
    return groups.map(group => {
      const items = [...(groupedInvestments.map.get(group.id) ?? [])].sort(
        (left, right) => Number(right.currentValue || 0) - Number(left.currentValue || 0)
      );

      return {
        group,
        items,
        stats: getGroupStats(items, contributionsByInvestment),
      };
    });
  }, [contributionsByInvestment, groupedInvestments.map, groups]);

  const summary = useMemo(() => {
    const totalNetValue = investments.reduce(
      (sum, investment) => sum + Number(investment.currentValue || 0),
      0
    );
    const totalContribution = investments.reduce(
      (sum, investment) => sum + (contributionsByInvestment.get(investment.id) ?? 0),
      0
    );
    const groupedHoldings = groupCards.reduce((sum, groupCard) => sum + groupCard.items.length, 0);
    const groupedValue = groupCards.reduce(
      (sum, groupCard) => sum + groupCard.stats.totalNetValue,
      0
    );
    const ungroupedValue = groupedInvestments.ungrouped.reduce(
      (sum, investment) => sum + Number(investment.currentValue || 0),
      0
    );
    const growth = totalNetValue - totalContribution;
    const bestGroup =
      [...groupCards].sort(
        (left, right) => right.stats.totalNetValue - left.stats.totalNetValue
      )[0] ?? null;

    return {
      totalNetValue,
      totalContribution,
      growth,
      groupedHoldings,
      groupedValue,
      ungroupedValue,
      ungroupedCount: groupedInvestments.ungrouped.length,
      bestGroup,
    };
  }, [contributionsByInvestment, groupCards, groupedInvestments.ungrouped, investments]);

  const selectedGroupCard =
    groupCards.find(groupCard => groupCard.group.id === selectedGroupId) ?? null;

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    if (!groupCards.some(groupCard => groupCard.group.id === selectedGroupId)) {
      setSelectedGroupId(null);
      setIsGroupDialogOpen(false);
    }
  }, [groupCards, selectedGroupId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[240px] w-full rounded-[28px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[260px] w-full rounded-[28px]" />
          <Skeleton className="h-[260px] w-full rounded-[28px]" />
        </div>
      </div>
    );
  }

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      return;
    }

    await onCreateGroup(trimmedName, groupDescription.trim());
    setGroupName('');
    setGroupDescription('');
    setIsCreateGroupOpen(false);
  };

  const readDraggedInvestmentId = (event: DragEvent<HTMLElement>) => {
    const raw = event.dataTransfer.getData('text/investment-id');
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return draggingInvestmentId;
  };

  const handleDrop = async (event: DragEvent<HTMLElement>, targetGroupId: number | null) => {
    event.preventDefault();

    const investmentId = readDraggedInvestmentId(event);
    if (!investmentId) {
      setActiveDropTarget(null);
      return;
    }

    const investment = investmentById.get(investmentId);
    if (!investment) {
      setActiveDropTarget(null);
      setDraggingInvestmentId(null);
      return;
    }

    if ((investment.groupId ?? null) === targetGroupId) {
      setActiveDropTarget(null);
      setDraggingInvestmentId(null);
      return;
    }

    await onMoveInvestmentToGroup(investmentId, targetGroupId);
    setActiveDropTarget(null);
    setDraggingInvestmentId(null);
  };

  const openGroupDialog = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsGroupDialogOpen(true);
  };

  const renderInvestmentCard = (investment: InvestmentItem) => {
    const netByInvestment = contributionsByInvestment.get(investment.id) ?? 0;
    const linkedAccount = investment.accountId ? accountsById.get(investment.accountId) : undefined;
    const currency = investment.currency || 'USD';
    const isDragging = draggingInvestmentId === investment.id;
    const growth = Number(investment.currentValue || 0) - netByInvestment;
    const growthPositive = growth >= 0;

    return (
      <SectionCard
        key={investment.id}
        radius="md"
        draggable
        onDragStart={event => {
          setDraggingInvestmentId(investment.id);
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/investment-id', investment.id.toString());
        }}
        onDragEnd={() => {
          setDraggingInvestmentId(null);
          setActiveDropTarget(null);
        }}
        className={cn(isDragging && 'scale-[0.985] opacity-60')}
      >
        <SectionCardHeader
          title={investment.name}
          className="space-y-4 pb-4"
        >
          <CardDescription className="mt-1 text-slate-500">
            {formatTypeLabel(investment.type)}
            {investment.symbol ? ` • ${investment.symbol}` : ''}
            {investment.institution ? ` • ${investment.institution}` : ''}
          </CardDescription>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-50">
                <Grip className="h-3 w-3" />
                Drag to regroup
              </span>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] text-slate-600">
                {linkedAccount || 'No linked account'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-slate-500 hover:bg-slate-900 hover:text-white"
              onClick={() => onEditInvestment(investment)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </SectionCardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-3 text-slate-50">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Current Value
              </div>
              <div className="mt-2 text-lg font-semibold">
                {formatCurrency(Number(investment.currentValue || 0), currency)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Monthly Contribution
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {formatCurrency(Number(investment.monthlyContribution || 0), currency)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Net Contributions
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {formatCurrency(Number(netByInvestment || 0), currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Delta</div>
              <div
                className={cn(
                  'mt-2 flex items-center gap-1 text-sm font-semibold',
                  growthPositive ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {growthPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatCurrency(growth, currency)}
              </div>
            </div>
          </div>

          {investment.notes ? (
            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {investment.notes}
            </div>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onAddContribution(investment.id)}
          >
            Add Contribution
          </Button>
        </CardContent>
      </SectionCard>
    );
  };

  return (
    <div className="space-y-6">
      <HeroCard accent="sky">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.26em] text-sky-100/80">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Holdings Workspace
                </div>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Organize positions into cleaner portfolios
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Group holdings by strategy, account, or goal. Drag cards between groups to keep
                    the portfolio structure tidy and easier to review.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Total holdings value
                  </div>
                  <div className="mt-2 text-4xl font-semibold sm:text-5xl">
                    {formatCurrency(summary.totalNetValue)}
                  </div>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                    summary.growth >= 0
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'bg-rose-500/15 text-rose-200'
                  )}
                >
                  {summary.growth >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatCurrency(summary.growth)} overall delta
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <GlassTile>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-sm">Active groups</span>
                    <Layers3 className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{groups.length}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    {summary.groupedHoldings} grouped holdings worth{' '}
                    {formatCurrency(summary.groupedValue)}
                  </div>
                </GlassTile>

                <GlassTile>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-sm">Ungrouped queue</span>
                    <Grip className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{summary.ungroupedCount}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    {formatCurrency(summary.ungroupedValue)} waiting for a home
                  </div>
                </GlassTile>

                <GlassTile>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-sm">Largest group</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {summary.bestGroup?.group.name || 'None yet'}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {summary.bestGroup
                      ? formatCurrency(summary.bestGroup.stats.totalNetValue)
                      : 'Create a group to start organizing'}
                  </div>
                </GlassTile>
              </div>
            </div>

            <GlassTile size="lg">
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <div className="text-sm font-medium text-slate-100">How this tab works</div>
                  <div className="mt-2 text-sm text-slate-400">
                    Build groups like retirement, long-term ETF, cash reserve, or speculation.
                    Expand a group to inspect holdings, then drag cards between groups to rebalance
                    the structure.
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Net contributions
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatCurrency(summary.totalContribution)}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Suggested next move
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      {summary.ungroupedCount > 0
                        ? 'Pull the ungrouped holdings into strategy buckets so the page reads like a real portfolio.'
                        : 'Your structure is clean. Expand a group and review concentration by strategy.'}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setIsCreateGroupOpen(true)}
                  disabled={isMutating}
                  className="w-full bg-white text-slate-950 hover:bg-slate-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </div>
            </GlassTile>
          </div>
      </HeroCard>

      {groupCards.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {groupCards.map(({ group, items, stats }) => {
            const growthClass =
              stats.growth > 0
                ? 'text-emerald-600'
                : stats.growth < 0
                  ? 'text-rose-600'
                  : 'text-slate-900';

            return (
              <SectionCard
                key={group.id}
                radius="lg"
                onDragOver={event => {
                  event.preventDefault();
                  setActiveDropTarget(group.id);
                }}
                onDragLeave={event => {
                  const related = event.relatedTarget as Node | null;
                  if (!related || !event.currentTarget.contains(related)) {
                    setActiveDropTarget(null);
                  }
                }}
                onDrop={event => handleDrop(event, group.id)}
                className={cn(
                  activeDropTarget === group.id &&
                    'border-sky-400 bg-sky-50 shadow-lg shadow-sky-100/70'
                )}
              >
                <SectionCardHeader
                  title={group.name}
                  className="space-y-4 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openGroupDialog(group.id)}
                        className="block text-left"
                      >
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-50">
                          <FolderKanban className="h-3 w-3" />
                          Group
                        </div>
                        <CardTitle className="mt-3 truncate text-xl text-slate-950 transition hover:text-sky-700">
                          {group.name}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2 text-slate-500">
                          {group.description ||
                            'Drop holdings here to build a more intentional strategy bucket.'}
                        </CardDescription>
                        <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                          Open group view
                        </div>
                      </button>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-600">
                        {items.length} holdings
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-950 p-3 text-slate-50">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Net Value
                      </div>
                      <div className="mt-2 text-base font-semibold">
                        {formatCurrency(stats.totalNetValue)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Contributions
                      </div>
                      <div className="mt-2 text-base font-semibold text-slate-900">
                        {formatCurrency(stats.totalContribution)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Growth
                      </div>
                      <div className={cn('mt-2 text-base font-semibold', growthClass)}>
                        {formatCurrency(stats.growth)}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {formatGrowthPercent(stats.growthPercent)}
                      </div>
                    </div>
                  </div>
                </SectionCardHeader>

              </SectionCard>
            );
          })}
        </div>
      ) : null}

      <Card
        onDragOver={event => {
          event.preventDefault();
          setActiveDropTarget('ungrouped');
        }}
        onDragLeave={event => {
          const related = event.relatedTarget as Node | null;
          if (!related || !event.currentTarget.contains(related)) {
            setActiveDropTarget(null);
          }
        }}
        onDrop={event => handleDrop(event, null)}
        className={cn(
          'overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))] shadow-sm transition duration-200',
          activeDropTarget === 'ungrouped' && 'border-sky-400 bg-sky-50 shadow-lg shadow-sky-100/70'
        )}
      >
        <CardHeader className="border-b border-slate-200/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                <Wallet className="h-5 w-5 text-sky-500" />
                Ungrouped Holdings
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                {groups.length === 0
                  ? 'Create a group and drag holdings into it.'
                  : 'Drop a holding here to remove it from a group and stage it for reorganization.'}
              </CardDescription>
            </div>
            <div className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-50">
              {summary.ungroupedCount} waiting
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {groupedInvestments.ungrouped.length === 0 ? (
            <div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              All holdings are currently assigned to groups.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groupedInvestments.ungrouped
                .slice()
                .sort(
                  (left, right) => Number(right.currentValue || 0) - Number(left.currentValue || 0)
                )
                .map(renderInvestmentCard)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="border border-slate-800 bg-slate-950 text-slate-50 sm:rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Investment Group</DialogTitle>
            <DialogDescription className="text-slate-400">
              Give the group a clear strategy label so the holdings workspace stays readable.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleCreateGroup}>
            <div className="space-y-2">
              <label htmlFor="group-name" className="text-sm font-medium text-slate-200">
                Group Name
              </label>
              <Input
                id="group-name"
                value={groupName}
                onChange={event => setGroupName(event.target.value)}
                placeholder="e.g. Retirement Portfolio"
                maxLength={80}
                required
                className="border-slate-700 bg-slate-900 text-slate-50 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="group-description" className="text-sm font-medium text-slate-200">
                Description
              </label>
              <Textarea
                id="group-description"
                value={groupDescription}
                onChange={event => setGroupDescription(event.target.value)}
                placeholder="What does this group represent?"
                maxLength={240}
                className="border-slate-700 bg-slate-900 text-slate-50 placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateGroupOpen(false)}
                disabled={isMutating}
                className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMutating || !groupName.trim()}
                className="bg-white text-slate-950 hover:bg-slate-200"
              >
                Create Group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden border border-slate-800 bg-slate-950 p-0 text-slate-50 sm:rounded-[32px]">
          {selectedGroupCard ? (
            <>
              <DialogHeader className="border-b border-white/10 px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {selectedGroupCard.group.name}
                    </div>
                    <DialogTitle className="text-2xl font-semibold text-slate-50">
                      {selectedGroupCard.group.name} holdings
                    </DialogTitle>
                    <DialogDescription className="max-w-2xl text-slate-400">
                      {selectedGroupCard.group.description ||
                        'A focused view of the holdings inside this group.'}
                    </DialogDescription>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Net value
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {formatCurrency(selectedGroupCard.stats.totalNetValue)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Contributions
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {formatCurrency(selectedGroupCard.stats.totalContribution)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Growth</div>
                      <div className="mt-1 text-lg font-semibold">
                        {formatCurrency(selectedGroupCard.stats.growth)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatGrowthPercent(selectedGroupCard.stats.growthPercent)}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
                  <div className="mb-4">
                    <div className="text-sm font-medium text-slate-200">Holdings ranking</div>
                    <div className="text-xs text-slate-400">
                      Largest positions inside this group
                    </div>
                  </div>

                  <ScrollArea className="h-[420px] pr-4">
                    <div className="space-y-3">
                      {selectedGroupCard.items.length > 0 ? (
                        selectedGroupCard.items.map(investment => {
                          const currentValue = Number(investment.currentValue || 0);
                          const share =
                            selectedGroupCard.stats.totalNetValue > 0
                              ? (currentValue / selectedGroupCard.stats.totalNetValue) * 100
                              : 0;

                          return (
                            <button
                              key={investment.id}
                              type="button"
                              onClick={() => onEditInvestment(investment)}
                              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-100">
                                    {investment.name}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    {formatTypeLabel(investment.type)}
                                    {investment.symbol ? ` • ${investment.symbol}` : ''}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-50">
                                    {formatCurrency(currentValue, investment.currency || 'USD')}
                                  </div>
                                  <div className="text-xs text-slate-400">{share.toFixed(1)}%</div>
                                </div>
                              </div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-sky-400"
                                  style={{ width: `${Math.max(share, share > 0 ? 8 : 0)}%` }}
                                />
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                          No holdings in this group yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="p-6 lg:p-8">
                  <div className="mb-4">
                    <div className="text-sm font-medium text-slate-200">Underlying positions</div>
                    <div className="text-xs text-slate-400">
                      Review details and add contributions without leaving this view
                    </div>
                  </div>

                  <ScrollArea className="h-[420px] pr-4">
                    <div className="space-y-3">
                      {selectedGroupCard.items.map(investment => {
                        const netByInvestment = contributionsByInvestment.get(investment.id) ?? 0;
                        const linkedAccount = investment.accountId
                          ? (accountsById.get(investment.accountId) ?? 'Linked account')
                          : 'Not linked';
                        const currency = investment.currency || 'USD';

                        return (
                          <div
                            key={investment.id}
                            className="rounded-3xl border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-base font-semibold text-slate-50">
                                  {investment.name}
                                </div>
                                <div className="mt-1 text-sm text-slate-400">
                                  {[
                                    formatTypeLabel(investment.type),
                                    investment.symbol,
                                    linkedAccount,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                                  onClick={() => onEditInvestment(investment)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-white text-slate-950 hover:bg-slate-200"
                                  onClick={() => onAddContribution(investment.id)}
                                >
                                  Add Contribution
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl bg-black/20 px-3 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Current value
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">
                                  {formatCurrency(Number(investment.currentValue || 0), currency)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-black/20 px-3 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Monthly contribution
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">
                                  {formatCurrency(
                                    Number(investment.monthlyContribution || 0),
                                    currency
                                  )}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-black/20 px-3 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Net contributions
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">
                                  {formatCurrency(Number(netByInvestment), currency)}
                                </div>
                              </div>
                            </div>

                            {investment.notes ? (
                              <div className="mt-3 text-sm text-slate-400">{investment.notes}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
