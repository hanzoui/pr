import { Header } from "../Components/Layout";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default function ComponentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex bg-cyan-800 card-body text-white gap-8">
      <Header />
      <div className="shadow-xl bg-cyan-900 text-white w-full card">{children}</div>
    </div>
  );
}
