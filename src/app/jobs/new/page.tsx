import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewJobForm } from "@/components/jobs/new-job-form";
import type { VisaType } from "@/lib/visa";

export const metadata: Metadata = {
  title: "Add a work period — 88Mate",
};

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: { employer?: string; start?: string; end?: string };
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, visa_type")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-6">
        <Link
          href="/jobs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Add a work period
        </h1>
        <p className="text-sm text-muted-foreground">
          One entry per employer stint. We check the postcode and count the
          days for you.
        </p>
      </div>
      <NewJobForm
        visaType={(profile.visa_type ?? "417") as VisaType}
        prefill={{
          employer: searchParams.employer,
          start: searchParams.start,
          end: searchParams.end,
        }}
      />
    </div>
  );
}
