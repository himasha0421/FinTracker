import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import Sidebar from '@/components/layout/sidebar';
import Dashboard from '@/pages/dashboard';
import Transactions from '@/pages/transactions';
import Insights from '@/pages/insights';
import Recommendations from '@/pages/recommendations';
import Notes from '@/pages/notes';
import Investment from '@/pages/investment';
import ChatPage from '@/pages/ChatPage';
import { FinanceProvider } from './lib/context';

function Router() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/insights" component={Insights} />
          <Route path="/recommendations" component={Recommendations} />
          <Route path="/notes" component={Notes} />
          <Route path="/investment" component={Investment} />
          <Route path="/chat" component={ChatPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FinanceProvider>
        <Router />
        <Toaster />
      </FinanceProvider>
    </QueryClientProvider>
  );
}

export default App;
