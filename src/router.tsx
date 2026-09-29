import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Link,
  Navigate,
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
  redirect,
  useRouteError,
  type LoaderFunctionArgs,
} from "react-router";

import { supabase } from "@/integrations/supabase/client";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { AuthForm } from "@/components/auth-form";
import { LandingPage } from "@/pages/landing";
import { AppPage } from "@/pages/app";

const queryClient = new QueryClient();

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollRestoration />
      <Outlet />
    </QueryClientProvider>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <title>404 — Flight Price Notifier</title>
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorPage() {
  const error = useRouteError();
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "react_router_root_error_element" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/** Client-side auth guard (replaces the old `_authenticated` beforeLoad). */
async function requireAuth({ request }: LoaderFunctionArgs) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const url = new URL(request.url);
    const target = url.pathname + url.search + url.hash;
    throw redirect(`/signin?redirect=${encodeURIComponent(target)}`);
  }
  return null;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/signin", element: <AuthForm mode="signin" /> },
      { path: "/signup", element: <AuthForm mode="signup" /> },
      // Aliases
      { path: "/sign-in", element: <Navigate to="/signin" replace /> },
      { path: "/sign-up", element: <Navigate to="/signup" replace /> },
      { path: "/app", loader: requireAuth, element: <AppPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
