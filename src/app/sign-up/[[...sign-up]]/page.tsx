"use client";
import * as React from "react";
import { BowArrow, UserPlus, LoaderPinwheel } from "lucide-react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Google } from "@/components/ui/svgs/google"; // added
import { Roboto } from "next/font/google"; // added
import { gupter}

// added roboto font
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [emailAddress, setEmailAddress] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const router = useRouter();

  const { isLoaded, signUp, setActive } = useSignUp();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isLoaded || !signUp) return null;

  // --- google oauth handler ---
  async function signUpWithGoogle() {
    setError(""); // clear previous errors
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      console.error("google sign-up error:", err);
      const clerkError = err?.errors?.[0]?.longMessage;
      setError(clerkError || "could not start google sign up.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp.create({
        emailAddress,
        username,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
      setResendCooldown(30);
    } catch (err: any) {
      console.error(err);
      const clerkError = err?.errors?.[0]?.longMessage;
      setError(clerkError || "an unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: otpCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("invalid code.");
      }
    } catch (err: any) {
      console.error(err);
      const clerkError = err?.errors?.[0]?.longMessage;
      setError(clerkError || "verification failed. please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setResendCooldown(30);
    } catch (err: any) {
      console.error(err);
      setError("couldn’t resend code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {!pendingVerification ? (
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="#"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex size-8 items-center justify-center rounded-md">
                  <BowArrow />
                </div>
                <span className="sr-only">hngr</span>
              </a>
              <h1 className="text-xl font-bold">welcome to hngr</h1>
              <FieldDescription>
                already have an account? <a href="/sign-in">sign in</a>
              </FieldDescription>
            </div>

            <FieldSeparator />

            {/* --- google button added --- */}
            <Button
              type="button"
              variant="outline"
              onClick={signUpWithGoogle}
              className={`${roboto.className} font-medium flex w-full rounded-full items-center justify-center gap-2`}
              disabled={loading}
            >
              <Google />
              <div className="text-center flex-1">
                <span className="font-bold text-center">
                  Continue with Google
                </span>
              </div>
            </Button>

            <div className="text-center text-sm font-medium text-gray-500">
              or continue with email
            </div>
            {/* --------------------------- */}

            {/* username */}
            <Field>
              <FieldLabel htmlFor="username">username</FieldLabel>
              <Input
                id="username"
                type="text"
                placeholder="your username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </Field>

            {/* email */}
            <Field>
              <FieldLabel htmlFor="email">email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                disabled={loading}
              />
            </Field>

            <div id="clerk-captcha"></div>

            {error && (
              <p className="text-red-500 text-center text-sm mt-2" role="alert">
                {error}
              </p>
            )}
            <Field>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <LoaderPinwheel className="animate-spin" />
                ) : (
                  <>
                    <UserPlus />
                    sign me up
                  </>
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : (
        // otp verification form
        <form onSubmit={handleCodeSubmit}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-xl font-bold">enter verification code</h1>
              <p className="text-shadow-muted-foreground text-sm">
                we sent a code to{" "}
                <span className="font-medium">{emailAddress}</span>
              </p>
            </div>

            <Field>
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => setOtpCode(value)}
                className="min-w-full h-20"
              >
                <InputOTPGroup className="flex justify-between w-full">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="flex-1 h-20 text-2xl text-center"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </Field>

            {error && (
              <p className="text-red-500 text-center text-sm mt-2" role="alert">
                {error}
              </p>
            )}

            <Field>
              <Button type="submit" disabled={loading || otpCode.length !== 6}>
                {loading ? "verifying…" : "verify code"}
              </Button>
            </Field>

            <Field>
              <Button
                type="button"
                variant="link"
                disabled={loading || resendCooldown > 0}
                onClick={handleResendCode}
                className="text-center"
              >
                {resendCooldown > 0
                  ? `resend code in ${resendCooldown}s`
                  : "didn't get your code? resend"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      )}

      <FieldDescription className="px-6 text-center">
        by clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-full flex w-full flex-1 items-center justify-center p-6 md:p-10">
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <SignupForm className="max-w-md" />
      </div>
    </div>
  );
}