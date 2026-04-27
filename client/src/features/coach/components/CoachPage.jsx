import { useState, useRef, useEffect } from 'react';
import { useCoach } from '../context/CoachContext';
import { Link } from 'react-router-dom';

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-white border border-primary-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-soft">
        <div className="flex gap-1.5 items-center">
          <span className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isSystem = msg.role === 'system';
  const isStudent = msg.role === 'student';
  const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSystem) {
    return (
      <div className="flex justify-center mb-2 animate-fade-in">
        <span className="text-[11px] text-primary-400 bg-primary-50 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isStudent ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      <div className={`max-w-[80%] ${isStudent ? 'ml-8' : 'mr-8'}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isStudent
              ? 'bg-primary-900 text-white rounded-2xl rounded-br-sm'
              : msg.isError
              ? 'bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-sm'
              : 'bg-white border border-primary-100 text-primary-800 rounded-2xl rounded-bl-sm shadow-soft'
          }`}
        >
          {msg.content}
        </div>
        <div className={`mt-1 flex items-center gap-2 ${isStudent ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-primary-300">{time}</span>
        </div>
        {msg.planSnapshot && (
          <div className="mt-2 bg-accent-50 border border-accent-200 rounded-xl p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-accent-700 mb-1">
              Rencana Diperbarui
            </div>
            <p className="text-xs text-primary-600">{msg.planSnapshot}</p>
            <Link
              to="/calendar"
              className="text-xs font-medium text-primary-900 hover:underline mt-1 inline-block"
            >
              Lihat rencana →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachPage() {
  const { messages, status, sendMessage, generatePlan } = useCoach();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || status === 'loading') return;
    sendMessage(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">
          AI Learning Coach
        </h2>
        <p className="text-primary-400">
          Tanya apa saja tentang rencana belajarmu.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1">
        {messages.length === 0 && status !== 'loading' ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-2xl">🎓</span>
            </div>
            <h3 className="text-base font-semibold text-primary-900 mb-2">
              Coach Belajar Kamu
            </h3>
            <p className="text-sm text-primary-400 max-w-xs leading-relaxed mb-4">
              Mulai dengan membuat rencana belajar yang dipersonalisasi, atau tanya apa saja.
            </p>
            <button
              onClick={generatePlan}
              disabled={status === 'loading'}
              className="btn-primary !px-6 !py-2.5 !rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buat Rencana Belajar
            </button>
          </div>
        ) : messages.length === 0 && status === 'loading' ? (
          <div className="flex-1 flex items-center justify-center">
            <TypingIndicator />
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {status === 'loading' && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 pt-3 border-t border-primary-100">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan untuk coach..."
          disabled={status === 'loading'}
          className="input flex-1 !py-2.5 !text-sm !rounded-xl disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || status === 'loading'}
          className="btn-primary !px-4 !py-2.5 !rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
