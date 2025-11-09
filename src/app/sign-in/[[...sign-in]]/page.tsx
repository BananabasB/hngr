"use client";
import * as React from "react";
import { BowArrow, LoaderPinwheel, LogIn, Mail } from "lucide-react";
import { useSignIn, useClerk } from "@clerk/nextjs";
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
import { Google } from "@/components/ui/svgs/google";
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

// import OTP component
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"; // assuming you added it via shadcn
import { Roboto } from "next/font/google";

// --- Main Form Component ---
export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [emailAddress, setEmailAddress] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const ready = isLoaded;

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn!.create({
        identifier: emailAddress,
      });

      await signIn!.reload();

      const emailFactor = signIn!.supportedFirstFactors.find(
        (factor) => factor.strategy === "email_code"
      );

      if (!emailFactor?.emailAddressId) {
        throw new Error("email address id not found");
      }

      await signIn!.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });

      setPendingVerification(true);
      setResendCooldown(30);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const clerkError = err.errors?.[0]?.longMessage;
      setError(clerkError || "couldn’t start email code sign-in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: "email_code",
        code: otpCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("Invalid code.");
      }
    } catch (err: any) {
      console.error(err);
      setError("couldn’t verify code.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      await signIn!.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      console.error("google sign-in error:", err);
      setError("could not start google sign in.");
    }
  }

  async function handleResendCode() {
    setError("");
    setLoading(true);
    try {
      await signIn!.reload();

      const emailFactor = signIn!.supportedFirstFactors.find(
        (factor) => factor.strategy === "email_code"
      );

      if (!emailFactor?.emailAddressId) {
        throw new Error("email address id not found");
      }

      await signIn!.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });

      setResendCooldown(30);
    } catch (err: any) {
      console.error(err);
      setError("couldn’t resend code.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {!pendingVerification ? (
        <form onSubmit={handleEmailSubmit}>
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
              <h1 className="text-xl font-bold">welcome back to hngr</h1>
              <FieldDescription>
                don’t have an account? <a href="/sign-up">sign up</a>
              </FieldDescription>
            </div>

            <FieldSeparator />

            <Button
              type="button"
              variant="outline"
              onClick={signInWithGoogle}
              className={`${roboto.className} font-medium flex w-full rounded-full items-center justify-center gap-2`}
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

            <Field>
              <FieldLabel htmlFor="email">email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </Field>

            <Field>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                  <LoaderPinwheel className="animate-spin" /></>
                ) : (
                  <>
                    <Mail />
                    send code
                  </>
                )}
              </Button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </Field>
          </FieldGroup>
        </form>
      ) : (
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

            <Field>
              <Button type="submit" disabled={loading}>
                {loading ? "verifying…" : "verify code"}
              </Button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
        by signing in, you agree to our <a href="#">terms of service</a> and{" "}
        <a href="#">privacy policy</a>.
      </FieldDescription>
    </div>
  );
}

// default page export
export default function SignInPage() {
  return (
    <div className="min-h-full flex w-full flex-1 items-center justify-center p-6 md:p-10">
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <SignInForm className="max-w-md" />
      </div>
    </div>
  );
}
