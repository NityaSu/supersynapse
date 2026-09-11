"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signError) {
          setError(signError.message);
          return;
        }
        router.replace("/");
        router.refresh();
        return;
      }

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      if (!data.session) {
        setInfo("Check your email to confirm the account, then sign in.");
        setMode("signin");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
      <label className="text-xs font-semibold text-ink-muted">
        Email
        <input
          className="mt-1 w-full rounded-[10px] border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="text-xs font-semibold text-ink-muted">
        Password
        <input
          className="mt-1 w-full rounded-[10px] border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-ink-secondary">{info}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent text-sm text-ink-muted hover:text-ink"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-subtle">
        <Icon name="bolt" size={12} />
        Free to use. Your memories stay private to your account.
      </p>
    </form>
  );
}
