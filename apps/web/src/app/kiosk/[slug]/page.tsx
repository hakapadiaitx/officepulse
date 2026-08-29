"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Delete, Sun, LogOut, LogIn, Home, Search, X, Lock, Pencil, Plus, Trash2, ChevronLeft, ChevronRight, Check, CalendarDays, ClipboardList, MapPin } from "lucide-react";
import Image from "next/image";
import { BrandColorInjector } from "@/components/layout/BrandColorProvider";

type Status = "not_arrived" | "in" | "out" | "left" | "on_leave";
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
  requireGeolocation: boolean;
}

interface AttendanceLog {
  id: string;
  employeeId: string;
  checkInTime: string;
  checkOutTime: string | null;
  isEndOfDay: boolean;
  purpose: string | null;
  notes: string | null;
}

const statusConfig: Record<Status, { label: string; dot: string; badge: string; text: string }> = {
  not_arrived: { label: "Not Arrived",   dot: "bg-gray-300",   badge: "bg-gray-100",   text: "text-gray-500"   },
  in:          { label: "At Work",       dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700"  },
  out:         { label: "Out of Office", dot: "bg-orange-500", badge: "bg-orange-100", text: "text-orange-700" },
  left:        { label: "Left for Day",  dot: "bg-gray-400",   badge: "bg-gray-100",   text: "text-gray-500"   },
  on_leave:    { label: "On Leave",      dot: "bg-blue-400",   badge: "bg-blue-50",    text: "text-blue-600"   },
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
    case "on_leave":    return [];
  }
}

const NUMPAD = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function toLocalInput(iso: string) { return format(new Date(iso), "yyyy-MM-dd'T'HH:mm"); }
function toUtcIso(local: string)   { return new Date(local).toISOString(); }

// ── KioskEditModal ─────────────────────────────────────────────────────────────
interface SessionRow extends AttendanceLog {
  dirty: boolean;
  saving: boolean;
  error: string;
}

interface KioskEditModalProps {
  employee: Employee;
  todayDate: string;
  kioskToken: string;
  brandColor: string;
  onClose: () => void;
}

