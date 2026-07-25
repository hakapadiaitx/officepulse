"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Clock, Delete, Sun, LogOut, LogIn, Home, CheckCircle } from "lucide-react";
import Image from "next/image";

type Status = "not_arrived" | "in" | "out" | "left";
type Action = "arrive" | "checkout" | "return" | "leave";
type Screen = "pin" | "identifying" | "employee" | "purpose" | "submitting" | "success" | "error";

interface EmployeeResult {
  id: string;
  firstName: string;
  lastName: string;
}

interface TenantInfo {
  tenantName: string;
  brandColor: string;
  logoUrl: string | null;
}

const statusConfig: Record<Status, { label: string; color: string }> = {
  not_arrived: { label: "Not yet arrived",  color: "text-gray-500" },
  in:          { label: "At work",          color: "text-green-600" },
  out:         { label: "Out of office",    color: "text-orange-600" },
  left:        { label: "Left for the day", color: "text-gray-400" },
};

const actionConfig: Record<Action, { label: string; icon: typeof Sun; confirm: string; brandBtn: boolean; btnClass: string }> = {
  arrive:   { label: "Arrive",        icon: Sun,    confirm: "Start My Day",        brandBtn: true,  btnClass: "" },
  checkout: { label: "Check Out",     icon: LogOut, confirm: "Confirm Check Out",   brandBtn: false, btnClass: "bg-orange-500 text-white hover:bg-orange-600" },
  return:   { label: "Return",        icon: LogIn,  confirm: "I'm Back",            brandBtn: true,  btnClass: "" },
  leave:    { label: "Leave for Day", icon: Home,   confirm: "Leave for Today",     brandBtn: false, btnClass: "bg-gray-600 text-white hover:bg-gray-700" },
};

function availableActions(status: Status): Action[] {
  switch (status) {
    case "not_arrived": return ["arrive"];
    case "in":          return ["checkout", "leave"];
    case "out":         return ["return"];
    case "left":        return [];
  }
}

const NUMPAD = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"] as const;

