"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";

export function HelpButton() {
  const { startOnboarding } = useOnboarding();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startOnboarding}
      className="gap-2"
      title="Start onboarding tour"
    >
      <HelpCircle className="h-4 w-4" />
      Help
    </Button>
  );
}
