"use client";

import { deleteGame } from "@/app/games/actions";

export default function DeleteGameButton({ gameId }: { gameId: string }) {
  return (
    <form
      action={deleteGame.bind(null, gameId)}
      onSubmit={(e) => {
        if (!confirm("Delete this game? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button className="text-sm text-loss underline-offset-2 transition-colors hover:underline">
        Delete
      </button>
    </form>
  );
}
