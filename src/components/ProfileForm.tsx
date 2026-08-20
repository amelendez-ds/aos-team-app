"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/settings/actions";
import { NO_ERROR } from "@/lib/actions";

type Faction = { id: string; name: string; grand_alliance: string };

const ALLIANCES = ["Order", "Chaos", "Death", "Destruction"];

const inputClass =
  "rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold";

export default function ProfileForm({
  factions,
  displayName,
  primaryFactionId,
}: {
  factions: Faction[];
  displayName: string;
  primaryFactionId: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, NO_ERROR);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Display name
        <input
          type="text"
          name="display_name"
          required
          maxLength={40}
          defaultValue={displayName}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Main army <span className="text-xs">(shown on your profile)</span>
        <select
          name="primary_faction_id"
          defaultValue={primaryFactionId}
          className={inputClass}
        >
          <option value="">— none —</option>
          {ALLIANCES.map((alliance) => (
            <optgroup key={alliance} label={alliance}>
              {factions
                .filter((f) => f.grand_alliance === alliance)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>

      {state.error && (
        <p aria-live="polite" className="text-sm text-loss">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
