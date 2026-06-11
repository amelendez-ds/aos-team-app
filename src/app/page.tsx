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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-bronze/40 bg-surface px-4 py-4">
        <h1 className="text-xl tracking-widest text-gold uppercase sm:text-2xl">
          AoS Team App
        </h1>
        <form action={signOut}>
          <button className="rounded border border-bronze/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold hover:text-text">
            Sign out
          </button>
        </form>
      </header>

      <div
        aria-hidden
        className="mx-auto mt-8 h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
          <h2 className="text-lg tracking-wide text-gold">
            Well met, {profile?.display_name ?? "warrior"}
          </h2>
          <p className="mt-1 text-sm text-muted capitalize">
            Rank: {profile?.role ?? "player"}
          </p>
          <p className="mt-4 text-text">
            The team&apos;s tools will assemble here: game logging, proficiency
            tracking, team statistics, and the damage calculator.
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
