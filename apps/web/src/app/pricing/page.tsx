"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, Clock } from "lucide-react";
import { PLANS } from "@/lib/stripe";

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    if (!session) {
      router.push(`/register?plan=${planId}`);
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">OfficePulse</span>
          </Link>
          <div className="flex gap-4 items-center">
            {session ? (
              <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600">Sign in</Link>
                <Link href="/register" className="btn-primary text-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-center text-gray-500 mb-8">Start free for 14 days. No credit card required.</p>

        {/* Interval toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${interval === "monthly" ? "bg-brand-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${interval === "yearly" ? "bg-brand-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              Yearly <span className="text-green-600 font-semibold ml-1">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`card p-8 flex flex-col ${i === 1 ? "ring-2 ring-brand-600 relative" : ""}`}
            >
              {i === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${interval === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12)}
                </span>
                <span className="text-gray-500">/mo</span>
                {interval === "yearly" && (
                  <p className="text-xs text-gray-400 mt-1">Billed ${plan.priceYearly}/year</p>
                )}
              </div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                {plan.maxEmployees >= 999999 ? "Unlimited employees" : `Up to ${plan.maxEmployees} employees`}
              </p>
              <ul className="space-y-2 mb-8 flex-1">
                {(plan.features as readonly string[]).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${i === 1 ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-gray-200 text-gray-700 hover:bg-gray-50"} disabled:opacity-50`}
              >
                {loading === plan.id ? "Loading..." : "Get started"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
