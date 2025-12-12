"use client";

import React from "react";
import { useCheckout, CurrencySelectorElement } from "@stripe/react-stripe-js/checkout";

export const OrderSummary = () => {
  const checkoutState = useCheckout();

  // always show the Stripe currency selector if available
  const showCurrencySelector = true;

  // safely compute total
  const totalAmount = 
    checkoutState.type === "success" &&
    checkoutState.checkout.total.total &&
    typeof checkoutState.checkout.total.total.amount === "number"
      ? (checkoutState.checkout.total.total.amount / 100).toFixed(2)
      : null;

  return (
    <div className="order-summary p-3 border rounded-md">
      {showCurrencySelector && <CurrencySelectorElement />}

      {checkoutState.type === "success" && totalAmount && (
        <div className="mt-2 text-lg font-medium">
          Total: {checkoutState.checkout.currency} {totalAmount}
        </div>
      )}

      {checkoutState.type === "loading" && <div>Loading...</div>}
      {checkoutState.type === "error" && <div>Error: {checkoutState.error.message}</div>}
    </div>
  );
};