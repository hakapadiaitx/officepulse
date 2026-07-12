"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CheckOutForm } from "@/components/attendance/CheckOutForm";
import { CheckInForm } from "@/components/attendance/CheckInForm";

type Status = "not_arrived" | "in" | "out" | "left";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  status: Status;
  lastAction: string | null;
  purpose: string | null;
}

const statusConfig: Record<Status, { label: string; dot: string; badge: string; text: string }> = {
  not_arrived: { label: "Not Arrived",   dot: "bg-gray-300",   badge: "bg-gray-100",   text: "text-gray-500" },
  in:          { label: "At Work",       dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700" },
  out:         { label: "Out of Office", dot: "bg-orange-500", badge: "bg-orange-100", text: "text-orange-700" },
  left:        { label: "Left for Day",  dot: "bg-gray-400",   badge: "bg-gray-100",   text: "text-gray-400" },
};

type ModalState =
  | { type: "checkin";  employee: Employee; isArrival: boolean }
  | { type: "checkout"; employee: Employee; isEndOfDay: boolean }
  | null;

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

  async function fetchStatus() {
    const res = await fetch("/api/attendance/status");
    if (res.ok) setEmployees(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchStatus(); }, []);

  function closeModal() { setModal(null); fetchStatus(); }

  const sortOrder: Status[] = ["in", "out", "not_arrived", "left"];
  const sorted = [...employees].sort((a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status));

  const counts = Object.fromEntries(
    (["in", "out", "not_arrived", "left"] as Status[]).map((s) => [s, employees.filter((e) => e.status === s).length])
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
    </div>
  );
}
