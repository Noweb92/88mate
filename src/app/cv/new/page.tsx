import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CvForm } from "@/components/cv/cv-form";

export const metadata: Metadata = { title: "New CV — 88Mate" };

export default async function NewCvPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, plan")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const isPro = profile.plan === "pro" || profile.plan === "pro_lifetime";

  // Enforce the free-plan limit before showing the form too.
  if (!isPro) {
    const { count } = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= 1) redirect("/cv");
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-6">
        <Link
          href="/cv"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My CVs
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New CV</h1>
        <p className="text-sm text-muted-foreground">
          Your visa and tracked jobs are already in. Just add the rest.
        </p>
      </div>
      <CvForm isPro={isPro} />
    </div>
  );
}
