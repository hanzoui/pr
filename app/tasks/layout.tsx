import { Suspense } from "react";
import { Header2 } from "../Components/Layout";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default function ComponentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex text-black flex-col">
      <Header2 />
      <Suspense>{children}</Suspense>
      <footer></footer>
    </div>
  );
}
