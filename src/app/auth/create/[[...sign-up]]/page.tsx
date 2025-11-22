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
import * as SignUp from "@clerk/elements/sign-up";
import { BowArrow, KeyRound, MailOpen } from "lucide-react";
import { Gupter, Roboto } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

// ... (EmailProviderButton remains the same) ...
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

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email");
  const redirected = searchParams.get("redirected") === "true";

  const [email, setEmail] = useState<string | null>(emailFromUrl);
  const [username, setUsername] = useState<string | null>(null);

  // 1. Create a ref for the input
  const emailInputRef = useRef<HTMLInputElement>(null);

  // 2. Use Effect to manually "type" the value into the input so Clerk detects it
  useEffect(() => {
    if (emailFromUrl && emailInputRef.current) {
      const input = emailInputRef.current;

      // This setter hack forces React/Clerk to see the change
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, emailFromUrl);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }, [emailFromUrl]);

  return (
    <div className="flex flex-col gap-5 min-h-screen items-center text-center justify-center">
      <SignUp.Root>
        <div className="max-w-100 gap-5 flex flex-col">
          <SignUp.Step name="start">
            <div className="flex w-full max-w-md mx-auto flex-col gap-6">
              <div className="gap-2">
                <div className="mx-auto flex size-8 items-center justify-center rounded-md">
                  <BowArrow className="size-6" />
                </div>
                <span className="sr-only">hngr</span>
                <h1 className={`text-3xl ${gupter.className}`}>
                  {redirected ? "sign in or sign up" : "create an account"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {redirected
                    ? "we'll check if you have an account with us, and create one if you don't."
                    : "welcome to hngr! let's get you set up."}
                </p>
              </div>
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
                  <span className="flex-1 text-center">
                    Continue with Google
                  </span>
                </Clerk.Connection>
              </Button>
              <FieldSeparator>or</FieldSeparator>

              <Clerk.Field name="emailAddress" className="gap-2 flex flex-col">
                <Label asChild>
                  <Clerk.Label>email address</Clerk.Label>
                </Label>
                <Clerk.Input asChild>
                  <Input
                    // 3. Attach ref here
                    ref={emailInputRef}
                    // 4. Remove value AND defaultValue. Let Clerk control it.
                    // 5. Keep onChange to update YOUR local state (for display only)
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="block text-destructive text-sm" />
              </Clerk.Field>

              <Clerk.Field name="username" className="gap-2 flex flex-col">
                <Clerk.Label asChild>
                  <Label>username</Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    value={username ?? ""}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="pick a username"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="block text-destructive text-sm" />
              </Clerk.Field>

              {/* 6. Fixed nesting error: Button inside Action, Captcha outside */}
              <SignUp.Action submit asChild>
                <Button>
                  <MailOpen />
                  send me a code
                </Button>
              </SignUp.Action>
              <div id="clerk-captcha" />

              <div className="flex items-center w-full justify-center gap-2">
                <Alert className="text-start">
                  <KeyRound />
                  <AlertTitle>we're passwordless</AlertTitle>
                  <AlertDescription>
                    passwords are a hassle and make using websites a mess.
                    that's why hngr doesn't use passwords.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </SignUp.Step>

          <SignUp.Step name="verifications">
            <div className="flex min-w-80 flex-col gap-6">
              <SignUp.Strategy name="email_code">
                <h1>check your email</h1>
                <p>we sent a code to {email}.</p>

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
                            "relative flex w-full h-20 text-2xl  items-center justify-center border-y border-r border-input transition-all first:rounded-l-md first:border-l last:rounded-r-md",
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

                <SignUp.Action submit asChild>
                  <Button>continue</Button>
                </SignUp.Action>
              </SignUp.Strategy>
            </div>
          </SignUp.Step>
        </div>
      </SignUp.Root>

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
