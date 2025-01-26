import Link from "next/link";

export function Header() {
  return (
    <header className="flex w-full gap-4 flex-wrap">
      <Link href="/">
        <h1 className="text-bold text-5xl">Comfy-PR</h1>
      </Link>
      <nav className="flex gap-2 flex-wrap">
        <Link href="/details" className="text-2xl">
          Details
        </Link>
        <Link href="/rules" className="text-2xl">
          Rules
        </Link>
        <Link href="/tasks" className="text-2xl">
          Tasks
        </Link>
      </nav>
    </header>
  );
}

export function Header2() {
  return (
    <header className="flex w-full gap-4 flex-wrap p-8">
      <Link href="/">
        <h1 className="text-bold text-5xl">Comfy-PR</h1>
      </Link>
      <nav className="flex gap-2 flex-wrap">
        <Link href="/details" className="text-2xl">
          Details
        </Link>
        <Link href="/rules" className="text-2xl">
          Rules
        </Link>
        <Link href="/tasks" className="text-2xl">
          Tasks
        </Link>
      </nav>
    </header>
  );
}
