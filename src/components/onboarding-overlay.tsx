"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, ArrowLeft, FastForward, Sparkles } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";
import { motion, AnimatePresence } from "motion/react";
import { SignInButton } from "@clerk/nextjs";

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
        className="fixed inset-0 bg-background bg-opacity-90 z-40 flex items-center justify-center"
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
          className="w-full max-w-md mx-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            {step.id === 'welcome' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-8 w-8 text-blue-500" />
              </motion.div>
            )}
            <h1 className="text-3xl font-bold text-foreground">{step.title}</h1>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Step {currentStep + 1} of {filteredSteps.length}
              </Badge>
            </motion.div>
            {step.action && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.2 }}
              >
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {step.action}
                </Badge>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto"
        >
          {step.description}
        </motion.p>
        
        {/* Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex items-center justify-center gap-4"
        >
          {!isFirstStep && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={previousStep}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            </motion.div>
          )}
          
          {step.id === 'auth-required' ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <SignInButton>
                <Button size="lg" className="gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignInButton>
            </motion.div>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  onClick={skipOnboarding}
                  className="gap-2"
                >
                  <FastForward className="h-4 w-4" />
                  Skip
                </Button>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  onClick={nextStep}
                  className="gap-2"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>

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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
