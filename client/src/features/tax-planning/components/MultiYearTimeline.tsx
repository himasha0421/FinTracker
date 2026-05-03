import type { MultiYearProjection } from '@shared/taxPlanning';
import { currencyFormatter } from '../constants';

interface MultiYearTimelineProps {
  multiYear: MultiYearProjection;
}

export function MultiYearTimeline({ multiYear }: MultiYearTimelineProps) {
  const { byYear, projectedHomeFundsAtPurchase, shortfallAtPurchase } = multiYear;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">3-Year Projection</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Tax Year</th>
              <th className="pb-2 pr-4 font-medium text-right">Family Net Tax After</th>
              <th className="pb-2 pr-4 font-medium text-right">FHSA Balance (combined)</th>
              <th className="pb-2 pr-4 font-medium text-right">RRSP Room Remaining (combined)</th>
              <th className="pb-2 font-medium text-right">Projected Home Funds</th>
            </tr>
          </thead>
          <tbody>
            {byYear.map(yearRow => {
              const combinedFhsa =
                yearRow.fhsaBalanceEndOfYear.personA + yearRow.fhsaBalanceEndOfYear.personB;
              const combinedRrspRoom =
                yearRow.rrspRoomEndOfYear.personA + yearRow.rrspRoomEndOfYear.personB;
              const homeFunds = yearRow.result.summary.totalProjectedHomeFunds;

              return (
                <tr key={yearRow.taxYear} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    {yearRow.taxYear}
                    {yearRow.projected && (
                      <span className="ml-1 text-xs text-muted-foreground">(est.)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {currencyFormatter.format(yearRow.result.summary.familyNetTaxAfter)}
                  </td>
                  <td className="py-2 pr-4 text-right">{currencyFormatter.format(combinedFhsa)}</td>
                  <td className="py-2 pr-4 text-right">{currencyFormatter.format(combinedRrspRoom)}</td>
                  <td className="py-2 text-right">{currencyFormatter.format(homeFunds)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="pt-3 pr-4" colSpan={4}>
                Projected home funds at purchase
              </td>
              <td className="pt-3 text-right">{currencyFormatter.format(projectedHomeFundsAtPurchase)}</td>
            </tr>
            {shortfallAtPurchase > 0 && (
              <tr className="text-destructive">
                <td className="pt-1 pr-4" colSpan={4}>
                  Shortfall at purchase
                </td>
                <td className="pt-1 text-right">{currencyFormatter.format(shortfallAtPurchase)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
