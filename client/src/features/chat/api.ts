import { getDifyClient } from '@/services/difyClient';
import type { ChatResponse } from './types';

export async function sendChat(
  formData: FormData,
  conversationId?: string
): Promise<ChatResponse> {
  try {
    const difyClient = getDifyClient();

    // Extract file and message from FormData
    const file = formData.get('file') as File | null;
    const message = formData.get('message') as string | null;

    // Default query if no message provided
    const query = message || 'Extract transactions from this bank statement';

    // Send request to Dify
    const response = await difyClient.sendMessage(query, file || undefined, conversationId);

    // Parse the response to extract transactions
    const transactions = difyClient.parseTransactions(response.answer);

    // Return in the format expected by the frontend
    return {
      response: transactions.length > 0
        ? `I've extracted ${transactions.length} transactions from your statement.`
        : response.answer,
      data: transactions,
      task_type: transactions.length > 0 ? 'add_transactions' : undefined,
      conversation_id: response.conversation_id,
      message_id: response.message_id,
    };
  } catch (error) {
    console.error('Dify API error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get response from AI'
    );
  }
}