function KioskEditModal({ employee, todayDate, kioskToken, brandColor, onClose }: KioskEditModalProps) {
  const [date, setDate]           = useState(todayDate);
  const [sessions, setSessions]   = useState<SessionRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [showAdd, setShowAdd]       = useState(false);
  const [newIn, setNewIn]           = useState("");
  const [newOut, setNewOut]         = useState("");
  const [newEod, setNewEod]         = useState(false);
  const [newPurpose, setNewPurpose] = useState("");
  const [addingNew, setAddingNew]   = useState(false);
  const [newError, setNewError]     = useState("");

  const authHeader = { "Authorization": `Bearer ${kioskToken}`, "Content-Type": "application/json" };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setGlobalError("");
    try {
      const res = await fetch(
        `/api/admin/attendance?employeeId=${employee.id}&date=${date}`,
        { headers: { Authorization: `Bearer ${kioskToken}` } }
      );
      if (!res.ok) throw new Error("Failed to load sessions");
      const data: AttendanceLog[] = await res.json();
      setSessions(data.map((l) => ({ ...l, dirty: false, saving: false, error: "" })));
    } catch {
      setGlobalError("Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, [employee.id, date, kioskToken]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function updateField(id: string, field: string, value: string | boolean | null) {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value, dirty: true, error: "" } : s));
  }

  async function saveSession(id: string) {
    const s = sessions.find((x) => x.id === id)!;
    setSessions((prev) => prev.map((x) => x.id === id ? { ...x, saving: true, error: "" } : x));
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, {
        method: "PATCH",
        headers: authHeader,
        body: JSON.stringify({
          checkInTime:  toUtcIso(toLocalInput(s.checkInTime)),
          checkOutTime: s.checkOutTime ? toUtcIso(toLocalInput(s.checkOutTime)) : null,
          isEndOfDay:   s.isEndOfDay,
          purpose:      s.purpose,
          notes:        s.notes,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Save failed"); }
      const updated: AttendanceLog = await res.json();
      setSessions((prev) => prev.map((x) => x.id === id ? { ...updated, dirty: false, saving: false, error: "" } : x));
    } catch (err: unknown) {
      setSessions((prev) => prev.map((x) => x.id === id ? { ...x, saving: false, error: (err as Error).message } : x));
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    setSessions((prev) => prev.map((x) => x.id === id ? { ...x, saving: true } : x));
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: "DELETE", headers: authHeader });
      if (!res.ok) throw new Error("Delete failed");
      setSessions((prev) => prev.filter((x) => x.id !== id));
    } catch (err: unknown) {
      setSessions((prev) => prev.map((x) => x.id === id ? { ...x, saving: false, error: (err as Error).message } : x));
    }
  }

  async function addSession() {
    setNewError("");
    if (!newIn) { setNewError("Check-in time is required."); return; }
    if (newOut && newOut <= newIn) { setNewError("Check-out must be after check-in."); return; }
    setAddingNew(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          employeeId:   employee.id,
          checkInTime:  toUtcIso(newIn),
          checkOutTime: newOut ? toUtcIso(newOut) : null,
          isEndOfDay:   newOut ? newEod : false,
          purpose:      newOut && !newEod ? newPurpose : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Add failed"); }
      const created: AttendanceLog = await res.json();
      setSessions((prev) =>
        [...prev, { ...created, dirty: false, saving: false, error: "" }]
          .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime())
      );
      setNewIn(""); setNewOut(""); setNewEod(false); setNewPurpose(""); setShowAdd(false);
    } catch (err: unknown) {
      setNewError((err as Error).message);
    } finally {
      setAddingNew(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Attendance</h2>
            <p className="text-sm text-gray-500 mt-0.5">{employee.firstName} {employee.lastName}</p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date picker */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Date</span>
          <button
            onClick={() => {
              const d = new Date(date + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() - 1);
              setDate(d.toISOString().slice(0, 10));
            }}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            max={todayDate}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ colorScheme: "light" }}
          />
          <button
            onClick={() => {
              const d = new Date(date + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() + 1);
              const next = d.toISOString().slice(0, 10);
              if (next <= todayDate) setDate(next);
            }}
            disabled={date >= todayDate}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {globalError && <p className="text-sm text-red-500 text-center">{globalError}</p>}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: "transparent" }} />
            </div>
          ) : sessions.length === 0 && !showAdd ? (
            <p className="text-sm text-gray-400 text-center py-8">No sessions for this date.</p>
          ) : null}

          {sessions.map((s, i) => (
            <div key={s.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session {i + 1}</span>
                <button
                  onClick={() => deleteSession(s.id)}
                  disabled={s.saving}
                  className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Check-in</label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(s.checkInTime)}
                    onChange={(e) => updateField(s.id, "checkInTime", e.target.value ? toUtcIso(e.target.value) : s.checkInTime)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ colorScheme: "light" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Check-out</label>
                  <input
                    type="datetime-local"
                    value={s.checkOutTime ? toLocalInput(s.checkOutTime) : ""}
                    onChange={(e) => updateField(s.id, "checkOutTime", e.target.value ? toUtcIso(e.target.value) : null)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ colorScheme: "light" }}
                  />
                </div>
              </div>

              {s.checkOutTime && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={s.isEndOfDay}
                      onChange={(e) => updateField(s.id, "isEndOfDay", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Left for the day
                  </label>
                  {!s.isEndOfDay && (
                    <input
                      type="text"
                      placeholder="Reason (e.g. lunch)"
                      value={s.purpose ?? ""}
                      onChange={(e) => updateField(s.id, "purpose", e.target.value || null)}
                      className="flex-1 min-w-[120px] text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>
              )}

              {s.error && <p className="text-xs text-red-500">{s.error}</p>}

              {s.dirty && (
                <button
                  onClick={() => saveSession(s.id)}
                  disabled={s.saving}
                  className="flex items-center gap-2 text-sm px-4 py-2.5 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: brandColor }}
                >
                  {s.saving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save changes
                </button>
              )}
            </div>
          ))}

          {/* Add session */}
          {showAdd ? (
            <div className="rounded-2xl border-2 border-dashed p-4 space-y-3" style={{ borderColor: brandColor + "60" }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: brandColor }}>New Session</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Check-in *</label>
                  <input
                    type="datetime-local"
                    value={newIn}
                    onChange={(e) => setNewIn(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ colorScheme: "light" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Check-out</label>
                  <input
                    type="datetime-local"
                    value={newOut}
                    onChange={(e) => setNewOut(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ colorScheme: "light" }}
                  />
                </div>
              </div>
              {newOut && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newEod}
                      onChange={(e) => setNewEod(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Left for the day
                  </label>
                  {!newEod && (
                    <input
                      type="text"
                      placeholder="Reason (e.g. lunch)"
                      value={newPurpose}
                      onChange={(e) => setNewPurpose(e.target.value)}
                      className="flex-1 min-w-[120px] text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>
              )}
              {newError && <p className="text-xs text-red-500">{newError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addSession}
                  disabled={addingNew}
                  className="flex items-center gap-2 text-sm px-4 py-2.5 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: brandColor }}
                >
                  {addingNew ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Session
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewError(""); }}
                  className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            !loading && (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Session
              </button>
            )
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KioskLeaveModal ────────────────────────────────────────────────────────────
type LeaveType   = "ANNUAL" | "SICK" | "PERSONAL" | "OTHER";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

const leaveTypeLabels: Record<LeaveType, string> = {
  ANNUAL: "Annual Leave", SICK: "Sick Leave", PERSONAL: "Personal", OTHER: "Other",
};

const leaveStatusConfig: Record<LeaveStatus, { label: string; badge: string; text: string }> = {
  PENDING:  { label: "Pending",  badge: "bg-amber-100",  text: "text-amber-700"  },
  APPROVED: { label: "Approved", badge: "bg-green-100",  text: "text-green-700"  },
  REJECTED: { label: "Rejected", badge: "bg-red-100",    text: "text-red-600"    },
};

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  adminNote: string | null;
  createdAt: string;
}

interface KioskLeaveModalProps {
  employee: Employee;
  slug: string;
  brandColor: string;
  onClose: () => void;
}

// ── Shared PIN pad used by both tabs ─────────────────────────────────────────
function PinPad({ pin, onKey, brandColor }: { pin: string; onKey: (k: string) => void; brandColor: string }) {
  return (
    <>
      <div className="flex gap-3 justify-center mb-3">
        {[0,1,2,3].map((i) => (
          <div key={i} className="w-4 h-4 rounded-full border-2 transition-all"
            style={{ backgroundColor: pin.length > i ? brandColor : "transparent", borderColor: pin.length > i ? brandColor : "#d1d5db" }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {NUMPAD.map((k) => (
          <button key={k} type="button" onClick={() => onKey(k)}
            className={`py-3 rounded-xl text-lg font-semibold transition-all active:scale-95 ${
              k === "✓" ? "text-white" :
              k === "⌫" ? "bg-gray-100 text-gray-700 hover:bg-gray-200" :
              "bg-gray-50 text-gray-900 hover:bg-gray-100"
            }`}
            style={k === "✓" ? { backgroundColor: brandColor } : undefined}>
            {k === "⌫" ? <Delete className="w-4 h-4 mx-auto" /> : k}
          </button>
        ))}
      </div>
    </>
  );
}

function KioskLeaveModal({ employee, slug, brandColor, onClose }: KioskLeaveModalProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [tab, setTab] = useState<"new" | "status">("new");

  // ── New Request state ──────────────────────────────────────────────────────
  const [startDate,  setStartDate]  = useState(today);
  const [endDate,    setEndDate]    = useState(today);
  const [type,       setType]       = useState<LeaveType>("ANNUAL");
  const [reason,     setReason]     = useState("");
  const [newPin,     setNewPin]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newError,   setNewError]   = useState("");
  const [submitted,  setSubmitted]  = useState(false);

  function handleNewKey(key: string) {
    setNewError("");
    if (key === "⌫") { setNewPin((p) => p.slice(0, -1)); return; }
    if (key === "✓") { if (newPin.length === 4 && !submitting) submitNew(); return; }
    if (newPin.length < 4) setNewPin((p) => p + key);
  }

  async function submitNew() {
    if (endDate < startDate) { setNewError("End date must be on or after start date."); return; }
    setSubmitting(true);
    setNewError("");
    try {
      const res = await fetch(`/api/kiosk/${slug}/leave-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, pin: newPin, startDate, endDate, type, reason: reason || null }),
      });
      const data = await res.json();
      if (!res.ok) { setNewError(data.error ?? "Failed to submit."); setNewPin(""); return; }
      setSubmitted(true);
      setTimeout(onClose, 2500);
    } catch {
      setNewError("Network error. Please try again.");
      setNewPin("");
    } finally {
      setSubmitting(false);
    }
  }

  // ── My Requests state ──────────────────────────────────────────────────────
  const [statusPin,   setStatusPin]   = useState("");
  const [fetching,    setFetching]    = useState(false);
  const [statusError, setStatusError] = useState("");
  const [myLeaves,    setMyLeaves]    = useState<LeaveRecord[] | null>(null);
  const [myBalance,   setMyBalance]   = useState<Record<string, { used: number; allowed: number }> | null>(null);
  const [balanceYear, setBalanceYear] = useState<number | null>(null);

  function handleStatusKey(key: string) {
    setStatusError("");
    if (key === "⌫") { setStatusPin((p) => p.slice(0, -1)); return; }
    if (key === "✓") { if (statusPin.length === 4 && !fetching) fetchMyLeaves(); return; }
    if (statusPin.length < 4) setStatusPin((p) => p + key);
  }

  async function fetchMyLeaves() {
    setFetching(true);
    setStatusError("");
    try {
      const res = await fetch(`/api/kiosk/${slug}/my-leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, pin: statusPin }),
      });
      const data = await res.json();
      if (!res.ok) { setStatusError(data.error ?? "Failed to load."); setStatusPin(""); return; }
      setMyLeaves(data.leaves);
      setMyBalance(data.balance ?? null);
      setBalanceYear(data.year ?? null);
    } catch {
      setStatusError("Network error. Please try again.");
      setStatusPin("");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[95vh] overflow-y-auto">

        {/* Success screen */}
        {submitted ? (
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Request Submitted!</p>
            <p className="text-sm text-gray-500">Your leave request has been sent to the admin for approval.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Leave</h2>
                <p className="text-sm text-gray-500">{employee.firstName} {employee.lastName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mx-5 mt-3 mb-1 bg-gray-100 rounded-xl p-1">
              {(["new", "status"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}>
                  {t === "new" ? "New Request" : "My Requests"}
                </button>
              ))}
            </div>

            {/* ── Tab: New Request ── */}
            {tab === "new" && (
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label>
                    <input type="date" value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ colorScheme: "light" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date</label>
                    <input type="date" value={endDate} min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ colorScheme: "light" }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Leave Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as LeaveType)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    {(Object.entries(leaveTypeLabels) as [LeaveType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="Add a note…" rows={2}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Your 4-digit PIN to confirm</label>
                  <PinPad pin={newPin} onKey={handleNewKey} brandColor={brandColor} />
                </div>

                {newError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{newError}</p>}

                <button onClick={submitNew} disabled={submitting || newPin.length !== 4}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: brandColor }}>
                  {submitting ? "Submitting…" : "Submit Leave Request"}
                </button>
                <button onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            )}

            {/* ── Tab: My Requests ── */}
            {tab === "status" && (
              <div className="px-5 py-4 space-y-3">
                {myLeaves === null ? (
                  <>
                    <p className="text-xs text-gray-500 text-center">Enter your PIN to view your leave requests</p>
                    <PinPad pin={statusPin} onKey={handleStatusKey} brandColor={brandColor} />
                    {statusError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{statusError}</p>}
                    <button onClick={fetchMyLeaves} disabled={fetching || statusPin.length !== 4}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: brandColor }}>
                      {fetching ? "Loading…" : "View My Requests"}
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                  </>
                ) : (
                  <div className="space-y-3">
                    {/* Balance summary */}
                    {myBalance && (
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Leave Balance {balanceYear}
                        </p>
                        {(["ANNUAL","SICK","PERSONAL","OTHER"] as const).map((type) => {
                          const { used, allowed } = myBalance[type] ?? { used: 0, allowed: 0 };
                          if (allowed === 0 && used === 0) return null;
                          const pct = allowed > 0 ? Math.min((used / allowed) * 100, 100) : 0;
                          const remaining = allowed - used;
                          const barColor = pct >= 100 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-green-500";
                          const textColor = pct >= 100 ? "text-red-600" : pct >= 75 ? "text-amber-600" : "text-green-700";
                          return (
                            <div key={type}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs text-gray-600">{leaveTypeLabels[type]}</span>
                                <span className={`text-xs font-semibold ${textColor}`}>
                                  {used}/{allowed}d
                                  {allowed > 0 && (
                                    <span className="text-gray-400 font-normal ml-1">
                                      ({remaining > 0 ? `${remaining}d left` : remaining === 0 ? "none left" : `${Math.abs(remaining)}d over`})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Request history */}
                    {myLeaves && myLeaves.length === 0 ? (
                      <div className="text-center py-6 flex flex-col items-center gap-3 text-gray-400">
                        <CalendarDays className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No leave requests yet.</p>
                        <button onClick={() => setTab("new")} className="text-sm font-semibold" style={{ color: brandColor }}>
                          Submit your first request →
                        </button>
                      </div>
                    ) : (
                      myLeaves && myLeaves.map((leave) => {
                        const days = Math.round(
                          (new Date(leave.endDate + "T12:00:00Z").getTime() - new Date(leave.startDate + "T12:00:00Z").getTime()) / 86400000
                        ) + 1;
                        const sc = leaveStatusConfig[leave.status];
                        return (
                          <div key={leave.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-900">{leaveTypeLabels[leave.type] ?? leave.type}</span>
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sc.badge} ${sc.text}`}>{sc.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{leave.startDate} → {leave.endDate} · {days} day{days !== 1 ? "s" : ""}</p>
                            {leave.reason && <p className="text-xs text-gray-400 italic">"{leave.reason}"</p>}
                            {leave.adminNote && (
                              <p className={`text-xs rounded-lg px-2.5 py-1.5 ${
                                leave.status === "REJECTED" ? "bg-red-50 text-red-700" :
                                leave.status === "APPROVED" ? "bg-green-50 text-green-700" :
                                "bg-gray-50 text-gray-600"
                              }`}>
                                <span className="font-semibold">Admin note:</span> {leave.adminNote}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}

                    <button onClick={() => { setMyLeaves(null); setMyBalance(null); setStatusPin(""); }}
                      className="w-full py-2 text-xs text-gray-400 hover:text-gray-600">
                      Check again with different PIN
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Kiosk Page ────────────────────────────────────────────────────────────

export default function KioskPage() {
  const { slug } = useParams<{ slug: string }>();

  const [tenant, setTenant] = useState<TenantInfo>({ tenantName: "", brandColor: "#4f46e5", logoUrl: null, requireGeolocation: false });
  const [now, setNow] = useState<Date | null>(null);

  // Screens: "pin" | "unlocked"
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);
  const [kioskToken, setKioskToken] = useState("");

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

  // Admin correction modal
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  // Leave request modal
  const [leaveEmployee, setLeaveEmployee] = useState<Employee | null>(null);

  // Kiosk main view
  const [kioskView, setKioskView] = useState<"attendance" | "upcoming" | "schedule">("attendance");

  // Upcoming leaves
  interface UpcomingDay { date: string; employees: { name: string; type: string; startDate: string; endDate: string }[] }
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingDay[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingLoaded, setUpcomingLoaded]   = useState(false);

  // Schedule — PIN-gated personal view
  interface MyScheduleEntry { startTime: string; endTime: string; label: string | null; notes: string | null }
  const [schedulePin, setSchedulePin]         = useState("");
  const [scheduleEmployee, setScheduleEmployee] = useState<{ id: string; name: string } | null>(null);
  const [scheduleByDate, setScheduleByDate]   = useState<Record<string, MyScheduleEntry[]>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError]     = useState("");
  const [scheduleStart, setScheduleStart]     = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Geolocation
  type GeoState = "idle" | "requesting" | "granted" | "denied" | "unavailable";
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoPlace, setGeoPlace] = useState<string | null>(null);

  function requestKioskLocation() {
    if (!navigator.geolocation) { setGeoState("unavailable"); return; }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoCoords({ lat, lng });
        setGeoState("granted");
        const { reverseGeocode } = await import("@/lib/geocode");
        const name = await reverseGeocode(lat, lng);
        setGeoPlace(name);
      },
      () => setGeoState("denied"),
      { timeout: 10000 }
    );
  }

  // Trigger permission request whenever requireGeolocation turns on
  useEffect(() => {
    if (tenant.requireGeolocation && geoState === "idle") requestKioskLocation();
  }, [tenant.requireGeolocation]);

  const todayDate = format(new Date(), "yyyy-MM-dd");

  // Load branding from status endpoint (public, no PIN needed)
  useEffect(() => {
    fetch(`/api/kiosk/${slug}/status?localDate=${todayDate}`)
      .then((r) => r.json())
      .then((d) => setTenant({ tenantName: d.tenantName ?? "", brandColor: d.brandColor ?? "#4f46e5", logoUrl: d.logoUrl ?? null, requireGeolocation: d.requireGeolocation ?? false }))
      .catch(() => {});
  }, [slug, todayDate]);

  // Live clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshEmployees = useCallback(async () => {
    const res = await fetch(`/api/kiosk/${slug}/status?localDate=${format(new Date(), "yyyy-MM-dd")}`);
    if (res.ok) {
      const d = await res.json();
      setEmployees(d.employees ?? []);
    }
  }, [slug]);

  const fetchUpcomingLeaves = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const res = await fetch(`/api/kiosk/${slug}/upcoming-leaves`);
      if (res.ok) {
        const d = await res.json();
        setUpcomingLeaves(d.days ?? []);
        setUpcomingLoaded(true);
      }
    } finally {
      setUpcomingLoading(false);
    }
  }, [slug]);

  const fetchMySchedule = useCallback(async (pin: string, start: string) => {
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const res = await fetch(`/api/kiosk/${slug}/my-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, start }),
      });
      const d = await res.json();
      if (!res.ok) { setScheduleError(d.error ?? "Invalid PIN"); return; }
      setScheduleEmployee(d.employee);
      setScheduleByDate(d.byDate ?? {});
    } finally {
      setScheduleLoading(false);
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
      body: JSON.stringify({ pin: pinValue, localDate: format(new Date(), "yyyy-MM-dd") }),
    });
    const data = await res.json();
    setPinChecking(false);
    if (!res.ok) {
      setPinError(data.error ?? "Incorrect PIN.");
      setPin("");
      return;
    }
    setTenant((prev) => ({ tenantName: data.tenantName, brandColor: data.brandColor, logoUrl: data.logoUrl, requireGeolocation: data.requireGeolocation ?? prev.requireGeolocation }));
    setEmployees(data.employees ?? []);
    setKioskToken(data.kioskToken ?? "");
    setPin("");
    setUnlocked(true);
  }

  function lock() {
    setUnlocked(false);
    setPin("");
    setPinError("");
    setSelected(null);
    setSearch("");
    setKioskToken("");
    setEditEmployee(null);
    setLeaveEmployee(null);
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

  function handleEmpKey(key: string) {
    setModalError("");
    if (key === "⌫") { setEmpPin((p) => p.slice(0, -1)); return; }
    if (key === "✓") { if (empPin.length === 4 && !submitting) handleAction(); return; }
    if (empPin.length < 4) setEmpPin((p) => p + key);
  }

  async function handleAction() {
    if (!selected) return;
    if (empPin.length !== 4) { setModalError("Please enter your 4-digit PIN."); return; }
    if (selected.action === "checkout" && !purpose.trim()) { setModalError("Please enter a purpose."); return; }
    setSubmitting(true);
    setModalError("");

    let lat: number | undefined;
    let lng: number | undefined;

    if (tenant.requireGeolocation) {
      if (geoState === "denied" || geoState === "unavailable") {
        setSubmitting(false);
        setModalError("Location access is required. Please allow location in this device's settings and refresh the page.");
        return;
      }
      if (geoState === "granted" && geoCoords) {
        lat = geoCoords.lat;
        lng = geoCoords.lng;
      } else {
        // Re-request in case permission was just granted
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setGeoCoords({ lat, lng });
          setGeoState("granted");
          const { reverseGeocode } = await import("@/lib/geocode");
          const name = await reverseGeocode(lat, lng);
          setGeoPlace(name);
        } catch {
          setSubmitting(false);
          setGeoState("denied");
          setModalError("Location access is required. Please allow location in this device's settings and refresh the page.");
          return;
        }
      }
    }

    const res = await fetch(`/api/kiosk/${slug}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: selected.action,
        employeeId: selected.emp.id,
        pin: empPin,
        timestamp: new Date().toISOString(),
        localDate: format(new Date(), "yyyy-MM-dd"),
        purpose: purpose || undefined,
        ...(lat != null && lng != null ? { lat, lng, place: geoPlace ?? undefined } : {}),
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
    on_leave: employees.filter((e) => e.status === "on_leave").length,
  };

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = () => (
    <div className="text-white px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: brandColor }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-1">
          <Image
              src={logoUrl || "/logo.PNG"}
              alt="Logo"
              width={56} height={56}
              className="w-full h-full object-contain"
            />
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
        <BrandColorInjector color={brandColor} />
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
      <BrandColorInjector color={brandColor} />
      <Header />

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-6 flex-wrap">
        {(["in","out","not_arrived","on_leave","left"] as Status[]).map((key) => {
          const labels: Record<Status,string> = { in:"At Work", out:"Out", not_arrived:"Not Arrived", left:"Left for Day", on_leave:"On Leave" };
          const colors: Record<Status,string> = { in:"text-green-600", out:"text-orange-600", not_arrived:"text-gray-500", left:"text-gray-400", on_leave:"text-blue-500" };
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-xl font-bold ${colors[key]}`}>{counts[key]}</span>
              <span className="text-sm text-gray-500">{labels[key]}</span>
            </div>
          );
        })}
      </div>

      {/* Location banner — shown when geo is required */}
      {tenant.requireGeolocation && (
        <div className={`px-6 py-2 flex items-center gap-3 text-sm ${
          geoState === "granted" ? "bg-green-50 text-green-700 border-b border-green-100" :
          geoState === "denied" || geoState === "unavailable" ? "bg-red-50 text-red-700 border-b border-red-100" :
          "bg-amber-50 text-amber-700 border-b border-amber-100"
        }`}>
          <MapPin className="w-4 h-4 flex-shrink-0" />
          {geoState === "granted" && <span>Location ready{geoPlace ? `: ${geoPlace}` : " ✓"} — will be recorded on each check-in and check-out.</span>}
          {geoState === "requesting" && <span>Requesting location access…</span>}
          {geoState === "denied" && (
            <span>
              Location access is denied. Go to your browser or device settings to allow location, then{" "}
              <button onClick={requestKioskLocation} className="underline font-semibold">retry</button>.
            </span>
          )}
          {geoState === "unavailable" && <span>Location services are not available on this device. Contact your administrator.</span>}
          {geoState === "idle" && (
            <span>
              Location required for check-in and check-out.{" "}
              <button onClick={requestKioskLocation} className="underline font-semibold">Enable location</button>
            </span>
          )}
        </div>
      )}

      {/* View toggle */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-5">
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 w-fit">
          {([ ["attendance", "Attendance", null], ["upcoming", "Upcoming Leaves", CalendarDays], ["schedule", "Schedule", ClipboardList] ] as const).map(([key, label, Icon]) => (
            <button key={key}
              onClick={() => {
                setKioskView(key);
                if (key === "upcoming" && !upcomingLoaded) fetchUpcomingLeaves();
                if (key !== "schedule") { setSchedulePin(""); setScheduleEmployee(null); setScheduleError(""); }
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                kioskView === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}>
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {kioskView === "upcoming" ? (
        /* ── Upcoming Leaves view ── */
        <div className="max-w-5xl mx-auto w-full p-6">
          {upcomingLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: brandColor }} />
            </div>
          ) : upcomingLeaves.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No approved leaves in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingLeaves.map(({ date, employees: emps }) => {
                const d = new Date(date + "T12:00:00Z");
                const today = new Date(); today.setHours(0,0,0,0);
                const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                const typeLabel: Record<string, string> = { ANNUAL:"Annual", SICK:"Sick", PERSONAL:"Personal", OTHER:"Other" };
                const typeClr: Record<string, string>   = { ANNUAL:"bg-indigo-100 text-indigo-700", SICK:"bg-red-100 text-red-700", PERSONAL:"bg-amber-100 text-amber-700", OTHER:"bg-gray-100 text-gray-600" };
                const relative = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
                return (
                  <div key={date} className="card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: brandColor }}>
                        {d.getUTCDate()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                        </p>
                        <p className="text-xs text-gray-400">{relative} · {emps.length} employee{emps.length > 1 ? "s" : ""} out</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {emps.map((emp, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: brandColor }}>
                              {emp.name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
                              {emp.startDate !== emp.endDate && (
                                <p className="text-xs text-gray-400">{emp.startDate} → {emp.endDate}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${typeClr[emp.type] ?? typeClr.OTHER}`}>
                            {typeLabel[emp.type] ?? emp.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : kioskView === "schedule" ? (
        /* ── Schedule view — PIN-gated per employee ── */
        <div className="max-w-md mx-auto w-full p-6">
          {!scheduleEmployee ? (
            /* PIN entry */
            <div className="card p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-3" style={{ backgroundColor: brandColor }}>
                  <ClipboardList className="w-7 h-7" />
                </div>
                <p className="text-lg font-semibold text-gray-800">View My Schedule</p>
                <p className="text-sm text-gray-400 mt-1">Enter your 4-digit PIN</p>
              </div>

              <div className="flex gap-4">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{ backgroundColor: schedulePin.length > i ? brandColor : "transparent", borderColor: schedulePin.length > i ? brandColor : "#d1d5db" }} />
                ))}
              </div>

              {scheduleError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 w-full text-center">{scheduleError}</p>
              )}

              {scheduleLoading ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: brandColor }} />
                  <p className="text-sm text-gray-400">Verifying…</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                  {(["1","2","3","4","5","6","7","8","9","⌫","0","✓"] as const).map((key) => (
                    <button key={key}
                      disabled={scheduleLoading}
                      onClick={() => {
                        if (key === "⌫") {
                          setSchedulePin((p) => p.slice(0, -1));
                          setScheduleError("");
                        } else if (key === "✓") {
                          if (schedulePin.length === 4) fetchMySchedule(schedulePin, scheduleStart);
                        } else if (schedulePin.length < 4) {
                          const next = schedulePin + key;
                          setSchedulePin(next);
                          setScheduleError("");
                          if (next.length === 4) fetchMySchedule(next, scheduleStart);
                        }
                      }}
                      className={`aspect-square rounded-2xl text-lg font-semibold flex items-center justify-center transition-colors ${
                        key === "✓"
                          ? "text-white"
                          : "bg-gray-50 text-gray-900 hover:bg-gray-100"
                      }`}
                      style={key === "✓" ? { backgroundColor: brandColor } : undefined}>
                      {key === "⌫" ? <Delete className="w-4 h-4 mx-auto" /> : key}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Schedule results */
            <div className="space-y-4">
              {/* Employee header + controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: brandColor }}>
                    {scheduleEmployee.name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{scheduleEmployee.name}</p>
                    <p className="text-xs text-gray-400">My schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => { setScheduleEmployee(null); setSchedulePin(""); setScheduleByDate({}); setScheduleError(""); }}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Switch
                </button>
              </div>

              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const prev = format(new Date(new Date(scheduleStart + "T12:00:00Z").getTime() - 7 * 86400000), "yyyy-MM-dd");
                    setScheduleStart(prev);
                    fetchMySchedule(schedulePin, prev);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => {
                    const today = format(new Date(), "yyyy-MM-dd");
                    setScheduleStart(today);
                    fetchMySchedule(schedulePin, today);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  This week
                </button>
                <button
                  onClick={() => {
                    const next = format(new Date(new Date(scheduleStart + "T12:00:00Z").getTime() + 7 * 86400000), "yyyy-MM-dd");
                    setScheduleStart(next);
                    fetchMySchedule(schedulePin, next);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {scheduleLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColor}40`, borderTopColor: brandColor }} />
                </div>
              ) : (() => {
                const days = Array.from({ length: 7 }, (_, i) =>
                  format(new Date(new Date(scheduleStart + "T12:00:00Z").getTime() + i * 86400000), "yyyy-MM-dd")
                );
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const hasAny = days.some((d) => (scheduleByDate[d]?.length ?? 0) > 0);
                if (!hasAny) return (
                  <div className="text-center py-16 text-gray-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-sm">No shifts scheduled this week</p>
                  </div>
                );
                return (
                  <div className="space-y-3">
                    {days.map((dateStr) => {
                      const entries = scheduleByDate[dateStr] ?? [];
                      if (entries.length === 0) return null;
                      const d = new Date(dateStr + "T12:00:00Z");
                      const isToday = dateStr === todayStr;
                      return (
                        <div key={dateStr} className="card p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ backgroundColor: brandColor }}>
                              {d.getUTCDate()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
                                {isToday && <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: brandColor }}>Today</span>}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {entries.map((e, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                                <div className="min-w-0">
                                  {e.label && <p className="text-sm font-medium text-gray-800 truncate">{e.label}</p>}
                                  {e.notes && <p className="text-xs text-gray-400 truncate">{e.notes}</p>}
                                  {!e.label && !e.notes && <p className="text-sm text-gray-500">Shift</p>}
                                </div>
                                <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1 flex-shrink-0 tabular-nums">
                                  {e.startTime} – {e.endTime}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Search */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-4">
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
                <div key={emp.id} className="card p-5 flex flex-col gap-3 relative">
                  {/* Top-right icon buttons */}
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={() => setLeaveEmployee(emp)}
                      title="Request leave"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditEmployee(emp)}
                      title="Edit attendance records"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: brandColor }}>
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="min-w-0 pr-6">
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

                  {emp.status === "on_leave" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {(["arrive", "checkout", "leave"] as Action[]).map((action) => (
                          <button key={action} disabled
                            title="Employee is on approved leave"
                            className="flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-semibold bg-gray-100 text-gray-300 cursor-not-allowed select-none">
                            {actionConfig[action].label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-blue-500 italic">On approved leave — actions disabled</p>
                    </div>
                  ) : actions.length > 0 ? (
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
      </>
      )}

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

                  {/* Location status in modal */}
                  {tenant.requireGeolocation && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                      geoState === "granted" ? "bg-green-50 text-green-700" :
                      geoState === "denied" || geoState === "unavailable" ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {geoState === "granted" && (geoPlace ? `Location: ${geoPlace} ✓` : "Location ready ✓")}
                      {geoState === "requesting" && "Getting location…"}
                      {geoState === "denied" && <span>Location denied — <button type="button" onClick={requestKioskLocation} className="underline">retry</button></span>}
                      {geoState === "unavailable" && "Location unavailable on this device"}
                      {geoState === "idle" && <span>Location required — <button type="button" onClick={requestKioskLocation} className="underline">enable</button></span>}
                    </div>
                  )}

                  {/* Employee PIN */}
                  <div>
                    <label className="label">Your 4-digit PIN</label>
                    <div className="flex gap-3 justify-center py-3">
                      {[0,1,2,3].map((i) => (
                        <div key={i} className="w-4 h-4 rounded-full border-2 transition-all"
                          style={{ backgroundColor: empPin.length > i ? brandColor : "transparent", borderColor: empPin.length > i ? brandColor : "#d1d5db" }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {NUMPAD.map((k) => (
                        <button key={k} type="button" onClick={() => handleEmpKey(k)}
                          disabled={k === "✓" && (empPin.length !== 4 || submitting)}
                          className={`py-3 rounded-xl text-lg font-semibold transition-all active:scale-95 disabled:opacity-40 ${k === "✓" ? "bg-green-500 text-white hover:bg-green-600" : k === "⌫" ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-50 text-gray-900 hover:bg-gray-100"}`}>
                          {k}
                        </button>
                      ))}
                    </div>
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

      {/* Admin correction modal */}
      {editEmployee && kioskToken && (
        <KioskEditModal
          employee={editEmployee}
          todayDate={todayDate}
          kioskToken={kioskToken}
          brandColor={brandColor}
          onClose={() => { setEditEmployee(null); refreshEmployees(); }}
        />
      )}

      {/* Leave request modal */}
      {leaveEmployee && (
        <KioskLeaveModal
          employee={leaveEmployee}
          slug={slug}
          brandColor={brandColor}
          onClose={() => setLeaveEmployee(null)}
        />
      )}
    </div>
  );
}
