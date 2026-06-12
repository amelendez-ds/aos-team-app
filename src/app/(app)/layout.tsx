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

  // Hides the link only; /admin itself re-checks the role and RLS guards
  // the data.
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

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
          <form action={signOut}>
            <button className="rounded border border-bronze/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold hover:text-text">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto mt-2 flex max-w-3xl gap-4 text-sm">
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
            href="/games/new"
            className="text-muted transition-colors hover:text-gold"
          >
            Log a Game
          </Link>
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
