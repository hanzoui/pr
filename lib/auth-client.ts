import { createAuthClient } from "better-auth/react";

// Backward compatibility with NextAuth environment variables
// Priority: BETTER_AUTH_URL > NEXT_PUBLIC_APP_URL > NEXT_PUBLIC_VERCEL_URL > fallback
const getBaseURL = () => {
  // Better Auth specific env var
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  // Standard app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel auto-provided URL
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Production check - throw error if no URL is set in production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_BETTER_AUTH_URL environment variable must be set in production.",
    );
  }

  // Local development fallback
  return "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signOut, useSession } = authClient;
