"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentElement, useCheckout } from "@stripe/react-stripe-js/checkout";
import { LoaderPinwheel } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Gupter } from "next/font/google";
import { OrderSummary } from "@/components/order-summary";
import { Stripe as StripeLogo } from "@/components/ui/svgs/stripe";
import { LoadingState } from "@/components/ui/loading-state";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

const validateEmail = async (email: string, checkout: any) => {
  const updateResult = await checkout.updateEmail(email);
  const isValid = updateResult.type !== "error";

  return { isValid, message: !isValid ? updateResult.error.message : null };
};
const EmailInput = ({
  email,
  setEmail,
  error,
  setError,
}: {
  email: string;
  setEmail: (email: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}) => {
  const checkoutState = useCheckout();
  if (checkoutState.type === "loading") {
    return <div>Loading...</div>;
  } else if (checkoutState.type === "error") {
    return <div>Error: {checkoutState.error.message}</div>;
  }
  const { checkout } = checkoutState;

  const handleBlur = async () => {
    if (!email) {
      return;
    }

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setError(message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEmail(e.target.value);
  };

  return (
    <>
      <Label htmlFor="email">email</Label>
      <Input
        id="email"
        type="text"
        value={email}
        onChange={handleChange}
        onBlur={handleBlur}
        className={error ? "error" : ""}
      />

      {error && <div id="email-errors">{error}</div>}
    </>
  );
};

export default function CheckoutForm() {
  const { user } = useUser();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Autofill email from Clerk user if available
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress && !email) {
      setEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user, email]);

  const checkoutState = useCheckout();
  if (checkoutState.type === "error") {
    return <div>Error: {checkoutState.error.message}</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkoutState.type !== "success") return;

    const { checkout } = checkoutState;
    setIsLoading(true);

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setEmailError(message);
      setMessage(message);
      setIsLoading(false);
      return;
    }

    const confirmResult = await checkout.confirm();

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (confirmResult.type === "error") {
      setMessage(confirmResult.error.message);
    }

    setIsLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center in gap-3"
    >
      <div className="bg-gradient-to-b from-base-100 via-base-100 text-center justify-center content-center items-center to-sidebar-accent border-b-2 border-border min-h-40 w-full">
        <h1 className={`${gupter.className} text-3xl`}>checkout</h1>
        {checkoutState.type === "success" &&
          checkoutState.checkout.total.total.amount && (
            <span className="text-5xl font-bold">
              {(() => {
                const fullAmount = checkoutState.checkout.total.total.amount;
                // Extract currency symbol (everything before the numbers)
                const currencyMatch = fullAmount.match(/^([^\d]+)/);
                const currency = currencyMatch ? currencyMatch[1] : "";
                // Get the numeric part
                const numericPart = fullAmount.replace(/^[^\d]+/, "");
                const [whole, decimals] = numericPart.split(".");

                return (
                  <>
                    <span className="text-2xl">{currency}</span>
                    {whole}
                    {decimals && <span className="text-2xl">.{decimals}</span>}
                  </>
                );
              })()}
            </span>
          )}
      </div>
      <div className="p-3 gap-3 flex-col min-w-full flex">
        <OrderSummary />
        <FieldGroup>
          <Field>
            <EmailInput
              email={email}
              setEmail={setEmail}
              error={emailError}
              setError={setEmailError}
            />
          </Field>
        </FieldGroup>
        <Label>payment</Label>
        <PaymentElement id="payment-element" />
        <Button disabled={isLoading} id="submit">
          {isLoading || checkoutState.type === "loading" ? (
            <LoadingState size="sm" />
          ) : checkoutState.type === "success" ? (
            `pay ${checkoutState.checkout.total.total.amount} now`
          ) : (
            "pay now"
          )}
        </Button>
        {/* Show any error or success messages */}
        {message && <div id="payment-message">{message}</div>}
      </div>
      <div className="text-xs inline-flex items-center gap-2 text-muted-foreground">
        powered by{" "}
        <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
          <StripeLogo className="h-4 w-auto inline-block hover:fill-primary transition fill-muted-foreground" />
        </a>
      </div>
    </form>
  );
}
