"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerDocument, runOcr } from "@/app/vault/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOC_TYPE_LABELS: Record<string, string> = {
  payslip: "Payslip",
  contract: "Contract",
  bank_statement: "Bank statement",
  reference: "Employer reference",
  piece_rate_agreement: "Piece rate agreement",
};

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const MAX_BYTES = 8 * 1024 * 1024;

type Period = { id: string; label: string };

export function UploadCard({
  userId,
  periods,
}: {
  userId: string;
  periods: Period[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("payslip");
  const [periodId, setPeriodId] = useState<string>("none");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("File too large — 8 MB max.");
      return;
    }
    setBusy(true);

    try {
      setStatus("Uploading…");
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const path = `${userId}/${crypto.randomUUID()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        setError("Upload failed — try again.");
        return;
      }

      setStatus("Saving…");
      const registered = await registerDocument({
        storagePath: path,
        type: docType as never,
        workPeriodId: periodId === "none" ? null : periodId,
      });
      if ("error" in registered) {
        setError(registered.error ?? "Could not save the document.");
        return;
      }

      if (docType === "payslip") {
        setStatus("Reading the payslip… (a few seconds)");
        const ocr = await runOcr(registered.id);
        if ("error" in ocr && ocr.error) {
          // Upload succeeded — OCR is best-effort.
          setError(ocr.error);
        }
      }

      setStatus(null);
      router.refresh();
    } finally {
      setBusy(false);
      setStatus(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Add a document</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Photo or PDF. Payslips are read automatically and pre-fill your
        tracker.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Linked job</Label>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked yet</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <Button
        className="mt-4 h-12 w-full gap-2"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {status ?? "Working…"}
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Take a photo / choose a file
          </>
        )}
      </Button>

      {error && (
        <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
