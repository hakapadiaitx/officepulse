import Link from "next/link";
import { CheckCircle, Clock, Users, BarChart3, Monitor } from "lucide-react";

const PLAN_META: Record<string, { name: string; color: string; features: string[] }> = {
  starter: {
    name: "Starter",
    color: "#4f46e5",
    features: ["Up to 10 employees", "Attendance tracking", "Basic reports", "Email support"],
  },
  professional: {
    name: "Professional",
    color: "#0891b2",
    features: ["Up to 50 employees", "Advanced reporting", "Daily/weekly/monthly reports", "CSV export", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    color: "#059669",
    features: ["Unlimited employees", "All reports & exports", "API access", "Dedicated account manager", "SLA guarantee"],
  },
};

const NEXT_STEPS = [
  { icon: Users, title: "Add your employees", desc: "Go to Employees → Add Employee. Each person gets a 4-digit PIN." },
  { icon: Monitor, title: "Set up the kiosk", desc: "Share your kiosk URL on a tablet near your entrance — no login needed." },
  { icon: BarChart3, title: "Track attendance", desc: "Employees tap Arrive or Leave. You see it live on your dashboard." },
];

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const plan = planId ? PLAN_META[planId] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-green-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">OfficePulse</span>
        </div>

        {/* Success card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center mb-6">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-11 h-11 text-green-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment successful!</h1>
          {plan ? (
            <p className="text-gray-600 mb-1">
              You&apos;re now on the{" "}
              <span className="font-semibold" style={{ color: plan.color }}>{plan.name}</span> plan.
            </p>
          ) : (
            <p className="text-gray-600 mb-1">Your subscription is now active.</p>
          )}
          <p className="text-sm text-gray-400 mb-6">A confirmation email is on its way to you.</p>

          {/* Plan features */}
          {plan && (
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {plan.name} plan includes
              </p>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/dashboard"
            className="block w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard →
          </Link>
        </div>

        {/* Next steps */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Get started in 3 steps</p>
          <div className="space-y-4">
            {NEXT_STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
