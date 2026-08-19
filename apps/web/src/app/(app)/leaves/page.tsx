"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, X, Check, Trash2, ChevronDown } from "lucide-react";

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

const typeLabels: Record<LeaveType, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  PERSONAL: "Personal",
  OTHER: "Other",
};

const statusConfig: Record<LeaveStatus, { label: string; badge: string; text: string }> = {
  PENDING:  { label: "Pending",  badge: "bg-amber-100",  text: "text-amber-700"  },
  APPROVED: { label: "Approved", badge: "bg-green-100",  text: "text-green-700"  },
  REJECTED: { label: "Rejected", badge: "bg-red-100",    text: "text-red-700"    },
};

const tabs: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

// ── New Leave Modal ────────────────────────────────────────────────────────────
interface NewLeaveModalProps {
  employees: Employee[];
  onClose: () => void;
  onCreated: () => void;   // refreshes list, does NOT close modal
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
      onCreated(); // refresh list
      if (!result.emailSent) {
        setError(`Request created but admin notification failed — ${result.emailError ?? "unknown error"} (tried sending to: ${result.emailTo ?? "no owner email found"})`);
        // keep modal open so the error is visible
      } else {
        onClose(); // success — close modal
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
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
              {(Object.entries(typeLabels) as [LeaveType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Reason <span className="text-gray-400">(optional)</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              className="input resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-brand-700 transition-colors"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Create Request
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Action Popover (approve / reject with note) ────────────────────────────────
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
      {/* Employee + dates */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {leave.employee.firstName[0]}{leave.employee.lastName[0]}
          </div>
          <p className="font-medium text-gray-900 truncate">
            {leave.employee.firstName} {leave.employee.lastName}
          </p>
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

      {/* Status + actions */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge} ${cfg.text}`}>{cfg.label}</span>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {open && (
            <div className="absolute right-0 top-8 z-20 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional)"
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => update("APPROVED")}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => update("REJECTED")}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="w-3 h-3" /> Reject
                </button>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-0.5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={remove}
          disabled={deleting}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          {pendingCount > 0 && tab === "ALL" && (
            <p className="text-sm text-amber-600 mt-0.5">{pendingCount} pending request{pendingCount > 1 ? "s" : ""} awaiting action</p>
          )}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
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

      {showNew && (
        <NewLeaveModal
          employees={employees}
          onClose={() => setShowNew(false)}
          onCreated={fetchLeaves}
        />
      )}
    </div>
  );
}
