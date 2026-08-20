"use client";

import Link from "next/link";

// Safety net for unexpected failures. Expected problems (validation, refused
// permissions) are returned by the actions and shown inline on each form —
// anything reaching here is a genuine bug. The message is deliberately not
// rendered: in production Next replaces it with an opaque placeholder.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-loss/40 bg-surface p-6 text-center shadow-lg">
      <h2 className="text-xl tracking-wide text-gold">Something went wrong</h2>
      <p className="mt-3 text-sm text-muted">
        That action could not be completed. Try again — if it keeps happening,
        let the team admin know.
      </p>

      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded border border-bronze/60 px-4 py-2 text-sm text-muted transition-colors hover:border-gold hover:text-text"
        >
          Back to Dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-4 text-xs text-muted">Reference: {error.digest}</p>
      )}
    </section>
  );
}
