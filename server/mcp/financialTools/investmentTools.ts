import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { storage } from '../../storage';
import {
  accountNameMap,
  ASSET_TYPE_GROUPS,
  DEFAULT_LIMIT,
  formatTypeLabel,
  isAssetType,
  isContributionAssetType,
  MAX_CONTRIBUTION_MONTHS,
  MAX_LIMIT,
  round2,
  toNumber,
  toolError,
  toolResult,
  resolveDateRange,
  inDateRange,
  asDate,
} from './utils/shared';
import {
  contributionsByInvestment,
  filterContributions,
  getInvestmentMetrics,
  serializeInvestmentBase,
  signedContributionAmount,
  toContributionMonthSeries,
} from './utils/investmentHelpers';
import {
  accountIdArg,
  assetGroupByArg,
  contributionMonthsArg,
  contributionTypeArg,
  endDateArg,
  includeAssetsArg,
  includeEmptyGroupsArg,
  includeInvestmentDetailsArg,
  investmentIdArg,
  investmentTypesArg,
  holdingsSortByArg,
  limitArg,
  sortDirectionArg,
  startDateArg,
} from './utils/toolDocSchemas';

function getDateBounds(values: Array<Date | string>) {
  if (!values.length) return null;

  let earliest = asDate(values[0]);
  let latest = asDate(values[0]);

  for (const value of values) {
    const date = asDate(value);
    if (date < earliest) earliest = date;
    if (date > latest) latest = date;
  }

  return {
    earliest: earliest.toISOString(),
    latest: latest.toISOString(),
  };
}

