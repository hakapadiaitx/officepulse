import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Add it to .env to enable payments.");
  }
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small teams",
    maxEmployees: 10,
    priceMonthly: 19,
    priceYearly: 190,
    stripePriceMonthlyId: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
    stripePriceYearlyId: process.env.STRIPE_PRICE_STARTER_YEARLY!,
    features: [
      "Up to 10 employees",
      "Attendance tracking",
      "Basic reports",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses",
    maxEmployees: 50,
    priceMonthly: 49,
    priceYearly: 490,
    stripePriceMonthlyId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    stripePriceYearlyId: process.env.STRIPE_PRICE_PRO_YEARLY!,
    features: [
      "Up to 50 employees",
      "Advanced reporting",
      "Daily/weekly/monthly reports",
      "CSV export",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    maxEmployees: 999999,
    priceMonthly: 149,
    priceYearly: 1490,
    stripePriceMonthlyId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!,
    stripePriceYearlyId: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY!,
    features: [
      "Unlimited employees",
      "All reports & exports",
      "API access",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
] as const;
