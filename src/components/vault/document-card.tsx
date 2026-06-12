"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Loader2, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, runOcr } from "@/app/vault/actions";
import type { PayslipData } from "@/lib/ocr";
import { Button } from "@/components/ui/button";

const DOC_TYPE_LABELS: Record<string, string> = {
  payslip: "Payslip",
  contract: "Contract",
  bank_statement: "Bank statement",
  reference: "Reference",
  piece_rate_agreement: "Piece rate agreement",
};

export type DocumentRow = {
  id: string;
  type: string;
  storage_path: string;
  ocr_data: PayslipData | null;
  created_at: string;
  periodLabel: string | null;
};

function fileName(path: string) {
  const tail = path.split("/").pop() ?? path;
  // strip the uuid_ prefix added at upload
  return tail.replace(/^[0-9a-f-]{36}_/, "");
}

export function DocumentCard({ doc }: { doc: DocumentRow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocrPending, startOcr] = useTransition();
  const [deletePending, startDelete] = useTransition();

  const ocr = doc.ocr_data;
  const needsReview = ocr !== null && ocr.confidence < 0.8;

  async function view() {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else setError("Could not open the file.");
  }

  function handleOcr() {
    setError(null);
    startOcr(async () => {
      const result = await runOcr(doc.id);
      if ("error" in result && result.error) setError(result.error);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      await deleteDocument(doc.id);
      router.refresh();
    });
  }

  const prefillHref =
    ocr &&
    `/jobs/new?${new URLSearchParams({
      ...(ocr.employer_name ? { employer: ocr.employer_name } : {}),
      ...(ocr.period_start ? { start: ocr.period_start } : {}),
      ...(ocr.period_end ? { end: ocr.period_end } : {}),
    }).toString()}`;

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {fileName(doc.storage_path)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {DOC_TYPE_LABELS[doc.type] ?? doc.type}
            {doc.periodLabel ? ` · ${doc.periodLabel}` : " · not linked"}
          </p>

          {ocr ? (
            <div className="mt-2 rounded-lg bg-muted p-2.5 text-xs">
              <p>
                <span className="font-medium">
                  {ocr.employer_name ?? "Employer unknown"}
                </span>
                {ocr.abn ? ` · ABN ${ocr.abn}` : ""}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {ocr.period_start ?? "?"} → {ocr.period_end ?? "?"}
                {ocr.gross_pay !== null ? ` · $${ocr.gross_pay} gross` : ""}
                {ocr.hourly_rate !== null ? ` · $${ocr.hourly_rate}/h` : ""}
              </p>
              {needsReview && (
                <p className="mt-1 font-medium text-amber-600">
                  ⚠️ Low confidence — double-check before relying on it
                </p>
              )}
            </div>
          ) : doc.type === "payslip" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Not scanned yet.
            </p>
          ) : null}

          {error && (
            <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={view}>
              <ExternalLink className="h-3.5 w-3.5" /> View
            </Button>
            {doc.type === "payslip" && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={handleOcr}
                disabled={ocrPending}
              >
                {ocrPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ScanLine className="h-3.5 w-3.5" />
                )}
                {ocr ? "Re-scan" : "Scan"}
              </Button>
            )}
            {ocr && prefillHref && (
              <Button size="sm" className="h-8" asChild>
                <Link href={prefillHref}>Fill tracker</Link>
              </Button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
            >
              {deletePending ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
