"use client";
import { useState, useEffect, useCallback } from "react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isToday, parseISO,
} from "date-fns";
import { Plus, X, Check, Trash2, ChevronDown, Save, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type LeaveType   = "ANNUAL" | "SICK" | "PERSONAL" | "OTHER";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string };
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  adminNote: string | null;
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface EmployeeBalance {
  employeeId: string;
  name: string;
  used: Record<string, number>;
  allowed: Record<string, number>;
  isCustom: Record<string, boolean>;
  overrides: Record<string, number>;
}

interface BalancesData {
  year: number;
  policyDefaults: Record<string, number>;
  balances: EmployeeBalance[];
}

const typeLabels: Record<LeaveType, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  PERSONAL: "Personal Leave",
  OTHER: "Other",
};

const LEAVE_TYPES: LeaveType[] = ["ANNUAL", "SICK", "PERSONAL", "OTHER"];

const statusConfig: Record<LeaveStatus, { label: string; badge: string; text: string }> = {
  PENDING:  { label: "Pending",  badge: "bg-amber-100",  text: "text-amber-700"  },
  APPROVED: { label: "Approved", badge: "bg-green-100",  text: "text-green-700"  },
  REJECTED: { label: "Rejected", badge: "bg-red-100",    text: "text-red-700"    },
};

const requestTabs: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

// ── New Leave Modal ────────────────────────────────────────────────────────────
interface NewLeaveModalProps {
  employees: Employee[];
  onClose: () => void;
  onCreated: () => void;
}

