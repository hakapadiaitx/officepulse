"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Clock, LogIn, LogOut, Sun, Home, Search, X } from "lucide-react";
import Image from "next/image";
import { PinInput } from "@/components/attendance/PinInput";

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

const statusConfig: Record<Status, { label: string; dot: string; badge: string; textColor: string }> = {
  not_arrived: { label: "Not Arrived",   dot: "bg-gray-300",   badge: "bg-gray-100",  textColor: "text-gray-500" },
  in:          { label: "At Work",       dot: "bg-green-500",  badge: "bg-green-100", textColor: "text-green-700" },
  out:         { label: "Out of Office", dot: "bg-orange-500", badge: "bg-orange-100",textColor: "text-orange-700" },
  left:        { label: "Left for Day",  dot: "bg-gray-400",   badge: "bg-gray-100",  textColor: "text-gray-500" },
};

// btnClass for checkout/leave are static; arrive/return use brandColor via inline style (see render)
const actionConfig: Record<Action, { label: string; btnClass: string; brandBtn: boolean; icon: typeof LogIn; title: string; subtitle: (name: string) => string; confirmLabel: string }> = {
  arrive:   { label: "Arrive",        btnClass: "", brandBtn: true,  icon: Sun,    title: "Good Morning!", subtitle: (n) => `Starting the day for ${n}`, confirmLabel: "Start My Day" },
  checkout: { label: "Check Out",     btnClass: "bg-orange-500 text-white hover:bg-orange-600", brandBtn: false, icon: LogOut, title: "Check Out",    subtitle: (n) => `${n} is stepping out`,     confirmLabel: "Confirm Check Out" },
  return:   { label: "Return",        btnClass: "", brandBtn: true,  icon: LogIn,  title: "Welcome Back!", subtitle: (n) => `${n} is returning`,        confirmLabel: "I'm Back" },
  leave:    { label: "Leave for Day", btnClass: "bg-gray-600 text-white hover:bg-gray-700", brandBtn: false, icon: Home,  title: "End of Day",   subtitle: (n) => `${n} is leaving for today`, confirmLabel: "Leave for Today" },
};

function availableActions(status: Status): Action[] {
  switch (status) {
    case "not_arrived": return ["arrive"];
    case "in":          return ["checkout", "leave"];
    case "out":         return ["return"];
    case "left":        return [];
  }
}