export function registerInvestmentTools(server: McpServer) {
  server.tool(
    'get_investment_filter_options',
    'Return valid filter values for investment tools: investment IDs/types, account IDs, contribution type enums, sort enums, asset groups, and contribution date coverage.',
    async () => {
      try {
        const [accounts, investments, contributions] = await Promise.all([
          storage.getAccounts(),
          storage.getInvestments(),
          storage.getInvestmentContributions(),
        ]);

        const accountOptions = accounts
          .map(account => ({
            id: account.id,
            name: account.name,
            type: account.type,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const investmentOptions = investments
          .map(investment => ({
            id: investment.id,
            name: investment.name,
            type: investment.type,
            accountId: investment.accountId,
            currency: investment.currency ?? 'USD',
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const investmentTypes = Array.from(
          new Set(investments.map(investment => investment.type.trim().toLowerCase()))
        ).sort((a, b) => a.localeCompare(b));

        return toolResult({
          guidance: {
            whenToCall:
              'Call this tool before get_investment_holdings, get_investment_assets, get_investment_contributions, or get_investment_summary when IDs or type keys are unknown.',
            dateInputs:
              'Use YYYY-MM-DD (recommended) or ISO 8601 timestamps. startDate/endDate are inclusive. Date-only values use UTC start/end of day.',
          },
          contributionDateBounds: getDateBounds(contributions.map(contribution => contribution.date)),
          options: {
            accounts: accountOptions,
            investments: investmentOptions,
            investmentTypes,
            contributionTypes: ['contribution', 'withdrawal'],
            sortDirections: ['asc', 'desc'],
            holdingsSortBy: ['currentValue', 'netContributions', 'monthlyContribution', 'name'],
            assetGroupBy: ['asset_group', 'type'],
            assetGroups: ASSET_TYPE_GROUPS,
          },
          defaults: {
            holdingsSortBy: 'currentValue',
            holdingsSortDirection: 'desc',
            includeAssets: false,
            includeInvestmentDetails: true,
            assetGroupBy: 'asset_group',
            includeEmptyGroups: false,
            maxLimit: MAX_LIMIT,
            maxContributionMonths: MAX_CONTRIBUTION_MONTHS,
          },
          examples: [
            {
              tool: 'get_investment_holdings',
              args: {
                includeAssets: false,
                investmentTypes: ['etf', 'crypto'],
                sortBy: 'currentValue',
                sortDirection: 'desc',
              },
            },
            {
              tool: 'get_investment_contributions',
              args: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                type: 'contribution',
              },
            },
          ],
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_investment_overview',
    'Return portfolio-level totals, allocation by type, and contribution trend. Call get_investment_filter_options first when date/type options are uncertain.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      months: contributionMonthsArg(),
    },
    async args => {
      try {
        const [investments, accounts, allContributions] = await Promise.all([
          storage.getInvestments(),
          storage.getAccounts(),
          storage.getInvestmentContributions(),
        ]);

        const periodContributions = filterContributions(allContributions, {
          startDate: args.startDate,
          endDate: args.endDate,
        });

        const allContributionStats = contributionsByInvestment(allContributions);
        const accountNames = accountNameMap(accounts);
        const rows = investments.map(investment =>
          serializeInvestmentBase(investment, accountNames, allContributionStats.get(investment.id))
        );

        const totalInvestmentValue = round2(
          rows.reduce((sum, investment) => sum + investment.currentValue, 0)
        );
        const totalMonthlyContribution = round2(
          rows.reduce((sum, investment) => sum + investment.monthlyContribution, 0)
        );
        const monthlyContributionAssets = round2(
          rows.reduce((sum, investment) => {
            return isContributionAssetType(investment.type)
              ? sum + investment.monthlyContribution
              : sum;
          }, 0)
        );
        const monthlyContributionHoldings = round2(totalMonthlyContribution - monthlyContributionAssets);
        const currentBalanceAssets = round2(
          rows.reduce((sum, investment) => {
            return isContributionAssetType(investment.type) ? sum + investment.currentValue : sum;
          }, 0)
        );
        const currentBalanceHoldings = round2(totalInvestmentValue - currentBalanceAssets);
        const totalAssetValue = round2(
          rows.reduce(
            (sum, investment) => (investment.class === 'asset' ? sum + investment.currentValue : sum),
            0
          )
        );
        const totalHoldingValue = round2(totalInvestmentValue - totalAssetValue);

        const allTimeNetContributions = round2(
          allContributions.reduce((sum, contribution) => sum + signedContributionAmount(contribution), 0)
        );
        const periodNetContributions = round2(
          periodContributions.reduce((sum, contribution) => sum + signedContributionAmount(contribution), 0)
        );
        const gainLoss = round2(totalInvestmentValue - allTimeNetContributions);
        const gainLossPercent =
          allTimeNetContributions > 0 ? round2((gainLoss / allTimeNetContributions) * 100) : null;

        const allocationMap = new Map<string, number>();
        for (const investment of rows) {
          allocationMap.set(
            investment.type,
            (allocationMap.get(investment.type) ?? 0) + investment.currentValue
          );
        }
        const allocationByType = Array.from(allocationMap.entries())
          .map(([type, value]) => ({
            type,
            typeLabel: formatTypeLabel(type),
            value: round2(value),
            percent: totalInvestmentValue > 0 ? round2((value / totalInvestmentValue) * 100) : 0,
          }))
          .sort((a, b) => b.value - a.value);

        const contributionSeries = toContributionMonthSeries(
          args.startDate || args.endDate ? periodContributions : allContributions,
          args.months
        );

        return toolResult({
          period: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
          },
          totals: {
            totalInvestmentValue,
            totalMonthlyContribution,
            monthlyContributionAssets,
            monthlyContributionHoldings,
            currentBalanceAssets,
            currentBalanceHoldings,
            totalAssetValue,
            totalHoldingValue,
            allTimeNetContributions,
            periodNetContributions,
            gainLoss,
            gainLossPercent,
          },
          counts: {
            investmentCount: rows.length,
            assetCount: rows.filter(row => row.class === 'asset').length,
            holdingCount: rows.filter(row => row.class === 'holding').length,
            allContributionCount: allContributions.length,
            periodContributionCount: periodContributions.length,
          },
          allocationByType,
          contributionSeries,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_investment_holdings',
    'List holdings (and optionally assets) with value, contribution, and gain/loss metrics, with filtering and sorting controls.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      includeAssets: includeAssetsArg(),
      investmentTypes: investmentTypesArg(),
      accountId: accountIdArg(),
      sortBy: holdingsSortByArg(),
      sortDirection: sortDirectionArg(),
      limit: limitArg(),
    },
    async args => {
      try {
        const [investments, accounts, allContributions] = await Promise.all([
          storage.getInvestments(),
          storage.getAccounts(),
          storage.getInvestmentContributions(),
        ]);

        const includeAssets = args.includeAssets ?? false;
        const contributionRows = filterContributions(allContributions, {
          startDate: args.startDate,
          endDate: args.endDate,
        });
        const contributionStats = contributionsByInvestment(contributionRows);
        const accountNames = accountNameMap(accounts);
        const normalizedTypes = args.investmentTypes?.map(type => type.trim().toLowerCase());

        const candidates = investments
          .filter(investment => (includeAssets ? true : !isAssetType(investment.type)))
          .filter(investment => (args.accountId ? investment.accountId === args.accountId : true))
          .filter(investment =>
            normalizedTypes?.length ? normalizedTypes.includes(investment.type.toLowerCase()) : true
          )
          .map(investment =>
            serializeInvestmentBase(investment, accountNames, contributionStats.get(investment.id))
          );

        const sortBy = args.sortBy ?? 'currentValue';
        const sortDirection = args.sortDirection ?? 'desc';

        const sorted = [...candidates].sort((a, b) => {
          let delta = 0;
          if (sortBy === 'name') {
            delta = a.name.localeCompare(b.name);
          } else if (sortBy === 'netContributions') {
            delta = a.netContributions - b.netContributions;
          } else if (sortBy === 'monthlyContribution') {
            delta = a.monthlyContribution - b.monthlyContribution;
          } else {
            delta = a.currentValue - b.currentValue;
          }
          return sortDirection === 'asc' ? delta : -delta;
        });

        const limited = sorted.slice(0, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
        const totals = limited.reduce(
          (acc, row) => {
            acc.currentValue += row.currentValue;
            acc.monthlyContribution += row.monthlyContribution;
            acc.netContributions += row.netContributions;
            acc.gainLoss += row.gainLossAgainstContributions;
            return acc;
          },
          { currentValue: 0, monthlyContribution: 0, netContributions: 0, gainLoss: 0 }
        );

        return toolResult({
          filters: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
            includeAssets,
            investmentTypes: args.investmentTypes ?? null,
            accountId: args.accountId ?? null,
          },
          sort: { by: sortBy, direction: sortDirection },
          totalMatching: candidates.length,
          returned: limited.length,
          totals: {
            currentValue: round2(totals.currentValue),
            monthlyContribution: round2(totals.monthlyContribution),
            netContributions: round2(totals.netContributions),
            gainLoss: round2(totals.gainLoss),
          },
          holdings: limited,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_investment_assets',
    'List asset-class investments grouped by asset group or by type, including totals and item details.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      groupBy: assetGroupByArg(),
      includeEmptyGroups: includeEmptyGroupsArg(),
    },
    async args => {
      try {
        const [investments, accounts, allContributions] = await Promise.all([
          storage.getInvestments(),
          storage.getAccounts(),
          storage.getInvestmentContributions(),
        ]);

        const assetInvestments = investments.filter(investment => isAssetType(investment.type));
        const contributionRows = filterContributions(allContributions, {
          startDate: args.startDate,
          endDate: args.endDate,
        });
        const contributionStats = contributionsByInvestment(contributionRows);
        const accountNames = accountNameMap(accounts);
        const serializedAssets = assetInvestments.map(investment =>
          serializeInvestmentBase(investment, accountNames, contributionStats.get(investment.id))
        );

        const includeEmptyGroups = args.includeEmptyGroups ?? false;
        const groupBy = args.groupBy ?? 'asset_group';
        const groups: Array<{
          key: string;
          title: string;
          description: string | null;
          totals: {
            currentValue: number;
            monthlyContribution: number;
            netContributions: number;
            gainLoss: number;
            count: number;
          };
          items: ReturnType<typeof serializeInvestmentBase>[];
        }> = [];

        if (groupBy === 'type') {
          const typeMap = new Map<string, ReturnType<typeof serializeInvestmentBase>[]>();
          for (const asset of serializedAssets) {
            const existing = typeMap.get(asset.type) ?? [];
            existing.push(asset);
            typeMap.set(asset.type, existing);
          }

          typeMap.forEach((items, type) => {
            const totals = items.reduce(
              (acc, item) => {
                acc.currentValue += item.currentValue;
                acc.monthlyContribution += item.monthlyContribution;
                acc.netContributions += item.netContributions;
                acc.gainLoss += item.gainLossAgainstContributions;
                acc.count += 1;
                return acc;
              },
              { currentValue: 0, monthlyContribution: 0, netContributions: 0, gainLoss: 0, count: 0 }
            );
            groups.push({
              key: type,
              title: formatTypeLabel(type),
              description: null,
              totals: {
                currentValue: round2(totals.currentValue),
                monthlyContribution: round2(totals.monthlyContribution),
                netContributions: round2(totals.netContributions),
                gainLoss: round2(totals.gainLoss),
                count: totals.count,
              },
              items: items.sort((a, b) => b.currentValue - a.currentValue),
            });
          });

          groups.sort((a, b) => b.totals.currentValue - a.totals.currentValue);
        } else {
          const seenType = new Set<string>();
          for (const group of ASSET_TYPE_GROUPS) {
            const groupTypes: readonly string[] = group.types;
            const items = serializedAssets.filter(asset => groupTypes.includes(asset.type));
            items.forEach(item => seenType.add(item.type));
            if (!items.length && !includeEmptyGroups) continue;

            const totals = items.reduce(
              (acc, item) => {
                acc.currentValue += item.currentValue;
                acc.monthlyContribution += item.monthlyContribution;
                acc.netContributions += item.netContributions;
                acc.gainLoss += item.gainLossAgainstContributions;
                acc.count += 1;
                return acc;
              },
              { currentValue: 0, monthlyContribution: 0, netContributions: 0, gainLoss: 0, count: 0 }
            );

            groups.push({
              key: group.key,
              title: group.title,
              description: group.description,
              totals: {
                currentValue: round2(totals.currentValue),
                monthlyContribution: round2(totals.monthlyContribution),
                netContributions: round2(totals.netContributions),
                gainLoss: round2(totals.gainLoss),
                count: totals.count,
              },
              items: items.sort((a, b) => b.currentValue - a.currentValue),
            });
          }

          const uncategorized = serializedAssets.filter(asset => !seenType.has(asset.type));
          if (uncategorized.length) {
            const totals = uncategorized.reduce(
              (acc, item) => {
                acc.currentValue += item.currentValue;
                acc.monthlyContribution += item.monthlyContribution;
                acc.netContributions += item.netContributions;
                acc.gainLoss += item.gainLossAgainstContributions;
                acc.count += 1;
                return acc;
              },
              { currentValue: 0, monthlyContribution: 0, netContributions: 0, gainLoss: 0, count: 0 }
            );

            groups.push({
              key: 'other_assets',
              title: 'Other Assets',
              description: 'Asset types not currently mapped to a named asset group.',
              totals: {
                currentValue: round2(totals.currentValue),
                monthlyContribution: round2(totals.monthlyContribution),
                netContributions: round2(totals.netContributions),
                gainLoss: round2(totals.gainLoss),
                count: totals.count,
              },
              items: uncategorized.sort((a, b) => b.currentValue - a.currentValue),
            });
          }
        }

        const summaryTotals = groups.reduce(
          (acc, group) => {
            acc.currentValue += group.totals.currentValue;
            acc.monthlyContribution += group.totals.monthlyContribution;
            acc.netContributions += group.totals.netContributions;
            acc.gainLoss += group.totals.gainLoss;
            acc.count += group.totals.count;
            return acc;
          },
          { currentValue: 0, monthlyContribution: 0, netContributions: 0, gainLoss: 0, count: 0 }
        );

        return toolResult({
          period: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
          },
          groupBy,
          groupCount: groups.length,
          totals: {
            currentValue: round2(summaryTotals.currentValue),
            monthlyContribution: round2(summaryTotals.monthlyContribution),
            netContributions: round2(summaryTotals.netContributions),
            gainLoss: round2(summaryTotals.gainLoss),
            assetCount: summaryTotals.count,
          },
          groups,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_investment_contributions',
    'Query contribution and withdrawal history with date/type/investment filters, totals, and optional investment metadata columns.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      investmentId: investmentIdArg(),
      type: contributionTypeArg(),
      sort: sortDirectionArg(),
      limit: limitArg(),
      includeInvestmentDetails: includeInvestmentDetailsArg(),
    },
    async args => {
      try {
        const [investments, contributions] = await Promise.all([
          storage.getInvestments(),
          storage.getInvestmentContributions(args.investmentId),
        ]);
        const investmentMap = new Map(investments.map(investment => [investment.id, investment]));

        const filtered = filterContributions(contributions, {
          startDate: args.startDate,
          endDate: args.endDate,
          investmentId: args.investmentId,
          type: args.type,
        });

        const sortDirection = args.sort ?? 'desc';
        const ordered = [...filtered].sort((a, b) => {
          const tA = asDate(a.date).getTime();
          const tB = asDate(b.date).getTime();
          return sortDirection === 'asc' ? tA - tB : tB - tA;
        });
        const limited = ordered.slice(0, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
        const includeDetails = args.includeInvestmentDetails ?? true;

        const totals = filtered.reduce(
          (acc, contribution) => {
            const amount = toNumber(contribution.amount);
            if (contribution.type === 'withdrawal') {
              acc.withdrawal += amount;
              acc.net -= amount;
            } else {
              acc.contribution += amount;
              acc.net += amount;
            }
            return acc;
          },
          { contribution: 0, withdrawal: 0, net: 0 }
        );

        const byInvestmentMap = contributionsByInvestment(filtered);
        const byInvestment = Array.from(byInvestmentMap.entries())
          .map(([investmentId, stats]) => {
            const investment = investmentMap.get(investmentId);
            return {
              investmentId,
              investmentName: investment?.name ?? `Investment #${investmentId}`,
              type: investment?.type ?? null,
              currency: investment?.currency ?? 'USD',
              contributionTotal: round2(stats.contributionTotal),
              withdrawalTotal: round2(stats.withdrawalTotal),
              net: round2(stats.net),
              count: stats.count,
            };
          })
          .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

        return toolResult({
          period: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
          },
          filters: {
            investmentId: args.investmentId ?? null,
            type: args.type ?? null,
          },
          totalMatching: filtered.length,
          returned: limited.length,
          sort: sortDirection,
          totals: {
            contribution: round2(totals.contribution),
            withdrawal: round2(totals.withdrawal),
            net: round2(totals.net),
          },
          byInvestment,
          contributions: limited.map(contribution => {
            const investment = investmentMap.get(contribution.investmentId);
            const signedAmount = round2(signedContributionAmount(contribution));
            return {
              id: contribution.id,
              investmentId: contribution.investmentId,
              type: contribution.type,
              amount: round2(toNumber(contribution.amount)),
              signedAmount,
              date: asDate(contribution.date).toISOString(),
              notes: contribution.notes ?? null,
              ...(includeDetails
                ? {
                    investmentName: investment?.name ?? null,
                    investmentType: investment?.type ?? null,
                    currency: investment?.currency ?? 'USD',
                  }
                : {}),
            };
          }),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.tool(
    'get_investment_summary',
    'Summarize selected investments with market value and contribution/withdrawal totals for an optional period.',
    {
      startDate: startDateArg(),
      endDate: endDateArg(),
      investmentId: investmentIdArg(),
    },
    async args => {
      try {
        const range = resolveDateRange(args.startDate, args.endDate);
        const [investments, contributions] = await Promise.all([
          storage.getInvestments(),
          storage.getInvestmentContributions(args.investmentId),
        ]);

        const filteredInvestments = args.investmentId
          ? investments.filter(investment => investment.id === args.investmentId)
          : investments;

        const filteredContributions = contributions.filter(contribution => {
          if (args.investmentId && contribution.investmentId !== args.investmentId) return false;
          return inDateRange(asDate(contribution.date), range);
        });

        const rows = filteredInvestments.map(investment =>
          getInvestmentMetrics(investment, filteredContributions)
        );

        const totals = rows.reduce(
          (acc, row) => {
            acc.currentValue += row.currentValue;
            acc.monthlyContribution += row.monthlyContribution;
            acc.contributionTotal += row.contributionTotal;
            acc.withdrawalTotal += row.withdrawalTotal;
            acc.netContributions += row.netContributions;
            acc.contributionCount += row.contributionCount;
            return acc;
          },
          {
            currentValue: 0,
            monthlyContribution: 0,
            contributionTotal: 0,
            withdrawalTotal: 0,
            netContributions: 0,
            contributionCount: 0,
          }
        );

        return toolResult({
          period: {
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
          },
          investmentId: args.investmentId ?? null,
          investmentCount: rows.length,
          totals: {
            currentValue: round2(totals.currentValue),
            monthlyContribution: round2(totals.monthlyContribution),
            contributionTotal: round2(totals.contributionTotal),
            withdrawalTotal: round2(totals.withdrawalTotal),
            netContributions: round2(totals.netContributions),
            contributionCount: totals.contributionCount,
          },
          investments: rows,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
