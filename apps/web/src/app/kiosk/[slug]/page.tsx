"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Clock, Delete, Sun, LogOut, LogIn, Home, Search, X, Lock } from "lucide-react";
import Image from "next/image";

type Status = "not_arrived" | "in" | "out" | "left";
type Action = "arrive" | "checkout" | "return" | "leave";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  status: Status;
  lastAction: string | null;
  purpose: string | null;
}

interface TenantInfo {
  tenantName: string;
  brandColor: string;
  logoUrl: string | null;
}

const statusConfig: Record<Status, { label: string; dot: string; badge: string; text: string }> = {
  not_arrived: { label: "Not Arrived",   dot: "bg-gray-300",   badge: "bg-gray-100",   text: "text-gray-500"   },
  in:          { label: "At Work",       dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700"  },
  out:         { label: "Out of Office", dot: "bg-orange-500", badge: "bg-orange-100", text: "text-orange-700" },
  left:        { label: "Left for Day",  dot: "bg-gray-400",   badge: "bg-gray-100",   text: "text-gray-500"   },
};

const actionConfig: Record<Action, { label: string; icon: typeof Sun; title: string; subtitle: (n: string) => string; confirm: string; brand: boolean; cls: string }> = {
  arrive:   { label: "Arrive",        icon: Sun,    title: "Good Morning!",  subtitle: (n) => `Starting the day for ${n}`,     confirm: "Start My Day",       brand: true,  cls: "" },
  checkout: { label: "Check Out",     icon: LogOut, title: "Check Out",      subtitle: (n) => `${n} is stepping out`,          confirm: "Confirm Check Out",  brand: false, cls: "bg-orange-500 text-white hover:bg-orange-600" },
  return:   { label: "Return",        icon: LogIn,  title: "Welcome Back!",  subtitle: (n) => `${n} is returning`,             confirm: "I'm Back",           brand: true,  cls: "" },
  leave:    { label: "Leave for Day", icon: Home,   title: "End of Day",     subtitle: (n) => `${n} is leaving for today`,     confirm: "Leave for Today",    brand: false, cls: "bg-gray-600 text-white hover:bg-gray-700" },
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

  // Screens: "pin" | "unlocked"
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);

  // Employee list
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");

  // Action modal
  const [selected, setSelected] = useState<{ emp: Employee; action: Action } | null>(null);
  const [purpose, setPurpose] = useState("");
  const [empPin, setEmpPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load branding from status endpoint (public, no PIN needed)
  useEffect(() => {
    fetch(`/api/kiosk/${slug}/status`)
      .then((r) => r.json())
      .then((d) => setTenant({ tenantName: d.tenantName ?? "", brandColor: d.brandColor ?? "#4f46e5", logoUrl: d.logoUrl ?? null }))
      .catch(() => {});
  }, [slug]);

  // Live clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshEmployees = useCallback(async () => {
    const res = await fetch(`/api/kiosk/${slug}/status`);
    if (res.ok) {
      const d = await res.json();
      setEmployees(d.employees ?? []);
    }
  }, [slug]);

  // Auto-refresh every 30s when unlocked
  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(refreshEmployees, 30000);
    return () => clearInterval(t);
  }, [unlocked, refreshEmployees]);

  // --- PIN screen ---
  function handleKey(key: string) {
    if (pinChecking) return;
    setPinError("");
    if (key === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (key === "✓") { if (pin.length === 4) submitPin(pin); return; }
    if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      if (next.length === 4) setTimeout(() => submitPin(next), 150);
    }
  }

  async function submitPin(pinValue: string) {
    setPinChecking(true);
    setPinError("");
    const res = await fetch(`/api/kiosk/${slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinValue }),
    });
    const data = await res.json();
    setPinChecking(false);
    if (!res.ok) {
      setPinError(data.error ?? "Incorrect PIN.");
      setPin("");
      return;
    }
    setTenant({ tenantName: data.tenantName, brandColor: data.brandColor, logoUrl: data.logoUrl });
    setEmployees(data.employees ?? []);
    setPin("");
    setUnlocked(true);
  }

  function lock() {
    setUnlocked(false);
    setPin("");
    setPinError("");
    setSelected(null);
    setSearch("");
  }

  // --- Action modal ---
  function openModal(emp: Employee, action: Action) {
    setSelected({ emp, action });
    setPurpose("");
    setEmpPin("");
    setModalError("");
    setSuccessMsg("");
  }

  function closeModal() { setSelected(null); setSuccessMsg(""); setEmpPin(""); }

  async function handleAction() {
    if (!selected) return;
    if (empPin.length !== 4) { setModalError("Please enter your 4-digit PIN."); return; }
    if (selected.action === "checkout" && !purpose.trim()) { setModalError("Please enter a purpose."); return; }
    setSubmitting(true);
    setModalError("");
    const res = await fetch(`/api/kiosk/${slug}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: selected.action,
        employeeId: selected.emp.id,
        pin: empPin,
        timestamp: new Date().toISOString(),
        purpose: purpose || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setModalError(data.error ?? "Something went wrong."); return; }
    const msgs: Record<Action, string> = { arrive: "Have a great day!", checkout: "See you soon!", return: "Welcome back!", leave: "See you tomorrow!" };
    setSuccessMsg(msgs[selected.action]);
    await refreshEmployees();
    setTimeout(closeModal, 2000);
  }

  const { brandColor, tenantName, logoUrl } = tenant;
  const query = search.trim().toLowerCase();
  const sorted = [...employees]
    .filter((e) => !query || `${e.firstName} ${e.lastName}`.toLowerCase().includes(query))
    .sort((a, b) => {
      const order: Status[] = ["in", "out", "not_arrived", "left"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

  const counts = {
    in: employees.filter((e) => e.status === "in").length,
    out: employees.filter((e) => e.status === "out").length,
    not_arrived: employees.filter((e) => e.status === "not_arrived").length,
    left: employees.filter((e) => e.status === "left").length,
  };

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = () => (
    <div className="text-white px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: brandColor }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-1">
          {logoUrl
            ? <Image src={logoUrl} alt="Logo" width={56} height={56} className="w-full h-full object-contain" />
            : <Clock className="w-7 h-7" style={{ color: brandColor }} />}
        </div>
        <div>
          <p className="font-bold text-xl">{tenantName || "OfficePulse"}</p>
          <p className="text-white/70 text-sm">Attendance Terminal</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{now ? format(now, "HH:mm:ss") : "--:--:--"}</p>
          <p className="text-white/70 text-sm">{now ? format(now, "EEEE, MMM d yyyy") : ""}</p>
        </div>
        {unlocked && (
          <button onClick={lock} className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors">
            <Lock className="w-4 h-4" /> Lock
          </button>
        )}
      </div>
    </div>
  );

  // ── PIN screen ─────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xs">
            <div className="card p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">Enter Kiosk PIN</p>
                <p className="text-sm text-gray-400 mt-1">to access the attendance terminal</p>
              </div>

              <div className="flex gap-4">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{ backgroundColor: pin.length > i ? brandColor : "transparent", borderColor: pin.length > i ? brandColor : "#d1d5db" }} />
                ))}
              </div>

              {pinError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center w-full">{pinError}</p>
              )}

              {pinChecking ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: "transparent" }} />
                  <p className="text-sm text-gray-400">Verifying…</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 w-full">
                  {NUMPAD.map((key) => (
                    <button key={key} onClick={() => handleKey(key)}
                      className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-95 select-none ${
                        key === "✓" ? "text-white shadow-md" :
                        key === "⌫" ? "bg-gray-100 text-gray-600 hover:bg-gray-200" :
                        "bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm"
                      }`}
                      style={key === "✓" ? { backgroundColor: brandColor } : undefined}>
                      {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Employee list (unlocked) ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-6 flex-wrap">
        {(["in","out","not_arrived","left"] as Status[]).map((key) => {
          const labels: Record<Status,string> = { in:"At Work", out:"Out", not_arrived:"Not Arrived", left:"Left for Day" };
          const colors: Record<Status,string> = { in:"text-green-600", out:"text-orange-600", not_arrived:"text-gray-500", left:"text-gray-400" };
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-xl font-bold ${colors[key]}`}>{counts[key]}</span>
              <span className="text-sm text-gray-500">{labels[key]}</span>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Employee grid */}
      <div className="max-w-5xl mx-auto w-full p-6">
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No employees found{search ? ` for "${search}"` : ""}.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((emp) => {
              const cfg = statusConfig[emp.status];
              const actions = availableActions(emp.status);
              return (
                <div key={emp.id} className="card p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: brandColor }}>
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{emp.firstName} {emp.lastName}</p>
                      {emp.purpose && emp.status === "out" && <p className="text-xs text-gray-400 truncate">{emp.purpose}</p>}
                      {emp.lastAction && (
                        <p className="text-xs text-gray-400">
                          {emp.status === "in" ? "Since " : emp.status === "left" ? "Left at " : emp.status === "out" ? "Out at " : ""}
                          {format(new Date(emp.lastAction), "h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 self-start text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>

                  {actions.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {actions.map((action) => {
                        const ac = actionConfig[action];
                        return (
                          <button key={action} onClick={() => openModal(emp, action)}
                            className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 ${ac.brand ? "text-white" : ac.cls}`}
                            style={ac.brand ? { backgroundColor: brandColor } : undefined}>
                            {ac.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No actions available</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {successMsg ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{successMsg}</p>
                <p className="text-gray-500 mt-2">{selected.emp.firstName} {selected.emp.lastName}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">{actionConfig[selected.action].title}</p>
                    <p className="text-sm text-gray-500">{actionConfig[selected.action].subtitle(`${selected.emp.firstName} ${selected.emp.lastName}`)}</p>
                  </div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                  {selected.action === "checkout" && (
                    <div>
                      <label className="label">Purpose / Reason <span className="text-red-400">*</span></label>
                      <input className="input" placeholder="e.g. Client meeting, Lunch…" value={purpose}
                        onChange={(e) => { setPurpose(e.target.value); setModalError(""); }} />
                    </div>
                  )}

                  {/* Employee PIN */}
                  <div>
                    <label className="label">Your 4-digit PIN</label>
                    <div className="relative mt-1">
                      {/* Dot display */}
                      <div className="flex gap-3 justify-center py-3 pointer-events-none select-none">
                        {[0,1,2,3].map((i) => (
                          <div key={i} className="w-4 h-4 rounded-full border-2 transition-all"
                            style={{ backgroundColor: empPin.length > i ? brandColor : "transparent", borderColor: empPin.length > i ? brandColor : "#d1d5db" }} />
                        ))}
                      </div>
                      {/* Invisible input captures taps and opens number keyboard */}
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        autoComplete="off"
                        value={empPin}
                        onChange={(e) => { setEmpPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setModalError(""); }}
                        autoFocus
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-1">Tap above and enter your PIN on the keyboard</p>
                  </div>

                  {modalError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{modalError}</p>
                  )}
                  <button onClick={handleAction} disabled={submitting || empPin.length !== 4}
                    className={`w-full py-3 rounded-xl font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-50 ${actionConfig[selected.action].brand ? "text-white" : actionConfig[selected.action].cls}`}
                    style={actionConfig[selected.action].brand ? { backgroundColor: brandColor } : undefined}>
                    {submitting ? "Processing…" : actionConfig[selected.action].confirm}
                  </button>
                  <button onClick={closeModal} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
