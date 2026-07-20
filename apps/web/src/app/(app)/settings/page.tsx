"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Copy, CheckCheck, Upload, X, Check, Loader2, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BRAND_COLORS } from "@/lib/brand";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Branding state
  const [brandColor, setBrandColor] = useState(user?.brandColor ?? "#4f46e5");
  const [logoUrl, setLogoUrl] = useState<string | null>(user?.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState("");

  useEffect(() => {
    if (user?.brandColor) setBrandColor(user.brandColor);
    if (user?.logoUrl !== undefined) setLogoUrl(user.logoUrl);
  }, [user?.brandColor, user?.logoUrl]);

  const [kioskUrl, setKioskUrl] = useState(`/kiosk/${user?.tenantSlug ?? ""}`);
  useEffect(() => {
    setKioskUrl(`${window.location.origin}/kiosk/${user?.tenantSlug ?? ""}`);
  }, [user?.tenantSlug]);

  function copyKioskUrl() {
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setBrandMsg("Logo must be under 2 MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setBrandMsg("");
  }

  function cancelLogoChange() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function removeLogo() {
    setBrandSaving(true);
    setBrandMsg("");
    const res = await fetch("/api/upload/logo", { method: "DELETE" });
    setBrandSaving(false);
    if (res.ok) {
      setLogoUrl(null);
      setLogoFile(null);
      setLogoPreview(null);
      await updateSession();
      setBrandMsg("Logo removed.");
    } else {
      setBrandMsg("Failed to remove logo.");
    }
  }

  async function saveBranding() {
    setBrandSaving(true);
    setBrandMsg("");

    // Upload logo if a new file was chosen
    if (logoFile) {
      const fd = new FormData();
      fd.append("file", logoFile);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        setBrandSaving(false);
        setBrandMsg("Logo upload failed. Please try again.");
        return;
      }
    }

    // Save brand colour
    const res = await fetch("/api/tenant/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandColor }),
    });

    setBrandSaving(false);
    if (res.ok) {
      await updateSession();
      setBrandMsg("Branding saved! Refresh to see the colour applied across the app.");
    } else {
      setBrandMsg("Failed to save colour. Please try again.");
    }
  }

  async function handleCancelSubscription() {
    setCancelling(true);
    setCancelMsg(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const expiryDate = new Date(data.accessEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        setCancelMsg({ type: "success", text: `Subscription cancelled. Your access continues until ${expiryDate}.` });
        setCancelConfirm(false);
        await updateSession();
      } else {
        setCancelMsg({ type: "error", text: data.error ?? "Failed to cancel. Please try again." });
      }
    } catch {
      setCancelMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setCancelling(false);
    }
  }

  const displayLogo = logoPreview ?? logoUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Workspace info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Workspace</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Company Name</p>
            <p className="font-medium text-gray-900 mt-0.5">{user?.tenantName}</p>
          </div>
          <div>
            <p className="text-gray-500">Company ID</p>
            <p className="font-mono font-medium text-gray-900 mt-0.5">{user?.tenantSlug}</p>
          </div>
          <div>
            <p className="text-gray-500">Your Name</p>
            <p className="font-medium text-gray-900 mt-0.5">{user?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900 mt-0.5">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Subscription</p>
            <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              user?.subscriptionStatus === "ACTIVE"   ? "bg-green-100 text-green-700" :
              user?.subscriptionStatus === "TRIALING" ? "bg-blue-100 text-blue-700"  :
              "bg-red-100 text-red-700"
            }`}>
              {user?.subscriptionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Branding</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your logo and colour appear on the employee kiosk terminal.</p>
        </div>

        {/* Logo */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Company Logo</p>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoChange} />

          {displayLogo ? (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                <Image src={displayLogo} alt="Company logo" width={80} height={80} className="object-contain w-full h-full p-1" />
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Replace logo
                </button>
                {logoFile ? (
                  <button type="button" onClick={cancelLogoChange} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancel change
                  </button>
                ) : (
                  <button type="button" onClick={removeLogo} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove logo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">Click to upload PNG, JPG, SVG or WebP · max 2 MB</span>
            </button>
          )}
        </div>

        {/* Colour picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Brand Colour</p>
          <div className="flex gap-2 flex-wrap">
            {BRAND_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setBrandColor(c.value)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.value,
                  outline: brandColor === c.value ? `3px solid ${c.value}` : "none",
                  outlineOffset: "2px",
                }}
              >
                {brandColor === c.value && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: brandColor }} />
            <span className="text-sm font-mono text-gray-600">{brandColor}</span>
          </div>
        </div>

        {brandMsg && (
          <p className={`text-sm px-3 py-2 rounded-lg border ${brandMsg.includes("ailed") ? "bg-red-50 border-red-100 text-red-600" : "bg-green-50 border-green-100 text-green-700"}`}>
            {brandMsg}
          </p>
        )}

        <button
          onClick={saveBranding}
          disabled={brandSaving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: brandColor }}
        >
          {brandSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {brandSaving ? "Saving…" : "Save Branding"}
        </button>
      </div>

      {/* Kiosk URL */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Employee Attendance Terminal</h2>
        <p className="text-sm text-gray-500 mb-4">
          Share this link with your employees or display it on a shared screen/tablet.
          No login is required — employees identify themselves with their PIN.
        </p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <p className="text-sm font-mono text-gray-700 flex-1 truncate">{kioskUrl}</p>
          <button
            onClick={copyKioskUrl}
            className="flex items-center gap-1.5 text-sm font-medium flex-shrink-0"
            style={{ color: brandColor }}
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex gap-3 mt-3">
          <Link
            href={`/kiosk/${user?.tenantSlug}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            Open Terminal <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <strong>How it works:</strong> Employees can Arrive, Check Out (temporary), Return, or Leave for Day — all authenticated by their private 4-digit PIN.
        </div>
      </div>

      {/* Subscription */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Subscription</h2>

        {user?.subscriptionStatus === "ACTIVE" && !user?.cancelAtPeriodEnd && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Active plan</p>
              <p className="text-xs text-gray-500 mt-0.5">Upgrade to add more employees or unlock features.</p>
            </div>
            <Link href="/pricing" className="btn-secondary text-sm inline-flex items-center gap-1.5">
              Change plan <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {(user?.subscriptionStatus === "TRIALING" || user?.subscriptionStatus === "CANCELED") && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">Start a plan to unlock more employees and features.</p>
            <Link href="/pricing" className="btn-primary text-sm inline-flex items-center gap-1.5">
              View Plans <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Cancellation scheduled notice */}
        {user?.cancelAtPeriodEnd && user?.currentPeriodEnd && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Subscription cancellation scheduled</p>
              <p className="text-xs text-amber-700 mt-1">
                Your access continues until <strong>{new Date(user.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>. You will not be charged again.
              </p>
              <Link href="/pricing" className="inline-block mt-2 text-xs font-medium text-amber-800 underline">
                Resubscribe
              </Link>
            </div>
          </div>
        )}

        {/* Cancel membership — only for active, non-cancelling subscriptions */}
        {user?.subscriptionStatus === "ACTIVE" && !user?.cancelAtPeriodEnd && (
          <div className="pt-2">
            {cancelMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg border mb-3 ${cancelMsg.type === "error" ? "bg-red-50 border-red-100 text-red-600" : "bg-green-50 border-green-100 text-green-700"}`}>
                {cancelMsg.text}
              </p>
            )}

            {!cancelConfirm ? (
              <button
                onClick={() => { setCancelConfirm(true); setCancelMsg(null); }}
                className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Cancel membership
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Cancel your subscription?</p>
                    <p className="text-xs text-red-600 mt-1">
                      You&apos;ll keep full access until the end of your current billing period. After that, you won&apos;t be charged again.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {cancelling ? "Cancelling…" : "Yes, cancel membership"}
                  </button>
                  <button
                    onClick={() => { setCancelConfirm(false); setCancelMsg(null); }}
                    disabled={cancelling}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Keep membership
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
