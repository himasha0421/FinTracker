import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type InvestmentHeaderProps = {
  canAddContribution: boolean;
  onAddContribution: () => void;
  onAddInvestment: () => void;
};

export default function InvestmentHeader({
  canAddContribution,
  onAddContribution,
  onAddInvestment,
}: InvestmentHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Investment Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Track holdings, assets, contributions, and progress in one view.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onAddContribution} disabled={!canAddContribution}>
          Add Contribution
        </Button>
        <Button onClick={onAddInvestment}>
          <Plus className="mr-2 h-4 w-4" />
          Add Investment
        </Button>
      </div>
    </div>
  );
}
