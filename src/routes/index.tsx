import { Link, createFileRoute } from "@tanstack/react-router";
import { Plane, Radar, BellRing, CalendarX } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { useAuthUser } from "@/hooks/use-auth-user";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flight Price Notifier — 機票降價通知" },
      {
        name: "description",
        content:
          "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
      },
      { property: "og:title", content: "Flight Price Notifier — 機票降價通知" },
      {
        property: "og:description",
        content:
          "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Radar,
    title: "盯緊熱門航線",
    subtitle: "Always-on route watching",
    body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
  },
  {
    icon: BellRing,
    title: "達標自動通知",
    subtitle: "Target-price email alerts",
    body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
  },
  {
    icon: CalendarX,
    title: "隨時取消",
    subtitle: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約。",
  },
];

function LandingPage() {
  const { user, loaded } = useAuthUser();

  return (
    <div className="hero-glow flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Plane className="size-5 text-primary" aria-hidden />
          Flight Price Notifier
        </Link>
        {loaded && (
          <Link
            to={user ? "/app" : "/signin"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_24px_-6px_var(--glow)] transition-all hover:brightness-110"
          >
            {user ? "開啟 App" : "Sign in / 登入"}
          </Link>
        )}
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              台北出發 · 東京 / 首爾航線
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Flight Price Notifier
            </h1>
            <p className="mt-6 text-xl font-medium text-foreground sm:text-2xl">
              設定航線與目標價，機票降價就通知你
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Set a route and a target price — we email you when the fare drops.
            </p>
            <div className="mt-10">
              <Link
                to={user ? "/app" : "/signin"}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_0_40px_-8px_var(--glow)] transition-all hover:brightness-110"
              >
                Sign in / 登入
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 120}>
                <article className="h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                  <div className="mb-4 inline-flex rounded-xl bg-accent p-2.5">
                    <feature.icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <h2 className="text-lg font-semibold">{feature.title}</h2>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-primary">
                    {feature.subtitle}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 Flight Price Notifier
      </footer>
    </div>
  );
}
