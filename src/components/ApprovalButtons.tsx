"use client";

import { useTransition } from "react";
import { approveUser, rejectUser } from "@/app/admin/actions";

export default function ApprovalButtons({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => approveUser(profileId))}
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
            startTransition(() => rejectUser(profileId));
          }
        }}
        className="rounded border border-loss/60 px-3 py-1.5 text-sm text-loss transition-colors hover:bg-loss hover:text-bg disabled:opacity-50"
      >
        Reject
      </button>
    </span>
  );
}
