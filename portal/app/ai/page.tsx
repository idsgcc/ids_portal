"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; text: string };

function Markdown({ text }: { text: string }) {
  // Render bold, bullets, and line breaks simply
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Replace **bold** inline
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );

        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          return <div key={i} className="flex gap-2"><span className="mt-0.5 shrink-0">•</span><span>{parts.slice(1)}</span></div>;
        }
        if (trimmed.startsWith("## ")) {
          return <p key={i} className="font-semibold text-sm mt-2">{trimmed.slice(3)}</p>;
        }
        if (trimmed.startsWith("# ")) {
          return <p key={i} className="font-bold mt-2">{trimmed.slice(2)}</p>;
        }
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

const SUGGESTIONS = [
  "Which projects are currently active?",
  "Are there any overdue invoices?",
  "What opportunities are closing soon?",
  "Which projects have the highest priority?",
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setError(null);
    const userMsg: Message = { role: "user", text: message };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.map(m => ({ role: m.role === "user" ? "user" : "model", text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setError((e as Error).message);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main className="min-h-screen flex flex-col p-8 pb-0">
      <div className="max-w-3xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Home</Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              Powered by Gemini
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ask questions about your projects, opportunities, and invoices.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="py-12">
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 mb-6">Try asking…</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-gray-600 dark:text-gray-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
              }`}>
                {m.role === "assistant" ? <Markdown text={m.text} /> : m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-xs text-red-500">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-950 pt-4 pb-8">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-3 transition-colors"
            >
              Clear conversation
            </button>
          )}
          <div className="flex gap-2 items-end bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus-within:border-violet-500 dark:focus-within:border-violet-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your projects…"
              rows={1}
              autoFocus
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-600 max-h-40"
              style={{ overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </main>
  );
}
