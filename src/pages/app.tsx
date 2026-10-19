import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Check, Loader2, Plane, PlaneTakeoff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";

const API_BASE =
  (import.meta.env["VITE_FLIGHT_API"] as string | undefined) ??
  "https://9et2w490q4.execute-api.us-east-1.amazonaws.com";

type PlanName = "tokyo" | "seoul";

const PLANS: { name: PlanName; label: string; route: string; hint: number }[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 7789 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 6846 },
];

type Subscription = { route: string; plan_name: PlanName; target_price: number };

function fmt(n: number) {
  return `NT$${Math.round(n).toLocaleString("en-US")}`;
}

function PlanCard({
  plan,
  email,
  current,
  onSaved,
}: {
  plan: (typeof PLANS)[number];
  email: string | undefined;
  current: Subscription | undefined;
  onSaved: (s: Subscription) => void;
}) {
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const subscribed = !!current && !editing;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const target = Number(price);
    if (!Number.isFinite(target) || target <= 0) {
      setError("請輸入大於 0 的金額");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, plan_name: plan.name, target_price: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onSaved(data.subscription as Subscription);
      setEditing(false);
      setPrice("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cloud-shadow rounded-2xl border border-white/60 bg-card p-6 text-left backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{plan.label}</h2>
        {subscribed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Check className="size-3.5" aria-hidden />
            已訂閱
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        近期最低價約 {fmt(plan.hint)}（下個月出發）
      </p>

      {subscribed ? (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">目前目標價</p>
          <p className="text-2xl font-bold tracking-tight">{fmt(current.target_price)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            票價低於目標價時，我們會寄信到 {email}
          </p>
          <button
            onClick={() => {
              setPrice(String(current.target_price));
              setEditing(true);
            }}
            className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            更新目標價
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium" htmlFor={`target-${plan.name}`}>
            目標價（新台幣）
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">NT$</span>
            <input
              id={`target-${plan.name}`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={String(Math.round(plan.hint * 1.1))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !email}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {current ? "儲存目標價" : "開始追蹤"}
            </button>
            {current && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                取消
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export function AppPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loaded } = useAuthUser();
  const email = user?.email ?? undefined;
  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data: { subscriptions?: Subscription[] }) => {
        if (cancelled) return;
        const map: Record<string, Subscription> = {};
        for (const s of data.subscriptions ?? []) map[s.route] = s;
        setSubs(map);
      })
      .catch(() => !cancelled && setLoadError("無法載入你的訂閱，請重新整理"));
    return () => {
      cancelled = true;
    };
  }, [email]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="hero-glow flex min-h-screen flex-col">
      <title>App — Flight Price Notifier</title>
      <meta name="robots" content="noindex" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Plane className="size-5 text-primary" aria-hidden />
          Flight Price Notifier
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary"
        >
          Sign out / 登出
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-accent p-3">
            <PlaneTakeoff className="size-7 text-primary" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hi {loaded ? (email ?? "…") : "…"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            選一條航線、設定目標價，票價低於目標時我們會寄信通知你。每 30 分鐘檢查一次。
          </p>
          {loadError && <p className="mt-2 text-xs text-destructive">{loadError}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              email={email}
              current={subs[plan.route]}
              onSaved={(s) => setSubs((prev) => ({ ...prev, [s.route]: s }))}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
