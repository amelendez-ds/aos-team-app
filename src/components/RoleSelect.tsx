"use client";

import { useState, useTransition } from "react";
import { updateRole, type Role } from "@/app/admin/actions";

const ROLES: Role[] = ["player", "captain", "admin"];

export default function RoleSelect({
  profileId,
  displayName,
  role,
}: {
  profileId: string;
  displayName: string;
  role: Role;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex flex-col items-end gap-1">
      <select
        defaultValue={role}
        disabled={pending}
        aria-label={`Role for ${displayName}`}
        onChange={(e) => {
          const select = e.currentTarget;
          const next = select.value;
          if (!confirm(`Change ${displayName}'s role to ${next}?`)) {
            select.value = role;
            return;
          }
          setError(null);
          startTransition(async () => {
            const res = await updateRole(profileId, next);
            // Snap back so the dropdown never shows a role that didn't stick.
            if (res?.error) {
              setError(res.error);
              select.value = role;
            }
          });
        }}
        className="rounded border border-bronze/40 bg-bg px-2 py-1.5 text-sm text-text capitalize outline-none focus:border-gold disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-loss">{error}</p>}
    </span>
  );
}
