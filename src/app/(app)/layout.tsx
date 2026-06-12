import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Hides links only; /captain and /admin re-check the role and RLS guards
  // the data.
  let role = "player";
  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "player";
    displayName = profile?.display_name ?? null;
  }
  const isCaptain = role === "captain" || role === "admin";
  const isAdmin = role === "admin";

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-bronze/40 bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <h1 className="text-lg tracking-widest text-gold uppercase sm:text-xl">
              AoS Team App
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/help"
              title="How the app works"
              className="text-sm text-muted underline-offset-2 transition-colors hover:text-gold hover:underline"
            >
              Help
            </Link>
            {displayName && (
              <Link
                href="/settings"
                title="Profile settings"
                className="max-w-32 truncate text-sm text-muted underline-offset-2 transition-colors hover:text-gold hover:underline"
              >
                {displayName}
              </Link>
            )}
            <form action={signOut}>
              <button className="rounded border border-bronze/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold hover:text-text">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto mt-2 flex max-w-3xl flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/" className="text-muted transition-colors hover:text-gold">
            Home
          </Link>
          <Link
            href="/games"
            className="text-muted transition-colors hover:text-gold"
          >
            My Games
          </Link>
          <Link
            href="/proficiency"
            className="text-muted transition-colors hover:text-gold"
          >
            Proficiency
          </Link>
          <Link
            href="/team"
            className="text-muted transition-colors hover:text-gold"
          >
            Team
          </Link>
          <Link
            href="/events"
            className="text-muted transition-colors hover:text-gold"
          >
            Events
          </Link>
          <Link
            href="/games/new"
            className="text-muted transition-colors hover:text-gold"
          >
            Log a Game
          </Link>
          {isCaptain && (
            <Link
              href="/captain"
              className="text-muted transition-colors hover:text-gold"
            >
              Captain
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="text-muted transition-colors hover:text-gold"
            >
              Admin
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="px-4 py-4 text-center text-xs text-muted">
        Private team tool. No Games Workshop assets; all trademarks belong to
        their owners.
      </footer>
    </div>
  );
}
