"use client";

import { useState, useTransition } from "react";
import { approveUser, rejectUser } from "@/app/admin/actions";

export default function ApprovalButtons({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(act: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await act();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveUser(profileId))}
          className="rounded border border-win/60 px-3 py-1.5 text-sm text-win transition-colors hover:bg-win hover:text-bg disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                `Reject ${displayName}? Their account is permanently deleted.`
              )
            ) {
              run(() => rejectUser(profileId));
            }
          }}
          className="rounded border border-loss/60 px-3 py-1.5 text-sm text-loss transition-colors hover:bg-loss hover:text-bg disabled:opacity-50"
        >
          Reject
        </button>
      </span>
      {error && <p className="text-xs text-loss">{error}</p>}
    </span>
  );
}
