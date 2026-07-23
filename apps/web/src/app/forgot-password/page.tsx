"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, ArrowLeft, CheckCircle } from "lucide-react";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get("email") ?? "",
    tenantSlug: searchParams.get("company") ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">OfficePulse</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your details and we&apos;ll send a reset link</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="font-semibold text-gray-900">Check your inbox</h2>
              <p className="text-sm text-gray-500">
                If an account exists for <strong>{form.email}</strong> under company <strong>{form.tenantSlug}</strong>, you&apos;ll receive a reset link shortly. The link expires in 1 hour.
              </p>
              <Link href="/login" className="btn-primary w-full py-2.5 mt-2 inline-block text-center text-sm">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Company ID</label>
                <input
                  className="input"
                  placeholder="your-company"
                  value={form.tenantSlug}
                  onChange={(e) => update("tenantSlug", e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">The company ID from your welcome email</p>
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-brand-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
