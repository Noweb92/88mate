"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { visaExpiryFromArrival } from "@/lib/visa";

const onboardingSchema = z.object({
  visaType: z.enum(["417", "462"]),
  visaGoal: z.enum(["second_year", "third_year"]),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  nationality: z.string().min(2).max(80),
  firstName: z.string().trim().max(80).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(input: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Some answers look invalid — please check and try again." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { visaType, visaGoal, arrivalDate, nationality, firstName } =
    parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      visa_type: visaType,
      visa_goal: visaGoal,
      arrival_date: arrivalDate,
      visa_expiry: visaExpiryFromArrival(arrivalDate),
      nationality,
      ...(firstName ? { first_name: firstName } : {}),
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile. Please try again." };
  }

  redirect("/dashboard");
}
