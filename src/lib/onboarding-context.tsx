"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  action?: string; // What the user should do
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  condition?: () => boolean; // Dynamic condition to show/hide step
  requiresAuth?: boolean; // Whether this step requires authentication
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  filteredSteps: OnboardingStep[];
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  setStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'welcome to hngr',
    description: 'let\'s take a quick tour to help you get started with managing your games and tributes.',
    position: 'center',
  },
  {
    id: 'districts',
    title: 'districts view',
    description: 'this is where you can see and manage all your tributes organized by districts. each district can have multiple tributes.',
    target: '[data-onboarding="districts"]',
    action: 'click on any district to see its tributes',
    position: 'bottom',
  },
  {
    id: 'tribute-naming',
    title: 'customise tribute names',
    description: 'you can customize what you call your participants - tributes, volunteers, or nominees.',
    target: '[data-onboarding="tribute-naming"]',
    action: 'try changing the tribute name',
    position: 'bottom',
  },
  {
    id: 'auth-required',
    title: 'unlock all features',
    description: 'sign in to save your games, sync across devices, and access social features like friends and nominations.',
    position: 'center',
    requiresAuth: false, // Show this step when user is NOT authenticated
  },
  {
    id: 'sidebar',
    title: 'navigation',
    description: 'use the sidebar to navigate between different features like timeline, friends, events, and more.',
    target: '[data-onboarding="sidebar"]',
    action: 'explore the different sections',
    position: 'right',
    condition: () => {
      // Only show if user is authenticated (has access to these features)
      try {
        const { isSignedIn } = useAuth();
        return isSignedIn;
      } catch {
        return false;
      }
    },
  },
  {
    id: 'friends',
    title: 'connect with friends',
    description: 'add friends to share tributes and create collaborative games together.',
    target: '[data-onboarding="sidebar"]', // Target the friends item in sidebar
    action: 'click on friends to add connections',
    position: 'right',
    condition: () => {
      try {
        const { isSignedIn } = useAuth();
        return isSignedIn;
      } catch {
        return false;
      }
    },
  },
  {
    id: 'sync',
    title: 'sync & backup',
    description: 'don\'t forget to back up your game data! you can export your games or import from other platforms.',
    target: '[data-onboarding="sync"]',
    action: 'visit the sync page to see backup options',
    position: 'left',
  },
  {
    id: 'complete',
    title: 'you\'re all set!',
    description: 'you\'ve completed the onboarding tour. start creating your first game and managing your tributes!',
    position: 'center',
  },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { isSignedIn } = useAuth();

  // Filter steps based on authentication and conditions
  const filteredSteps = ONBOARDING_STEPS.filter(step => {
    // Check authentication requirement
    if (step.requiresAuth !== undefined) {
      return step.requiresAuth ? isSignedIn : !isSignedIn;
    }
    
    // Check custom conditions
    if (step.condition) {
      try {
        return step.condition();
      } catch {
        return true; // Default to showing if condition fails
      }
    }
    
    return true; // Show by default
  });

  useEffect(() => {
    // Check if user has seen onboarding via cookie
    const hasCompletedCookie = typeof document !== 'undefined' &&
      document.cookie.split('; ').some(row => row.startsWith('hngr_onboarding_completed='));

    if (!hasCompletedCookie) {
      // Auto-start onboarding for new users
      setTimeout(() => {
        setIsActive(true);
      }, 1000);
    }
    setHasSeenOnboarding(hasCompletedCookie);
  }, []);

  // Reset current step if filtered steps change and current step is out of bounds
  useEffect(() => {
    if (currentStep >= filteredSteps.length && filteredSteps.length > 0) {
      setCurrentStep(filteredSteps.length - 1);
    }
  }, [filteredSteps, currentStep]);

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setIsActive(false);
    // Set cookie to expire in 1 year
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `hngr_onboarding_completed=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }
    setHasSeenOnboarding(true);
  };

  const setStep = (step: number) => {
    if (step >= 0 && step < filteredSteps.length) {
      setCurrentStep(step);
    }
  };

  return (
    <OnboardingContext.Provider value={{
      isActive,
      currentStep,
      steps: ONBOARDING_STEPS, // Keep original steps for reference
      filteredSteps, // Provide filtered steps for actual display
      startOnboarding,
      nextStep,
      previousStep,
      skipOnboarding,
      completeOnboarding,
      setStep,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
