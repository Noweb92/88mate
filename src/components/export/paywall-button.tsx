"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { createExportCheckout } from "@/app/export/actions";
import { Button } from "@/components/ui/button";

export function PaywallButton({
  stripeConfigured,
}: {
  stripeConfigured: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createExportCheckout();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        className="h-12 w-full gap-2"
        onClick={handleClick}
        disabled={pending || !stripeConfigured}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        Unlock my export — $29 AUD
      </Button>
      {!stripeConfigured && (
        <p className="text-xs text-muted-foreground">
          Payments aren&apos;t configured yet (Stripe keys missing in{" "}
          <code className="font-mono">.env.local</code>).
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
