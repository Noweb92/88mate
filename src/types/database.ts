import type { VisaGoal, VisaType } from "@/lib/visa";

export type Plan = "free" | "pro" | "pro_lifetime";

export interface Profile {
  id: string;
  visa_type: VisaType | null;
  visa_goal: VisaGoal | null;
  arrival_date: string | null;
  visa_expiry: string | null;
  nationality: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  current_postcode: string | null;
  has_vehicle: boolean;
  plan: Plan;
  onboarding_completed: boolean;
  export_unlocked: boolean;
  created_at: string;
}
