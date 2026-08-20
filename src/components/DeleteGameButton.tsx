"use client";

import { useState, useTransition } from "react";
import { deleteGame } from "@/app/games/actions";

export default function DeleteGameButton({ gameId }: { gameId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this game? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteGame(gameId);
            if (res?.error) setError(res.error);
          });
        }}
        className="text-sm text-loss underline-offset-2 transition-colors hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