export default function KioskPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tenantName, setTenantName] = useState("");
  const [brandColor, setBrandColor] = useState("#4f46e5");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  // Modal state
  const [selected, setSelected] = useState<{ emp: Employee; action: Action } | null>(null);
  const [pin, setPin] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/kiosk/${slug}/status`);
    if (res.ok) {
      const data = await res.json();
      setTenantName(data.tenantName);
      setEmployees(data.employees);
      if (data.brandColor) setBrandColor(data.brandColor);
      if (data.logoUrl) setLogoUrl(data.logoUrl);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Live clock — initialised client-side only to avoid SSR/hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(fetchStatus, 30000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  function openModal(emp: Employee, action: Action) {
    setSelected({ emp, action });
    setPin("");
    setPurpose("");
    setDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setModalError("");
    setSuccessMsg("");
  }

  function closeModal() {
    setSelected(null);
    setSuccessMsg("");
  }

  async function handleAction() {
    if (!selected) return;
    if (pin.length !== 4) { setModalError("Please enter your 4-digit PIN."); return; }
    if (selected.action === "checkout" && !purpose.trim()) { setModalError("Please enter a purpose."); return; }

    setSubmitting(true);
    setModalError("");

    const res = await fetch(`/api/kiosk/${slug}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: selected.action,
        employeeId: selected.emp.id,
        pin,
        timestamp: new Date(dateTime).toISOString(),
        purpose: purpose || undefined,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setModalError(data.error || "Something went wrong.");
      return;
    }

    const actionLabels: Record<Action, string> = {
      arrive: "Have a great day!",
      checkout: "See you soon!",
      return: "Welcome back!",
      leave: "See you tomorrow!",
    };
    setSuccessMsg(actionLabels[selected.action]);
    await fetchStatus();
    setTimeout(closeModal, 2000);
  }

  const sortOrder: Status[] = ["in", "out", "not_arrived", "left"];
  const query = search.trim().toLowerCase();
  const sorted = [...employees]
    .filter((e) => !query || `${e.firstName} ${e.lastName}`.toLowerCase().includes(query))
    .sort((a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status));

  const counts = {
    in: employees.filter((e) => e.status === "in").length,
    out: employees.filter((e) => e.status === "out").length,
    not_arrived: employees.filter((e) => e.status === "not_arrived").length,
    left: employees.filter((e) => e.status === "left").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white px-6 py-4 flex items-center justify-between" style={{ backgroundColor: brandColor }}>
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
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{now ? format(now, "HH:mm:ss") : "--:--:--"}</p>
          <p className="text-white/70 text-sm">{now ? format(now, "EEEE, MMM d yyyy") : ""}</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-6 flex-wrap">
        {([["in", "At Work", "text-green-600"], ["out", "Out", "text-orange-600"], ["not_arrived", "Not Arrived", "text-gray-500"], ["left", "Left for Day", "text-gray-400"]] as [Status, string, string][]).map(([key, label, color]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-xl font-bold ${color}`}>{counts[key]}</span>
            <span className="text-sm text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Employee grid */}
      <div className="max-w-5xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {sorted.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No employees found for &quot;<span className="font-medium">{search}</span>&quot;</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((emp) => {
              const cfg = statusConfig[emp.status];
              const actions = availableActions(emp.status);
              return (
                <div key={emp.id} className="card p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-lg flex-shrink-0">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{emp.firstName} {emp.lastName}</p>
                      {emp.purpose && emp.status === "out" && (
                        <p className="text-xs text-gray-400 truncate">{emp.purpose}</p>
                      )}
                      {emp.lastAction && (
                        <p className="text-xs text-gray-400">
                          {emp.status === "in" ? "Since" : emp.status === "out" ? "Left at" : emp.status === "left" ? "Left at" : ""}{" "}
                          {emp.lastAction ? format(new Date(emp.lastAction), "h:mm a") : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 self-start text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge} ${cfg.textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>

                  {actions.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {actions.map((action) => {
                        const ac = actionConfig[action];
                        return (
                          <button
                            key={action}
                            onClick={() => openModal(emp, action)}
                            className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 ${ac.brandBtn ? "text-white" : ac.btnClass}`}
                            style={ac.brandBtn ? { backgroundColor: brandColor } : undefined}
                          >
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
          </>
        )}
      </div>

      {/* Action Modal */}
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
                  <div>
                    <label className="label">Date & Time</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  </div>

                  {selected.action === "checkout" && (
                    <div>
                      <label className="label">Purpose / Reason *</label>
                      <input
                        className="input"
                        placeholder="e.g. Client meeting, Lunch..."
                        value={purpose}
                        onChange={(e) => { setPurpose(e.target.value); setModalError(""); }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="label">Your 4-Digit PIN</label>
                    <PinInput value={pin} onChange={(v) => { setPin(v); setModalError(""); }} />
                  </div>

                  {modalError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{modalError}</p>
                  )}

                  <button
                    onClick={handleAction}
                    disabled={submitting}
                    className={`w-full py-3 rounded-xl font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-50 ${actionConfig[selected.action].brandBtn ? "text-white" : actionConfig[selected.action].btnClass}`}
                    style={actionConfig[selected.action].brandBtn ? { backgroundColor: brandColor } : undefined}
                  >
                    {submitting ? "Processing..." : actionConfig[selected.action].confirmLabel}
                  </button>

                  <button onClick={closeModal} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
