import { ApiError, fetchWithErrorHandling, uploadFile } from './apiClient';

export interface DifyFile {
  type: 'image' | 'document';
  transfer_method: 'remote_url' | 'local_file';
  url?: string;
  upload_file_id?: string;
}

export interface DifyRequest {
  inputs?: Record<string, any>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user: string;
  files?: DifyFile[];
}

export interface DifyMessageResponse {
  event: 'message' | 'message_end' | 'error';
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  created_at?: number;
  error?: string;
}

export interface DifyBlockingResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
  created_at: number;
}

export interface DifyConfig {
  baseUrl: string;
  apiKey: string;
}

export class DifyClient {
  private config: DifyConfig;

  constructor(config: DifyConfig) {
    this.config = config;
  }

  /**
   * Upload a file to Dify for processing
   */
  async uploadFile(file: File): Promise<string> {
    const data = await uploadFile(
      `${this.config.baseUrl}/v1/files/upload`,
      file,
      { user: 'default-user' },
      { Authorization: `Bearer ${this.config.apiKey}` }
    );
    return data.id;
  }

  /**
   * Send a chat message with optional file attachments (blocking mode)
   */
  async sendMessage(
    query: string,
    file?: File,
    conversationId?: string
  ): Promise<DifyBlockingResponse> {
    let files: DifyFile[] | undefined;

    if (file) {
      const uploadFileId = await this.uploadFile(file);
      files = [
        {
          type: file.type.startsWith('image/') ? 'image' : 'document',
          transfer_method: 'local_file',
          upload_file_id: uploadFileId,
        },
      ];
    }

    const requestBody: DifyRequest = {
      inputs: {},
      query,
      response_mode: 'blocking',
      conversation_id: conversationId || '',
      user: 'default-user',
      ...(files && { files }),
    };

    return fetchWithErrorHandling<DifyBlockingResponse>(
      `${this.config.baseUrl}/v1/chat-messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );
  }

  /**
   * Send a chat message with streaming response
   */
  async sendMessageStreaming(
    query: string,
    file?: File,
    conversationId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<{
    answer: string;
    conversation_id: string;
    message_id: string;
  }> {
    let files: DifyFile[] | undefined;

    // Upload file if provided
    if (file) {
      const uploadFileId = await this.uploadFile(file);
      files = [
        {
          type: file.type.startsWith('image/') ? 'image' : 'document',
          transfer_method: 'local_file',
          upload_file_id: uploadFileId,
        },
      ];
    }

    const requestBody: DifyRequest = {
      inputs: {},
      query,
      response_mode: 'streaming',
      conversation_id: conversationId || '',
      user: 'default-user',
      ...(files && { files }),
    };

    const response = await fetch(`${this.config.baseUrl}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, `Dify API error: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError(500, 'Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullAnswer = '';
    let conversationIdResult = '';
    let messageIdResult = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data: DifyMessageResponse = JSON.parse(jsonStr);

              if (data.event === 'message') {
                if (data.answer) {
                  fullAnswer += data.answer;
                  onChunk?.(data.answer);
                }
                if (data.conversation_id) {
                  conversationIdResult = data.conversation_id;
                }
                if (data.message_id) {
                  messageIdResult = data.message_id;
                }
              } else if (data.event === 'message_end') {
                if (data.conversation_id) {
                  conversationIdResult = data.conversation_id;
                }
                if (data.message_id) {
                  messageIdResult = data.message_id;
                }
              } else if (data.event === 'error') {
                throw new ApiError(500, `Dify streaming error: ${data.error}`);
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', jsonStr, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      answer: fullAnswer,
      conversation_id: conversationIdResult,
      message_id: messageIdResult,
    };
  }

  /**
   * Parse transaction data from Dify workflow output
   * Handles both JSON string and structured object responses
   */
  parseTransactions(answer: string): any[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(answer);

      // Check if it has a transactions array
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        return parsed.transactions;
      }

      // If the whole response is an array
      if (Array.isArray(parsed)) {
        return parsed;
      }

      return [];
    } catch (e) {
      // If parsing fails, try to extract JSON from text
      const jsonMatch = answer.match(/\{[\s\S]*"transactions"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.transactions || [];
        } catch {
          console.error('Failed to extract transactions from response');
        }
      }
      return [];
    }
  }
}

// Singleton instance
let difyClient: DifyClient | null = null;

/**
 * Get or create the Dify client instance
 */
export function getDifyClient(): DifyClient {
  if (!difyClient) {
    const baseUrl = import.meta.env.VITE_DIFY_BASE_URL;
    const apiKey = import.meta.env.VITE_DIFY_API_KEY;

    if (!apiKey) {
      throw new Error(
        'VITE_DIFY_API_KEY environment variable is not set. Please add it to your .env file.'
      );
    }

    if (!baseUrl) {
      throw new Error(
        'VITE_DIFY_BASE_URL environment variable is not set. Please add it to your .env file.'
      );
    }

    difyClient = new DifyClient({ baseUrl, apiKey });
  }

  return difyClient;
}
