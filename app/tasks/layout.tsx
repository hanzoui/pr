import Link from "next/link";
import { Suspense } from "react";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default function ComponentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex bg-grey-300 card-body text-black gap-8">
      <header className="flex w-full gap-4 flex-wrap">
        <Link href="/">
          <h1 className="text-5xl">Comfy-PR</h1>
        </Link>
        <nav className="flex gap-2 flex-wrap">
          <Link href="/details" className="text-2xl">
            Details
          </Link>
          <Link href="/rules" className="text-2xl">
            Rules
          </Link>
        </nav>
      </header>
      <div className="shadow-xl w-full card">
        <Suspense>{children}</Suspense>
      </div>
    </div>
  );
}
