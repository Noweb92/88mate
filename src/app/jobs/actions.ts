"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeDaysCounted } from "@/lib/days";

const workPeriodSchema = z.object({
  employerName: z.string().trim().min(2).max(120),
  postcode: z.string().regex(/^\d{4}$/),
  industry: z.string().min(1).max(60),
  workType: z.enum(["full_time", "piecework", "part_time"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  actualDaysWorked: z.number().int().min(0).max(999).nullable(),
});

export type WorkPeriodInput = z.infer<typeof workPeriodSchema>;

export async function createWorkPeriod(input: WorkPeriodInput) {
  const parsed = workPeriodSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Some fields look invalid — please check the form." };
  }
  const d = parsed.data;

  if (d.endDate && d.endDate < d.startDate) {
    return { error: "End date can't be before the start date." };
  }
  if (d.workType !== "full_time") {
    if (!d.endDate) {
      return {
        error: "Piecework and part-time periods need an end date.",
      };
    }
    if (d.actualDaysWorked == null || d.actualDaysWorked < 1) {
      return { error: "Enter how many days you actually worked." };
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("visa_type")
    .eq("id", user.id)
    .single();
  const visaType = profile?.visa_type ?? "417";

  // Eligible means: postcode is listed AND the selected industry is
  // approved for that postcode under this visa subclass.
  const { data: pc } = await supabase
    .from("eligible_postcodes")
    .select("industries")
    .eq("postcode", d.postcode)
    .eq("visa_type", visaType)
    .maybeSingle();
  const postcodeEligible = Boolean(
    pc && ((pc.industries as string[]) ?? []).includes(d.industry)
  );

  // Find-or-create the employer (shared entity, matched on name+postcode).
  const { data: existing } = await supabase
    .from("employers")
    .select("id")
    .eq("name", d.employerName)
    .eq("postcode", d.postcode)
    .limit(1);

  let employerId = existing?.[0]?.id as string | undefined;
  if (!employerId) {
    const { data: created, error: empError } = await supabase
      .from("employers")
      .insert({ name: d.employerName, postcode: d.postcode })
      .select("id")
      .single();
    if (empError || !created) {
      return { error: "Could not save the employer. Try again." };
    }
    employerId = created.id;
  }

  // Ongoing full-time periods (no end date) are recomputed live on read.
  const daysCounted = d.endDate
    ? computeDaysCounted({
        workType: d.workType,
        startDate: d.startDate,
        endDate: d.endDate,
        actualDaysWorked: d.actualDaysWorked,
      })
    : null;

  const { error } = await supabase.from("work_periods").insert({
    user_id: user.id,
    employer_id: employerId,
    start_date: d.startDate,
    end_date: d.endDate,
    work_type: d.workType,
    industry: d.industry,
    postcode: d.postcode,
    postcode_eligible: postcodeEligible,
    days_counted: daysCounted,
  });
  if (error) {
    return { error: "Could not save the work period. Try again." };
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect("/jobs");
}

export async function deleteWorkPeriod(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("work_periods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}
