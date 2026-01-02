"use client"
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Plus, KeyRound } from "lucide-react";
export default function PunditPage() {
  const user = useAuth();
  const runtime = useChatRuntime(
    {
      transport: new AssistantChatTransport({
        api: "/api/pundit/chat",
      }),
    }
  );
  return (
    <>
      {!user.isPlus ? (
        <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-2xl border-dashed border-primary/40 bg-card/80 text-center">
          <CardHeader>
            <h2 className="text-3xl font-semibold">hngr+ required</h2>
            <p className="text-muted-foreground">
              you gotta have hngr+ to use this tab. upgrade to unlock Pundit AI.
            </p>
          </CardHeader>
          <CardContent className="flex gap-2 flex-col justify-center">
            <Button asChild>
              <Link href="/pay/checkout">
                <Plus className="mr-2 h-4 w-4" />
                upgrade to hngr+
              </Link>
            </Button>

            <SignedOut>
              <SignInButton>
                <Button
                  className={`justify-center rounded-md py-2 px-4 font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  variant={"outline"}
                  aria-label="authenticate"
                >
                  <KeyRound className={"h-5 w-5"} />
                  log in
                </Button>
              </SignInButton>
            </SignedOut>
          </CardContent>
        </Card>
      </div>
      ) : (
        <div className="w-full h-screen">
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread />
          </AssistantRuntimeProvider>
        </div>
      )}
    </>
  );
}