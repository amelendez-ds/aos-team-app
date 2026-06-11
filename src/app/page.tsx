export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-bronze/40 bg-surface px-4 py-4">
        <h1 className="text-center text-2xl tracking-widest text-gold uppercase sm:text-3xl">
          AoS Team App
        </h1>
      </header>

      <div
        aria-hidden
        className="mx-auto mt-8 h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
          <h2 className="text-lg tracking-wide text-gold">The Muster Grounds</h2>
          <p className="mt-3 text-text">
            The team&apos;s tools will assemble here: game logging, proficiency
            tracking, team statistics, and the damage calculator.
          </p>
          <p className="mt-3 text-sm text-muted">
            Skeleton build — modules arriving soon.
          </p>
        </section>
      </main>

      <footer className="px-4 py-4 text-center text-xs text-muted">
        Private team tool. No Games Workshop assets; all trademarks belong to
        their owners.
      </footer>
    </div>
  );
}
