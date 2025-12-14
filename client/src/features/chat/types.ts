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
  task_type?: string;
  conversation_id?: string;
  message_id?: string;
};

export type DifyTransaction = {
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense';
  icon: string;
  accountId: string;
};
