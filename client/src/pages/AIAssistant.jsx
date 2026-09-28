import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, AlertTriangle, User, Bot } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const SUGGESTIONS = [
  'Summarize my safety notes',
  'Explain how to spot a phishing SMS',
  'What should I keep in an emergency kit?',
  'Translate "I need help" to Hindi and Telugu',
  'How do I prepare for a night journey?',
  'What are common scam indicators?',
];

export default function AIAssistant() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(null); // null = unknown
  const endRef = useRef(null);

  useEffect(() => {
    api.get('/health').then((r) => setAvailable(r.data.services?.ai === 'configured')).catch(() => setAvailable(false));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    setInput('');
    const userMsg = { role: 'user', content: prompt };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const { data } = await api.post('/ai/generate', { prompt });
      if (data.available === false || !data.reply) {
        setMessages((m) => [...m, { role: 'system', content: data.message || 'AI assistant is not available.' }]);
        toast.error(data.message || 'AI not available');
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'Request failed';
      setMessages((m) => [...m, { role: 'system', content: msg }]);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-600" /> AI Safety Assistant
        </h1>
        <p className="text-navy-500 text-sm mt-1">
          Helps explain features, translate, summarize notes, and provide general safety information.
        </p>
      </header>

      {available === false && (
        <div className="card p-4 border-amber-200 bg-amber-50/50 flex items-start gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">AI assistant is not configured.</p>
            <p className="text-amber-700 mt-1">The server does not have GEMINI_API_KEY set. Please add it to <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">server/.env</code>.</p>
          </div>
        </div>
      )}

      <div className="card flex flex-col h-[60vh] min-h-[420px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center"><Bot className="w-7 h-7" /></div>
              <div>
                <p className="font-medium text-navy-800">SAHAYA AI Assistant</p>
                <p className="text-sm text-navy-500 mt-1">Ask about safety, summarise notes, or pick a suggestion below.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left text-sm px-3 py-2 rounded-xl border border-navy-100 hover:border-violet-300 hover:bg-violet-50/50 text-navy-700">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'system' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                    {m.role === 'system' ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-navy-700 text-white rounded-br-md'
                  : m.role === 'system' ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-navy-50 text-navy-800 rounded-bl-md'
                }`}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-navy-700 text-white flex items-center justify-center shrink-0"><User className="w-4 h-4" /></div>
                )}
              </div>
            ))
          )}
          {busy && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center"><Bot className="w-4 h-4" /></div>
              <div className="bg-navy-50 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-navy-500">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-navy-50 p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask SAHAYA AI…"
            className="input flex-1"
            disabled={busy}
          />
          <button onClick={() => send()} disabled={busy || !input.trim()} className="btn-primary">
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>

      <p className="text-xs text-navy-400 leading-relaxed">
        SAHAYA AI is a general assistant. It does NOT diagnose dangerous situations, predict danger, or replace emergency services.
        If you are in immediate danger, activate Emergency Mode or call your local emergency number.
      </p>
    </div>
  );
}
