export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  file?: {
    name: string;
    type: string;
    url: string;
  };
};

export type ChatResponse = {
  response: string;
  data?: unknown;
  task_type?: string | null;
};

export type ExtractedTransaction = {
  description: string;
  amount: number;
  date: string;
  category: string;
  subcategory?: string;
  type: 'income' | 'expense';
  assignee?: string;
};
