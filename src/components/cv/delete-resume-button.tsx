"use client";

import { useTransition } from "react";
import { deleteResume } from "@/app/cv/actions";

export function DeleteResumeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteResume(id))}
      className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
    >
      {pending ? "Deleting…" : "Delete this CV"}
    </button>
  );
}
