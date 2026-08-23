"use client";
import { useState, useEffect, useCallback } from "react";
import {
  format, addWeeks, subWeeks, addMonths, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isToday, parseISO, addDays,
} from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Trash2, X, Check, RotateCcw, Calendar } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee { id: string; firstName: string; lastName: string }

interface ScheduleEntry {
  id: string;
  employeeId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  notes: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SHIFT_COLORS = [
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100  text-amber-700  border-amber-200",
  "bg-rose-100   text-rose-700   border-rose-200",
  "bg-sky-100    text-sky-700    border-sky-200",
  "bg-violet-100 text-violet-700 border-violet-200",
];

function empColor(empId: string, employees: Employee[]) {
  const idx = employees.findIndex((e) => e.id === empId);
  return SHIFT_COLORS[idx % SHIFT_COLORS.length] ?? SHIFT_COLORS[0];
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

function addDaysToDate(dateStr: string, n: number) {
  return format(addDays(parseISO(dateStr), n), "yyyy-MM-dd");
}

// ── New Entry Modal ───────────────────────────────────────────────────────────

interface NewEntryModalProps {
  employees: Employee[];
  prefillDate?: string;
  onClose: () => void;
  onCreated: () => void;
}

function NewEntryModal({ employees, prefillDate, onClose, onCreated }: NewEntryModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [date,       setDate]       = useState(prefillDate ?? format(new Date(), "yyyy-MM-dd"));
  const [startTime,  setStartTime]  = useState("09:00");
  const [endTime,    setEndTime]    = useState("17:00");
  const [label,      setLabel]      = useState("");
  const [notes,      setNotes]      = useState("");
  const [repeat,     setRepeat]     = useState(false);
  const [weeks,      setWeeks]      = useState(4);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  async function submit() {
    setError("");
    if (!employeeId) { setError("Select an employee."); return; }
    if (endTime <= startTime) { setError("End time must be after start time."); return; }

    const entries: { employeeId: string; date: string; startTime: string; endTime: string; label?: string; notes?: string }[] = [];
    const totalWeeks = repeat ? weeks : 1;
    for (let w = 0; w < totalWeeks; w++) {
      entries.push({
        employeeId,
        date: addDaysToDate(date, w * 7),
        startTime,
        endTime,
        label: label || undefined,
        notes: notes || undefined,
      });
    }

    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Shift</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Employee */}
          <div>
            <label className="label">Employee</label>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start time</label>
              <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="label">End time</label>
              <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="label">Label <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" className="input" placeholder="e.g. Morning shift, On-call…" value={label}
              onChange={(e) => setLabel(e.target.value)} maxLength={80} />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" className="input" placeholder="Any extra details…" value={notes}
              onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </div>

          {/* Repeat */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)}
                className="rounded text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Repeat weekly</span>
            </label>
            {repeat && (
              <div className="flex items-center gap-2 pl-5">
                <span className="text-sm text-gray-500">for</span>
                <input type="number" min={2} max={52} value={weeks}
                  onChange={(e) => setWeeks(Math.min(52, Math.max(2, Number(e.target.value))))}
                  className="input w-20 text-center" />
                <span className="text-sm text-gray-500">weeks</span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Check className="w-4 h-4" />}
            {repeat ? `Add ${weeks} shifts` : "Add shift"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────────

interface WeekViewProps {
  week: Date;
  entries: ScheduleEntry[];
  employees: Employee[];
  onDelete: (id: string) => void;
  onCellClick: (date: string) => void;
}

function WeekView({ week, entries, employees, onDelete, onCellClick }: WeekViewProps) {
  const weekStart = startOfWeek(week, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Build map: employeeId → date → entries
  const grid: Record<string, Record<string, ScheduleEntry[]>> = {};
  for (const emp of employees) {
    grid[emp.id] = {};
    for (const day of days) {
      grid[emp.id][format(day, "yyyy-MM-dd")] = [];
    }
  }
  for (const e of entries) {
    if (grid[e.employeeId]?.[e.date]) {
      grid[e.employeeId][e.date].push(e);
    }
  }

  // Only show employees who have ≥1 shift this week OR all employees (toggle via prop could be added later)
  const activeEmps = employees.filter((emp) =>
    days.some((d) => (grid[emp.id]?.[format(d, "yyyy-MM-dd")] ?? []).length > 0)
  );
  const displayEmps = activeEmps.length > 0 ? activeEmps : employees.slice(0, 8);

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}>
        <div className="px-4 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">Employee</div>
        {days.map((day) => (
          <div key={day.toISOString()}
            className={`px-2 py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday(day) ? "bg-indigo-50" : ""}`}>
            <p className="text-xs font-semibold text-gray-500">{format(day, "EEE")}</p>
            <p className={`text-lg font-bold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${
              isToday(day) ? "bg-indigo-600 text-white" : "text-gray-900"
            }`}>{format(day, "d")}</p>
          </div>
        ))}
      </div>

      {/* Employee rows */}
      {displayEmps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No employees yet. Add employees to start scheduling.</p>
        </div>
      ) : (
        displayEmps.map((emp) => (
          <div key={emp.id} className="grid border-b border-gray-50 last:border-b-0"
            style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}>
            <div className="px-4 py-2 flex items-center gap-2 border-r border-gray-100">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${SHIFT_COLORS[employees.findIndex((e) => e.id === emp.id) % SHIFT_COLORS.length]}`}>
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
              <span className="text-xs font-medium text-gray-700 truncate">{emp.firstName} {emp.lastName}</span>
            </div>
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEntries = grid[emp.id]?.[key] ?? [];
              return (
                <div key={key}
                  onClick={() => onCellClick(key)}
                  className={`px-1.5 py-1.5 border-r border-gray-50 last:border-r-0 min-h-[60px] cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday(day) ? "bg-indigo-50/40" : ""
                  }`}>
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div key={entry.id}
                        className={`group relative text-[11px] font-medium px-1.5 py-1 rounded border ${empColor(entry.employeeId, employees)}`}
                        onClick={(ev) => ev.stopPropagation()}>
                        <p className="truncate leading-tight">{entry.label || `${fmt12(entry.startTime)}–${fmt12(entry.endTime)}`}</p>
                        {entry.label && <p className="text-[10px] opacity-60 truncate">{fmt12(entry.startTime)}–{fmt12(entry.endTime)}</p>}
                        <button
                          onClick={() => onDelete(entry.id)}
                          className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center justify-center w-4 h-4 bg-white/80 rounded-sm hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    {dayEntries.length === 0 && (
                      <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────────────────

interface MonthViewProps {
  month: Date;
  entries: ScheduleEntry[];
  employees: Employee[];
  onDelete: (id: string) => void;
  onCellClick: (date: string) => void;
}

function MonthView({ month, entries, employees, onDelete, onCellClick }: MonthViewProps) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const dayMap: Record<string, ScheduleEntry[]> = {};
  for (const e of entries) {
    if (!dayMap[e.date]) dayMap[e.date] = [];
    dayMap[e.date].push(e);
  }

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2 border-r border-gray-50 last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-100">
        {days.map((day) => {
          const key     = format(day, "yyyy-MM-dd");
          const dayEnts = dayMap[key] ?? [];
          const inMonth = isSameMonth(day, month);
          const today   = isToday(day);
          const isExp   = expanded === key;

          return (
            <div key={key}
              className={`bg-white p-1.5 min-h-[90px] flex flex-col ${!inMonth ? "opacity-40" : ""}`}>
              <button
                onClick={() => { setExpanded(isExp ? null : key); onCellClick(key); }}
                className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 self-end ${
                  today ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}>
                {format(day, "d")}
              </button>
              <div className="flex-1 space-y-0.5">
                {dayEnts.slice(0, isExp ? 99 : 3).map((e) => (
                  <div key={e.id}
                    className={`group relative flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${empColor(e.employeeId, employees)}`}>
                    <span className="truncate flex-1">{e.label || e.name.split(" ")[0]}</span>
                    <span className="opacity-60 flex-shrink-0">{fmt12(e.startTime)}</span>
                    <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}
                      className="hidden group-hover:block flex-shrink-0 hover:text-red-600">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {dayEnts.length > 3 && !isExp && (
                  <button onClick={() => setExpanded(key)} className="text-[10px] text-gray-400 hover:text-gray-600 pl-1">
                    +{dayEnts.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [view,      setView]      = useState<"week" | "month">("week");
  const [cursor,    setCursor]    = useState(new Date()); // anchor for week/month navigation
  const [entries,   setEntries]   = useState<ScheduleEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();

  // Compute date range for current view
  const { rangeStart, rangeEnd, label } = (() => {
    if (view === "week") {
      const ws = startOfWeek(cursor, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return {
        rangeStart: format(ws, "yyyy-MM-dd"),
        rangeEnd:   format(we, "yyyy-MM-dd"),
        label: `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`,
      };
    } else {
      return {
        rangeStart: format(startOfMonth(cursor), "yyyy-MM-dd"),
        rangeEnd:   format(endOfMonth(cursor),   "yyyy-MM-dd"),
        label: format(cursor, "MMMM yyyy"),
      };
    }
  })();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/schedule?start=${rangeStart}&end=${rangeEnd}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? d ?? []));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function prev() {
    setCursor((c) => view === "week" ? subWeeks(c, 1) : subMonths(c, 1));
  }
  function next() {
    setCursor((c) => view === "week" ? addWeeks(c, 1) : addMonths(c, 1));
  }
  function goToday() { setCursor(new Date()); }

  function openNew(date?: string) {
    setPrefillDate(date);
    setShowNew(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan weekly and monthly shifts for your team</p>
        </div>
        <button onClick={() => openNew()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[180px] text-center">{label}</span>
          <button onClick={next} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={goToday}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:border-gray-300 text-gray-600 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Today
        </button>

        {loading && (
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-2" />
        )}
      </div>

      {/* Legend */}
      {employees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {employees.slice(0, 6).map((emp, i) => (
            <span key={emp.id} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SHIFT_COLORS[i % SHIFT_COLORS.length]}`}>
              {emp.firstName} {emp.lastName}
            </span>
          ))}
          {employees.length > 6 && (
            <span className="text-xs text-gray-400">+{employees.length - 6} more</span>
          )}
        </div>
      )}

      {/* Calendar */}
      {view === "week" ? (
        <WeekView
          week={cursor}
          entries={entries}
          employees={employees}
          onDelete={handleDelete}
          onCellClick={(date) => openNew(date)}
        />
      ) : (
        <MonthView
          month={cursor}
          entries={entries}
          employees={employees}
          onDelete={handleDelete}
          onCellClick={(date) => openNew(date)}
        />
      )}

      {/* Empty state for week view with no employees */}
      {!loading && employees.length === 0 && (
        <div className="text-center py-16 text-gray-400 card">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No employees yet</p>
          <p className="text-sm mt-1">Add employees first, then build their schedule here.</p>
        </div>
      )}

      {/* Modal */}
      {showNew && (
        <NewEntryModal
          employees={employees}
          prefillDate={prefillDate}
          onClose={() => setShowNew(false)}
          onCreated={fetchEntries}
        />
      )}
    </div>
  );
}
