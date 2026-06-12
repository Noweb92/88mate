import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign up — 88Mate",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Start tracking your 88 days
        </h1>
        <p className="text-sm text-muted-foreground">
          Free account. Your visa evidence, finally organised.
        </p>
      </div>
      <AuthForm mode="signup" />
    </div>
  );
}
