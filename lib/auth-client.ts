import { createAuthClient } from "better-auth/react";

// Backward compatibility with NextAuth environment variables
// Priority: BETTER_AUTH_URL > NEXTAUTH_URL > NEXT_PUBLIC_VERCEL_URL > fallback
const getBaseURL = () => {
  // Better Auth specific env var
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  // NextAuth backward compatibility
  if (process.env.NEXT_PUBLIC_NEXTAUTH_URL) {
    return process.env.NEXT_PUBLIC_NEXTAUTH_URL;
  }

  // Vercel auto-provided URL
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Local development fallback
  return "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signOut, useSession } = authClient;
