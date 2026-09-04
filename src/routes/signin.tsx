import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "登入 — Flight Price Notifier" },
      { name: "description", content: "Sign in to Flight Price Notifier with email and password." },
    ],
  }),
  component: () => <AuthForm mode="signin" />,
});