function NewLeaveModal({ employees, onClose, onCreated }: NewLeaveModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [startDate,  setStartDate]  = useState("");
  const [endDate,    setEndDate]    = useState("");
  const [type,       setType]       = useState<LeaveType>("ANNUAL");
  const [reason,     setReason]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  async function submit() {
    setError("");
    if (!employeeId) { setError("Please select an employee."); return; }
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (endDate < startDate) { setError("End date must be on or after start date."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, startDate, endDate, type, reason: reason || null }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Failed to create"); }
      const result = await res.json();
      onCreated();
      if (!result.emailSent) {
        setError(`Request created but admin notification failed — ${result.emailError ?? "unknown error"} (tried sending to: ${result.emailTo ?? "no owner email found"})`);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Leave Request</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input">
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Leave Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as LeaveType)} className="input">
              {LEAVE_TYPES.map((k) => <option key={k} value={k}>{typeLabels[k]}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Reason <span className="text-gray-400">(optional)</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a note…" rows={2} className="input resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-brand-700 transition-colors">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Create Request
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Action Row ─────────────────────────────────────────────────────────────────
interface ActionRowProps {
  leave: LeaveRequest;
  onUpdated: () => void;
}

function ActionRow({ leave, onUpdated }: ActionRowProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(leave.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function update(status: LeaveStatus) {
    setSaving(true);
    try {
      await fetch(`/api/leaves/${leave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: note || null }),
      });
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this leave request?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/leaves/${leave.id}`, { method: "DELETE" });
      onUpdated();
    } finally {
      setDeleting(false);
    }
  }

  const dayCount = (() => {
    const start = new Date(leave.startDate + "T12:00:00Z");
    const end   = new Date(leave.endDate   + "T12:00:00Z");
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  })();

  const cfg = statusConfig[leave.status];

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {leave.employee.firstName[0]}{leave.employee.lastName[0]}
          </div>
          <p className="font-medium text-gray-900 truncate">{leave.employee.firstName} {leave.employee.lastName}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 ml-10">
          <span>{format(new Date(leave.startDate + "T12:00:00Z"), "MMM d")} – {format(new Date(leave.endDate + "T12:00:00Z"), "MMM d, yyyy")}</span>
          <span>·</span>
          <span>{dayCount} day{dayCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{typeLabels[leave.type]}</span>
          {leave.reason && <><span>·</span><span className="italic truncate max-w-[120px]">{leave.reason}</span></>}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge} ${cfg.text}`}>{cfg.label}</span>

        <div className="relative">
          <button onClick={() => setOpen((o) => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>

          {open && (
            <div className="absolute right-0 top-8 z-20 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-3 space-y-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional)" rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <div className="flex gap-2">
                <button onClick={() => update("APPROVED")} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                  <Check className="w-3 h-3" /> Approve
                </button>
                <button onClick={() => update("REJECTED")} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50">
                  <X className="w-3 h-3" /> Reject
                </button>
              </div>
              <button onClick={() => setOpen(false)} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-0.5">Cancel</button>
            </div>
          )}
        </div>

        <button onClick={remove} disabled={deleting}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Per-employee allowance editor row ─────────────────────────────────────────
interface EmpAllowanceEditorProps {
  emp: EmployeeBalance;
  year: number;
  policyDefaults: Record<string, number>;
  onSaved: () => void;
}

function EmpAllowanceEditor({ emp, year, policyDefaults, onSaved }: EmpAllowanceEditorProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const t of LEAVE_TYPES) {
      init[t] = emp.isCustom[t] ? emp.overrides[t] : policyDefaults[t] ?? 0;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const hasAnyCustom = LEAVE_TYPES.some((t) => emp.isCustom[t]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leaves/employee-allowance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.employeeId, year, policies: values }),
      });
      if (res.ok) { setMsg({ type: "ok", text: "Saved." }); onSaved(); }
      else { const d = await res.json().catch(() => ({})); setMsg({ type: "err", text: d.error ?? "Failed." }); }
    } catch { setMsg({ type: "err", text: "Network error." }); }
    finally { setSaving(false); }
  }

  async function resetToPolicy() {
    setResetting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leaves/employee-allowance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.employeeId, year }),
      });
      if (res.ok) {
        setValues(Object.fromEntries(LEAVE_TYPES.map((t) => [t, policyDefaults[t] ?? 0])));
        setMsg({ type: "ok", text: "Reset to policy defaults." });
        onSaved();
      } else {
        setMsg({ type: "err", text: "Failed to reset." });
      }
    } catch { setMsg({ type: "err", text: "Network error." }); }
    finally { setResetting(false); }
  }

  return (
    <div className="bg-indigo-50/60 border-t border-indigo-100 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-indigo-700">Custom allowance for {emp.name} — {year}</p>
        {hasAnyCustom && (
          <button onClick={resetToPolicy} disabled={resetting}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 disabled:opacity-50">
            {resetting ? <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <X className="w-3 h-3" />}
            Reset to policy defaults
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LEAVE_TYPES.map((type) => (
          <div key={type}>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {typeLabels[type]}
              {emp.isCustom[type] && <span className="ml-1 text-indigo-500">•</span>}
            </label>
            <div className="relative">
              <input
                type="number" min={0} max={365}
                value={values[type] ?? 0}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(365, parseInt(e.target.value) || 0));
                  setValues((v) => ({ ...v, [type]: val }));
                  setMsg(null);
                }}
                className="input pr-8 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">d</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Policy: {policyDefaults[type] ?? 0}d</p>
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg border ${msg.type === "err" ? "bg-red-50 border-red-100 text-red-600" : "bg-green-50 border-green-100 text-green-700"}`}>
          {msg.text}
        </p>
      )}

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save custom allowance
      </button>
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────────────────────────────────────
interface CalendarLeave {
  id: string;
  employeeId: string;
  name: string;
  initials: string;
  startDate: string;
  endDate: string;
  type: string;
}

const typeColors: Record<string, string> = {
  ANNUAL:   "bg-indigo-100 text-indigo-700",
  SICK:     "bg-red-100 text-red-700",
  PERSONAL: "bg-amber-100 text-amber-700",
  OTHER:    "bg-gray-100 text-gray-600",
};

function CalendarTab() {
  const [month, setMonth] = useState(() => new Date());
  const [leaves, setLeaves] = useState<CalendarLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // YYYY-MM-DD

  useEffect(() => {
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end   = format(endOfMonth(month),   "yyyy-MM-dd");
    setLoading(true);
    setSelected(null);
    fetch(`/api/leaves/calendar?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => { setLeaves(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month]);

  // Build a map: date string → leaves active on that day
  const dayLeaves: Record<string, CalendarLeave[]> = {};
  for (const leave of leaves) {
    const start = parseISO(leave.startDate);
    const end   = parseISO(leave.endDate);
    const cur   = new Date(start);
    while (cur <= end) {
      const d = format(cur, "yyyy-MM-dd");
      if (!dayLeaves[d]) dayLeaves[d] = [];
      dayLeaves[d].push(leave);
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Build 6-week grid starting from the Monday of the first week of the month
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedLeaves = selected ? (dayLeaves[selected] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-gray-900">{format(month, "MMMM yyyy")}</h2>
          <button onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
            {days.map((day) => {
              const key  = format(day, "yyyy-MM-dd");
              const here = dayLeaves[key] ?? [];
              const inMonth  = isSameMonth(day, month);
              const today    = isToday(day);
              const isSelected = selected === key;

              return (
                <button key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`bg-white p-1.5 min-h-[70px] text-left flex flex-col transition-colors ${
                    !inMonth ? "opacity-30" : ""
                  } ${isSelected ? "ring-2 ring-inset ring-indigo-500" : "hover:bg-gray-50"}`}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    today ? "bg-indigo-600 text-white" : inMonth ? "text-gray-700" : "text-gray-400"
                  }`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-0.5 flex-1">
                    {here.slice(0, 3).map((l) => (
                      <span key={l.id} className={`text-[10px] font-medium px-1 rounded leading-tight truncate ${typeColors[l.type] ?? typeColors.OTHER}`}>
                        {l.initials}
                      </span>
                    ))}
                    {here.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{here.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries({ ANNUAL: "Annual Leave", SICK: "Sick Leave", PERSONAL: "Personal Leave", OTHER: "Other" })).map(([k, label]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${typeColors[k].split(" ")[0]}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Detail panel for selected day */}
      {selected && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              {format(parseISO(selected), "EEEE, MMMM d yyyy")}
            </h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedLeaves.length === 0 ? (
            <p className="text-sm text-gray-400">No approved leaves on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedLeaves.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                    {l.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{l.name}</p>
                    <p className="text-xs text-gray-500">{typeLabels[l.type as LeaveType] ?? l.type} · {l.startDate} → {l.endDate}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[l.type] ?? typeColors.OTHER}`}>
                    {typeLabels[l.type as LeaveType] ?? l.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Balances Tab ───────────────────────────────────────────────────────────────
function BalancesTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<BalancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  // Policy editor state
  const [policy, setPolicy] = useState<Record<string, number>>({ ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 });
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMsg, setPolicyMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leaves/balances?year=${year}`);
    if (res.ok) {
      const d: BalancesData = await res.json();
      setData(d);
      setPolicy({ ...d.policyDefaults });
    }
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  async function savePolicy() {
    setPolicySaving(true);
    setPolicyMsg(null);
    try {
      const res = await fetch("/api/settings/leave-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, policies: policy }),
      });
      if (res.ok) {
        setPolicyMsg({ type: "ok", text: "Policy saved." });
        fetchBalances();
      } else {
        const d = await res.json().catch(() => ({}));
        setPolicyMsg({ type: "err", text: d.error ?? "Failed to save." });
      }
    } catch {
      setPolicyMsg({ type: "err", text: "Network error." });
    } finally {
      setPolicySaving(false);
    }
  }

  function usagePill(used: number, allowed: number, isCustom: boolean) {
    if (allowed === 0) return <span className="text-xs text-gray-400">—</span>;
    const pct = (used / allowed) * 100;
    const remaining = allowed - used;
    const color = pct >= 100 ? "text-red-600 bg-red-50" : pct >= 75 ? "text-amber-600 bg-amber-50" : "text-green-700 bg-green-50";
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {used}/{allowed}d
          </span>
          {isCustom && <span className="text-xs text-indigo-500 font-medium">custom</span>}
          {remaining > 0
            ? <span className="text-xs text-gray-400">{remaining}d left</span>
            : remaining === 0
            ? <span className="text-xs text-red-500">none left</span>
            : <span className="text-xs text-red-600 font-semibold">{Math.abs(remaining)}d over</span>}
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-green-500"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year navigator */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setYear((y) => y - 1); setExpandedEmp(null); }}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-lg font-bold text-gray-900 min-w-[60px] text-center">{year}</span>
        <button onClick={() => { setYear((y) => y + 1); setExpandedEmp(null); }}
          disabled={year >= currentYear + 1}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Policy editor */}
      <div className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Default Leave Policy — {year}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Applies to all employees unless a custom allowance is set for them below.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {LEAVE_TYPES.map((type) => (
            <div key={type}>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{typeLabels[type]}</label>
              <div className="relative">
                <input type="number" min={0} max={365}
                  value={policy[type] ?? 0}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(365, parseInt(e.target.value) || 0));
                    setPolicy((p) => ({ ...p, [type]: val }));
                    setPolicyMsg(null);
                  }}
                  className="input pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">days</span>
              </div>
            </div>
          ))}
        </div>

        {policyMsg && (
          <p className={`text-sm px-3 py-2 rounded-lg border ${policyMsg.type === "err" ? "bg-red-50 border-red-100 text-red-600" : "bg-green-50 border-green-100 text-green-700"}`}>
            {policyMsg.text}
          </p>
        )}

        <button onClick={savePolicy} disabled={policySaving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {policySaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Policy
        </button>
      </div>

      {/* Employee balances */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Employee Leave Balances — {year}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Based on approved requests. Click <strong>Customize</strong> on any employee to set individual allowances.
            <span className="ml-2 text-indigo-500">● custom</span> indicates a personal override.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.balances.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No active employees found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="text-left px-5 py-3">Employee</th>
                  {LEAVE_TYPES.map((t) => (
                    <th key={t} className="text-left px-4 py-3 min-w-[140px]">{typeLabels[t]}</th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.balances.map((emp) => {
                  const hasCustom = LEAVE_TYPES.some((t) => emp.isCustom[t]);
                  const isExpanded = expandedEmp === emp.employeeId;
                  return (
                    <>
                      <tr key={emp.employeeId}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 ${isExpanded ? "bg-indigo-50/30" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                              {emp.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 text-sm">{emp.name}</span>
                              {hasCustom && (
                                <span className="ml-2 text-xs text-indigo-500 font-medium">● custom</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {LEAVE_TYPES.map((type) => (
                          <td key={type} className="px-4 py-4">
                            {usagePill(emp.used[type] ?? 0, emp.allowed[type] ?? 0, emp.isCustom[type])}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setExpandedEmp(isExpanded ? null : emp.employeeId)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              isExpanded
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                : "border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}>
                            {isExpanded ? "Done" : "Customize"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${emp.employeeId}-editor`}>
                          <td colSpan={LEAVE_TYPES.length + 2} className="p-0">
                            <EmpAllowanceEditor
                              emp={emp}
                              year={year}
                              policyDefaults={data.policyDefaults}
                              onSaved={fetchBalances}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeavesPage() {
  const [leaves,    setLeaves]    = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("ALL");
  const [mainTab,   setMainTab]   = useState<"requests" | "balances" | "calendar">("requests");
  const [showNew,   setShowNew]   = useState(false);

  async function fetchLeaves() {
    const res = await fetch(`/api/leaves?status=${tab}`);
    if (res.ok) setLeaves(await res.json());
    setLoading(false);
  }

  async function fetchEmployees() {
    const res = await fetch("/api/employees");
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees ?? data ?? []);
    }
  }

  useEffect(() => { setLoading(true); fetchLeaves(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEmployees(); }, []);

  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          {pendingCount > 0 && mainTab === "requests" && tab === "ALL" && (
            <p className="text-sm text-amber-600 mt-0.5">{pendingCount} pending request{pendingCount > 1 ? "s" : ""} awaiting action</p>
          )}
        </div>
        {mainTab === "requests" && (
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </button>
        )}
        {mainTab === "calendar" && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Approved leaves only
          </div>
        )}
      </div>

      {/* Main tabs: Requests / Calendar / Balances */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["requests", "Requests"], ["calendar", "Calendar"], ["balances", "Leave Balances"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mainTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {mainTab === "calendar" ? (
        <CalendarTab />
      ) : mainTab === "balances" ? (
        <BalancesTab />
      ) : (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {requestTabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="card">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaves.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">
                {tab === "ALL" ? "No leave requests yet. Create one to get started." : `No ${tab.toLowerCase()} requests.`}
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {leaves.map((leave) => (
                  <ActionRow key={leave.id} leave={leave} onUpdated={fetchLeaves} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showNew && (
        <NewLeaveModal employees={employees} onClose={() => setShowNew(false)} onCreated={fetchLeaves} />
      )}
    </div>
  );
}
