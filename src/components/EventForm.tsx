type InitialEvent = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  format: string | null;
  notes: string | null;
};

const inputClass =
  "rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold";

export default function EventForm({
  initial,
  action,
  submitLabel,
}: {
  initial?: Partial<InitialEvent>;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Event name
        <input
          type="text"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Start date <span className="text-xs">(optional)</span>
          <input
            type="date"
            name="start_date"
            defaultValue={initial?.start_date ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          End date <span className="text-xs">(optional)</span>
          <input
            type="date"
            name="end_date"
            defaultValue={initial?.end_date ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Location <span className="text-xs">(optional)</span>
        <input
          type="text"
          name="location"
          defaultValue={initial?.location ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Format <span className="text-xs">(optional, e.g. Teams of 6, 2000pts)</span>
        <input
          type="text"
          name="format"
          defaultValue={initial?.format ?? ""}
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

      <button
        type="submit"
        className="mt-2 rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
      >
        {submitLabel}
      </button>
    </form>
  );
}
