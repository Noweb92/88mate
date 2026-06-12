"use client";

import { useMemo, useState, useTransition } from "react";
import {
  completeOnboarding,
  type OnboardingInput,
} from "@/app/onboarding/actions";
import {
  REQUIRED_DAYS,
  formatDate,
  toISODate,
  visaExpiryFromArrival,
  type VisaGoal,
  type VisaType,
} from "@/lib/visa";
import { WHV_COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Disclaimer } from "@/components/disclaimer";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

function ChoiceCard({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border-2 p-4 text-left transition-colors",
        selected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:border-muted-foreground/40"
      )}
    >
      <span className="block font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">
        {subtitle}
      </span>
    </button>
  );
}

export function OnboardingFlow({
  initialFirstName,
}: {
  initialFirstName: string;
}) {
  const [step, setStep] = useState(0);
  const [visaType, setVisaType] = useState<VisaType | null>(null);
  const [arrivalDate, setArrivalDate] = useState("");
  const [visaGoal, setVisaGoal] = useState<VisaGoal | null>(null);
  const [nationality, setNationality] = useState("");
  const [firstName, setFirstName] = useState(initialFirstName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = useMemo(() => toISODate(new Date()), []);

  const canContinue =
    (step === 0 && visaType !== null) ||
    (step === 1 && arrivalDate !== "") ||
    (step === 2 && visaGoal !== null) ||
    (step === 3 && nationality !== "");

  function handleSubmit() {
    if (!visaType || !visaGoal || !arrivalDate || !nationality) return;
    setError(null);
    const input: OnboardingInput = {
      visaType,
      visaGoal,
      arrivalDate,
      nationality,
      ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
    };
    startTransition(async () => {
      const result = await completeOnboarding(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-8">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} />
      </div>

      <div className="flex-1">
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Which visa are you on?
            </h1>
            <p className="text-sm text-muted-foreground">
              It&apos;s on your visa grant letter.
            </p>
            <div className="space-y-3 pt-2">
              <ChoiceCard
                selected={visaType === "417"}
                onClick={() => setVisaType("417")}
                title="Working Holiday (417)"
                subtitle="France, Germany, Italy, UK, Ireland, Japan…"
              />
              <ChoiceCard
                selected={visaType === "462"}
                onClick={() => setVisaType("462")}
                title="Work and Holiday (462)"
                subtitle="USA, Spain, Chile, China, Indonesia…"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              When did you arrive in Australia?
            </h1>
            <p className="text-sm text-muted-foreground">
              First entry on this visa. We&apos;ll estimate your visa deadline
              from it — you can fine-tune it later.
            </p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="arrival">Arrival date</Label>
              <Input
                id="arrival"
                type="date"
                max={today}
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              What are you working towards?
            </h1>
            <div className="space-y-3 pt-2">
              <ChoiceCard
                selected={visaGoal === "second_year"}
                onClick={() => setVisaGoal("second_year")}
                title="My 2nd year visa"
                subtitle="88 days of specified work during your 1st year"
              />
              <ChoiceCard
                selected={visaGoal === "third_year"}
                onClick={() => setVisaGoal("third_year")}
                title="My 3rd year visa"
                subtitle="179 days of specified work during your 2nd year"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold tracking-tight">
              Last one, mate
            </h1>
            <div className="space-y-2">
              <Label htmlFor="firstName">First name (optional)</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="So we know what to call you"
              />
            </div>
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Select value={nationality} onValueChange={setNationality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {WHV_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {visaGoal && arrivalDate && (
              <div className="rounded-xl border bg-card p-4 text-sm">
                <p className="font-semibold">Your plan</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">
                      {REQUIRED_DAYS[visaGoal]} days
                    </span>{" "}
                    of specified work to track
                  </li>
                  <li>
                    Estimated visa deadline:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(visaExpiryFromArrival(arrivalDate))}
                    </span>
                  </li>
                </ul>
              </div>
            )}

            <Disclaimer />
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm font-medium text-destructive">{error}</p>
      )}

      <div className="flex gap-3 pt-6">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => setStep(step - 1)}
            disabled={pending}
          >
            Back
          </Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button
            type="button"
            className="h-12 flex-1"
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 flex-1"
            disabled={!canContinue || pending}
            onClick={handleSubmit}
          >
            {pending ? "Setting things up…" : "Start tracking"}
          </Button>
        )}
      </div>
    </div>
  );
}
