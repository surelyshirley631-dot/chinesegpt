'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Send, BookOpen } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  context?: any[]; // To show sources
}

export default function SmartTutorPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.answer,
        context: data.context 
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get answer:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error retrieving the answer.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">Smart Tutor</h1>
          <p className="text-neutral-600">Ask questions based on your uploaded course materials.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col h-[600px]">
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-neutral-400 mt-20">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Upload PDFs to your knowledge base and ask me anything!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Context Sources (Optional) */}
                  {msg.context && msg.context.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200/50 text-xs text-neutral-500">
                      <p className="font-semibold mb-1">Sources:</p>
                      <ul className="list-disc list-inside">
                        {msg.context.slice(0, 3).map((doc: any, i: number) => (
                          <li key={i} className="truncate">
                            {doc.metadata?.source || 'Document'} (Page {doc.metadata?.page || '?'})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 rounded-2xl px-4 py-3">
                  <div className="animate-pulse flex space-x-2">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-neutral-200 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about grammar, vocabulary, or course content..."
                className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
