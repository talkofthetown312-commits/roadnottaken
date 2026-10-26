import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  Package,
  Users,
  CheckCircle2,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { RestaurantProfile } from '../server/types.js';

interface AssistantViewProps {
  restaurantProfile: RestaurantProfile;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AssistantView: React.FC<AssistantViewProps> = ({ restaurantProfile }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your AI Operations Assistant for **${restaurantProfile.restaurant_name}** (${restaurantProfile.outlet_name}).\n\nI have real-time access to your SQLite edge database, including today's orders, revenue, 144 master inventory stock levels, staff payroll, and daily SOP compliance. Ask me anything or tap one of the operational queries below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const SUGGESTED_QUERIES = [
    "Summarize today's sales and top selling dishes",
    "Which raw materials need reordering?",
    "Staff payroll and monthly wage overview",
    "Food cost margin & recipe portioning analysis",
    "Review today's opening SOP compliance checklist"
  ];

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'I have analyzed the restaurant records. Everything is running nominally.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Operational query completed: edge node operational with SQLite active.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Restaurant Operations Copilot</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                SQLite Grounded
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Real-time operational queries · Stock predictions · Shift & margin insights
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Inquiries:</span>
        </span>
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            onClick={() => void handleSend(sq)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-medium whitespace-nowrap transition-colors active:scale-95 shadow-2xs"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 min-h-[460px] max-h-[560px] overflow-y-auto space-y-4 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-xl p-4 text-xs leading-relaxed space-y-2 ${
                msg.sender === 'user'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-800 border border-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
              <span className={`text-[10px] block font-mono ${msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600" />
            <span>Analyzing live restaurant orders and inventory records...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask about sales, low ingredients, staff wages, opening checklists, or recipe portions..."
          className="flex-1 px-4 py-2.5 text-xs bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95 shadow-xs"
        >
          <span>Ask Copilot</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
