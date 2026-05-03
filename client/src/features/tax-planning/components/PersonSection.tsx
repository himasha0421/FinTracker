import { useState } from 'react';
import type { TaxPersonInput, TaxPersonKey } from '@shared/taxPlanning';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { toNumber } from '../utils';
import { NumberField } from './NumberField';
import { CheckboxField } from './CheckboxField';

interface PersonSectionProps {
  personKey: TaxPersonKey;
  person: TaxPersonInput;
  onChange: (next: TaxPersonInput) => void;
}

export function PersonSection({ personKey, person, onChange }: PersonSectionProps) {
  const fallbackTitle = personKey === 'personA' ? 'Partner A' : 'Partner B';
  const [collapsed, setCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                className="text-lg font-semibold bg-transparent border-b border-primary outline-none w-full leading-tight"
                value={person.name}
                onChange={e => onChange({ ...person, name: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingName(false)}
              />
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 group text-left"
                onClick={() => setEditingName(true)}
                title="Click to rename"
              >
                <span className="text-lg font-semibold leading-tight">
                  {person.name?.trim() || fallbackTitle}
                </span>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </button>
            )}
            {!collapsed && (
              <p className="text-sm text-muted-foreground mt-1">
                Income, room, balances, and home-buyer eligibility.
              </p>
            )}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1 rounded"
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NumberField
            id={`${personKey}-employment-income`}
            label="Employment income"
            value={person.employmentIncome}
            onChange={value => onChange({ ...person, employmentIncome: value })}
          />
          <NumberField
            id={`${personKey}-other-income`}
            label="Other taxable income"
            value={person.otherTaxableIncome}
            onChange={value => onChange({ ...person, otherTaxableIncome: value })}
          />
          <NumberField
            id={`${personKey}-rrsp-room`}
            label="RRSP deduction limit"
            value={person.rrspDeductionLimit}
            onChange={value => onChange({ ...person, rrspDeductionLimit: value })}
          />
          <div className="space-y-2">
            <Label htmlFor={`${personKey}-fhsa-room`}>FHSA contribution room (start of year)</Label>
            <Input
              id={`${personKey}-fhsa-room`}
              type="number"
              min="0"
              step="100"
              value={Number.isFinite(person.fhsaRoom) ? person.fhsaRoom : 0}
              onChange={event => onChange({ ...person, fhsaRoom: toNumber(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Remaining room is auto-calculated from contributions
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${personKey}-tfsa-room`}>TFSA contribution room (start of year)</Label>
            <Input
              id={`${personKey}-tfsa-room`}
              type="number"
              min="0"
              step="100"
              value={Number.isFinite(person.tfsaRoom) ? person.tfsaRoom : 0}
              onChange={event => onChange({ ...person, tfsaRoom: toNumber(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Remaining room is auto-calculated from contributions
            </p>
          </div>
          <NumberField
            id={`${personKey}-rrsp-ytd`}
            label="RRSP contributed in 2026 (YTD)"
            value={person.currentYearRrspContributions}
            onChange={value => onChange({ ...person, currentYearRrspContributions: value })}
          />
          <NumberField
            id={`${personKey}-fhsa-ytd`}
            label="FHSA contributed in 2026 (YTD)"
            value={person.currentYearFhsaContributions}
            onChange={value => onChange({ ...person, currentYearFhsaContributions: value })}
          />
          <NumberField
            id={`${personKey}-tfsa-ytd`}
            label="TFSA contributed in 2026 (YTD)"
            value={person.currentYearTfsaContributions}
            onChange={value => onChange({ ...person, currentYearTfsaContributions: value })}
          />
          <NumberField
            id={`${personKey}-match-cap`}
            label="Employer RRSP match cap"
            value={person.employerRrspMatchCap}
            onChange={value => onChange({ ...person, employerRrspMatchCap: value })}
          />
          <NumberField
            id={`${personKey}-match-rate`}
            label="Employer RRSP match rate"
            value={person.employerRrspMatchRate}
            onChange={value => onChange({ ...person, employerRrspMatchRate: value })}
            step="0.05"
          />
          <NumberField
            id={`${personKey}-hbp-balance`}
            label="Outstanding HBP balance"
            value={person.currentHbpBalance}
            onChange={value => onChange({ ...person, currentHbpBalance: value })}
          />
          <NumberField
            id={`${personKey}-personal-rrsp-balance`}
            label="Current personal RRSP balance"
            value={person.currentPersonalRrspBalance}
            onChange={value => onChange({ ...person, currentPersonalRrspBalance: value })}
          />
          <NumberField
            id={`${personKey}-spousal-rrsp-balance`}
            label="Current spousal RRSP balance"
            value={person.currentSpousalRrspBalance}
            onChange={value => onChange({ ...person, currentSpousalRrspBalance: value })}
          />
          <div className="space-y-2">
            <Label htmlFor={`${personKey}-fhsa-balance`}>FHSA account balance (investment value)</Label>
            <Input
              id={`${personKey}-fhsa-balance`}
              type="number"
              min="0"
              step="100"
              value={Number.isFinite(person.currentFhsaBalance) ? person.currentFhsaBalance : 0}
              onChange={event => onChange({ ...person, currentFhsaBalance: toNumber(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Total $ currently invested in your FHSA (not contribution room)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${personKey}-tfsa-balance`}>TFSA account balance (investment value)</Label>
            <Input
              id={`${personKey}-tfsa-balance`}
              type="number"
              min="0"
              step="100"
              value={Number.isFinite(person.currentTfsaBalance) ? person.currentTfsaBalance : 0}
              onChange={event => onChange({ ...person, currentTfsaBalance: toNumber(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Total $ currently in your TFSA account(s)
            </p>
          </div>
          <NumberField
            id={`${personKey}-recent-hbp`}
            label="RRSP contributions made in last 89 days"
            value={person.recentHbpRrspContributions}
            onChange={value => onChange({ ...person, recentHbpRrspContributions: value })}
          />
          <div className="md:col-span-2 xl:col-span-3">
            <CheckboxField
              id={`${personKey}-home-buyer`}
              label="Eligible as a first-time home buyer"
              checked={person.firstTimeHomeBuyerEligible}
              onChange={value => onChange({ ...person, firstTimeHomeBuyerEligible: value })}
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-lg border px-4 py-3 space-y-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-medium"
              onClick={() => setDetailsOpen(prev => !prev)}
            >
              <span>Income &amp; Tuition Details</span>
              <span className="text-muted-foreground">{detailsOpen ? '▲' : '▼'}</span>
            </button>

            {detailsOpen && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <NumberField
                  id={`${personKey}-months-employed`}
                  label="Months employed in 2026"
                  value={person.monthsEmployedThisYear}
                  onChange={value =>
                    onChange({
                      ...person,
                      monthsEmployedThisYear: Math.min(12, Math.max(0, Math.round(value))),
                    })
                  }
                  step="1"
                  min="0"
                  max="12"
                />
                {person.monthsEmployedThisYear < 12 && (
                  <NumberField
                    id={`${personKey}-employment-start-month`}
                    label="Start month (1=Jan, 4=Apr…)"
                    value={person.employmentStartMonth ?? 1}
                    onChange={value =>
                      onChange({
                        ...person,
                        employmentStartMonth: Math.min(12, Math.max(1, Math.round(value))),
                      })
                    }
                    step="1"
                    min="1"
                    max="12"
                  />
                )}
                <div className="space-y-2">
                  <Label htmlFor={`${personKey}-monthly-salary`}>
                    Monthly salary (for future-year projection){' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id={`${personKey}-monthly-salary`}
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 4500"
                    value={person.monthlySalary ?? ''}
                    onChange={event => {
                      const raw = event.target.value;
                      onChange({ ...person, monthlySalary: raw === '' ? null : toNumber(raw) });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${personKey}-tuition-paid`}>Current year tuition paid (T2202)</Label>
                  <Input
                    id={`${personKey}-tuition-paid`}
                    type="number"
                    min="0"
                    step="100"
                    value={Number.isFinite(person.currentYearTuitionPaid) ? person.currentYearTuitionPaid : 0}
                    onChange={event =>
                      onChange({ ...person, currentYearTuitionPaid: toNumber(event.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    2026 Jan–Mar tuition only (if studies completed). Unused amount (after reducing own
                    tax) can be transferred to spouse this year
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${personKey}-tuition-carryforward-federal`}>
                    Federal tuition carryforward from prior years
                  </Label>
                  <Input
                    id={`${personKey}-tuition-carryforward-federal`}
                    type="number"
                    min="0"
                    step="100"
                    value={
                      Number.isFinite(person.tuitionCarryforwardFederal)
                        ? person.tuitionCarryforwardFederal
                        : 0
                    }
                    onChange={event =>
                      onChange({
                        ...person,
                        tuitionCarryforwardFederal: toNumber(event.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Carryforward can only be used by this person in future years — it cannot be
                    transferred to a spouse
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${personKey}-tuition-carryforward-provincial`}>
                    MB tuition carryforward from prior years
                  </Label>
                  <Input
                    id={`${personKey}-tuition-carryforward-provincial`}
                    type="number"
                    min="0"
                    step="100"
                    value={
                      Number.isFinite(person.tuitionCarryforwardProvincial)
                        ? person.tuitionCarryforwardProvincial
                        : 0
                    }
                    onChange={event =>
                      onChange({
                        ...person,
                        tuitionCarryforwardProvincial: toNumber(event.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Carryforward can only be used by this person in future years — it cannot be
                    transferred to a spouse
                  </p>
                </div>
                <NumberField
                  id={`${personKey}-spousal-rrsp-3yr`}
                  label="Spousal RRSP contributed in last 3 years"
                  value={person.spousalRrspContributionsLastThreeYears}
                  onChange={value =>
                    onChange({ ...person, spousalRrspContributionsLastThreeYears: value })
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
