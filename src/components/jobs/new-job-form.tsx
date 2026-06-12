"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  createWorkPeriod,
  type WorkPeriodInput,
} from "@/app/jobs/actions";
import { computeDaysCounted, WORK_TYPE_LABELS, type WorkType } from "@/lib/days";
import { INDUSTRIES } from "@/lib/industries";
import { toISODate, type VisaType } from "@/lib/visa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PostcodeState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "eligible" }
  | { status: "not_eligible" }
  | { status: "unknown" };

export function NewJobForm({ visaType }: { visaType: VisaType }) {
  const [employerName, setEmployerName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [industry, setIndustry] = useState("");
  const [workType, setWorkType] = useState<WorkType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stillWorking, setStillWorking] = useState(false);
  const [actualDays, setActualDays] = useState("");
  const [pcState, setPcState] = useState<PostcodeState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = useMemo(() => toISODate(new Date()), []);

  useEffect(() => {
    if (postcode.length !== 4) {
      setPcState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setPcState({ status: "checking" });
    fetch(`/api/check-postcode?postcode=${postcode}&visa=${visaType}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) setPcState({ status: "unknown" });
        else
          setPcState({
            status: json.eligible ? "eligible" : "not_eligible",
          });
      })
      .catch(() => !cancelled && setPcState({ status: "unknown" }));
    return () => {
      cancelled = true;
    };
  }, [postcode, visaType]);

  const isFullTime = workType === "full_time";
  const effectiveEnd = stillWorking && isFullTime ? null : endDate || null;

  const previewDays =
    workType && startDate && (effectiveEnd || (isFullTime && stillWorking))
      ? computeDaysCounted({
          workType: workType as WorkType,
          startDate,
          endDate: effectiveEnd,
          actualDaysWorked: actualDays ? parseInt(actualDays, 10) : 0,
          today,
        })
      : null;

  const canSubmit =
    employerName.trim().length >= 2 &&
    postcode.length === 4 &&
    industry !== "" &&
    workType !== "" &&
    startDate !== "" &&
    (isFullTime
      ? stillWorking || endDate !== ""
      : endDate !== "" && parseInt(actualDays || "0", 10) >= 1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !workType) return;
    setError(null);
    const input: WorkPeriodInput = {
      employerName: employerName.trim(),
      postcode,
      industry,
      workType: workType as WorkType,
      startDate,
      endDate: effectiveEnd,
      actualDaysWorked:
        !isFullTime && actualDays ? parseInt(actualDays, 10) : null,
    };
    startTransition(async () => {
      const result = await createWorkPeriod(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="employer">Employer / farm name</Label>
        <Input
          id="employer"
          value={employerName}
          onChange={(e) => setEmployerName(e.target.value)}
          placeholder="e.g. Sunshine Citrus Farm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="postcode">Workplace postcode</Label>
        <Input
          id="postcode"
          inputMode="numeric"
          maxLength={4}
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 6530"
        />
        {pcState.status === "checking" && (
          <p className="text-xs text-muted-foreground">Checking postcode…</p>
        )}
        {pcState.status === "eligible" && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Eligible area for visa{" "}
            {visaType}
          </p>
        )}
        {pcState.status === "not_eligible" && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <XCircle className="h-3.5 w-3.5" /> Not on the eligible list —
            these days probably won&apos;t count
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Industry</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger>
            <SelectValue placeholder="What kind of work?" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Work type</Label>
        <Select
          value={workType}
          onValueChange={(v) => setWorkType(v as WorkType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="How were you paid?" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {WORK_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {workType === "full_time" && (
          <p className="text-xs text-muted-foreground">
            Full-time: every calendar day of the period counts, days off
            included.
          </p>
        )}
        {(workType === "piecework" || workType === "part_time") && (
          <p className="text-xs text-muted-foreground">
            Only the days you actually worked count.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start">Start date</Label>
          <Input
            id="start"
            type="date"
            max={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End date</Label>
          <Input
            id="end"
            type="date"
            max={today}
            min={startDate || undefined}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isFullTime && stillWorking}
          />
        </div>
      </div>

      {isFullTime && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stillWorking}
            onChange={(e) => setStillWorking(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          I still work there — keep counting automatically
        </label>
      )}

      {!isFullTime && workType !== "" && (
        <div className="space-y-2">
          <Label htmlFor="actualDays">Days actually worked</Label>
          <Input
            id="actualDays"
            inputMode="numeric"
            value={actualDays}
            onChange={(e) =>
              setActualDays(e.target.value.replace(/\D/g, ""))
            }
            placeholder="e.g. 34"
          />
        </div>
      )}

      {previewDays !== null && (
        <div className="rounded-xl border bg-accent p-4 text-sm text-accent-foreground">
          This period adds{" "}
          <span className="font-bold">{previewDays} days</span> to your count
          {pcState.status === "not_eligible" && (
            <span className="font-medium text-destructive">
              {" "}
              — but the postcode looks ineligible
            </span>
          )}
          .
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        className="h-12 w-full"
        disabled={!canSubmit || pending}
      >
        {pending ? "Saving…" : "Add this work period"}
      </Button>
    </form>
  );
}
