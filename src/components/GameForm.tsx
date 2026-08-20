"use client";

import { useActionState, useState } from "react";
import { NO_ERROR, type FormState } from "@/lib/actions";

type Faction = { id: string; name: string; grand_alliance: string };
type EventOption = { id: string; name: string };

type InitialGame = {
  player_faction_id: string;
  opponent_faction_id: string;
  result: "win" | "loss" | "draw";
  score_self: number | null;
  score_opp: number | null;
  battle_tactics_self: number | null;
  battle_tactics_opp: number | null;
  event_id: string | null;
  played_on: string;
  notes: string | null;
};

const ALLIANCES = ["Order", "Chaos", "Death", "Destruction"];

const inputClass =
  "rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold";

function FactionSelect({
  name,
  label,
  factions,
  defaultValue,
}: {
  name: string;
  label: string;
  factions: Faction[];
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <select
        name={name}
        required
        defaultValue={defaultValue ?? ""}
        className={inputClass}
      >
        <option value="" disabled>
          Choose a faction…
        </option>
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
  );
}

export default function GameForm({
  factions,
  events,
  initial,
  action,
  submitLabel,
}: {
  factions: Faction[];
  events: EventOption[];
  initial?: Partial<InitialGame>;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [state, formAction, pending] = useActionState(action, NO_ERROR);

  const resultOptions = [
    { value: "win", label: "Win", checked: "has-checked:border-win has-checked:text-win" },
    { value: "draw", label: "Draw", checked: "has-checked:border-gold has-checked:text-gold" },
    { value: "loss", label: "Loss", checked: "has-checked:border-loss has-checked:text-loss" },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FactionSelect
        name="player_faction_id"
        label="Your faction"
        factions={factions}
        defaultValue={initial?.player_faction_id}
      />
      <FactionSelect
        name="opponent_faction_id"
        label="Opponent faction"
        factions={factions}
        defaultValue={initial?.opponent_faction_id}
      />

      <fieldset className="flex flex-col gap-1 text-sm text-muted">
        <legend className="mb-1">Result</legend>
        <div className="grid grid-cols-3 gap-2">
          {resultOptions.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded border border-bronze/40 px-3 py-2 text-center text-base text-muted transition-colors ${opt.checked}`}
            >
              <input
                type="radio"
                name="result"
                value={opt.value}
                required
                defaultChecked={initial?.result === opt.value}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Your score <span className="text-xs">(optional)</span>
          <input
            type="number"
            name="score_self"
            min={0}
            inputMode="numeric"
            defaultValue={initial?.score_self ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Opponent score <span className="text-xs">(optional)</span>
          <input
            type="number"
            name="score_opp"
            min={0}
            inputMode="numeric"
            defaultValue={initial?.score_opp ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Battle tactics (you) <span className="text-xs">(optional)</span>
          <input
            type="number"
            name="battle_tactics_self"
            min={0}
            inputMode="numeric"
            defaultValue={initial?.battle_tactics_self ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Battle tactics (opponent) <span className="text-xs">(optional)</span>
          <input
            type="number"
            name="battle_tactics_opp"
            min={0}
            inputMode="numeric"
            defaultValue={initial?.battle_tactics_opp ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Event <span className="text-xs">(optional)</span>
        <select
          name="event_id"
          defaultValue={initial?.event_id ?? ""}
          className={inputClass}
        >
          <option value="">— none —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Date played
        <input
          type="date"
          name="played_on"
          required
          defaultValue={initial?.played_on ?? today}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Notes <span className="text-xs">(optional)</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className={inputClass}
        />
      </label>

      {state.error && (
        <p aria-live="polite" className="text-sm text-loss">
          {state.error}
        </p>
      )}

      {/* Disabled while in flight: a repeated tap on a slow connection used to
          log the same game several times. */}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
