"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import type { ChatReply } from "@/lib/types";

interface Msg {
  sender: "user" | "bot";
  text: string;
  products?: ChatReply["reply"]["products"];
}

export default function ChatbotWidget() {
  const { formatPrice } = useLocalization();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Msg[]>([
    { sender: "bot", text: "Hi! I'm the larktribe shopping assistant. Ask me to find something, or check an order." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((m) => [...m, { sender: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.chatbot(text, sessionId);
      setSessionId(res.session_id);
      setMessages((m) => [...m, { sender: "bot", text: res.reply.text, products: res.reply.products }]);
    } catch {
      setMessages((m) => [...m, { sender: "bot", text: "Sorry, something went wrong. Try again in a moment." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-5 z-50 font-sans">
      {open && (
        <div className="mb-3 w-[90vw] max-w-sm h-[28rem] bg-stone-50 border border-stone-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-stone-900 text-stone-100 px-4 py-3 flex items-center justify-between">
            <span className="font-editorial text-lg tracking-wide">Lark Tribe Concierge</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.sender === "user" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block px-3 py-2 rounded-lg max-w-[85%] ${
                    m.sender === "user" ? "bg-stone-900 text-stone-50" : "bg-stone-200 text-espresso"
                  }`}
                >
                  {m.text}
                </span>
                {m.products && m.products.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.products.slice(0, 4).map((p) => (
                      <Link key={p.id} href={`/product/${p.slug}`} className="block text-xs underline text-left">
                        {p.name} — {formatPrice(p.price)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-stone-200 p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about products, orders, returns…"
              className="flex-1 bg-stone-100 rounded-full px-4 py-2 text-sm outline-none"
            />
            <button onClick={send} disabled={sending} aria-label="Send" className="bg-stone-900 text-stone-50 rounded-full p-2 disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Client Live Chat"
        className="bg-stone-900 hover:bg-black text-stone-100 p-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200"
      >
        {open ? <X size={20} strokeWidth={1.6} /> : <MessageCircle size={20} strokeWidth={1.6} />}
      </button>
    </div>
  );
}
