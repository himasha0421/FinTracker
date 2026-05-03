import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  buildEmptyScenarioOverrides,
  type TaxPersonKey,
  type TaxPlanBundle,
  type TaxPlanInput,
  type TaxPlanScenarioInput,
} from '@shared/taxPlanning';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  taxPlanKeys,
  taxPlansListQuery,
  createDefaultTaxPlan,
  updateTaxPlan,
  deleteTaxPlan,
  createTaxPlanScenario,
  updateTaxPlanScenario,
  deleteTaxPlanScenario,
} from './api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { PlanDraft } from './types';
import { currencyFormatter, decimalFormatter, fieldLabelFromBucket, scenarioModeLabel } from './constants';
import { clonePlan, toDateInput, fromDateInput } from './utils';
import { CheckboxField } from './components/CheckboxField';
import { NumberField } from './components/NumberField';
import { FamilyNetTaxKpiCard } from './components/FamilyNetTaxKpiCard';
import { BracketThresholdInsightCard } from './components/BracketThresholdInsightCard';
import { DeductionWaterfallChart } from './components/DeductionWaterfallChart';
import { CreditsBreakdownTable } from './components/CreditsBreakdownTable';
import { TuitionTransferRecommendationCard } from './components/TuitionTransferRecommendationCard';
import { SpousalAmountBreakEvenCard } from './components/SpousalAmountBreakEvenCard';
import { MultiYearTimeline } from './components/MultiYearTimeline';
import { PersonSection } from './components/PersonSection';
import { ManualScenarioEditor } from './components/ManualScenarioEditor';

