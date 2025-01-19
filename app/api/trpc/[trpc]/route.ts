import { router } from "@/app/api/router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
export const dynamic = "force-dynamic";
function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: router,
    createContext: () => ({
      user: null,
    }),
  });
}
export { handler as GET, handler as POST };
