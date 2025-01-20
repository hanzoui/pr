import { Suspense } from "react";
import { Header } from "../Components/Header";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default function ComponentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex bg-grey-300 card-body text-black gap-8">
      <Header />
      <div className="shadow-xl w-full card">
        <Suspense>{children}</Suspense>
      </div>
    </div>
  );
}