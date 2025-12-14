import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '@/features/chat/types';

type ChatInterfaceProps = {
  messages: ChatMessage[];
  input: string;
  selectedFile: File | null;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onFileSelect: (file: File | null) => void;
  onRemoveFile: () => void;
};

export function ChatInterface({
  messages,
  input,
  selectedFile,
  isLoading,
  onInputChange,
  onSubmit,
  onFileSelect,
  onRemoveFile,
}: ChatInterfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    onFileSelect(file || null);
  };

  return (
    <div className="flex-1 bg-black h-[calc(100vh-180px)] overflow-hidden font-inter">
      <div className="h-full flex flex-col">
        <div className="flex-1 mx-4 rounded-lg bg-[#1a1a1a] overflow-hidden flex flex-col">
          <div className="bg-[#2a2a2a] p-2.5 text-center flex-shrink-0">
            <h2 className="text-white text-xl font-medium"> What can I help with? </h2>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <div className="px-4 py-3 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${message.role === 'assistant' ? 'bg-[#2a2a2a]' : 'bg-[#2970ff]'} rounded-xl px-4 py-2.5 ${message.role === 'assistant' ? 'text-gray-100' : 'text-white'}`}
                  >
                    {message.file && (
                      <div className="mb-2">
                        {message.file.type.startsWith('image/') ? (
                          <img
                            src={message.file.url}
                            alt={message.file.name}
                            className="max-w-[200px] max-h-[150px] w-auto h-auto object-contain rounded-lg"
                          />
                        ) : (
                          <div className="flex items-center space-x-2 text-sm">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            <span> {message.file.name} </span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-base leading-relaxed whitespace-pre-wrap">
                      {' '}
                      {message.content}{' '}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-[#2a2a2a] rounded-xl px-4 py-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"> </div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      >
                        {' '}
                      </div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      >
                        {' '}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-[#333333] p-2.5 flex-shrink-0">
            <form onSubmit={onSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => onInputChange(e.target.value)}
                  placeholder="Ask anything"
                  className="w-full rounded-lg border border-[#333333] bg-[#2a2a2a] px-4 py-2.5 pr-20 text-base text-white placeholder-gray-400 focus:border-[#2970ff] focus:outline-none focus:ring-1 focus:ring-[#2970ff]"
                  disabled={isLoading}
                />
                <div className="absolute right-2 top-2 flex space-x-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-gray-400 hover:text-gray-300"
                    title="Attach file"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={onRemoveFile}
                        className="p-1.5 text-red-400 hover:text-red-300"
                        title="Remove file"
                      >
                        <svg
                          className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !selectedFile)}
                    className="p-1.5 text-gray-400 hover:text-gray-300 disabled:opacity-50"
                    title="Send message"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-400">Selected file: {selectedFile.name}</div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
