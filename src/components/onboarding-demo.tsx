"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, Info } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";

export function OnboardingDemo() {
  const { isActive, currentStep, steps, startOnboarding } = useOnboarding();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          Onboarding Location & Features
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Where it appears:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Auto-starts for new users (1 second after load)</li>
            <li>• Overlays the entire app with backdrop</li>
            <li>• Highlights specific UI elements with blue glow</li>
            <li>• Positioned near target elements</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Animation features:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Smooth fade-in/out with spring animations</li>
            <li>• Target elements scale up slightly (1.02x)</li>
            <li>• Buttons have hover/tap scale effects</li>
            <li>• Staggered content animations</li>
            <li>• Rotating sparkle icon on welcome step</li>
            <li>• Gradient border with pulse effect</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Current status:</h3>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            {isActive && (
              <Badge variant="outline">
                Step {currentStep + 1}/{steps.length}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Onboarding steps:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`p-2 rounded border text-center ${
                  currentStep === index 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="font-medium">{index + 1}. {step.title}</div>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={startOnboarding} 
          disabled={isActive}
          className="w-full gap-2"
        >
          <Play className="h-4 w-4" />
          {isActive ? "Onboarding in Progress..." : "Start Onboarding"}
        </Button>

        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
          <Info className="h-3 w-3 inline mr-1" />
          <strong>Tip:</strong> You can also restart onboarding anytime with the Help button in the sidebar!
        </div>
      </CardContent>
    </Card>
  );
}
