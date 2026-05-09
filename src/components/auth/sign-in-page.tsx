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
import { useSignIn } from "@clerk/nextjs/legacy";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { SiLine, SiDiscord } from "@icons-pack/react-simple-icons";
import { BowArrow, KeyRound, MailOpen, Loader2 } from "lucide-react";
import { Gupter, Roboto, Geist } from "next/font/google";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});
const geist = Geist({ subsets: ["latin"] });

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
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<"start" | "verifications" | "link-sent">("start");
  const [error, setError] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<"google" | "email" | "line" | "discord" | null>(null);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const router = useRouter();
  const identifierInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedMethod = localStorage.getItem(LAST_METHOD_KEY) as
      | "google"
      | "email"
      | "line"
      | "discord"
      | null;

    if (storedMethod === "google" || storedMethod === "email" || storedMethod === "line" || storedMethod === "discord") {
      setLastMethod(storedMethod);
    }

    const storedEmail = localStorage.getItem(LAST_EMAIL_KEY);
    if (storedEmail) {
      setLastEmail(storedEmail);
    }
  }, []);

  const rememberMethod = (method: "google" | "email" | "line" | "discord", value?: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LAST_METHOD_KEY, method);
    setLastMethod(method);
    if (value) {
      localStorage.setItem(LAST_EMAIL_KEY, value);
      setLastEmail(value);
    }
  };

  const handleGoogleClick = async () => {
    if (!isLoaded) return;
    rememberMethod("google");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Something went wrong");
    }
  };

  const handleDiscordClick = async () => {
    if (!isLoaded) return;
    rememberMethod("discord");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_discord",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Something went wrong");
    }
  };

  const handleLineClick = async () => {
    if (!isLoaded) return;
    rememberMethod("line");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_line",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Something went wrong");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !email) return;

    setVerifying(true);
    setError(null);
    rememberMethod("email", email);

    try {
      const created = await signIn.create({ identifier: email });

      if (created.status === "complete") {
        await setActive({ session: created.createdSessionId });
        router.push("/");
        return;
      }

      const firstFactor = (created as any).supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "email_code" || factor.strategy === "email_link"
      );

      if (!firstFactor) {
        setError("This account doesn't have a supported email login method enabled.");
        return;
      }

      if (firstFactor.strategy === "email_link") {
        await signIn.prepareFirstFactor({
          strategy: "email_link",
          emailAddressId: firstFactor.emailAddressId,
          redirectUrl: `${window.location.origin}/sso-callback`,
        });
        setStep("link-sent");
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: firstFactor.emailAddressId,
      });

      setStep("verifications");
    } catch (err: any) {
      const message = err.errors?.[0]?.message || err.message || "Failed to send code";

      if (err.errors?.[0]?.code === "form_identifier_not_found") {
        router.push(`/auth/create?email=${encodeURIComponent(email)}&redirected=true`);
        return;
      }

      if (/missing/i.test(message)) {
        setError("Email sign-in is temporarily unavailable. Please use Google, Discord, or LINE.");
        return;
      }

      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const verificationCode = typeof e === "string" ? e : code;

    if (!isLoaded || !verificationCode) return;

    setVerifying(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        console.error("Sign in status not complete:", result.status);
        setError("Something went wrong during verification");
      }
    } catch (err: any) {
      const message = err.errors?.[0]?.message || err.message || "Invalid code";
      setError(/missing/i.test(message) ? "Email verification is temporarily unavailable. Please use another sign-in method." : message);
    } finally {
      setVerifying(false);
    }
  };

  const handleAutofillEmail = () => {
    if (!lastEmail) return;
    setEmail(lastEmail);
    identifierInputRef.current?.focus();
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-5 min-h-screen items-center text-center justify-center px-4 py-10">
      <div className="max-w-100 gap-5 flex flex-col">
        {step === "start" ? (
          <div className="flex w-full max-w-md mx-auto flex-col gap-6">
            <div className="gap-2">
              <div className="mx-auto flex size-8 items-center justify-center rounded-md">
                <BowArrow className="size-6" />
              </div>
              <span className="sr-only">hngr</span>
              <h1 className={`text-3xl ${gupter.className}`}>
                hngr private beta
              </h1>
              <p className="text-sm text-muted-foreground">
                we'll check if you have an account with us, and show you how to join the waitlist if you don't.
              </p>
            </div>

            <div className="relative">
              <Button
                className={`w-full rounded-full ${roboto.className} font-medium`}
                variant="outline"
                onClick={handleGoogleClick}
              >
                <Google className="size-5 flex-none" />
                <span className="flex-1 text-center flex items-center justify-center gap-2">
                  Continue with Google
                </span>
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

            <div className="relative">
              <Button
                className={`font-[family-name:var(--font-gg-sans)] w-full rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] active:bg-[#3C45A5] font-medium`}
                onClick={handleDiscordClick}
              >
                <span className="flex-1 text-center flex items-center justify-center gap-2">
                  <SiDiscord className="size-5 flex-none" />
                  Continue with Discord
                </span>
              </Button>
              {lastMethod === "discord" && (
                <Badge
                  variant="secondary"
                  className="pointer-events-none absolute -top-2 right-0 text-[10px] uppercase font-semibold shadow-md"
                >
                  last used
                </Badge>
              )}
            </div>

            <div className="relative">
              <Button
                className={`font-brand-line w-full corner-round rounded-lg bg-brand-line-bg text-white  p-0 pl-1.5 hover:bg-brand-line-bg-hover active:bg-brand-line-bg-active font-semibold`}
                onClick={handleLineClick}
              >
                <span className="flex justify-items-start items-center border-r border-brand-line-line pr-1.5 h-full">
                  <SiLine className="text-white size-5" />
                </span>
                <span className="flex-1 text-center flex items-center justify-center gap-2 text-[14px] tracking-wide">
                  Log in with LINE
                </span>
              </Button>
              {lastMethod === "line" && (
                <Badge
                  variant="secondary"
                  className="pointer-events-none absolute -top-2 right-0 text-[10px] uppercase font-semibold shadow-md"
                >
                  last used
                </Badge>
              )}
            </div>

            <FieldSeparator>or</FieldSeparator>

            <form onSubmit={handleEmailSubmit} className="gap-2 flex flex-col">
              <div className="flex items-center justify-between text-left">
                <Label htmlFor="identifier">email address</Label>
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
              <Input
                id="identifier"
                ref={identifierInputRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="email@example.com"
                required
              />
              {error && <p className="text-destructive text-sm text-left">{error}</p>}

              <Button type="submit" disabled={verifying} className="mt-2">
                {verifying ? <Loader2 className="animate-spin" /> : <MailOpen />}
                send me a code
              </Button>
            </form>

            <div className="flex items-center w-full justify-center gap-2">
              <Alert className="text-start">
                <KeyRound />
                <AlertTitle>we're passwordless</AlertTitle>
                <AlertDescription>
                  passwords are a hassle and make using websites a mess. that's why hngr doesn't use passwords.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        ) : step === "link-sent" ? (
          <div className="flex min-w-80 flex-col gap-6">
            <h1>check your email</h1>
            <p>
              we sent a sign-in link to {email}. click it to finish logging in.
            </p>

            <EmailProviderButton email={email} />

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              variant="link"
              onClick={() => setStep("start")}
              className="text-muted-foreground"
            >
              go back
            </Button>
          </div>
        ) : (
          <div className="flex min-w-80 flex-col gap-6">
            <h1>check your email</h1>
            <p>we sent a code to {email}.</p>

            <EmailProviderButton email={email} />

            <form onSubmit={handleVerify} className="gap-2 flex flex-col">
              <Label htmlFor="code">email code</Label>
              <div className="w-full">
                <InputOTP
                  id="code"
                  className="w-full"
                  containerClassName="w-full"
                  maxLength={6}
                  value={code}
                  onChange={(val) => {
                    setCode(val);
                    if (val.length === 6) handleVerify(val);
                  }}
                  autoFocus
                >
                  <InputOTPGroup className="w-full justify-between">
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-20 w-full flex-1 text-2xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button type="submit" disabled={verifying || code.length < 6} className="mt-4">
                {verifying ? <Loader2 className="animate-spin" /> : "continue"}
              </Button>
              <Button
                variant="link"
                onClick={() => setStep("start")}
                className="text-muted-foreground"
              >
                go back
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <p className="text-muted-foreground text-sm">secured by</p>
        <div className="flex items-center">
          <ClerkWordmarkDark className="hidden dark:inline h-4" />
          <ClerkWordmarkLight className="inline dark:hidden h-4" />
        </div>
      </div>
    </div>
  );
}
