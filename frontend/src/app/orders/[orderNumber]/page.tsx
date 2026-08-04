"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, formatKES } from "@/lib/api";

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
}

interface OrderData {
  order_number: string;
  status: string;
  total: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
}

const STEPS = ["pending_payment", "paid", "processing", "shipped", "delivered"];

export default function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);

  useEffect(() => {
    api.orderDetail(orderNumber).then((r) => setOrder(r as OrderData)).catch(() => {});
  }, [orderNumber]);

  async function submitTicket() {
    await api.openSupportTicket(`Return/refund request — ${orderNumber}`, ticketMessage);
    setTicketSent(true);
  }

  if (!order) return <main className="container-shell py-10 text-neutral-400">Loading order…</main>;

  const stepIndex = Math.max(0, STEPS.indexOf(order.status));

  return (
    <main className="container-shell py-10 max-w-2xl">
      <h1 className="font-display text-2xl font-black mb-1">Order {order.order_number}</h1>
      <p className="text-sm text-neutral-500 mb-8">Placed {new Date(order.created_at).toLocaleString()}</p>

      {order.status !== "cancelled" && (
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`h-2.5 w-2.5 rounded-full ${i <= stepIndex ? "bg-[var(--color-ink)]" : "bg-[var(--color-line)]"}`}
              />
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-[var(--color-ink)]" : "bg-[var(--color-line)]"}`} />
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide mb-8">Status: {order.status.replace(/_/g, " ")}</p>

      <div className="border-t border-[var(--color-line)] pt-6 space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.product_name} × {item.quantity}</span>
            <span>{formatKES(parseFloat(item.unit_price) * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between font-bold pt-4 border-t border-[var(--color-line)] mt-4">
        <span>Total</span>
        <span>{formatKES(order.total)}</span>
      </div>

      <div className="mt-8 text-sm text-neutral-600 space-y-1">
        <p className="font-semibold text-[var(--color-ink)]">Delivery details</p>
        <p>{order.shipping_name}</p>
        <p>{order.shipping_address}, {order.shipping_city}</p>
        <p className="capitalize">Payment: {order.payment_method}</p>
      </div>

      <div className="mt-10 border-t border-[var(--color-line)] pt-6">
        {ticketSent ? (
          <p className="text-sm text-neutral-600">Your return/refund request has been sent to support — we&apos;ll follow up by email.</p>
        ) : ticketOpen ? (
          <div className="space-y-3">
            <textarea
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="Tell us what you'd like to return and why…"
              rows={3}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none text-sm"
            />
            <button onClick={submitTicket} className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase px-5 py-2.5 rounded-full">
              Submit request
            </button>
          </div>
        ) : (
          <button onClick={() => setTicketOpen(true)} className="border border-[var(--color-ink)] text-xs font-semibold uppercase px-5 py-2.5 rounded-full">
            Request a return or refund
          </button>
        )}
      </div>
    </main>
  );
}