export default function TaxPlanningScreen() {
  const { toast } = useToast();
  const { data: bundles = [], isLoading } = useQuery(taxPlansListQuery());
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);

  useEffect(() => {
    if (!bundles.length) {
      setSelectedPlanId(null);
      setDraft(null);
      return;
    }
    const activePlan =
      bundles.find((bundle: TaxPlanBundle) => bundle.plan.id === selectedPlanId) ?? bundles[0];
    if (activePlan.plan.id !== selectedPlanId) setSelectedPlanId(activePlan.plan.id);
    setDraft(clonePlan(activePlan));
  }, [bundles, selectedPlanId]);

  const selectedBundle = useMemo(
    () => bundles.find((bundle: TaxPlanBundle) => bundle.plan.id === selectedPlanId) ?? null,
    [bundles, selectedPlanId]
  );

  const recommendedScenario =
    selectedBundle?.scenarios.find(s => s.mode === 'recommended') ??
    selectedBundle?.scenarios.find(s => s.mode === 'balanced') ??
    selectedBundle?.scenarios[0] ??
    null;

  const createDefaultMutation = useMutation({
    mutationFn: () => createDefaultTaxPlan(),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Tax plan created', description: 'A default household plan is ready to edit.' });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaxPlanInput }) => updateTaxPlan(id, data),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Plan saved', description: 'Household inputs and scenario results were refreshed.' });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => deleteTaxPlan(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      toast({ title: 'Plan deleted', description: 'The household tax plan was removed.' });
    },
  });

  const createScenarioMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TaxPlanScenarioInput }) =>
      createTaxPlanScenario(planId, data),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Scenario added', description: 'The scenario has been saved and recalculated.' });
    },
  });

  const updateScenarioMutation = useMutation({
    mutationFn: ({
      planId,
      scenarioId,
      data,
    }: {
      planId: number;
      scenarioId: number;
      data: TaxPlanScenarioInput;
    }) => updateTaxPlanScenario(planId, scenarioId, data),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Scenario updated', description: 'The scenario results were refreshed.' });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: ({ planId, scenarioId }: { planId: number; scenarioId: number }) =>
      deleteTaxPlanScenario(planId, scenarioId),
    onSuccess: async bundle => {
      await queryClient.invalidateQueries({ queryKey: taxPlanKeys.all });
      setSelectedPlanId(bundle.plan.id);
      toast({ title: 'Scenario removed', description: 'The scenario was deleted.' });
    },
  });

  const isMutating =
    createDefaultMutation.isPending ||
    savePlanMutation.isPending ||
    deletePlanMutation.isPending ||
    createScenarioMutation.isPending ||
    updateScenarioMutation.isPending ||
    deleteScenarioMutation.isPending;

  const handleSavePlan = async () => {
    if (!draft) return;
    await savePlanMutation.mutateAsync({
      id: draft.id,
      data: {
        name: draft.name,
        taxYear: draft.taxYear,
        province: draft.province,
        household: draft.household,
        personA: draft.personA,
        personB: draft.personB,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!bundles.length || !draft || !selectedBundle) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax Planning</CardTitle>
            <CardDescription>
              Build a couple-focused Manitoba optimizer for RRSP, FHSA, TFSA, HBP, and spousal RRSP
              tradeoffs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>No plan yet</AlertTitle>
              <AlertDescription>
                Create a default household plan, then adjust the incomes, room, balances, and home
                target to compare scenarios.
              </AlertDescription>
            </Alert>
            <Button onClick={() => createDefaultMutation.mutate()} disabled={isMutating}>
              {createDefaultMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Default Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Plan selector ── */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Planning</CardTitle>
          <CardDescription>
            Deterministic Winnipeg household planner for RRSP, FHSA, TFSA, HBP, and spousal RRSP
            allocation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md space-y-2">
            <Label>Active plan</Label>
            <Select
              value={String(selectedPlanId)}
              onValueChange={value => setSelectedPlanId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {bundles.map((bundle: TaxPlanBundle) => (
                  <SelectItem key={bundle.plan.id} value={String(bundle.plan.id)}>
                    {bundle.plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => createDefaultMutation.mutate()} disabled={isMutating}>
              <RefreshCw className="mr-2 h-4 w-4" />
              New Default Plan
            </Button>
            <Button
              variant="outline"
              onClick={() => deletePlanMutation.mutate(selectedBundle.plan.id)}
              disabled={isMutating}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Plan
            </Button>
            <Button onClick={handleSavePlan} disabled={isMutating}>
              {savePlanMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Household inputs ── */}
      <Card>
        <CardHeader>
          <CardTitle>Household Inputs</CardTitle>
          <CardDescription>
            Manual inputs for the two-spouse household and shared home target.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 md:col-span-2 xl:col-span-4">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={draft.name}
                onChange={event =>
                  setDraft(current => (current ? { ...current, name: event.target.value } : current))
                }
              />
            </div>
            <NumberField
              id="tax-year"
              label="Tax year"
              value={draft.taxYear}
              onChange={value =>
                setDraft(current =>
                  current ? { ...current, taxYear: Math.round(value || 2026) } : current
                )
              }
              step="1"
            />
            <div className="space-y-2">
              <Label>Province</Label>
              <Select
                value={draft.province}
                onValueChange={value =>
                  setDraft(current =>
                    current ? { ...current, province: value as 'MB' } : current
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MB">Manitoba</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Target purchase date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={toDateInput(draft.household.targetPurchaseDate)}
                onChange={event =>
                  setDraft(current =>
                    current
                      ? {
                          ...current,
                          household: {
                            ...current.household,
                            targetPurchaseDate: fromDateInput(event.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </div>
            <NumberField
              id="home-price"
              label="Target home price"
              value={draft.household.targetHomePrice}
              onChange={value =>
                setDraft(current =>
                  current
                    ? { ...current, household: { ...current.household, targetHomePrice: value } }
                    : current
                )
              }
            />
            <NumberField
              id="down-payment"
              label="Desired down payment"
              value={draft.household.desiredDownPayment}
              onChange={value =>
                setDraft(current =>
                  current
                    ? { ...current, household: { ...current.household, desiredDownPayment: value } }
                    : current
                )
              }
            />
            <NumberField
              id="current-home-savings"
              label="Current down payment savings"
              value={draft.household.currentDownPaymentSavings}
              onChange={value =>
                setDraft(current =>
                  current
                    ? {
                        ...current,
                        household: { ...current.household, currentDownPaymentSavings: value },
                      }
                    : current
                )
              }
            />
            <NumberField
              id="monthly-available-savings"
              label="Monthly available savings"
              value={draft.household.monthlyAvailableSavings}
              onChange={value =>
                setDraft(current =>
                  current
                    ? {
                        ...current,
                        household: { ...current.household, monthlyAvailableSavings: value },
                      }
                    : current
                )
              }
            />
            <NumberField
              id="minimum-cash-reserve"
              label="Minimum cash reserve"
              value={draft.household.minimumCashReserve}
              onChange={value =>
                setDraft(current =>
                  current
                    ? {
                        ...current,
                        household: { ...current.household, minimumCashReserve: value },
                      }
                    : current
                )
              }
            />
            <div className="md:col-span-2 xl:col-span-4">
              <CheckboxField
                id="both-renting"
                label="Both currently renting in Manitoba"
                checked={draft.household.bothRentingCurrently}
                onChange={value =>
                  setDraft(current =>
                    current
                      ? {
                          ...current,
                          household: { ...current.household, bothRentingCurrently: value },
                        }
                      : current
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PersonSection
              personKey="personA"
              person={draft.personA}
              onChange={person =>
                setDraft(current => (current ? { ...current, personA: person } : current))
              }
            />
            <PersonSection
              personKey="personB"
              person={draft.personB}
              onChange={person =>
                setDraft(current => (current ? { ...current, personB: person } : current))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Recommended plan ── */}
      {recommendedScenario && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Plan</CardTitle>
            <CardDescription>
              The leading scenario uses {scenarioModeLabel(recommendedScenario.mode)} logic and
              explains the contribution ordering.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FamilyNetTaxKpiCard summary={recommendedScenario.result.summary} />
            <BracketThresholdInsightCard people={recommendedScenario.result.people} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>Estimated tax savings</CardDescription>
                  <CardTitle>
                    {currencyFormatter.format(recommendedScenario.result.summary.estimatedTaxSavings)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>Projected home funds</CardDescription>
                  <CardTitle>
                    {currencyFormatter.format(
                      recommendedScenario.result.summary.totalProjectedHomeFunds
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>FHSA used</CardDescription>
                  <CardTitle>
                    {currencyFormatter.format(recommendedScenario.result.summary.fhsaUsed)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription>HBP capacity</CardDescription>
                  <CardTitle>
                    {currencyFormatter.format(recommendedScenario.result.summary.hbpCapacityUsed)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Contribution ordering</CardTitle>
                  <CardDescription>
                    Ranked recommendations with tax and home-funding effect.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendedScenario.result.recommendations.map((item, index) => (
                    <div key={item.key} className="rounded-lg border px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {index + 1}. Contribute {currencyFormatter.format(item.amount)} to{' '}
                            {item.contributor === 'personA'
                              ? draft.personA.name
                              : draft.personB.name}{' '}
                            {fieldLabelFromBucket(item.bucket)}
                            {item.annuitant
                              ? ` for ${item.annuitant === 'personA' ? draft.personA.name : draft.personB.name}`
                              : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.reason}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>Tax save: {currencyFormatter.format(item.estimatedTaxSavings)}</p>
                          <p>Home impact: {currencyFormatter.format(item.estimatedHomeFundsAdded)}</p>
                          <p>Rate: {decimalFormatter.format(item.marginalRate)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <SpousalAmountBreakEvenCard
                  spousalBreakEven={recommendedScenario.result.spousalBreakEven}
                  personBName={recommendedScenario.result.people.personB.name}
                />
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Per-spouse impact</CardTitle>
                    <CardDescription>
                      Before and after taxable income, tax, and home-accessible room.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => {
                      const personResult = recommendedScenario.result.people[personKey];
                      return (
                        <div key={personKey} className="rounded-lg border px-4 py-3">
                          <p className="font-medium">{personResult.name}</p>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                            <p>
                              Taxable income:{' '}
                              {currencyFormatter.format(personResult.taxableIncomeBefore)} →{' '}
                              {currencyFormatter.format(personResult.taxableIncomeAfter)}
                            </p>
                            <p>
                              Estimated tax:{' '}
                              {currencyFormatter.format(personResult.estimatedTaxBefore)} →{' '}
                              {currencyFormatter.format(personResult.estimatedTaxAfter)}
                            </p>
                            <p>
                              Estimated savings:{' '}
                              {currencyFormatter.format(personResult.estimatedTaxSavings)}
                            </p>
                            <p>
                              FHSA withdrawal capacity:{' '}
                              {currencyFormatter.format(personResult.fhsaWithdrawalCapacity)}
                            </p>
                            <p>HBP capacity: {currencyFormatter.format(personResult.hbpCapacity)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            {recommendedScenario.result.tuitionTransfer !== null && (
              <TuitionTransferRecommendationCard
                tuitionTransfer={recommendedScenario.result.tuitionTransfer}
                personAName={recommendedScenario.result.people.personA.name}
                personBName={recommendedScenario.result.people.personB.name}
              />
            )}

            <div className="space-y-3">
              {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => {
                const personResult = recommendedScenario.result.people[personKey];
                return (
                  <DeductionWaterfallChart
                    key={personKey}
                    personName={personResult.name}
                    personResult={personResult}
                  />
                );
              })}
            </div>

            <div className="space-y-3">
              {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => {
                const personResult = recommendedScenario.result.people[personKey];
                return (
                  <CreditsBreakdownTable
                    key={personKey}
                    personName={personResult.name}
                    federalCredits={personResult.federalCredits}
                    provincialCredits={personResult.provincialCredits}
                    payroll={personResult.payroll}
                  />
                );
              })}
            </div>

            <MultiYearTimeline multiYear={recommendedScenario.multiYear} />
          </CardContent>
        </Card>
      )}

      {/* ── Scenario comparison ── */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
          <CardDescription>
            Compare balanced, tax-max, home-max, recommended, and manual plans side by side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                createScenarioMutation.mutate({
                  planId: selectedBundle.plan.id,
                  data: {
                    name: `Manual ${selectedBundle.scenarios.length + 1}`,
                    mode: 'manual',
                    overrides: buildEmptyScenarioOverrides(),
                  },
                })
              }
              disabled={isMutating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Scenario
            </Button>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {selectedBundle.scenarios.map(scenario => (
              <Card key={scenario.id} className="border-border/60">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{scenario.name}</CardTitle>
                    <CardDescription>{scenarioModeLabel(scenario.mode)}</CardDescription>
                  </div>
                  {!['recommended', 'balanced', 'tax-max', 'home-max'].includes(scenario.mode) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteScenarioMutation.mutate({
                          planId: selectedBundle.plan.id,
                          scenarioId: scenario.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <p>
                      Total contribution:{' '}
                      {currencyFormatter.format(scenario.result.summary.totalContribution)}
                    </p>
                    <p>
                      Tax savings:{' '}
                      {currencyFormatter.format(scenario.result.summary.estimatedTaxSavings)}
                    </p>
                    <p>
                      Home funds:{' '}
                      {currencyFormatter.format(scenario.result.summary.totalProjectedHomeFunds)}
                    </p>
                    <p>FHSA used: {currencyFormatter.format(scenario.result.summary.fhsaUsed)}</p>
                    <p>
                      HBP capacity:{' '}
                      {currencyFormatter.format(scenario.result.summary.hbpCapacityUsed)}
                    </p>
                    <p>
                      TFSA ending balance:{' '}
                      {currencyFormatter.format(scenario.result.summary.tfsaEndingBalance)}
                    </p>
                    <p>Shortfall: {currencyFormatter.format(scenario.result.summary.shortfall)}</p>
                    <p>Warnings: {scenario.result.summary.warningsCount}</p>
                  </div>
                  {scenario.mode === 'manual' && (
                    <ManualScenarioEditor
                      scenario={scenario}
                      planId={selectedBundle.plan.id}
                      onSave={payload =>
                        updateScenarioMutation.mutate({
                          planId: selectedBundle.plan.id,
                          scenarioId: scenario.id,
                          data: payload,
                        })
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Rules & warnings ── */}
      {recommendedScenario && (
        <Card>
          <CardHeader>
            <CardTitle>Rules &amp; Warnings</CardTitle>
            <CardDescription>
              Assumptions, planner caveats, and scenario-specific warnings for the active
              recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedScenario.result.warnings.length > 0 ? (
              recommendedScenario.result.warnings.map(warning => (
                <Alert
                  key={warning.code}
                  variant={warning.severity === 'warning' ? 'destructive' : 'default'}
                >
                  <AlertTitle>{warning.title}</AlertTitle>
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              ))
            ) : (
              <Alert>
                <AlertTitle>No blocking warnings</AlertTitle>
                <AlertDescription>
                  The current recommended scenario stayed within the entered room and budget limits.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
              <p>Tax year: 2026 federal + Manitoba rates.</p>
              <p>FHSA annual / lifetime limit modeled: $8,000 / $40,000.</p>
              <p>TFSA annual limit modeled: $7,000.</p>
              <p>HBP withdrawal limit modeled: $60,000 per eligible spouse.</p>
              <p>
                Estimated taxes are planning estimates based on taxable-income brackets and do not
                include every credit, deduction, or filing nuance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
