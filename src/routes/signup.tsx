import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "註冊 — Flight Price Notifier" },
      { name: "description", content: "Create a Flight Price Notifier account with email and password." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
