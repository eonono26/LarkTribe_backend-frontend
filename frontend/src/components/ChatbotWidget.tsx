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
  orderHref?: string;
}

function renderBotText(text: string) {
  const parts = text.split(/(\/(?:account\/(?:orders|support)|orders\/[A-Z0-9]{8,32}|delivery|returns|contact|faq|about|download|vendor\/apply))/gi);
  return parts.map((part, index) =>
    part.startsWith("/") ? (
      <Link key={`${part}-${index}`} href={part} className="underline underline-offset-2">
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

export default function ChatbotWidget() {
  const { formatPrice } = useLocalization();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Msg[]>([
    { sender: "bot", text: "Hi! I'm the LarkTribe shopping assistant. Ask about products, orders, delivery, returns, payments, or your account." },
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
      const orderNumber = res.reply.text.match(/\bOrder\s+([A-Z0-9]{8,32})\s+is currently\b/i)?.[1];
      setMessages((m) => [
        ...m,
        {
          sender: "bot",
          text: res.reply.text,
          products: res.reply.products,
          orderHref: orderNumber ? `/orders/${orderNumber}` : undefined,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { sender: "bot", text: "Sorry, something went wrong. Try again in a moment." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 font-sans sm:bottom-5 sm:left-auto sm:right-5">
      {open && (
        <div className="mb-3 ml-auto flex h-[min(70dvh,28rem)] max-h-[calc(100dvh-7rem)] w-full max-w-sm flex-col overflow-hidden rounded-none border border-stone-200 bg-stone-50 ">
          <div className="bg-stone-900 text-stone-100 px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-[13px] tracking-[0.08em] font-editorial text-lg tracking-wide">LarkTribe Concierge</span>
              <p className="text-[11px] text-stone-300">Shopping and order help</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
          </div>
          <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.sender === "user" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block px-3 py-2 rounded-none max-w-[85%] ${
 m.sender === "user"? "bg-stone-900 text-stone-50": "bg-stone-200 text-espresso"
 }`}
                >
                  {m.sender === "bot" ? renderBotText(m.text) : m.text}
                </span>
                {m.orderHref && (
                  <Link href={m.orderHref} className="mt-1 block text-xs font-semibold underline">
                    View order details
                  </Link>
                )}
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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="flex gap-2 border-t border-stone-200 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, orders, returns…"
              aria-label="Ask the LarkTribe assistant"
              className="min-w-0 flex-1 rounded-full bg-stone-100 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-stone-500"
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className="rounded-full bg-stone-900 p-2 text-stone-50 disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Client Live Chat"
        className="bg-stone-900 hover:bg-black text-stone-100 p-3.5 rounded-full hover: transition-all duration-200"
      >
        {open ? <X size={20} strokeWidth={1.6} /> : <MessageCircle size={20} strokeWidth={1.6} />}
      </button>
    </div>
  );
}
