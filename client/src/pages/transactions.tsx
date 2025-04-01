import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFinance } from "@/lib/context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Briefcase, Film, Database, Server, ShoppingCart, Plus, Search, ArrowUpDown } from "lucide-react";
import TransactionForm from "@/components/forms/transaction-form";
import type { Transaction } from "@shared/schema";

// Map of transaction icons
const transactionIcons: Record<string, JSX.Element> = {
  "shopping-bag": <ShoppingBag className="h-4 w-4 text-muted-foreground" />,
  "briefcase": <Briefcase className="h-4 w-4 text-muted-foreground" />,
  "film": <Film className="h-4 w-4 text-muted-foreground" />,
  "database": <Database className="h-4 w-4 text-muted-foreground" />,
  "server": <Server className="h-4 w-4 text-muted-foreground" />,
  "shopping-cart": <ShoppingCart className="h-4 w-4 text-muted-foreground" />
};

type TransactionRowProps = {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const TransactionRow = ({ transaction, onEdit }: TransactionRowProps) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(transaction.amount));

  const isIncome = transaction.type === 'income';
  const amountClass = isIncome ? 'text-positive' : 'text-negative';
  const formattedPrefix = isIncome ? '+' : '-';

  return (
    <tr
      className="border-b border-border transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => onEdit(transaction)}
    >
      <td className="p-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center mr-3">
            {transaction.icon && transactionIcons[transaction.icon] || <div className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            <div className="font-medium">{transaction.description}</div>
            <div className="text-xs text-muted-foreground">{transaction.category || 'Uncategorized'}</div>
          </div>
        </div>
      </td>
      <td className="p-3 text-muted-foreground">{formatDate(transaction.date)}</td>
      <td className="p-3 text-right">
        <span className={`font-medium ${amountClass} font-mono`}>
          {isIncome ? formattedPrefix : ''}{formattedAmount}
        </span>
      </td>
    </tr>
  );
};

export default function Transactions() {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions'],
  });
  
  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionFormOpen(true);
  };
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionFormOpen(true);
  };
  
  // Filter and sort transactions
  const filteredTransactions = transactions && Array.isArray(transactions) ? transactions.filter((transaction: Transaction) => {
    // Search term filter
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.category && transaction.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Transaction type filter
    const matchesType = filterType === "all" || transaction.type === filterType;
    
    return matchesSearch && matchesType;
  }).sort((a: Transaction, b: Transaction) => {
    // Sort by date
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  }) : [];
  
  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <Button onClick={handleAddTransaction}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={filterType}
                  onValueChange={setFilterType}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Date</th>
                    <th className="p-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-3">
                          <div className="flex items-center">
                            <Skeleton className="w-8 h-8 rounded-md mr-3" />
                            <div>
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredTransactions && filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction: Transaction) => (
                      <TransactionRow 
                        key={transaction.id} 
                        transaction={transaction} 
                        onEdit={handleEditTransaction}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        {searchTerm || filterType !== "all" 
                          ? "No transactions match your filters." 
                          : "No transactions found. Add a transaction to get started."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
      />
    </>
  );
}
