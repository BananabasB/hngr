"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Show, SignInButton } from "@clerk/nextjs";
import { KeyRound, Plus } from "lucide-react";
import Link from "next/link";

import { Thread } from "@/components/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { isHngrPlusEnabled } from "@/lib/plus";
import { usePunditRuntime } from "@/lib/pundit-runtime";

export default function PunditPage() {
  const user = useAuth();

  return (
    <>
      {user.loading ? (
        <div className="container mx-auto px-4 py-16">
          <Card className="mx-auto max-w-2xl border-dashed border-primary/40 bg-card/80 text-center">
            <CardHeader>
              <h2 className="text-3xl font-semibold">checking hngr+</h2>
              <p className="text-muted-foreground">
                verifying your membership before loading Pundit AI.
              </p>
            </CardHeader>
          </Card>
        </div>
      ) : isHngrPlusEnabled() && !user.isPlus ? (
        <div className="container mx-auto px-4 py-16">
          <Card className="mx-auto max-w-2xl border-dashed border-primary/40 bg-card/80 text-center">
            <CardHeader>
              <h2 className="text-3xl font-semibold">hngr+ required</h2>
              <p className="text-muted-foreground">
                you gotta have hngr+ to use this tab. upgrade to unlock Pundit AI.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col justify-center gap-2">
              <Button asChild>
                <Link href="/pay/checkout">
                  <Plus className="mr-2 h-4 w-4" />
                  upgrade to hngr+
                </Link>
              </Button>

              <Show when="signed-out">
                <SignInButton>
                  <Button
                    className="justify-center rounded-md px-4 py-2 font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    variant="outline"
                    aria-label="authenticate"
                  >
                    <KeyRound className="h-5 w-5" />
                    log in
                  </Button>
                </SignInButton>
              </Show>
            </CardContent>
          </Card>
        </div>
      ) : (
        <PunditChatShell />
      )}
    </>
  );
}

function PunditChatShell() {
  const runtime = usePunditRuntime();

  return (
    <div className="h-screen w-full">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}