export default function KioskPage() {
  const { slug } = useParams<{ slug: string }>();

  const [tenant, setTenant] = useState<TenantInfo>({ tenantName: "", brandColor: "#4f46e5", logoUrl: null });
  const [now, setNow] = useState<Date | null>(null);

  // PIN entry
  const [pin, setPin] = useState("");

  // Employee state
  const [employee, setEmployee] = useState<EmployeeResult | null>(null);
  const [empStatus, setEmpStatus] = useState<Status>("not_arrived");
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [purpose, setPurpose] = useState("");

  // Screen
  const [screen, setScreen] = useState<Screen>("pin");
  const [message, setMessage] = useState("");

  // Load tenant branding once
  useEffect(() => {
    fetch(`/api/kiosk/${slug}/status`)
      .then((r) => r.json())
      .then((d) => setTenant({ tenantName: d.tenantName, brandColor: d.brandColor ?? "#4f46e5", logoUrl: d.logoUrl ?? null }))
      .catch(() => {});
  }, [slug]);

  // Live clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const reset = useCallback((delay = 0) => {
    const go = () => {
      setPin("");
      setEmployee(null);
      setSelectedAction(null);
      setPurpose("");
      setMessage("");
      setScreen("pin");
    };
    if (delay) setTimeout(go, delay);
    else go();
  }, []);

  // Numpad press
  function handleKey(key: string) {
    if (screen !== "pin" && screen !== "error") return;
    if (screen === "error") { reset(); return; }

    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "✓") {
      if (pin.length === 4) identify();
      return;
    }
    if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      if (next.length === 4) setTimeout(() => identify(next), 150); // pass value directly to avoid stale closure
    }
  }

  async function identify(pinValue?: string) {
    const currentPin = pinValue ?? pin;
    setScreen("identifying");
    try {
      const res = await fetch(`/api/kiosk/${slug}/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: currentPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Invalid PIN. Please try again.");
        setScreen("error");
        reset(2500);
        return;
      }
      setEmployee(data.employee);
      setEmpStatus(data.status);
      setScreen("employee");
    } catch {
      setMessage("Connection error. Please try again.");
      setScreen("error");
      reset(2500);
    }
  }

  function selectAction(action: Action) {
    setSelectedAction(action);
    if (action === "checkout") {
      setPurpose("");
      setScreen("purpose");
    } else {
      submitAction(action);
    }
  }

  async function submitAction(action?: Action) {
    const act = action ?? selectedAction;
    if (!act || !employee) return;
    if (act === "checkout" && !purpose.trim()) return;
    setScreen("submitting");
    try {
      const res = await fetch(`/api/kiosk/${slug}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: act,
          employeeId: employee.id,
          pin,
          timestamp: new Date().toISOString(),
          purpose: purpose || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong.");
        setScreen("error");
        reset(3000);
        return;
      }
      const successMessages: Record<Action, string> = {
        arrive:   "Have a great day!",
        checkout: "See you soon!",
        return:   "Welcome back!",
        leave:    "See you tomorrow!",
      };
      setMessage(successMessages[act]);
      setScreen("success");
      reset(3000);
    } catch {
      setMessage("Connection error. Please try again.");
      setScreen("error");
      reset(3000);
    }
  }

  const { brandColor, tenantName, logoUrl } = tenant;
  const actions = employee ? availableActions(empStatus) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="text-white px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: brandColor }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-1">
            {logoUrl
              ? <Image src={logoUrl} alt="Logo" width={56} height={56} className="w-full h-full object-contain" />
              : <Clock className="w-7 h-7" style={{ color: brandColor }} />}
          </div>
          <div>
            <p className="font-bold text-xl">{tenantName || "Attendance Terminal"}</p>
            <p className="text-white/70 text-sm">Employee Check-In</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{now ? format(now, "HH:mm:ss") : "--:--:--"}</p>
          <p className="text-white/70 text-sm">{now ? format(now, "EEEE, MMM d yyyy") : ""}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* PIN entry screen */}
          {(screen === "pin" || screen === "identifying" || screen === "error") && (
            <div className="card p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">Enter your PIN</p>
                <p className="text-sm text-gray-400 mt-1">to check in or out</p>
              </div>

              {/* PIN dots */}
              <div className="flex gap-4">
                {[0,1,2,3].map((i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: pin.length > i ? brandColor : "transparent",
                      borderColor: pin.length > i ? brandColor : "#d1d5db",
                    }}
                  />
                ))}
              </div>

              {/* Error message */}
              {screen === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center w-full">
                  {message}
                </p>
              )}

              {/* Numpad */}
              {screen !== "identifying" ? (
                <div className="grid grid-cols-3 gap-3 w-full">
                  {NUMPAD.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-95 select-none ${
                        key === "✓"
                          ? "text-white shadow-md"
                          : key === "⌫"
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm"
                      }`}
                      style={key === "✓" ? { backgroundColor: brandColor } : undefined}
                    >
                      {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: "transparent" }} />
                  <p className="text-sm text-gray-400">Identifying…</p>
                </div>
              )}
            </div>
          )}

          {/* Employee identified — action selection */}
          {screen === "employee" && employee && (
            <div className="card p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3" style={{ backgroundColor: brandColor }}>
                  {employee.firstName[0]}{employee.lastName[0]}
                </div>
                <p className="text-xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</p>
                <p className={`text-sm mt-1 ${statusConfig[empStatus].color}`}>{statusConfig[empStatus].label}</p>
              </div>

              {actions.length > 0 ? (
                <div className="flex flex-col gap-3 w-full">
                  {actions.map((action) => {
                    const cfg = actionConfig[action];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={action}
                        onClick={() => selectAction(action)}
                        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${cfg.brandBtn ? "text-white shadow-md" : cfg.btnClass}`}
                        style={cfg.brandBtn ? { backgroundColor: brandColor } : undefined}
                      >
                        <Icon className="w-5 h-5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center">No actions available — you&apos;ve already left for the day.</p>
              )}

              <button onClick={() => reset()} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Not you? Go back
              </button>
            </div>
          )}

          {/* Purpose entry for check-out */}
          {screen === "purpose" && employee && (
            <div className="card p-8 flex flex-col gap-5">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Check Out</p>
                <p className="text-sm text-gray-400 mt-1">{employee.firstName} {employee.lastName}</p>
              </div>
              <div>
                <label className="label">Purpose / Reason <span className="text-red-400">*</span></label>
                <input
                  className="input mt-1"
                  placeholder="e.g. Client meeting, Lunch…"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                onClick={() => submitAction()}
                disabled={!purpose.trim()}
                className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: brandColor }}
              >
                Confirm Check Out
              </button>
              <button onClick={() => setScreen("employee")} className="text-sm text-gray-400 hover:text-gray-600 text-center">
                Back
              </button>
            </div>
          )}

          {/* Submitting */}
          {screen === "submitting" && (
            <div className="card p-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: "transparent" }} />
              <p className="text-gray-400">Processing…</p>
            </div>
          )}

          {/* Success */}
          {screen === "success" && employee && (
            <div className="card p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColor}15` }}>
                <CheckCircle className="w-10 h-10" style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{message}</p>
                <p className="text-gray-400 mt-1">{employee.firstName} {employee.lastName}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
