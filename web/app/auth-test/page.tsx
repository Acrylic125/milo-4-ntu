"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LogIn, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export default function AuthTestPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [apiSessionJson, setApiSessionJson] = useState<string | null>(null);
  const [apiSessionError, setApiSessionError] = useState<string | null>(null);

  const {
    data: session,
    isPending: isSessionPending,
    error: sessionError,
    refetch: refetchSession,
  } = authClient.useSession();

  const profileQuery = useQuery({
    ...trpc.profiles.current.queryOptions(),
    enabled: !!session,
  });

  const isBusy = isPending || isSessionPending;

  function handleMicrosoftSignIn() {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "microsoft",
        callbackURL: "/auth-test",
      });
    });
  }

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: async () => {
            setApiSessionJson(null);
            await profileQuery.refetch();
            await refetchSession();
            router.refresh();
          },
        },
      });
    });
  }

  async function handleRefreshAll() {
    await refetchSession();
    if (session) {
      await profileQuery.refetch();
    }
    await fetchApiSession();
  }

  async function fetchApiSession() {
    setApiSessionError(null);
    try {
      const response = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      const body = await response.json();
      setApiSessionJson(JSON.stringify(body, null, 2));
    } catch (err) {
      setApiSessionError(
        err instanceof Error
          ? err.message
          : "Failed to fetch /api/auth/get-session"
      );
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6">
        <div className="mb-6 space-y-2">
          <Button variant="ghost" size="xs" asChild className="-ml-2 w-fit">
            <Link href="/">
              <ArrowLeft />
              Back to discover
            </Link>
          </Button>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Dev · Auth test
          </p>
          <h1 className="font-sans text-2xl font-medium tracking-tight">
            Microsoft sign-in test
          </h1>
          <p className="text-xs/relaxed text-muted-foreground">
            Use this page to verify Better Auth session cookies, Microsoft
            OAuth, and profile linking. Callback returns here after sign-in.
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Actions</CardTitle>
              <CardDescription>
                Sign in redirects to Microsoft and back to{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  /auth-test
                </code>
                .
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2 border-t-0 pt-0">
              {!session ? (
                <Button onClick={handleMicrosoftSignIn} disabled={isBusy}>
                  <LogIn className="size-3.5" />
                  Continue with Microsoft
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isBusy}
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => void handleRefreshAll()}
                disabled={isBusy}
              >
                <RefreshCw className="size-3.5" />
                Refresh all
              </Button>
              <Button
                variant="ghost"
                onClick={() => void fetchApiSession()}
                disabled={isBusy}
              >
                Fetch /api/auth/get-session
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Session (client hook)</CardTitle>
              <CardDescription>
                From{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  authClient.useSession()
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Status">
                  {isSessionPending
                    ? "Loading…"
                    : session
                      ? "Signed in"
                      : "Signed out"}
                </Stat>
                <Stat label="User ID">{session?.user.id ?? "—"}</Stat>
                <Stat label="Email">{session?.user.email ?? "—"}</Stat>
              </div>

              {sessionError ? (
                <Alert variant="destructive">
                  <AlertTitle>Session error</AlertTitle>
                  <AlertDescription>{sessionError.message}</AlertDescription>
                </Alert>
              ) : null}

              <JsonBlock
                label="Raw session"
                value={
                  isSessionPending
                    ? "Loading…"
                    : JSON.stringify(session ?? null, null, 2)
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Linked Milo profile</CardTitle>
              <CardDescription>
                From{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  trpc.profiles.current
                </code>{" "}
                — requires sign-in and an onboarded or email-matched profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!session ? (
                <p className="text-muted-foreground">
                  Sign in to check profile linking.
                </p>
              ) : profileQuery.isPending ? (
                <p className="text-muted-foreground">Loading profile…</p>
              ) : profileQuery.data ? (
                <>
                  <Alert>
                    <ShieldCheck />
                    <AlertTitle>Profile linked</AlertTitle>
                    <AlertDescription>
                      {profileQuery.data.name} · {profileQuery.data.role}
                    </AlertDescription>
                  </Alert>
                  <Button size="sm" asChild>
                    <Link href={`/profile/${profileQuery.data.id}`}>
                      Open profile
                    </Link>
                  </Button>
                </>
              ) : (
                <Alert>
                  <AlertTitle>No profile yet</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Session is valid but no Milo profile is linked to this
                      account.
                    </span>
                    <Button size="sm" asChild className="shrink-0">
                      <Link href="/onboard">Go to onboarding</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {session ? (
                <JsonBlock
                  label="Raw profile"
                  value={JSON.stringify(profileQuery.data ?? null, null, 2)}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Session (API route)</CardTitle>
              <CardDescription>
                Direct fetch to{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  GET /api/auth/get-session
                </code>{" "}
                with cookies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {apiSessionError ? (
                <Alert variant="destructive">
                  <AlertTitle>Fetch failed</AlertTitle>
                  <AlertDescription>{apiSessionError}</AlertDescription>
                </Alert>
              ) : null}

              <JsonBlock
                label="API response"
                value={
                  apiSessionJson ?? "Click “Fetch /api/auth/get-session” above."
                }
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border border-border bg-muted/40 p-3">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="break-all font-sans text-sm font-medium">
        {children}
      </span>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <Separator />
      <pre className="max-h-64 overflow-auto border border-border bg-muted/30 p-3 text-[10px] leading-relaxed">
        {value}
      </pre>
    </div>
  );
}
