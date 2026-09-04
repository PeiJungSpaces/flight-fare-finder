import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plane } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignIn = mode === "signin";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = isSignIn
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    // Email confirmation is disabled — signUp returns a live session.
    navigate({ to: "/app", replace: true });
  }

  return (
    <div className="hero-glow flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Plane className="size-5 text-primary" aria-hidden />
          Flight Price Notifier
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-[0_0_60px_-20px_var(--glow)]">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignIn ? "登入" : "建立帳號"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignIn ? "Sign in to your account" : "Sign up with email and password"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "…" : isSignIn ? "Sign in / 登入" : "Sign up / 註冊"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignIn ? "還沒有帳號？" : "已經有帳號了？"}{" "}
            <Link
              to={isSignIn ? "/signup" : "/signin"}
              className="font-medium text-primary hover:underline"
            >
              {isSignIn ? "Sign up / 註冊" : "Sign in / 登入"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
