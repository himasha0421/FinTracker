import React from 'react';
import { ChatInterface } from '@/features/chat/components/ChatInterface';
import { useChat } from './hooks/useChat';

export default function ChatScreen() {
  const {
    messages,
    input,
    isLoading,
    selectedFile,
    handleSubmit,
    handleFileSelect,
    handleRemoveFile,
    handleInputChange,
  } = useChat();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6"> Financial Assistant </h1>
      <ChatInterface
        messages={messages}
        input={input}
        isLoading={isLoading}
        selectedFile={selectedFile}
        onSubmit={handleSubmit}
        onFileSelect={handleFileSelect}
        onRemoveFile={handleRemoveFile}
        onInputChange={handleInputChange}
      />
    </div>
  );
}
