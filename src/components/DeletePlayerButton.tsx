"use client";

import { useTransition } from "react";
import { deleteUser } from "@/app/admin/actions";

export default function DeletePlayerButton({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Delete ${displayName}? Their account and ALL their games and stats are permanently removed. This cannot be undone.`
          )
        ) {
          startTransition(() => deleteUser(profileId));
        }
      }}
      className="rounded border border-loss/60 px-2.5 py-1.5 text-sm text-loss transition-colors hover:bg-loss hover:text-bg disabled:opacity-50"
    >
      Delete
    </button>
  );
}
