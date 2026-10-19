"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Download } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import LiveDeliveryTracker from "@/components/LiveDeliveryTracker";

interface OrderItem {
  id: number;
  product_name: string;
  product_image: string | null;
  product_slug: string | null;
  quantity: number;
  unit_price: string;
  variant_label?: string;
}

interface OrderData {
  order_number: string;
  status: string;
  subtotal: string;
  shipping_fee: string;
  discount_total: string;
  member_discount_total: string;
  total: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
}

const STEPS = [
  { key: "paid", label: "Order Confirmed" },
  { key: "processing", label: "Being Prepared" },
  { key: "shipped", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_HEADLINE: Record<string, string> = {
  pending_payment: "Awaiting Payment.",
  paid: "Order Confirmed.",
  processing: "Your Order Is Being Prepared.",
  shipped: "Your Order Is On Its Way.",
  delivered: "Your Order Has Arrived.",
  cancelled: "Order Cancelled.",
};

const STATUS_SUBCOPY: Record<string, string> = {
  pending_payment: "We're waiting to confirm your payment before we begin preparing your order.",
  paid: "Thank you — we've received your order and it now moves to our vendors for preparation.",
  processing: "Your pieces are being pulled, checked, and packed for dispatch.",
  shipped: "A courier has your order and is on the way to your delivery address.",
  delivered: "Your order was delivered. We hope you and your family love it.",
  cancelled: "This order was cancelled. Contact support if you believe this is a mistake.",
};

export default function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { formatPrice } = useLocalization();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const result = await api.orderDetail(orderNumber) as OrderData;
        if (!active) return;
        setOrder(result);
        if (result.status !== "pending_payment" && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch {
        // Keep the tracking page usable if a single status poll fails.
      }
    };
    void load();
    timer = setInterval(() => { void load(); }, 5000);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [orderNumber]);

  async function submitTicket() {
    await api.openSupportTicket(`Return/refund request — ${orderNumber}`, ticketMessage);
    setTicketSent(true);
  }

  if (!order) {
    return (
      <main className="bg-stone-50 min-h-screen flex items-center justify-center">
        <p className="text-stone-400 text-sm">Loading your order…</p>
      </main>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <main className="bg-stone-50 text-espresso font-sans min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold">
            Order #{order.order_number}
          </span>
          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-stone-500 hover:text-espresso transition"
          >
            <Download size={13} strokeWidth={1.6} /> Save Receipt
          </button>
        </div>

        <h1 className="font-editorial text-3xl sm:text-4xl text-espresso mb-2 max-w-xl">
          {STATUS_HEADLINE[order.status] || "Order Update."}
        </h1>
        <p className="text-sm text-stone-500 max-w-lg mb-2">{STATUS_SUBCOPY[order.status]}</p>
        {order.payment_method === "mpesa" && order.status === "pending_payment" && (
          <div className="mb-5 border border-stone-200 bg-white p-4 text-sm text-stone-700">
            <strong className="block mb-1 text-espresso">M-Pesa payment pending</strong>
            If you received an STK Push on your phone, approve it using your M-Pesa PIN. This page checks for Safaricom confirmation automatically. Do not pay again if you already approved the request.
          </div>
        )}
        <p className="text-xs text-stone-400 mb-10">
          Placed {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
        </p>

        {!isCancelled && (
          <div className="flex items-start mb-12">
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center text-center relative">
                  <div className="flex items-center w-full">
                    <div className={`h-px flex-1 ${i === 0 ? "opacity-0" : i <= stepIndex ? "bg-espresso" : "bg-stone-200"}`} />
                    {done ? (
                      <CheckCircle2 size={20} className="text-espresso shrink-0" strokeWidth={1.6} />
                    ) : (
                      <Circle size={20} className="text-stone-300 shrink-0" strokeWidth={1.6} />
                    )}
                    <div className={`h-px flex-1 ${i === STEPS.length - 1 ? "opacity-0" : i < stepIndex ? "bg-espresso" : "bg-stone-200"}`} />
                  </div>
                  <span className={`mt-2 text-[10px] sm:text-[11px] uppercase tracking-wider px-1 ${done ? "text-espresso font-medium" : "text-stone-400"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <LiveDeliveryTracker orderNumber={order.order_number} />

        {/* Order manifest */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200">
            <span className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold">Order Manifest</span>
            <span className="text-[11px] text-stone-400">{order.items.length} Item{order.items.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <Link
                  href={item.product_slug ? `/product/${item.product_slug}` : "#"}
                  className="w-16 h-20 bg-stone-100 rounded-lg overflow-hidden shrink-0"
                >
                  {item.product_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(item.product_image)} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-espresso truncate">{item.product_name}</p>
                  {item.variant_label && (
                    <p className="text-xs text-stone-500 mt-0.5">{item.variant_label}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-0.5">Qty {item.quantity}</p>
                </div>
                <p className="text-sm text-espresso shrink-0">
                  {formatPrice(parseFloat(item.unit_price) * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-stone-200 space-y-2 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Delivery</span>
              <span>{parseFloat(order.shipping_fee) > 0 ? formatPrice(order.shipping_fee) : "Complimentary"}</span>
            </div>
            {parseFloat(order.discount_total) > 0 && (
              <div className="flex justify-between text-stone-500">
                <span>Discount</span>
                <span>–{formatPrice(order.discount_total)}</span>
              </div>
            )}
            {parseFloat(order.member_discount_total) > 0 && (
              <div className="flex justify-between text-stone-500">
                <span>Member Discount</span>
                <span>–{formatPrice(order.member_discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-base pt-3 border-t border-stone-200 text-espresso font-medium">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>

        {/* Delivery details */}
        <section className="mt-10 pt-8 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold mb-2">Delivery Details</p>
            <p className="text-espresso">{order.shipping_name}</p>
            <p className="text-stone-500">{order.shipping_address}, {order.shipping_city}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold mb-2">Payment Method</p>
            <p className="text-espresso capitalize">{order.payment_method}</p>
          </div>
        </section>

        {/* Support */}
        <section className="mt-10 pt-8 border-t border-stone-200">
          {ticketSent ? (
            <p className="text-sm text-stone-500">Your return/refund request has been sent to support — we&apos;ll follow up by email.</p>
          ) : ticketOpen ? (
            <div className="space-y-3 max-w-md">
              <textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Tell us what you'd like to return and why…"
                rows={3}
                className="w-full bg-white border border-stone-300 focus:border-espresso focus:ring-0 rounded-lg px-4 py-3 outline-none text-sm"
              />
              <button
                onClick={submitTicket}
                className="px-6 py-3 bg-espresso text-stone-50 hover:bg-stone-900 text-xs uppercase tracking-widest font-semibold rounded-lg transition"
              >
                Submit Request
              </button>
            </div>
          ) : (
            <button
              onClick={() => setTicketOpen(true)}
              className="border border-stone-300 hover:border-espresso text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded-lg text-espresso transition"
            >
              Request A Return Or Refund
            </button>
          )}
        </section>

        <div className="mt-10 text-center">
          <Link href="/shop" className="text-xs uppercase tracking-widest font-semibold text-stone-500 hover:text-espresso transition">
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
