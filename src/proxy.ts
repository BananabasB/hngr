import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/waitlist(.*)",
  "/public-nominate(.*)",
  "/api/webhooks(.*)",
  "/api/nominations(.*)",
  "/api/mental-health(.*)",
  "/auth(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/favicon.ico",
]);

export default clerkMiddleware(async (auth, req) => {
  const waitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED === "true";
  if (waitlistEnabled) {
    const { isAuthenticated } = await auth();

    if (!isPublicRoute(req) && !isAuthenticated) {
      return NextResponse.redirect(new URL("/waitlist", req.url));
    }
    return;
  }
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
