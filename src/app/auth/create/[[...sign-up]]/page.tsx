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
import { useSignUp } from "@clerk/nextjs/legacy";
import { BowArrow, KeyRound, MailOpen, Loader2 } from "lucide-react";
import { SiDiscord, SiLine } from "@icons-pack/react-simple-icons";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Gupter, Roboto } from "next/font/google";
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
  const { isLoaded, signUp, setActive } = useSignUp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailFromUrl = searchParams.get("email");
  const redirected = searchParams.get("redirected") === "true";

  const [email, setEmail] = useState<string>(emailFromUrl || "");
  const [username, setUsername] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [step, setStep] = useState<"start" | "verifications">("start");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  const handleGoogleClick = async () => {
    if (!isLoaded) return;
    try {
      await signUp.authenticateWithRedirect({
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
    try {
      await signUp.authenticateWithRedirect({
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
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_line",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Something went wrong");
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !email || !username) return;

    setVerifying(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email,
        username,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setStep("verifications");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to create account");
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
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        console.error("Sign up status not complete:", result.status);
        setError("Something went wrong during verification");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-5 min-h-screen items-center text-center justify-center">
      <div className="max-w-100 gap-5 flex flex-col">
        {step === "start" ? (
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
              className={`w-full rounded-full ${roboto.className} font-medium`}
              variant="outline"
              onClick={handleGoogleClick}
            >
              <Google className="size-5 flex-none" />
              <span className="flex-1 text-center">
                Continue with Google
              </span>
            </Button>
            <Button
              className={`font-[family-name:var(--font-gg-sans)] w-full rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] active:bg-[#3C45A5] font-medium`}
              onClick={handleDiscordClick}
            >
              <span className="flex-1 text-center flex items-center justify-center gap-2">
                <SiDiscord className="size-5 flex-none" />
                Continue with Discord
              </span>
            </Button>
            <Button
              className={`font-brand-line w-full corner-round bg-brand-line-bg text-white  p-0 pl-1.5 hover:bg-brand-line-bg-hover active:bg-brand-line-bg-active font-semibold`}
              onClick={handleLineClick}
            >
              <span className="flex justify-items-start items-center border-r border-brand-line-line pr-1.5 h-full">
                <SiLine className="text-white size-5" />
              </span>
              <span className="flex-1 text-center flex items-center justify-center gap-2 text-[14px] tracking-wide">
                Log in with LINE
              </span>
            </Button>
            <FieldSeparator>or</FieldSeparator>

            <form onSubmit={handleSignUpSubmit} className="gap-4 flex flex-col">
              <div className="gap-2 flex flex-col text-left">
                <Label htmlFor="email">email address</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div className="gap-2 flex flex-col text-left">
                <Label htmlFor="username">username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="pick a username"
                  required
                />
              </div>

              {error && <p className="text-destructive text-sm text-left">{error}</p>}

              <Button type="submit" disabled={verifying}>
                {verifying ? <Loader2 className="animate-spin" /> : <MailOpen />}
                send me a code
              </Button>
            </form>

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
                  <InputOTPGroup className="w-full">
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
