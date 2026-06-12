"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { industryLabel } from "@/lib/industries";
import { cn } from "@/lib/utils";
import type { VisaType } from "@/lib/visa";

type CheckResult = {
  eligible: boolean;
  industries: string[];
  sourceUpdatedAt: string | null;
};

export function PostcodeChecker() {
  const [visa, setVisa] = useState<VisaType>("417");
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/check-postcode?postcode=${encodeURIComponent(postcode)}&visa=${visa}`
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(
          json.error === "not_configured"
            ? "The checker isn't connected to its database yet."
            : "Enter a valid 4-digit Australian postcode."
        );
      } else {
        setResult(json);
      }
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex gap-2">
        {(["417", "462"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setVisa(v);
              setResult(null);
            }}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              visa === v
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:border-muted-foreground/40"
            )}
          >
            Visa {v}
          </button>
        ))}
      </div>

      <form onSubmit={check} className="flex gap-2">
        <Input
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="e.g. 6530"
          value={postcode}
          onChange={(e) => {
            setPostcode(e.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          className="h-12 text-base"
          aria-label="Postcode"
        />
        <Button
          type="submit"
          className="h-12 px-6"
          disabled={loading || postcode.length !== 4}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
        </Button>
      </form>

      {error && (
        <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
      )}

      {result && (
        <div
          className={cn(
            "mt-4 rounded-xl border p-4",
            result.eligible
              ? "border-green-600/30 bg-green-50"
              : "border-destructive/30 bg-destructive/5"
          )}
        >
          {result.eligible ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">
                  {postcode} is in an eligible area for visa {visa}
                </p>
                <p className="mt-1 text-sm text-green-800/80">
                  Counts for:{" "}
                  {result.industries.map(industryLabel).join(", ") ||
                    "specified work"}
                  . Your work must be in one of these industries.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  {postcode} is not on the eligible list for visa {visa}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Work done here is unlikely to count. Double-check on
                  immi.homeaffairs.gov.au before signing anything.
                </p>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {result.sourceUpdatedAt
              ? `Official list, last synced ${result.sourceUpdatedAt}.`
              : "⚠️ Dev database — sample data only, not the official list yet."}
          </p>
        </div>
      )}
    </div>
  );
}
