import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { count: gameCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single(),
    supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-hidden
        className="mx-auto h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <h2 className="text-lg tracking-wide text-gold">
          Well met, {profile?.display_name ?? "warrior"}
        </h2>
        <p className="mt-1 text-sm text-muted capitalize">
          Rank: {profile?.role ?? "player"}
        </p>
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <h3 className="text-base tracking-wide text-gold">Battle Ledger</h3>
        <p className="mt-2 text-text">
          {gameCount
            ? `${gameCount} game${gameCount === 1 ? "" : "s"} recorded.`
            : "No games recorded yet — chronicle your first battle."}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/games/new"
            className="rounded border border-gold/60 px-4 py-2 text-center font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
          >
            Log a Game
          </Link>
          <Link
            href="/games"
            className="rounded border border-bronze/60 px-4 py-2 text-center text-text transition-colors hover:border-gold"
          >
            My Games
          </Link>
          <Link
            href="/proficiency"
            className="rounded border border-bronze/60 px-4 py-2 text-center text-text transition-colors hover:border-gold"
          >
            Proficiency
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <h3 className="text-base tracking-wide text-gold">Coming soon</h3>
        <p className="mt-2 text-sm text-muted">
          Team statistics, the captain&apos;s pairing helper, and the damage
          calculator.
        </p>
      </section>
    </div>
  );
}
