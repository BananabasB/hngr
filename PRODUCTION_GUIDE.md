# Production Shipping Guide

This guide describes how to ship HNGR to production with Clerk for authentication and Supabase for data.

## What Runs In Production

- Next.js app deployed from this repo
- Clerk for authentication and user session management
- Supabase for database, row-level security, and any storage-backed app data
- Stripe Checkout, payment status checks, and webhooks for paid flows
- External moderation and support APIs, if configured

## Recommended Environment Layout

Keep production and development fully separate.

- `Clerk dev` + `Supabase dev` for local development
- `Clerk prod` + `Supabase prod` for the live app

Do not point development at production Supabase unless you are intentionally testing against live data.

## Required Environment Variables

Set these in your production hosting provider, not in the repo:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

DATABASE_URL=

STRIPE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PK=

PERSPECTIVE_API_KEY=

NEXT_PUBLIC_COMMIT_HASH=
```

If you use any additional provider-specific secrets, keep them production-only as well.

## Stripe Setup

The app uses Stripe on both the client and server:

- `NEXT_PUBLIC_STRIPE_PK` is used by the checkout page in the browser.
- `STRIPE_KEY` is used by server routes to create and inspect checkout sessions.
- `STRIPE_WEBHOOK_SECRET` is used to verify Stripe webhook signatures.

Production Stripe setup:

1. Create or confirm the production Stripe account.
2. Switch the app to live mode keys for production.
3. Add the live webhook endpoint in Stripe.
4. Subscribe to the checkout and customer events your app depends on.
5. Verify the webhook secret matches the deployed environment.
6. Confirm the checkout redirect URLs are set to the production domain.

If you use Stripe in development, keep test mode keys separate from live mode keys.

## Stripe Production Readiness Checklist

Before shipping, make sure the Stripe account itself is ready for live payments.

1. Switch the Stripe dashboard to live mode.
2. Complete business profile details in Stripe.
3. Add and verify the bank account where payouts should land.
4. Confirm the legal business name, address, and support contact are correct.
5. Configure tax and billing settings if your product requires them.
6. Set your statement descriptor so customers recognize the charge.
7. Review payment methods enabled for the account and keep only the ones you intend to support.
8. Configure refund and dispute handling contacts inside Stripe.
9. Set payout timing and payout bank destination intentionally, not by default.
10. Verify webhook endpoints are registered in live mode only.

Validation checklist:

- Create a live-mode checkout session successfully.
- Complete a full payment using a real live payment method.
- Confirm the session status endpoint reports the paid result correctly.
- Confirm the webhook updates your app record as expected.
- Confirm the charge appears in the Stripe dashboard.
- Confirm the payout balance moves toward the connected bank account.
- Confirm refunds can be issued from the dashboard or API if your app needs them.
- Confirm disputed or failed payments surface in logs and admin workflows.

If you are not ready to accept live money, stay in test mode and do not switch the app or webhook secrets to live values yet.

## Production Supabase Setup

1. Create a separate Supabase project for production.
2. Apply your schema and migrations to the production database.
3. Verify row-level security policies are enabled and correct.
4. Configure any required storage buckets and policies.
5. Confirm the production anon key is the one used by the deployed app.

If you already have production data, back it up before changing schema or policies.

## Clerk Setup

1. Create or confirm the production Clerk application.
2. Set production allowed origins and redirect URLs.
3. Add the production webhook endpoint.
4. Confirm webhook secret values match the deployed environment.

This app expects Clerk to be the source of identity, so user records in Supabase should remain linked by Clerk IDs rather than Supabase auth users.

## Database Deployment Flow

Use the existing Drizzle workflow in this repo.

1. Generate migrations when schema changes are ready.
2. Review the SQL in `drizzle/` before applying it.
3. Run the production migration against the production database.
4. Confirm the migration history table is intact so future migrations remain idempotent.

The repo already treats migrations as re-runnable and safe to apply incrementally.

## Build And Release Steps

1. Install dependencies.
2. Run the type check and build.
3. Deploy the generated production build.
4. Verify the deployed app uses only production env vars.
5. Test sign-in, data reads, writes, and webhook flows.

Suggested commands:

```bash
npm install
npm run build
npm run db:check
npm run db:migrate
```

## Go-Live Checklist

- Production Clerk app is configured
- Production Supabase project exists
- Production env vars are set in the hosting platform
- Database schema and migrations are applied
- RLS policies are enabled and validated
- Stripe live mode keys are set and webhooks are configured
- Stripe account is fully verified and bank details are connected
- Stripe live payment flow has been validated end to end
- Moderation API keys are set, if used
- `NEXT_PUBLIC_COMMIT_HASH` is populated for release tracking
- Smoke test passes in the live environment

## Smoke Test Before Announcing Launch

1. Open the deployed app in a private browser window.
2. Sign in with a production Clerk user.
3. Create a record that touches Supabase.
4. Refresh and confirm the data persists.
5. Run a Stripe checkout flow in live mode if payments are enabled.
6. Trigger any critical webhook flows.
7. Confirm the webhook updates the expected records.
8. Confirm logs are clean and there are no auth, database, or payment errors.

## Common Failure Modes

- Wrong Supabase project URL or anon key in production
- Clerk webhook secret mismatch
- RLS policy blocks reads or writes
- Migration applied to the wrong environment
- Stripe webhook points at a preview or local URL
- Stripe client key is still pointing at test mode in production
- Stripe server key is missing or mismatched
- Client code still references a dev-only env var

## Rollback Plan

If a release breaks production:

1. Revert the deployment at the hosting provider.
2. Restore the previous production env var set if needed.
3. Re-run the last known good migration only if the schema change was forward-compatible.
4. Check Clerk and Supabase logs before retrying the release.

## Notes For This Repo

- Clerk is already wired into the app routes and middleware.
- Supabase is used as the persistence layer for app data.
- Stripe checkout pages and API routes depend on the live/public Stripe keys being present.
- Drizzle is present for schema/migration management.
- Several API routes depend on environment variables, so production deployment must include the full secret set.

## Ownership

Treat production database changes as a release event. Keep the exact schema, env vars, and webhook configuration documented alongside the app so the next deployment is repeatable.
