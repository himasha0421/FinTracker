import type { TuitionTransferDetail } from '@shared/taxPlanning';
import { currencyFormatter } from '../constants';

interface TuitionTransferRecommendationCardProps {
  tuitionTransfer: TuitionTransferDetail;
  personAName: string;
  personBName: string;
}

export function TuitionTransferRecommendationCard({
  tuitionTransfer,
  personAName,
  personBName,
}: TuitionTransferRecommendationCardProps) {
  const donorName = tuitionTransfer.donor === 'personA' ? personAName : personBName;
  const recipientName = tuitionTransfer.recipient === 'personA' ? personAName : personBName;

  return (
    <div className="rounded-lg border-2 border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20 px-5 py-4 space-y-2">
      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Tuition Transfer Opportunity</p>
      <p className="text-sm">
        Transfer{' '}
        <span className="font-medium">{currencyFormatter.format(tuitionTransfer.recommendedFederalAmount)}</span>{' '}
        of <span className="font-medium">{donorName}</span>'s current-year tuition to{' '}
        <span className="font-medium">{recipientName}</span>.
      </p>
      <p className="text-sm text-green-700 dark:text-green-400">
        Estimated family tax saving:{' '}
        <span className="font-semibold">{currencyFormatter.format(tuitionTransfer.taxSaved)}</span>
      </p>
      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <p>Federal transferred: {currencyFormatter.format(tuitionTransfer.recommendedFederalAmount)}</p>
        <p>Provincial transferred: {currencyFormatter.format(tuitionTransfer.recommendedProvincialAmount)}</p>
        <p>{donorName} carries forward (federal): {currencyFormatter.format(tuitionTransfer.carryForwardFederal)}</p>
        <p>{donorName} carries forward (MB): {currencyFormatter.format(tuitionTransfer.carryForwardProvincial)}</p>
      </div>
    </div>
  );
}
