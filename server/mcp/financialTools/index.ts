import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAccountAndTransactionTools } from './accountTransactionTools';
import { registerInvestmentTools } from './investmentTools';
import { registerOverviewAndGoalTools } from './overviewGoalTools';

export function registerFinancialTools(server: McpServer) {
  registerAccountAndTransactionTools(server);
  registerOverviewAndGoalTools(server);
  registerInvestmentTools(server);
}

export * from './accountTransactionTools';
export * from './overviewGoalTools';
export * from './investmentTools';
export * from './utils/transactionHelpers';
export * from './utils/goalHelpers';
export * from './utils/investmentHelpers';
export * from './utils/shared';
