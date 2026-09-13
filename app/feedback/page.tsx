"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { FaStar } from "react-icons/fa";
import { authClient } from "@/lib/auth-client";

interface FeedbackItem {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  stars: number;
  comment: string;
  createdAt: string;
}

interface FeedbackData {
  items: FeedbackItem[];
  viewerId: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function StarRating({
  value,
  onChange,
  labelId,
}: {
  value: number;
  onChange: (v: number) => void;
  labelId?: string;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Rating"
      aria-labelledby={labelId}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <FaStar
            className={`size-6 ${
              star <= value ? "text-yellow-400" : "text-muted"
            }`}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/feedback", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load feedback");
    const json: FeedbackData = await res.json();
    return json;
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((json) => {
        if (cancelled) return;
        setItems(json.items);
        setViewerId(json.viewerId);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load feedback");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!stars) {
      setSubmitError("Pick a star rating");
      return;
    }
    if (!comment.trim()) {
      setSubmitError("Write a short comment");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit feedback");
      setSubmitSuccess(true);
      setStars(0);
      setComment("");
      const fresh = await load();
      setItems(fresh.items);
      setViewerId(fresh.viewerId);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit feedback"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const avg =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.stars, 0) / items.length
      : null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl leading-tighter font-black tracking-tight">
            Feedback
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-balance">
            What&apos;s working, what sucks, what&apos;s missing. Drop your
            experience below — it&apos;s read by a human.
          </p>
        </div>

        {!session && (
          <div
            className="mb-8 rounded-2xl border border-border bg-card p-5 text-sm"
            role="status"
            aria-live="polite"
          >
            Sign in to leave feedback. You can still read what others have
            shared below.
          </div>
        )}

        {session && (
          <form
            onSubmit={handleSubmit}
            className="mb-10 rounded-4xl border border-border bg-card p-6 shadow-sm"
            aria-label="Leave feedback"
          >
            <div className="mb-4">
              <label id="rating-label" className="mb-2 block text-sm font-medium">
                Your rating
              </label>
              <StarRating value={stars} onChange={setStars} labelId="rating-label" />
            </div>
            <div className="mb-4">
              <Label htmlFor="feedback-comment">Your experience</Label>
              <Textarea
                id="feedback-comment"
                name="comment"
                placeholder="Tell us what you loved or hated…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                aria-describedby="feedback-comment-hint"
              />
              <p
                id="feedback-comment-hint"
                className="mt-1 text-right text-xs text-muted-foreground tabular-nums"
              >
                {comment.length}/2000
              </p>
            </div>

            {submitError && (
              <p
                className="mb-3 text-sm text-red-500"
                role="alert"
                aria-live="polite"
              >
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p
                className="mb-3 text-sm text-green-600"
                role="status"
                aria-live="polite"
              >
                Thanks! Your feedback is now live below.
              </p>
            )}

            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? (
                <>
                  <Spinner className="size-4" /> Submitting…
                </>
              ) : (
                "Share feedback"
              )}
            </Button>
          </form>
        )}

        {avg !== null && (
          <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {avg.toFixed(1)}
            </span>
            <span className="flex items-center gap-0.5" aria-hidden="true">
              <FaStar className="size-4 text-yellow-400" />
            </span>
            <span>
              from {items.length} review{items.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-500">
            Couldn&apos;t load feedback. {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-4xl border border-dashed bg-card p-12 text-center">
            <p className="text-muted-foreground">No feedback yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to share your experience.
            </p>
          </div>
        ) : (
          <ul className="space-y-4" aria-live="polite">
            {items.map((item) => {
              const isViewer = item.userId === viewerId;
              return (
                <li
                  key={item.id}
                  className={`rounded-4xl border bg-card p-5 shadow-sm ${
                    isViewer ? "ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name ?? "User"}
                        width={32}
                        height={32}
                        className="size-8 rounded-full"
                      />
                    ) : (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold">
                        {initials(item.name ?? "U")}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name ?? "Someone"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`${item.stars} out of 5 stars`}
                    >
                      {Array.from({ length: item.stars }).map((_, i) => (
                        <FaStar
                          key={i}
                          className="size-3.5 text-yellow-400"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {item.comment}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm leading-none font-medium"
    >
      {children}
    </label>
  );
}