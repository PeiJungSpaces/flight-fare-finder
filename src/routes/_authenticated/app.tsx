import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plane, PlaneTakeoff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "App — Flight Price Notifier" },
      { name: "description", content: "Your route-tracking dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loaded } = useAuthUser();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }

  return (
    <div className="hero-glow flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Plane className="size-5 text-primary" aria-hidden />
          Flight Price Notifier
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
        >
          Sign out / 登出
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-[0_0_60px_-20px_var(--glow)]">
          <div className="mx-auto mb-6 inline-flex rounded-2xl bg-accent p-3">
            <PlaneTakeoff className="size-7 text-primary" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hi {loaded ? (user?.email ?? "…") : "…"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            你的航線追蹤儀表板即將上線 — 下一個里程碑會加上訂閱航線的功能。
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground/70">
            Your dashboard is coming soon. Route-subscription will be added in the next milestone.
          </p>
        </div>
      </main>
    </div>
  );
}
