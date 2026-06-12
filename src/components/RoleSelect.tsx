"use client";

import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={pending}
      aria-label={`Role for ${displayName}`}
      onChange={(e) => {
        const next = e.target.value;
        if (!confirm(`Change ${displayName}'s role to ${next}?`)) {
          e.target.value = role;
          return;
        }
        startTransition(() => updateRole(profileId, next));
      }}
      className="rounded border border-bronze/40 bg-bg px-2 py-1.5 text-sm text-text capitalize outline-none focus:border-gold disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
