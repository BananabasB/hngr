"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gupter } from "next/font/google";
import { MailOpen, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldSeparator } from "@/components/ui/field";
import { ClerkWordmarkDark } from "@/components/ui/svgs/clerkWordmarkDark";
import { ClerkWordmarkLight } from "@/components/ui/svgs/clerkWordmarkLight";
import { Google } from "@/components/ui/svgs/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

const LAST_METHOD_KEY = "hngr:lastAuthMethod";
const LAST_EMAIL_KEY = "hngr:lastEmail";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [lastMethod, setLastMethod] = useState<"google" | "email" | null>(null);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const router = useRouter();
  const identifierInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMethod = localStorage.getItem(LAST_METHOD_KEY) as
        | "google"
        | "email"
        | null;
      if (storedMethod === "google" || storedMethod === "email") {
        setLastMethod(storedMethod);
      }
      const storedEmail = localStorage.getItem(LAST_EMAIL_KEY);
      if (storedEmail) {
        setLastEmail(storedEmail);
      }
    }
  }, []);

  useEffect(() => {
    const checkForError = setInterval(() => {
      const errorElement = document.querySelector(
        '[data-error-code="form_identifier_not_found"]'
      );
      if (errorElement && email) {
        clearInterval(checkForError);
        router.push(
          `/auth/create/verify?email=${encodeURIComponent(email)}&redirected=true`
        );
      }
    }, 100);

    return () => clearInterval(checkForError);
  }, [email, router]);

  const rememberMethod = (method: "google" | "email", value?: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LAST_METHOD_KEY, method);
    setLastMethod(method);
    if (value) {
      localStorage.setItem(LAST_EMAIL_KEY, value);
      setLastEmail(value);
    }
  };

  const handleGoogleClick = () => {
    rememberMethod("google");
  };

  const handleEmailSubmit = () => {
    rememberMethod("email", email || undefined);
  };

  const handleAutofillEmail = () => {
    if (!lastEmail) return;
    setEmail(lastEmail);
    if (identifierInputRef.current) {
      identifierInputRef.current.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(identifierInputRef.current, lastEmail);
        identifierInputRef.current.dispatchEvent(
          new Event("input", { bubbles: true })
        );
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 min-h-screen items-center text-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10 mb-2">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <h1 className={`text-3xl font-semibold ${gupter.className}`}>
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to continue to your account
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleGoogleClick}
          >
            <Google className="w-4 h-4" />
            Continue with Google
          </Button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              ref={identifierInputRef}
              className="h-11"
            />
            <Button className="w-full" onClick={handleEmailSubmit}>
              Continue with Email
            </Button>
          </div>

          {lastEmail && lastMethod === "email" && (
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAutofillEmail}
              >
                Sign in as {lastEmail}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
