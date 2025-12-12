'use client';
import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutProvider } from '@stripe/react-stripe-js/checkout';
import CheckoutForm from './CheckoutForm';
import { useStripeAppearance } from '@/lib/setup';
import { useUser } from '@clerk/nextjs';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);

export default function CheckoutPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  
  const promise = useMemo(() => {
    if (!userLoaded) {
      // User is still loading, return a pending promise
      return new Promise(() => {}); // Never resolves
    }
    
    if (!user?.id) {
      setError('User must be logged in to purchase hngr+');
      return Promise.reject(new Error('User must be logged in to purchase hngr+'));
    }
    
    setError(null);
    return fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        if (!data.clientSecret) {
          throw new Error('No client secret received');
        }
        return data.clientSecret;
      })
      .catch((err) => {
        setError(err.message);
        throw err;
      });
  }, [user?.id, userLoaded]);

  const appearance = useStripeAppearance();

  if (!userLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    );
  }

  if (!user || error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-muted-foreground mb-6">
          {error || 'You need to sign in to purchase hngr+ membership.'}
        </p>
      </div>
    );
  }

  return (
    <div className="App gap-2 flex flex-col">
      <CheckoutProvider
        stripe={stripePromise}
        options={{
          clientSecret: promise,
          adaptivePricing: {
            allowed: true
          } as any, // Type assertion to handle Stripe API mismatch
          elementsOptions: {
            fonts: [
              {
                cssSrc: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap"
              }
            ],
            appearance
          },
        }}
      >
        <CheckoutForm />
      </CheckoutProvider>
    </div>
  );
}