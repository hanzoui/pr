import { forbidden } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthUser } from "../../api/auth/[...nextauth]/getAuthUser";

export default async function RulesLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();
  // check authorization (permission)
  const isAdmin = user.admin || user.email.endsWith("@drip.art");
  if (!isAdmin) return forbidden();

  return (
    <div className="flex flex-wrap">
      <div className="grow">{children}</div>
    </div>
  );
}
