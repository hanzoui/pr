import { Suspense, use } from "react";

export async function SuspenseUse({ children, fallback }: { children: Promise<any> | any; fallback?: React.ReactNode; }) {
  const data = children;
  return (
    <Suspense fallback={fallback}>
      <Use>{data}</Use>
    </Suspense>
  );
  async function Use({ children }: { children: Promise<any> | any; fallback?: React.ReactNode; }) {
    const data = use(children);
    return <>{data}</>;
  }
}
