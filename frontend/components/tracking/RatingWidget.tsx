"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/state/store";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Rating } from "@/lib/types";

interface RatingStats {
  productId: string;
  averageRating: number;
  totalRatings: number;
  recentRatings: Rating[];
}

interface RatingWidgetProps {
  productId: string;
}

export function RatingWidget({ productId }: RatingWidgetProps) {
  const { walletAddress } = useStore();
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [productId]);

  async function fetchRatings() {
    try {
      const res = await fetch(`/api/ratings?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch ratings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitRating() {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (stars === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      const message = `Rate ${productId}`;
      
      // Create a minimal transaction to sign for verification
      const {
        TransactionBuilder,
        BASE_FEE,
        Account,
        Memo,
      } = await import("@stellar/stellar-sdk");
      const { signTransaction } = await import("@stellar/freighter-api");

      // Create test account (sequence doesn't matter for signing)
      const account = new Account(walletAddress, "0");

      // Build transaction with message in memo
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: "Test SDF Network ; September 2015",
      })
        .addMemo(Memo.text(message.slice(0, 28)))
        .setTimeout(300)
        .build();

      const txXdr = tx.toEnvelope().toXDR("base64");

      // Sign with Freighter
      const signedResult = await signTransaction(txXdr);

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          walletAddress,
          stars,
          comment: comment || undefined,
          message,
          signature: signedResult.signedTxXdr,
        }),
      });

      if (res.ok) {
        toast.success("Rating submitted successfully");
        setStars(0);
        setComment("");
        await fetchRatings();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Rating submission error:", error);
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
        <div className="h-20 bg-[var(--muted-bg)] rounded animate-pulse" />
      </div>
    );
  }

  const displayRating = stats?.averageRating || 0;

  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
      {/* Stats */}
      <div className="mb-6">
        <div className="flex items-end gap-2 mb-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                className={
                  i < Math.round(displayRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 dark:text-gray-600"
                }
              />
            ))}
          </div>
          <span className="text-lg font-semibold text-[var(--foreground)]">
            {displayRating.toFixed(1)}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {stats?.totalRatings || 0} {stats?.totalRatings === 1 ? "rating" : "ratings"}
        </p>
      </div>

      {/* Recent comments */}
      {stats && stats.recentRatings.length > 0 && (
        <div className="mb-6 space-y-3 border-t border-[var(--card-border)] pt-4">
          {stats.recentRatings.map((rating) => (
            <div key={rating.id}>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < rating.stars
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }
                    />
                  ))}
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {rating.walletAddress.slice(0, 8)}...
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(rating.timestamp).toLocaleDateString()}
                </span>
              </div>
              {rating.comment && (
                <p className="text-sm text-[var(--foreground)] ml-1">
                  {rating.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit rating form */}
      {walletAddress && (
        <div className="border-t border-[var(--card-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Leave a rating
          </h3>

          {/* Star selector */}
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStars(i + 1)}
                onMouseEnter={() => setHoveredStar(i + 1)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 transition-colors"
              >
                <Star
                  size={24}
                  className={
                    i < (hoveredStar || stars)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }
                />
              </button>
            ))}
          </div>

          {/* Comment input */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Add a comment (optional, max 500 chars)"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
            rows={3}
          />

          <div className="text-xs text-[var(--muted)] mb-3">
            {comment.length}/500
          </div>

          <Button
            onClick={submitRating}
            disabled={submitting || stars === 0}
            className="w-full"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      )}

      {!walletAddress && (
        <div className="border-t border-[var(--card-border)] pt-4 text-center">
          <p className="text-sm text-[var(--muted)]">
            Connect your wallet to leave a rating
          </p>
        </div>
      )}
    </div>
  );
}
