"use client";

import { Waitlist } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { HatGlasses } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WaitlistPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Branding Header */}
      <header className="border-b py-4 px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary rounded p-1">
            <HatGlasses className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-foreground">hngr</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/public-nominate")}>
          nominate a tribute
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 max-w-2xl mx-auto">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tighter leading-tight">hngr is currently in private beta.</h1>
          <p className="text-muted-foreground text-xl">
            we're slowly letting people in to ensure a great experience. join the waitlist and we'll notify you when it's your turn!
          </p>
        </div>

          <Waitlist />

        <div className="text-base text-muted-foreground max-w-md pt-4">
          while you wait, you can still contribute to the community by nominating tributes publicly for your favorite creators!
        </div>

        <Button variant="link" className="text-primary text-lg" onClick={() => router.push("/public-nominate")}>
          start nominating →
        </Button>
      </div>
    </div>
  );
}
