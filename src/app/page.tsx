import Link from "next/link";
import {
  CalendarCheck,
  FileCheck,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Day tracker",
    text: "Counts your days the way the rules do — full-time, piecework or part-time — and projects your finish date.",
  },
  {
    icon: MapPin,
    title: "Postcode checker",
    text: "Know if a farm's postcode actually counts before you commit. No more bad surprises at visa time.",
  },
  {
    icon: FileCheck,
    title: "Proof vault",
    text: "Payslips, contracts and bank statements stored safely, linked to each job, ready to export.",
  },
  {
    icon: ShieldAlert,
    title: "Underpayment alerts",
    text: "Every payslip checked against minimum award rates. If something's off, you'll know.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <span className="text-xl font-extrabold tracking-tight">
          88<span className="text-primary">Mate</span>
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Log in</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        <section className="py-14 text-center sm:py-20">
          <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Built by a backpacker, for backpackers
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your 88 days,{" "}
            <span className="text-primary">sorted.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Track your regional work days, check postcode eligibility, keep
            every payslip safe — and walk into your visa application with a
            clean, complete evidence pack.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full px-8 sm:w-auto">
              <Link href="/signup">Start tracking — it&apos;s free</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              No card needed. 2-minute setup.
            </p>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-3xl space-y-2 px-4 py-6">
          <Disclaimer />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 88Mate
          </p>
        </div>
      </footer>
    </div>
  );
}
