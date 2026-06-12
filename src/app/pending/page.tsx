import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Holding page for unapproved accounts. The proxy routes pending users
// here and keeps active users out; the guards below are the backstop.
export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "pending") redirect("/");

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-lg border border-bronze/40 bg-surface p-8 text-center shadow-lg">
        <div
          aria-hidden
          className="mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-gold to-transparent"
        />
        <h1 className="mt-6 font-display text-xl tracking-wide text-gold">
          The Gates Are Watched
        </h1>
        <p className="mt-4 text-text">
          Your account is awaiting approval from the team admin. You will be
          notified when approved.
        </p>
        <form action={signOut} className="mt-6">
          <button className="rounded border border-bronze/60 px-4 py-2 text-sm text-muted transition-colors hover:border-gold hover:text-text">
            Sign out
          </button>
        </form>
        <div
          aria-hidden
          className="mx-auto mt-6 h-px w-2/3 bg-gradient-to-r from-transparent via-bronze to-transparent"
        />
      </section>
    </main>
  );
}
