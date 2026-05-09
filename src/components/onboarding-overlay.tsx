"use client";

import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, ArrowLeft, FastForward, Sparkles, ShieldCheck, Waypoints, WandSparkles } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";
import { motion, AnimatePresence } from "motion/react";
import { SignInButton } from "@clerk/nextjs";
import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

const stepIcons: Record<string, ReactNode> = {
  welcome: <Sparkles className="h-5 w-5" />,
  districts: <Waypoints className="h-5 w-5" />,
  "tribute-naming": <WandSparkles className="h-5 w-5" />,
  "auth-required": <ShieldCheck className="h-5 w-5" />,
  sidebar: <Waypoints className="h-5 w-5" />,
  friends: <Sparkles className="h-5 w-5" />,
  sync: <ShieldCheck className="h-5 w-5" />,
  complete: <Sparkles className="h-5 w-5" />,
};

export function OnboardingOverlay() {
  const { 
    isActive, 
    currentStep, 
    filteredSteps, 
    nextStep, 
    previousStep, 
    skipOnboarding, 
    completeOnboarding 
  } = useOnboarding();
  
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositioning, setIsPositioning] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  const step = filteredSteps[currentStep];

  useEffect(() => {
    if (!isActive || !step?.target) return;

    setIsPositioning(true);
    const targetElement = document.querySelector(step.target) as HTMLElement;
    targetRef.current = targetElement;

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const scrollX = window.pageXOffset;
      const scrollY = window.pageYOffset;

      let top = rect.top + scrollY;
      let left = rect.left + scrollX;

      // Adjust position based on step position preference
      switch (step.position) {
        case 'bottom':
          top += rect.height + 10;
          left += rect.width / 2 - 200; // Center the tooltip
          break;
        case 'top':
          top -= 250; // Approximate height of tooltip
          left += rect.width / 2 - 200;
          break;
        case 'left':
          top += rect.height / 2 - 100;
          left -= 420;
          break;
        case 'right':
          top += rect.height / 2 - 100;
          left += rect.width + 20;
          break;
        case 'center':
          top = window.innerHeight / 2 - 150;
          left = window.innerWidth / 2 - 200;
          break;
        default:
          top += rect.height + 10;
          left += rect.width / 2 - 200;
      }

      // Ensure tooltip stays within viewport
      if (left < 20) left = 20;
      if (left + 400 > window.innerWidth - 20) left = window.innerWidth - 420;
      if (top < 20) top = 20;
      if (top + 300 > window.innerHeight - 20) top = window.innerHeight - 320;

      setPosition({ top, left });
      setTimeout(() => setIsPositioning(false), 100);
    }
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive || !step?.target) return;

    const targetElement = document.querySelector(step.target) as HTMLElement;
    if (targetElement) {
      // Add highlight styles with animation
      targetElement.style.position = 'relative';
      targetElement.style.zIndex = '9999';
      targetElement.style.transition = 'all 0.3s ease-in-out';
      targetElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
      targetElement.style.borderRadius = '8px';
      targetElement.style.transform = 'scale(1.02)';

      return () => {
        // Remove highlight styles with animation
        targetElement.style.transition = 'all 0.3s ease-in-out';
        targetElement.style.transform = 'scale(1)';
        setTimeout(() => {
          targetElement.style.position = '';
          targetElement.style.zIndex = '';
          targetElement.style.boxShadow = '';
          targetElement.style.borderRadius = '';
          targetElement.style.transform = '';
        }, 300);
      };
    }
  }, [isActive, step]);

  if (!isActive || !step) return null;

  const isLastStep = currentStep === filteredSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      {/* Backdrop with centered content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-md"
        onClick={skipOnboarding}
      >
        {/* Centered Content */}
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.9,
            y: 20
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: 0
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.9,
            y: -20
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            duration: 0.4
          }}
          className="w-full max-w-lg mx-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-[0_25px_80px_rgba(0,0,0,0.16)] backdrop-blur-sm">
          <CardHeader className="relative space-y-4 border-b border-border/60 bg-gradient-to-b from-muted/50 to-transparent px-8 py-8">
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground shadow-sm">
                  {stepIcons[step.id] ?? <Sparkles className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Onboarding</p>
                  <p className="text-sm text-muted-foreground">A quick tour of the key flows</p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                {currentStep + 1}/{filteredSteps.length}
              </Badge>
            </div>

            <CardTitle className={`text-balance text-4xl font-normal leading-tight text-foreground ${gupter.className}`}>
              {step.title}
            </CardTitle>

            {step.action && (
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-sm text-muted-foreground">
                {step.action}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-8 px-8 py-8">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mx-auto max-w-xl text-pretty text-lg leading-8 text-muted-foreground"
            >
              {step.description}
            </motion.p>

            <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px w-12 bg-border" />
              {isLastStep ? "Ready to begin" : "Guided setup"}
              <span className="h-px w-12 bg-border" />
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row"
            >
              {!isFirstStep && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={previousStep}
                    className="gap-2 rounded-full px-6"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                </motion.div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {step.id === 'auth-required' ? (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <SignInButton>
                      <Button size="lg" className="gap-2 rounded-full px-6 shadow-sm">
                        Sign in to continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </SignInButton>
                  </motion.div>
                ) : null}

                {step.id !== 'auth-required' && (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="ghost" 
                        size="lg" 
                        onClick={skipOnboarding}
                        className="gap-2 rounded-full px-6 text-muted-foreground"
                      >
                        <FastForward className="h-4 w-4" />
                        Skip tour
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        size="lg" 
                        onClick={nextStep}
                        className="gap-2 rounded-full px-6 shadow-sm"
                      >
                        {isLastStep ? 'Get started' : 'Next'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          </CardContent>
          {/* Close button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.2 }}
            className="absolute top-4 right-4"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipOnboarding}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
