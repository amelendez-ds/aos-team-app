"use client";

import { useState, useTransition } from "react";
import { adjustProficiency } from "@/app/proficiency/actions";

// Disabled while in flight so rapid taps on a phone cannot stack up several
// upserts before the first one lands.
export default function AdjustButton({
  factionId,
  axis,
  delta,
  label,
}: {
  factionId: string;
  axis: "playing" | "against";
  delta: 1 | -1;
  label: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      title={error ?? undefined}
      disabled={pending}
      onClick={() => {
        setError(null);
        startTransition(async () => {
          const res = await adjustProficiency(factionId, axis, delta);
          if (res?.error) setError(res.error);
        });
      }}
      className={`size-7 rounded border text-base leading-none transition-colors disabled:opacity-40 ${
        error
          ? "border-loss/60 text-loss"
          : "border-bronze/60 text-muted hover:border-gold hover:text-gold"
      }`}
    >
      {delta > 0 ? "+" : "−"}
    </button>
  );
}
