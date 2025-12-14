import { useEffect, useRef, useState } from 'react';
import { useFinance } from '@/lib/context';
import { useToast } from '@/hooks/use-toast';
import { sendChat } from '../api';
import type { ChatMessage, ChatResponse } from '../types';

export function useChat() {
  const { addTransaction } = useFinance();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const pendingFileUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pendingFileUrl.current) {
        URL.revokeObjectURL(pendingFileUrl.current);
      }
    };
  }, []);

  const handleFileSelect = (file: File | null) => {
    if (pendingFileUrl.current) {
      URL.revokeObjectURL(pendingFileUrl.current);
      pendingFileUrl.current = null;
    }
    if (file) {
      pendingFileUrl.current = URL.createObjectURL(file);
    }
    setSelectedFile(file);
  };

  const processTransactions = async (transactions: any[]) => {
    for (const transaction of transactions) {
      const formatted = {
        description: transaction.description,
        amount: transaction.amount.toString(),
        date: new Date(transaction.date),
        category: transaction.category || 'Uncategorized',
        type: transaction.type || 'expense',
        icon: transaction.icon || 'shopping-bag',
        accountId: 4,
      };
      await addTransaction(formatted as any);
    }
    toast({
      title: 'Success',
      description: `Added ${transactions.length} transactions successfully`,
      duration: 3000,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    if (input.trim()) {
      formData.append('message', input.trim());
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      ...(selectedFile && pendingFileUrl.current
        ? {
            file: {
              name: selectedFile.name,
              type: selectedFile.type,
              url: pendingFileUrl.current,
            },
          }
        : {}),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    handleFileSelect(null);
    setIsLoading(true);

    try {
      const data: ChatResponse = await sendChat(formData, conversationId);

      // Update conversation ID for multi-turn conversations
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.task_type === 'add_transactions' && Array.isArray(data.data)) {
        await processTransactions(data.data);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
      toast({
        title: 'Error',
        description: 'Failed to process the request: ' + (error as Error).message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    isLoading,
    selectedFile,
    handleSubmit,
    handleFileSelect,
    handleRemoveFile: () => handleFileSelect(null),
    handleInputChange: setInput,
  };
}
