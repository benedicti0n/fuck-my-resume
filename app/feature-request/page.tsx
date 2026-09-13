"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const FEATURE_EMAIL = "subhraneeljobs@gmail.com";

export default function FeatureRequestPage() {
  const { data: session } = authClient.useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submittingDisabled = submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      setSent(true);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit feature request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl leading-tighter font-black tracking-tight">
            Request a feature
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-balance">
            Something&apos;s missing? Tell us exactly what it is and it goes
            straight to{" "}
            <a
              href={`mailto:${FEATURE_EMAIL}`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {FEATURE_EMAIL}
            </a>
            .
          </p>
        </div>

        {session && (
          <p className="mb-6 rounded-2xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
            Submitting as <span className="font-medium text-foreground">{session.user.name}</span>. The request is
            saved to your account.
          </p>
        )}

        {!sent ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-4xl border border-border bg-card p-6 shadow-sm"
            aria-label="Feature request form"
          >
            <div className="mb-4">
              <label
                htmlFor="feature-title"
                className="mb-2 block text-sm leading-none font-medium"
              >
                Title
              </label>
              <Input
                id="feature-title"
                name="title"
                type="text"
                placeholder="e.g. Dark mode for the resume preview"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                disabled={submitting}
                className="h-10"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="feature-description"
                className="mb-2 block text-sm leading-none font-medium"
              >
                What should it do?
              </label>
              <Textarea
                id="feature-description"
                name="description"
                placeholder="Describe the feature, why you want it, and what you'd expect it to look like…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={4000}
                required
                disabled={submitting}
                aria-describedby="feature-description-hint"
              />
              <p
                id="feature-description-hint"
                className="mt-1 text-right text-xs text-muted-foreground tabular-nums"
              >
                {description.length}/4000
              </p>
            </div>

            {error && (
              <p className="mb-3 text-sm text-red-500" role="alert" aria-live="polite">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submittingDisabled} size="lg">
              {submitting ? (
                <>
                  <Spinner className="size-4" /> Sending…
                </>
              ) : (
                "Send feature request"
              )}
            </Button>
          </form>
        ) : (
          <div
            className="rounded-4xl border border-border bg-card p-6 text-center shadow-sm"
            role="status"
            aria-live="polite"
          >
            <h2 className="text-xl leading-tighter font-bold tracking-tight">
              Sent!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground text-balance">
              Your feature request is on its way to{" "}
              <span className="font-medium text-foreground">
                {FEATURE_EMAIL}
              </span>
              . We read every one.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setSent(false)}
              >
                Send another
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}