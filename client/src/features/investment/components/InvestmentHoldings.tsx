import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InvestmentGroupItem, InvestmentItem } from '@/features/investment/types';
import { formatCurrency, formatTypeLabel } from '@/features/investment/utils';

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
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
  const hasInitializedCollapse = useRef(false);

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

  useEffect(() => {
    setCollapsedGroupIds(previous => {
      if (!hasInitializedCollapse.current && groups.length > 0) {
        hasInitializedCollapse.current = true;
        return new Set(groups.map(group => group.id));
      }

      const validIds = new Set(groups.map(group => group.id));
      const next = new Set<number>();
      previous.forEach(id => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [groups]);

  if (isLoading) {
    return <Skeleton className="h-[220px]" />;
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

  const handleDrop = async (
    event: DragEvent<HTMLElement>,
    targetGroupId: number | null
  ) => {
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

  const renderInvestmentCard = (investment: InvestmentItem) => {
    const netByInvestment = contributionsByInvestment.get(investment.id) ?? 0;
    const linkedAccount = investment.accountId
      ? accountsById.get(investment.accountId)
      : undefined;
    const currency = investment.currency || 'USD';
    const isDragging = draggingInvestmentId === investment.id;

    return (
      <Card
        key={investment.id}
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
        className={cn('transition-opacity', isDragging && 'opacity-60')}
      >
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">{investment.name}</CardTitle>
            <CardDescription>
              {formatTypeLabel(investment.type)}
              {investment.symbol ? ` • ${investment.symbol}` : ''}
              {investment.institution ? ` • ${investment.institution}` : ''}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onEditInvestment(investment)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Current Value</span>
            <span className="font-medium">
              {formatCurrency(Number(investment.currentValue || 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Monthly Contribution</span>
            <span className="font-medium">
              {formatCurrency(Number(investment.monthlyContribution || 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Net Contributions</span>
            <span className="font-medium">
              {formatCurrency(Number(netByInvestment || 0), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Linked Account</span>
            <span className="text-muted-foreground">{linkedAccount || 'Not linked'}</span>
          </div>
          {investment.notes ? (
            <p className="text-xs text-muted-foreground">{investment.notes}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">Drag card to move between groups</p>
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => onAddContribution(investment.id)}>
              Add Contribution
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Investment Groups</CardTitle>
            <CardDescription>
              Two-column grouped view. Expand any group to manage individual holdings.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreateGroupOpen(true)} disabled={isMutating}>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </CardHeader>
      </Card>

      {groups.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map(group => {
            const groupInvestments = groupedInvestments.map.get(group.id) ?? [];
            const stats = getGroupStats(groupInvestments, contributionsByInvestment);
            const isCollapsed = collapsedGroupIds.has(group.id);
            const growthClass =
              stats.growth > 0
                ? 'text-emerald-600'
                : stats.growth < 0
                  ? 'text-red-600'
                  : 'text-foreground';

            return (
              <Card
                key={group.id}
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
                  'overflow-hidden border-l-4 border-l-primary/50 transition-colors',
                  activeDropTarget === group.id && 'border-primary bg-primary/5'
                )}
              >
                <CardHeader className="space-y-3 bg-gradient-to-br from-muted/45 to-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{group.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {group.description || 'Drag holdings into this group.'}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {groupInvestments.length} holdings
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCollapsedGroupIds(previous => {
                            const next = new Set(previous);
                            if (next.has(group.id)) {
                              next.delete(group.id);
                            } else {
                              next.add(group.id);
                            }
                            return next;
                          })
                        }
                        className="h-8 px-2"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border bg-background/80 p-2">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Net Value
                      </p>
                      <p className="text-sm font-semibold">{formatCurrency(stats.totalNetValue)}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Contribution
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(stats.totalContribution)}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Growth
                      </p>
                      <p className={cn('text-sm font-semibold', growthClass)}>
                        {formatCurrency(stats.growth)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {stats.growthPercent === null
                          ? 'N/A'
                          : `${stats.growthPercent > 0 ? '+' : ''}${stats.growthPercent.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {!isCollapsed ? (
                  <CardContent className="space-y-3 p-4 pt-0">
                    {groupInvestments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No holdings in this group yet. Drag cards here.
                      </p>
                    ) : (
                      <div className="grid gap-4">{groupInvestments.map(renderInvestmentCard)}</div>
                    )}
                  </CardContent>
                ) : null}
              </Card>
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
          'transition-colors',
          activeDropTarget === 'ungrouped' && 'border-primary bg-primary/5'
        )}
      >
        <CardHeader>
          <CardTitle className="text-lg">Ungrouped Holdings</CardTitle>
          <CardDescription>
            {groups.length === 0
              ? 'Create a group and drag holdings into it.'
              : 'Drag a holding here to remove it from a group.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedInvestments.ungrouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All holdings are currently assigned to groups.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {groupedInvestments.ungrouped.map(renderInvestmentCard)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Investment Group</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateGroup}>
            <div className="space-y-2">
              <label htmlFor="group-name" className="text-sm font-medium">
                Group Name
              </label>
              <Input
                id="group-name"
                value={groupName}
                onChange={event => setGroupName(event.target.value)}
                placeholder="e.g. Retirement Portfolio"
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="group-description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                id="group-description"
                value={groupDescription}
                onChange={event => setGroupDescription(event.target.value)}
                placeholder="What does this group represent?"
                maxLength={240}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateGroupOpen(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating || !groupName.trim()}>
                Create Group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
