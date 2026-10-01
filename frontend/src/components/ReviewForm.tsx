"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

export default function ReviewForm({ productId, onSubmitted }: { productId: number | string; onSubmitted?: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!isLoggedIn()) {
    return (
      <p className="text-sm text-neutral-500">
        <a href="/login" className="underline font-semibold">Sign in</a> to leave a review.
      </p>
    );
  }

  if (done) return <p className="text-sm text-neutral-600">Thanks — your review was submitted.</p>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.addReview(productId, rating, comment);
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Couldn't submit your review — you may have already reviewed this product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star size={20} className={n <= rating ? "fill-[var(--color-signal)] text-[var(--color-signal)]" : "text-neutral-300"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product…"
        rows={3}
        className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none text-sm"
      />
      {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
      <button
        disabled={saving}
        className="btn btn-ink btn-sm"
      >
        {saving ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
