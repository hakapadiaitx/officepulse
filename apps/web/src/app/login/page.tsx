"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Clock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", tenantSlug: "" });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      tenantSlug: form.tenantSlug,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid email, password, or company ID. Please check and try again.");
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
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your workspace</p>
        </div>

        <div className="card p-8">
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
              <p className="text-xs text-gray-400 mt-1">The company ID you received when registering</p>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Password</label>
                <Link
                  href={`/forgot-password?email=${encodeURIComponent(form.email)}&company=${encodeURIComponent(form.tenantSlug)}`}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input className="input" type="password" placeholder="Your password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brand-600 hover:underline">Start free trial</Link>
        </p>
      </div>
    </div>
  );
}
