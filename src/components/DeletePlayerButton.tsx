"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "@/app/admin/actions";

export default function DeletePlayerButton({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              `Delete ${displayName}? Their account and ALL their games and stats are permanently removed. This cannot be undone.`,
            )
          ) {
            setError(null);
            startTransition(async () => {
              const res = await deleteUser(profileId);
              if (res?.error) setError(res.error);
            });
          }
        }}
        className="rounded border border-loss/60 px-2.5 py-1.5 text-sm text-loss transition-colors hover:bg-loss hover:text-bg disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-loss">{error}</p>}
    </span>
  );
}
