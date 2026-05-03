import { useState } from 'react';
import type { TaxCreditBreakdown, TaxOptimizationResult, TaxPersonKey } from '@shared/taxPlanning';
import { currencyFormatter } from '../constants';

interface CreditsBreakdownTableProps {
  personName: string;
  federalCredits: TaxCreditBreakdown;
  provincialCredits: TaxCreditBreakdown;
  payroll: TaxOptimizationResult['people'][TaxPersonKey]['payroll'];
}

export function CreditsBreakdownTable({
  personName,
  federalCredits,
  provincialCredits,
  payroll,
}: CreditsBreakdownTableProps) {
  const [open, setOpen] = useState(false);

  const creditRows = [
    {
      label: 'Basic Personal Amount',
      fedAmount: federalCredits.basicPersonalAmount,
      fedValue: federalCredits.basicPersonalAmount * 0.15,
      mbAmount: provincialCredits.basicPersonalAmount,
      mbValue: provincialCredits.basicPersonalAmount * 0.108,
    },
    {
      label: 'Spousal Amount',
      fedAmount: federalCredits.spousalAmount,
      fedValue: federalCredits.spousalAmount * 0.15,
      mbAmount: provincialCredits.spousalAmount,
      mbValue: provincialCredits.spousalAmount * 0.108,
    },
    {
      label: 'Canada Employment Amount',
      fedAmount: federalCredits.canadaEmploymentAmount,
      fedValue: federalCredits.canadaEmploymentAmount * 0.15,
      mbAmount: provincialCredits.canadaEmploymentAmount,
      mbValue: provincialCredits.canadaEmploymentAmount * 0.108,
    },
    {
      label: 'CPP/EI Credit',
      fedAmount: federalCredits.cppEiCredit,
      fedValue: federalCredits.cppEiCredit * 0.15,
      mbAmount: provincialCredits.cppEiCredit,
      mbValue: provincialCredits.cppEiCredit * 0.108,
    },
    {
      label: 'Tuition (own)',
      fedAmount: federalCredits.tuitionOwn,
      fedValue: federalCredits.tuitionOwn * 0.15,
      mbAmount: provincialCredits.tuitionOwn,
      mbValue: provincialCredits.tuitionOwn * 0.108,
    },
    {
      label: 'Tuition Transfer Received',
      fedAmount: federalCredits.tuitionTransferIn,
      fedValue: federalCredits.tuitionTransferIn * 0.15,
      mbAmount: provincialCredits.tuitionTransferIn,
      mbValue: provincialCredits.tuitionTransferIn * 0.108,
    },
  ];

  return (
    <div className="rounded-lg border px-4 py-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => setOpen(prev => !prev)}
      >
        <span>Tax Credits Detail — {personName}</span>
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Credit</th>
                <th className="pb-2 pr-4 font-medium text-right">Federal Amount</th>
                <th className="pb-2 pr-4 font-medium text-right">Federal Value</th>
                <th className="pb-2 pr-4 font-medium text-right">MB Amount</th>
                <th className="pb-2 font-medium text-right">MB Value</th>
              </tr>
            </thead>
            <tbody>
              {creditRows.map(row => (
                <tr key={row.label} className="border-b border-border/40">
                  <td className="py-1.5 pr-4">{row.label}</td>
                  <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(row.fedAmount)}</td>
                  <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(row.fedValue)}</td>
                  <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(row.mbAmount)}</td>
                  <td className="py-1.5 text-right">{currencyFormatter.format(row.mbValue)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5 pr-4">Total Non-Refundable Credits</td>
                <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(federalCredits.totalCreditAmount)}</td>
                <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(federalCredits.totalCreditValue)}</td>
                <td className="py-1.5 pr-4 text-right">{currencyFormatter.format(provincialCredits.totalCreditAmount)}</td>
                <td className="py-1.5 text-right">{currencyFormatter.format(provincialCredits.totalCreditValue)}</td>
              </tr>
            </tbody>
          </table>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payroll Deductions
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-1.5 pr-4 font-medium">CPP Base</th>
                  <th className="pb-1.5 pr-4 font-medium">CPP Enhanced</th>
                  <th className="pb-1.5 pr-4 font-medium">CPP2</th>
                  <th className="pb-1.5 pr-4 font-medium">EI</th>
                  <th className="pb-1.5 font-medium">Total Deduction</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.cppBase)}</td>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.cppEnhanced)}</td>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.cpp2)}</td>
                  <td className="py-1.5 pr-4">{currencyFormatter.format(payroll.ei)}</td>
                  <td className="py-1.5 font-semibold">{currencyFormatter.format(payroll.totalDeduction)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
