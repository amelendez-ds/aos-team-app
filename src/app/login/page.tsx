"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      setNotice("Check your email to confirm your account, then sign in.");
    }
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl tracking-widest text-gold uppercase sm:text-3xl">
        AoS Team App
      </h1>
      <div
        aria-hidden
        className="mt-4 mb-8 h-px w-2/3 max-w-xs bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <section className="w-full max-w-sm rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg">
        <h2 className="text-lg tracking-wide text-gold">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold"
            />
          </label>

          {error && <p className="text-sm text-loss">{error}</p>}
          {notice && <p className="text-sm text-win">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-bronze/40" />
          or
          <span className="h-px flex-1 bg-bronze/40" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded border border-bronze/60 bg-bg px-4 py-2 text-text transition-colors hover:border-gold"
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                className="text-gold underline"
                onClick={() => setMode("signup")}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already enlisted?{" "}
              <button
                className="text-gold underline"
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
