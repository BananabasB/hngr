// src/components/auth/sign-in-page.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClerkWordmarkDark } from "@/components/ui/svgs/clerkWordmarkDark";
import { ClerkWordmarkLight } from "@/components/ui/svgs/clerkWordmarkLight";
import { Google } from "@/components/ui/svgs/google";
import { cn } from "@/lib/utils";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { BowArrow, KeyRound, MailOpen } from "lucide-react";
import { Gupter, Roboto } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const LAST_METHOD_KEY = "hngr:lastAuthMethod";
const LAST_EMAIL_KEY = "hngr:lastEmail";

function EmailProviderButton({ email }: { email: string | null }) {
  if (!email) return null;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  const providerMap: Record<string, { name: string; url: string }> = {
    "gmail.com": { name: "gmail", url: "https://mail.google.com" },
    "googlemail.com": { name: "gmail", url: "https://mail.google.com" },
    "icloud.com": { name: "iCloud", url: "https://www.icloud.com/mail" },
    "yahoo.com": { name: "yahoo", url: "https://mail.yahoo.com" },
    "outlook.com": { name: "outlook", url: "https://outlook.live.com" },
    "hotmail.com": { name: "outlook", url: "https://outlook.live.com" },
    "live.com": { name: "outlook", url: "https://outlook.live.com" },
    "protonmail.com": { name: "proton mail", url: "https://mail.proton.me" },
    "tuta.io": { name: "tuta", url: "https://mail.tutanota.com" },
    "tutanota.com": { name: "tuta", url: "https://mail.tutanota.com" },
    "yandex.com": { name: "yandex.mail", url: "https://mail.yandex.com" },
    "yandex.ru": { name: "yandex.mail", url: "https://mail.yandex.com" },
    "yandex.kz": { name: "yandex.mail", url: "https://mail.yandex.com" },
  };

  let provider = undefined as { name: string; url: string } | undefined;
  for (const key of Object.keys(providerMap)) {
    if (domain === key || domain.endsWith(`.${key}`) || domain.endsWith(key)) {
      provider = providerMap[key];
      break;
    }
  }

  if (!provider) return null;

  return (
    <Button asChild variant="outline" className="mb-4 w-full">
      <a href={provider.url} target="_blank" rel="noopener noreferrer">
        open {provider.name}
      </a>
    </Button>
  );
}

export function SignInPage() {
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
    <div className="flex flex-col gap-5 min-h-screen items-center text-center justify-center">
      <SignIn.Root>
        <div className="max-w-100 gap-5 flex flex-col">
          <SignIn.Step name="start">
            <div className="flex w-full max-w-md mx-auto flex-col gap-6">
              <div className="gap-2">
                <div className="mx-auto flex size-8 items-center justify-center rounded-md">
                  <BowArrow className="size-6" />
                </div>
                <span className="sr-only">hngr</span>
                <h1 className={`text-3xl ${gupter.className}`}>
                  sign in or sign up
                </h1>
                <p className="text-sm text-muted-foreground">
                  we'll check if you have an account with us, and create one if
                  you don't.
                </p>
              </div>
              <div className="relative">
                <Button
                  asChild
                  className={`w-full rounded-full ${roboto.className} font-medium`}
                  variant="outline"
                >
                  <Clerk.Connection
                    name="google"
                    className="flex w-full items-center justify-center gap-2"
                  >
                    <Google className="size-5 flex-none" />
                    <span className="flex-1 text-center flex items-center justify-center gap-2">
                      Continue with Google
                    </span>
                  </Clerk.Connection>
                </Button>
                {lastMethod === "google" && (
                  <Badge
                    variant="secondary"
                    className="pointer-events-none absolute -top-2 right-0 text-[10px] uppercase font-semibold shadow-md"
                  >
                    last used
                  </Badge>
                )}
              </div>
              <Clerk.Field name="identifier" className="gap-2 flex flex-col">
                <div className="flex items-center justify-between text-left">
                  <Label asChild>
                    <Clerk.Label>email address</Clerk.Label>
                  </Label>
                  {lastMethod === "email" && lastEmail && (
                    <button
                      type="button"
                      onClick={handleAutofillEmail}
                      className="focus:outline-none"
                    >
                      <Badge className="cursor-pointer text-[10px] uppercase font-semibold">
                        last used
                      </Badge>
                    </button>
                  )}
                </div>
                <Clerk.Input asChild>
                  <Input
                    ref={identifierInputRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Clerk.Input>
                <Clerk.FieldError className="block text-destructive text-sm" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <Button onClick={handleEmailSubmit}>
                  <MailOpen />
                  send me a code
                </Button>
              </SignIn.Action>

              <div className="flex items-center w-full justify-center gap-2">
                <Alert className="text-start">
                  <KeyRound />
                  <AlertTitle>we're passwordless</AlertTitle>
                  <AlertDescription>
                    passwords are a hassle and make using websites a mess. that's why hngr
                    doesn't use passwords.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </SignIn.Step>
          <SignIn.Step name="verifications">
            <div className="flex min-w-80 flex-col gap-6">
              <SignIn.Strategy name="email_code">
                <h1>check your email</h1>
                <p>
                  we sent a code to <SignIn.SafeIdentifier />.
                </p>

                <EmailProviderButton email={email} />

                <Clerk.Field name="code" className="gap-2 flex flex-col">
                  <Clerk.Label asChild>
                    <Label>email code</Label>
                  </Clerk.Label>
                  <Clerk.Input
                    type="otp"
                    className="flex min-w-full justify-center has-[:disabled]:opacity-50"
                    autoSubmit
                    render={({ value, status }) => {
                      return (
                        <div
                          data-status={status}
                          className={cn(
                            "relative flex w-full h-20 text-2xl items-center justify-center border-y border-r border-input transition-all first:rounded-l-md first:border-l last:rounded-r-md",
                            {
                              "z-10 ring-2 ring-ring ring-offset-background":
                                status === "cursor" || status === "selected",
                            }
                          )}
                        >
                          {value}
                          {status === "cursor" && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="animate-caret-blink h-4 w-px duration-1000" />
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Clerk.FieldError />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button>continue</Button>
                </SignIn.Action>
              </SignIn.Strategy>
            </div>
          </SignIn.Step>
        </div>
      </SignIn.Root>

      <div className="flex items-center justify-center gap-2">
        <p className="text-muted-foreground text-sm">secured by</p>
        <a href="https://go.clerk.com/components" className="flex items-center">
          <ClerkWordmarkDark className="hidden dark:inline h-4" />
          <ClerkWordmarkLight className="inline dark:hidden h-4" />
        </a>
      </div>
    </div>
  );
}