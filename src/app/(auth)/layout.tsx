import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-8">
      <header className="mx-auto w-full max-w-sm">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          88<span className="text-primary">Mate</span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-sm">
        <Disclaimer />
      </footer>
    </div>
  );
}
