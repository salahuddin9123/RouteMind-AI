import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle, Trash2, MessageSquare, Zap } from 'lucide-react';
import { useApp } from '../context';
import { generateId, askAiAgent } from '../services';
import type { AiMessage } from '../types';

const SUGGESTED_QUESTIONS = [
  'Why is this route recommended?',
  'Which route is the shortest?',
  'Are there flood risks on this route?',
  'Is there a road closure?',
  'How much longer is the safer route?',
  'What is the weather risk?',
];

export function AIPlannerPage() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.aiMessages, isTyping]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim()) return;
    setInput('');

    const userMsg: AiMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };
    dispatch({ type: 'ADD_AI_MESSAGE', payload: userMsg });
    setIsTyping(true);

    try {
      const context = {
        routeComparison: state.routeComparison,
        originPlace: state.originPlace,
        destinationPlace: state.destinationPlace,
        weatherData: state.weatherData,
        selectedRoadInfo: state.selectedRoadInfo
      };
      
      const allMessages = [...state.aiMessages, userMsg].map(m => ({ role: m.role, content: m.content }));
      
      const res = await askAiAgent(allMessages, context);
      
      const assistantMsg: AiMessage = {
        id: generateId(),
        role: 'assistant',
        content: res.reply || res.error || "I'm sorry, I couldn't process that request.",
        timestamp: new Date().toISOString()
      };
      dispatch({ type: 'ADD_AI_MESSAGE', payload: assistantMsg });
    } catch (e) {
      const errorMsg: AiMessage = {
        id: generateId(),
        role: 'assistant',
        content: "Error communicating with the AI service.",
        timestamp: new Date().toISOString()
      };
      dispatch({ type: 'ADD_AI_MESSAGE', payload: errorMsg });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full p-4 gap-4">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
              <Bot size={20} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">AI Route Planner</h1>
              <p className="text-xs text-gray-500">Natural language route planning & road intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.aiMessages.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'CLEAR_AI_MESSAGES' })}
                className="btn-ghost text-xs p-2"
                title="Clear conversation"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-area space-y-4 min-h-0">
        {state.aiMessages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-brand-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Ask RouteMind AI</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
              Ask about routes, flood risks, road closures, or let the AI help you plan your journey.
            </p>

            {/* Suggested questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left p-3 glass-card-hover text-xs text-gray-300 rounded-lg"
                >
                  <Zap size={10} className="text-brand-400 inline mr-1" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.aiMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/30 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-brand-400" />
            </div>
            <div className="glass-card px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-card p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try: "Find the safest route from London to Birmingham" or "Are there flood risks?"'
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none min-h-[42px] max-h-32"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            className="btn-primary p-2.5 shrink-0"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-brand-600/50 border border-brand-500/30'
          : 'bg-surface-600 border border-white/10'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-brand-400" />}
      </div>

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-600/30 border border-brand-500/30 text-white'
            : 'glass-card text-gray-200'
        }`}>
          {/* Render markdown-like bold */}
          <p className="whitespace-pre-wrap">
            {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
