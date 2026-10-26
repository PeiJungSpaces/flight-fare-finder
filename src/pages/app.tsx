import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertCircle, Check, Clock, Loader2, Plane, PlaneTakeoff, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";

const API_BASE =
  (import.meta.env["VITE_FLIGHT_API"] as string | undefined) ??
  "https://9et2w490q4.execute-api.us-east-1.amazonaws.com";

const MONTHLY_FEE = 300;

type PlanName = "tokyo" | "seoul";
type Status = "pending_payment" | "active" | "cancelled" | "expired";

const PLANS: { name: PlanName; label: string; route: string; hint: number }[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 7789 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 6846 },
];

type Subscription = {
  route: string;
  plan_name: PlanName;
  target_price: number;
  subscription_status?: Status;
  current_period_end?: string;
  current_period_end_date?: string;
};

function fmt(n: number) {
  return `NT$${Math.round(n).toLocaleString("en-US")}`;
}

/** Legacy M1 rows have no status: treat them as unpaid so the user can self-migrate by paying. */
function statusOf(s: Subscription | undefined): Status | undefined {
  if (!s) return undefined;
  const st = s.subscription_status ?? "pending_payment";
  if (
    st === "cancelled" &&
    s.current_period_end &&
    s.current_period_end < new Date().toISOString()
  ) {
    return "expired";
  }
  return st;
}

/**
 * POST /subscribe. The Lambda answers either:
 *  - text/html  → an auto-submit ECPay checkout form: hand the whole page to it (leaves the SPA)
 *  - application/json → an in-place update (paid / in-grace user changed their target price)
 */
async function postSubscribe(email: string, plan: PlanName, target: number) {
  const res = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, plan_name: plan, target_price: target }),
  });
  const ctype = res.headers.get("content-type") ?? "";
  if (res.ok && ctype.includes("text/html")) {
    const html = await res.text();
    document.open();
    document.write(html);
    document.close();
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data.subscription as Subscription;
}

function StatusBadge({ status, until }: { status: Status; until?: string | undefined }) {
  const map: Record<Status, { text: string; cls: string; Icon: typeof Check }> = {
    active: { text: "已訂閱（有效）", cls: "bg-primary/10 text-primary", Icon: Check },
    pending_payment: { text: "未完成付款", cls: "bg-amber-100 text-amber-800", Icon: AlertCircle },
    cancelled: {
      text: `已取消 · 有效至 ${until ?? ""}`,
      cls: "bg-slate-100 text-slate-700",
      Icon: Clock,
    },
    expired: { text: "已結束", cls: "bg-slate-100 text-slate-500", Icon: X },
  };
  const { text, cls, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {text}
    </span>
  );
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
  const [busy, setBusy] = useState<null | "save" | "pay" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const status = statusOf(current);
  // paid (or paid-through) users keep their watch; target edits are in place
  const live = status === "active" || status === "cancelled";
  const showSummary = !!current && !editing && status !== "expired";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const target = Number(price);
    if (!Number.isFinite(target) || target <= 0) {
      setError("請輸入大於 0 的金額");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const saved = await postSubscribe(email, plan.name, target);
      if (saved) {
        onSaved(saved);
        setEditing(false);
        setPrice("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請稍後再試");
    } finally {
      setBusy(null);
    }
  }

  async function payNow() {
    if (!email || !current) return;
    setBusy("pay");
    setError(null);
    try {
      await postSubscribe(email, plan.name, current.target_price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法前往付款，請稍後再試");
      setBusy(null);
    }
  }

  async function cancel() {
    if (!email || !current) return;
    if (!window.confirm("確定要取消訂閱嗎？之後不會再扣款，已付費的期間仍會繼續通知。")) return;
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, route: plan.route }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onSaved(data.subscription as Subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消失敗，請稍後再試");
    } finally {
      setBusy(null);
    }
  }

  const submitLabel = live ? "儲存目標價" : `訂閱並付款（${fmt(MONTHLY_FEE)}/月）`;

  return (
    <div className="cloud-shadow rounded-2xl border border-white/60 bg-card p-6 text-left backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{plan.label}</h2>
        {status && <StatusBadge status={status} until={current?.current_period_end_date} />}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        近期最低價約 {fmt(plan.hint)}（下個月出發）· 月費 {fmt(MONTHLY_FEE)}
      </p>

      {showSummary ? (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">目前目標價</p>
          <p className="text-2xl font-bold tracking-tight">{fmt(current.target_price)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {status === "active" && <>票價低於目標價時，我們會寄信到 {email}</>}
            {status === "cancelled" && (
              <>已取消續訂，{current.current_period_end_date} 前仍會繼續通知你</>
            )}
            {status === "pending_payment" && <>完成付款後才會開始寄送降價通知</>}
          </p>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {status === "pending_payment" && (
              <button
                onClick={payNow}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {busy === "pay" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                完成付款 / Pay
              </button>
            )}
            <button
              onClick={() => {
                setPrice(String(current.target_price));
                setEditing(true);
              }}
              disabled={!!busy}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              更新目標價
            </button>
            {status === "active" && (
              <button
                onClick={cancel}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
              >
                {busy === "cancel" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                取消訂閱
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          {status === "expired" && (
            <p className="text-xs text-muted-foreground">訂閱已結束，重新訂閱即可恢復通知。</p>
          )}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!!busy || !email}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy === "save" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {status === "expired" ? `重新訂閱（${fmt(MONTHLY_FEE)}/月）` : submitLabel}
            </button>
            {current && editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                取消
              </button>
            )}
          </div>
          {!live && (
            <p className="text-xs text-muted-foreground">
              將前往綠界 ECPay 以信用卡定期定額付款，每月自動扣款，可隨時取消。
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export function AppPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const purchase = params.get("purchase");
  const { user, loaded } = useAuthUser();
  const email = user?.email ?? undefined;
  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    const load = () =>
      fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then((data: { subscriptions?: Subscription[] }) => {
          if (cancelled) return;
          const map: Record<string, Subscription> = {};
          for (const s of data.subscriptions ?? []) map[s.route] = s;
          setSubs(map);
        })
        .catch(() => !cancelled && setLoadError("無法載入你的訂閱，請重新整理"));
    load();
    // right after paying, the ECPay ReturnURL callback may land a few seconds after the browser does
    const retry = purchase === "success" ? window.setTimeout(load, 4000) : undefined;
    return () => {
      cancelled = true;
      if (retry) window.clearTimeout(retry);
    };
  }, [email, purchase]);

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
        {purchase && (
          <div
            className={`mb-6 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              purchase === "success"
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-destructive/30 bg-destructive/10 text-foreground"
            }`}
          >
            <span>
              {purchase === "success"
                ? "付款完成，訂閱已啟用！我們也寄了一封確認信給你。"
                : "付款未完成，你可以在下方點「完成付款」再試一次。"}
            </span>
            <button
              onClick={() => setParams({}, { replace: true })}
              aria-label="關閉"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-accent p-3">
            <PlaneTakeoff className="size-7 text-primary" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hi {loaded ? (email ?? "…") : "…"}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            選一條航線、設定目標價並訂閱（{fmt(MONTHLY_FEE)}
            /月），票價低於目標時我們會寄信通知你。每 30 分鐘檢查一次。
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
