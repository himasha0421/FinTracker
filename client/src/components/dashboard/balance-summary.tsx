import { useFinance } from "@/lib/context";

export default function BalanceSummary() {
  const { totalBalance } = useFinance();

  // Format the balance with commas and 2 decimal places
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(totalBalance);

  return (
    <div className="mb-6">
      <h2 className="text-muted-foreground text-sm font-medium">Total Balance</h2>
      <h1 className="text-3xl font-semibold font-mono">{formattedBalance}</h1>
    </div>
  );
}
