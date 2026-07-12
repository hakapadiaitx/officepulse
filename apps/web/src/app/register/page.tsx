"use client";
import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Clock, Eye, EyeOff, Upload, X, Check } from "lucide-react";
import { BRAND_COLORS } from "@/lib/brand";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brandColor, setBrandColor] = useState("#4f46e5");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "", firstName: "", lastName: "", email: "", password: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, brandColor }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(Array.isArray(data.error) ? data.error[0]?.message : data.error || "Registration failed");
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        tenantSlug: data.tenantSlug,
        redirect: false,
      });

      // Upload logo now that we have a session
      if (result?.ok && logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await fetch("/api/upload/logo", { method: "POST", body: fd });
      }

      if (result?.ok) {
        const plan = searchParams.get("plan");
        router.push(plan ? `/pricing?plan=${plan}` : "/dashboard");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: brandColor }}>
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">OfficePulse</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your workspace</h1>
          <p className="text-gray-500 text-sm mt-1">14-day free trial, no credit card needed</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input className="input" placeholder="Acme Corp" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input" placeholder="Jane" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" placeholder="Doe" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Work Email</label>
              <input className="input" type="email" placeholder="jane@acme.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Brand colour */}
            <div>
              <label className="label">Brand Colour</label>
              <div className="flex gap-2 flex-wrap">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setBrandColor(c.value)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c.value, borderColor: brandColor === c.value ? c.value : "transparent", outline: brandColor === c.value ? `2px solid ${c.value}` : "none", outlineOffset: "2px" }}
                  >
                    {brandColor === c.value && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="label">Company Logo <span className="text-gray-400 font-normal">(optional)</span></label>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoChange} />
              {logoPreview ? (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <Image src={logoPreview} alt="Logo preview" width={48} height={48} className="w-12 h-12 object-contain rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{logoFile?.name}</p>
                    <p className="text-xs text-gray-400">{logoFile ? (logoFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                  </div>
                  <button type="button" onClick={removeLogo} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center gap-1.5 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Click to upload PNG, JPG, SVG or WebP · max 2 MB</span>
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? "Creating workspace..." : "Create workspace"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="hover:underline" style={{ color: brandColor }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
