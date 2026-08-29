"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, X, ChevronLeft, ChevronRight, Check, MapPin } from "lucide-react";
import { CheckOutForm } from "@/components/attendance/CheckOutForm";
import { CheckInForm } from "@/components/attendance/CheckInForm";

type Status = "not_arrived" | "in" | "out" | "left" | "on_leave";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  status: Status;
  lastAction: string | null;
  purpose: string | null;
  hasLocation?: boolean;
  checkInPlace?: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInLogId?: string | null;
}

interface AttendanceLog {
  id: string;
  employeeId: string;
  checkInTime: string;
  checkOutTime: string | null;
  isEndOfDay: boolean;
  purpose: string | null;
  notes: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInPlace: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutPlace: string | null;
}

const statusConfig: Record<Status, { label: string; dot: string; badge: string; text: string }> = {
  not_arrived: { label: "Not Arrived",   dot: "bg-gray-300",   badge: "bg-gray-100",   text: "text-gray-500" },
  in:          { label: "At Work",       dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700" },
  out:         { label: "Out of Office", dot: "bg-orange-500", badge: "bg-orange-100", text: "text-orange-700" },
  left:        { label: "Left for Day",  dot: "bg-gray-400",   badge: "bg-gray-100",   text: "text-gray-400" },
  on_leave:    { label: "On Leave",      dot: "bg-blue-400",   badge: "bg-blue-50",    text: "text-blue-600" },
};

type ModalState =
  | { type: "checkin";  employee: Employee; isArrival: boolean }
  | { type: "checkout"; employee: Employee; isEndOfDay: boolean }
  | null;

// ---------- EditAttendanceModal ----------

interface EditAttendanceModalProps {
  employee: Employee;
  todayDate: string; // YYYY-MM-DD (local)
  onClose: () => void;
}

interface SessionRow extends AttendanceLog {
  dirty: boolean;
  saving: boolean;
  error: string;
}

function toLocalInput(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

function toUtcIso(localInput: string): string {
  return new Date(localInput).toISOString();
}

function EditAttendanceModal({ employee, todayDate, onClose }: EditAttendanceModalProps) {
  const [date, setDate] = useState(todayDate);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // New-session form state
  const [newIn,    setNewIn]    = useState("");
  const [newOut,   setNewOut]   = useState("");
  const [newEod,   setNewEod]   = useState(false);
  const [newPurpose, setNewPurpose] = useState("");
  const [addingNew, setAddingNew]   = useState(false);
  const [newError,  setNewError]    = useState("");
  const [showAdd,   setShowAdd]     = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setGlobalError("");
    try {
      const res = await fetch(`/api/admin/attendance?employeeId=${employee.id}&date=${date}`);
      if (!res.ok) throw new Error("Failed to load sessions");
      const data: AttendanceLog[] = await res.json();
      setSessions(data.map((l) => ({ ...l, dirty: false, saving: false, error: "" })));
    } catch {
      setGlobalError("Could not load sessions.");
    } finally {
      setLoadingLogs(false);
    }
  }, [employee.id, date]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function updateField(id: string, field: string, value: string | boolean | null) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value, dirty: true, error: "" } : s))
    );
  }

  async function saveSession(id: string) {
    const s = sessions.find((x) => x.id === id)!;
    setSessions((prev) => prev.map((x) => (x.id === id ? { ...x, saving: true, error: "" } : x)));

    try {
      const body: Record<string, unknown> = {
        checkInTime: toUtcIso(toLocalInput(s.checkInTime)),
        checkOutTime: s.checkOutTime ? toUtcIso(toLocalInput(s.checkOutTime)) : null,
        isEndOfDay: s.isEndOfDay,
        purpose: s.purpose,
        notes: s.notes,
      };
      const res = await fetch(`/api/admin/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Save failed");
      }
      const updated: AttendanceLog = await res.json();
      setSessions((prev) =>
        prev.map((x) => (x.id === id ? { ...updated, dirty: false, saving: false, error: "" } : x))
      );
    } catch (err: unknown) {
      setSessions((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, saving: false, error: (err as Error).message } : x
        )
      );
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    setSessions((prev) => prev.map((x) => (x.id === id ? { ...x, saving: true } : x)));
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSessions((prev) => prev.filter((x) => x.id !== id));
    } catch (err: unknown) {
      setSessions((prev) =>
        prev.map((x) => (x.id === id ? { ...x, saving: false, error: (err as Error).message } : x))
      );
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          checkInTime:  toUtcIso(newIn),
          checkOutTime: newOut ? toUtcIso(newOut) : null,
          isEndOfDay:   newOut ? newEod : false,
          purpose:      newOut && !newEod ? newPurpose : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Add failed");
      }
      const created: AttendanceLog = await res.json();
      setSessions((prev) => [...prev, { ...created, dirty: false, saving: false, error: "" }]
        .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()));
      setNewIn(""); setNewOut(""); setNewEod(false); setNewPurpose("");
      setShowAdd(false);
    } catch (err: unknown) {
      setNewError((err as Error).message);
    } finally {
      setAddingNew(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Attendance</h2>
            <p className="text-sm text-gray-500 mt-0.5">{employee.firstName} {employee.lastName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date picker */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Date</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(date + "T12:00:00Z");
                d.setUTCDate(d.getUTCDate() - 1);
                setDate(d.toISOString().slice(0, 10));
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={date}
              max={todayDate}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => {
                const d = new Date(date + "T12:00:00Z");
                d.setUTCDate(d.getUTCDate() + 1);
                const next = d.toISOString().slice(0, 10);
                if (next <= todayDate) setDate(next);
              }}
              disabled={date >= todayDate}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {globalError && <p className="text-sm text-red-500">{globalError}</p>}

          {loadingLogs ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 && !showAdd ? (
            <p className="text-sm text-gray-400 text-center py-6">No sessions recorded for this date.</p>
          ) : null}

          {sessions.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Session {i + 1}</span>
                <button
                  onClick={() => deleteSession(s.id)}
                  disabled={s.saving}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Check-in</label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(s.checkInTime)}
                    onChange={(e) => updateField(s.id, "checkInTime", e.target.value ? toUtcIso(e.target.value) : s.checkInTime)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Check-out</label>
                  <input
                    type="datetime-local"
                    value={s.checkOutTime ? toLocalInput(s.checkOutTime) : ""}
                    onChange={(e) => updateField(s.id, "checkOutTime", e.target.value ? toUtcIso(e.target.value) : null)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Location */}
              {(s.checkInLat != null || s.checkOutLat != null) && (
                <div className="space-y-1.5">
                  {s.checkInLat != null && s.checkInLng != null && (
                    <a
                      href={`https://maps.google.com/?q=${s.checkInLat},${s.checkInLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors w-fit"
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium">Check-in:</span>
                      <span>{s.checkInPlace ?? "View on map"}</span>
                    </a>
                  )}
                  {s.checkOutLat != null && s.checkOutLng != null && (
                    <a
                      href={`https://maps.google.com/?q=${s.checkOutLat},${s.checkOutLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors w-fit"
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium">Check-out:</span>
                      <span>{s.checkOutPlace ?? "View on map"}</span>
                    </a>
                  )}
                </div>
              )}

              {s.checkOutTime && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.isEndOfDay}
                      onChange={(e) => updateField(s.id, "isEndOfDay", e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Left for the day
                  </label>
                  {!s.isEndOfDay && (
                    <input
                      type="text"
                      placeholder="Reason (e.g. lunch)"
                      value={s.purpose ?? ""}
                      onChange={(e) => updateField(s.id, "purpose", e.target.value || null)}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>
              )}

              {s.error && <p className="text-xs text-red-500">{s.error}</p>}

              {s.dirty && (
                <button
                  onClick={() => saveSession(s.id)}
                  disabled={s.saving}
                  className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
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
            <div className="rounded-xl border-2 border-dashed border-brand-300 p-4 space-y-3">
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">New Session</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Check-in *</label>
                  <input
                    type="datetime-local"
                    value={newIn}
                    onChange={(e) => setNewIn(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Check-out</label>
                  <input
                    type="datetime-local"
                    value={newOut}
                    onChange={(e) => setNewOut(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              {newOut && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEod}
                      onChange={(e) => setNewEod(e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Left for the day
                  </label>
                  {!newEod && (
                    <input
                      type="text"
                      placeholder="Reason (e.g. lunch)"
                      value={newPurpose}
                      onChange={(e) => setNewPurpose(e.target.value)}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>
              )}
              {newError && <p className="text-xs text-red-500">{newError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addSession}
                  disabled={addingNew}
                  className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
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
                  className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            !loadingLogs && (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors"
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
            className="w-full py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const todayDate = format(new Date(), "yyyy-MM-dd");
  const geocodedIds = useRef<Set<string>>(new Set());

  async function fetchStatus() {
    const res = await fetch(`/api/attendance/status?localDate=${todayDate}`);
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocode any employees who have lat/lng but no resolved place name yet
  useEffect(() => {
    const needsGeocode = employees.filter(
      (e) => e.checkInLat != null && !e.checkInPlace && e.checkInLogId && !geocodedIds.current.has(e.id)
    );
    if (needsGeocode.length === 0) return;

    needsGeocode.forEach((e) => geocodedIds.current.add(e.id));

    import("@/lib/geocode").then(({ reverseGeocode }) => {
      needsGeocode.forEach(async (emp) => {
        const place = await reverseGeocode(emp.checkInLat!, emp.checkInLng!);
        setEmployees((prev) => prev.map((x) => x.id === emp.id ? { ...x, checkInPlace: place } : x));
        // Save back to DB so next load is instant
        fetch(`/api/admin/attendance/${emp.checkInLogId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkInPlace: place }),
        }).catch(() => {});
      });
    });
  }, [employees]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeModal() { setModal(null); fetchStatus(); }
  function closeEdit()  { setEditEmployee(null); fetchStatus(); }

  const sortOrder: Status[] = ["in", "out", "not_arrived", "on_leave", "left"];
  const sorted = [...employees].sort((a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status));

  const counts = Object.fromEntries(
    (["in", "out", "not_arrived", "on_leave", "left"] as Status[]).map((s) => [s, employees.filter((e) => e.status === s).length])
  ) as Record<Status, number>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <span className="text-sm text-gray-400">{format(new Date(), "EEEE, MMM d yyyy")}</span>
      </div>

      {/* Status counts */}
      <div className="flex gap-4 flex-wrap">
        {(Object.entries(statusConfig) as [Status, (typeof statusConfig)[Status]][]).map(([key, cfg]) => (
          <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.badge} ${cfg.text}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}: {counts[key]}
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No employees found. Add employees first.</p>
            )}
            {sorted.map((emp) => {
              const cfg = statusConfig[emp.status];
              return (
                <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-semibold text-gray-600">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      {emp.purpose && emp.status === "out" && (
                        <p className="text-xs text-gray-400 mt-0.5">{emp.purpose}</p>
                      )}
                      {emp.lastAction && emp.status !== "not_arrived" && (
                        <p className="text-xs text-gray-400">
                          {emp.status === "in" ? "In since" : "At"}{" "}
                          {format(new Date(emp.lastAction), "h:mm a")}
                        </p>
                      )}
                      {emp.hasLocation && (emp.status === "in" || emp.status === "out") && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {emp.checkInPlace ?? "Location recorded"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${cfg.badge} ${cfg.text}`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>

                    {emp.status === "not_arrived" && (
                      <button onClick={() => setModal({ type: "checkin", employee: emp, isArrival: true })} className="btn-primary text-sm px-3 py-1.5">
                        Arrive
                      </button>
                    )}
                    {emp.status === "in" && (
                      <div className="flex gap-2">
                        <button onClick={() => setModal({ type: "checkout", employee: emp, isEndOfDay: false })} className="btn-secondary text-sm px-3 py-1.5">
                          Check Out
                        </button>
                        <button onClick={() => setModal({ type: "checkout", employee: emp, isEndOfDay: true })} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                          Leave for Day
                        </button>
                      </div>
                    )}
                    {emp.status === "out" && (
                      <button onClick={() => setModal({ type: "checkin", employee: emp, isArrival: false })} className="btn-primary text-sm px-3 py-1.5">
                        Return
                      </button>
                    )}
                    {emp.status === "left" && (
                      <span className="text-xs text-gray-400 italic">Done for today</span>
                    )}
                    {emp.status === "on_leave" && (
                      <span className="text-xs text-blue-500 italic">On approved leave</span>
                    )}

                    {/* Admin correction button */}
                    <button
                      onClick={() => setEditEmployee(emp)}
                      title="Edit attendance records"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal?.type === "checkin" && (
        <CheckInForm employee={modal.employee} isArrival={modal.isArrival} onClose={closeModal} />
      )}
      {modal?.type === "checkout" && (
        <CheckOutForm employee={modal.employee} isEndOfDay={modal.isEndOfDay} onClose={closeModal} />
      )}
      {editEmployee && (
        <EditAttendanceModal employee={editEmployee} todayDate={todayDate} onClose={closeEdit} />
      )}
    </div>
  );
}
