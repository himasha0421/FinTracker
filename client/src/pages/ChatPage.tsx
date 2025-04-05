import React from 'react';
import { ChatInterface } from '../components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6"> Financial Assistant </h1>
      <ChatInterface />
    </div>
  );
}
