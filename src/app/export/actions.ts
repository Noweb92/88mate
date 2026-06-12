"use server";

import Stripe from "stripe";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EXPORT_PRICE_AUD = 29;

export async function createExportCheckout() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      error:
        "Payments aren't configured yet — add the Stripe keys to .env.local.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const origin = headers().get("origin") ?? "http://localhost:3200";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let checkoutUrl: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: EXPORT_PRICE_AUD * 100,
            product_data: {
              name: "88Mate — Visa evidence pack (PDF export)",
              description:
                "One-off unlock: export your complete 88-days evidence pack.",
            },
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: user.id },
      customer_email: user.email ?? undefined,
      success_url: `${origin}/export?purchase=success`,
      cancel_url: `${origin}/export?purchase=cancelled`,
    });
    checkoutUrl = session.url;
  } catch {
    return { error: "Could not start the checkout — try again." };
  }

  if (!checkoutUrl) {
    return { error: "Could not start the checkout — try again." };
  }
  redirect(checkoutUrl);
}
