"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/captain/actions";

function confirmMessage(
  eventName: string,
  pairingCount: number,
  gameCount: number,
) {
  const lost = ["its opponent teams", "lineup", "player preference rankings"];
  if (pairingCount > 0) {
    lost.push(
      `${pairingCount} recorded pairing${pairingCount === 1 ? "" : "s"}`,
    );
  }
  const parts = [
    `Delete "${eventName}"? Permanently removes ${lost
      .slice(0, -1)
      .join(", ")} and ${lost[lost.length - 1]}.`,
  ];
  if (gameCount > 0) {
    parts.push(
      gameCount === 1
        ? "1 logged game stays but loses its event tag."
        : `${gameCount} logged games stay but lose their event tag.`,
    );
  }
  parts.push("This cannot be undone.");
  return parts.join(" ");
}

export default function DeleteEventButton({
  eventId,
  eventName,
  pairingCount,
  gameCount,
  variant = "link",
}: {
  eventId: string;
  eventName: string;
  pairingCount: number;
  gameCount: number;
  variant?: "link" | "button";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(confirmMessage(eventName, pairingCount, gameCount))) {
            setError(null);
            startTransition(async () => {
              const res = await deleteEvent(eventId);
              if (res?.error) setError(res.error);
            });
          }
        }}
        className={
          variant === "button"
            ? "rounded border border-loss/60 px-3 py-2 text-sm text-loss transition-colors hover:bg-loss hover:text-bg disabled:opacity-50"
            : "text-sm text-loss underline-offset-2 transition-colors hover:underline disabled:opacity-50"
        }
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-loss">{error}</p>}
    </span>
  );
}
