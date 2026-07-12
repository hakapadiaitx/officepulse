"use client";
import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatHours } from "@/lib/utils";
import dynamic from "next/dynamic";

const DailyChart = dynamic(() => import("@/components/reports/DailyChart").then(m => m.DailyChart), { ssr: false, loading: () => <div className="h-60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div> });
const EmployeeChart = dynamic(() => import("@/components/reports/EmployeeChart").then(m => m.EmployeeChart), { ssr: false });

type Period = "day" | "week" | "month" | "quarter";

interface Summary {
  totalSessions: number;
  totalEmployees: number;
  totalInMinutes: number;
  totalOutMinutes: number;
}
interface EmpDailyStat { date: string; inMinutes: number; outMinutes: number; }
interface EmployeeStat {
  employeeId: string;
  name: string;
  inMinutes: number;
  outMinutes: number;
  sessions: number;
  daysPresent: number;
  dailyStats: EmpDailyStat[];
}
interface DailyStat { date: string; employees: number; inMinutes: number; outMinutes: number; }
interface ReportData {
  period: Period;
  start: string;
  end: string;
  summary: Summary;
  employeeStats: EmployeeStat[];
  dailyStats: DailyStat[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period, date: date.toISOString() });
    const res = await fetch(`/api/reports?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [period, date]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function navigate(dir: 1 | -1) {
    setDate((d) => {
      switch (period) {
        case "day": return dir === 1 ? addDays(d, 1) : subDays(d, 1);
        case "week": return dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1);
        case "month": return dir === 1 ? addMonths(d, 1) : subMonths(d, 1);
        case "quarter": return dir === 1 ? addMonths(d, 3) : subMonths(d, 3);
      }
    });
  }

  function getPeriodLabel() {
    if (!data) return "";
    const s = new Date(data.start);
    const e = new Date(data.end);
    if (period === "day") return format(s, "EEE, MMM d, yyyy");
    if (period === "month") return format(s, "MMMM yyyy");
    if (period === "quarter") return `Q${Math.ceil((s.getMonth() + 1) / 3)} ${format(s, "yyyy")}`;
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  }

  function downloadCSV() {
    if (!data) return;
    const rows = [
      ["Employee", "Days Present", "Sessions", "Hours In Office", "Hours Out of Office", "Total Hours"],
      ...data.employeeStats.map((e) => [
        e.name,
        e.daysPresent,
        e.sessions,
        (e.inMinutes / 60).toFixed(2),
        (e.outMinutes / 60).toFixed(2),
        ((e.inMinutes + e.outMinutes) / 60).toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `report-${period}-${format(date, "yyyy-MM-dd")}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button onClick={downloadCSV} disabled={!data} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Period Selector */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["day", "week", "month", "quarter"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setDate(new Date()); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${period === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{getPeriodLabel()}</span>
          <button onClick={() => navigate(1)} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Employees", value: data.summary.totalEmployees },
              { label: "Total Sessions", value: data.summary.totalSessions },
              { label: "Total In-Office", value: formatHours(data.summary.totalInMinutes), highlight: true },
              { label: "Total Out-of-Office", value: formatHours(data.summary.totalOutMinutes) },
            ].map((s) => (
              <div key={s.label} className="card p-5 text-center">
                <p className={`text-3xl font-bold ${s.highlight ? "text-green-600" : "text-gray-900"}`}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Chart — In-Office vs Out-of-Office Hours by Day */}
          {data.dailyStats.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-semibold text-gray-900">Hours by Day</h2>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />In Office</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />Out of Office</span>
                  <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-gray-400 inline-block" />8h / employee</span>
                </div>
              </div>
              <DailyChart
                data={data.dailyStats.map((d) => ({
                  date: format(new Date(d.date + "T12:00:00"), period === "day" ? "ha" : "MMM d"),
                  "In Office": +(d.inMinutes / 60).toFixed(2),
                  "Out of Office": +(d.outMinutes / 60).toFixed(2),
                  employees: d.employees,
                }))}
              />
            </div>
          )}

          {/* Employee Breakdown */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Employee Breakdown</h2>
              <p className="text-xs text-gray-400 mt-0.5">In-office = active work sessions · Out-of-office = gaps between sessions (temporary departures)</p>
            </div>
            <div className="divide-y divide-gray-50">
              {data.employeeStats.length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400">No data for this period.</p>
              )}
              {data.employeeStats.map((emp) => {
                const total = emp.inMinutes + emp.outMinutes;
                const inPct = total > 0 ? Math.round((emp.inMinutes / total) * 100) : 0;
                const outPct = total > 0 ? 100 - inPct : 0;

                return (
                  <div key={emp.employeeId} className="px-5 py-4">
                    {/* Name row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                          {emp.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.daysPresent} day{emp.daysPresent !== 1 ? "s" : ""} present · {emp.sessions} session{emp.sessions !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{formatHours(emp.inMinutes + emp.outMinutes)} total</p>
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="flex rounded-full overflow-hidden h-2 bg-gray-100 mb-2">
                        {inPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${inPct}%` }} />}
                        {outPct > 0 && <div className="bg-orange-400 h-full" style={{ width: `${outPct}%` }} />}
                      </div>
                    )}

                    {/* Stats pills */}
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-green-700">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        In Office: <strong>{formatHours(emp.inMinutes)}</strong>
                        {total > 0 && <span className="text-gray-400">({inPct}%)</span>}
                      </span>
                      <span className="flex items-center gap-1.5 text-orange-600">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                        Out of Office: <strong>{formatHours(emp.outMinutes)}</strong>
                        {total > 0 && outPct > 0 && <span className="text-gray-400">({outPct}%)</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact table for quick scanning */}
            {data.employeeStats.length > 0 && (
              <div className="border-t border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                      <th className="text-left px-5 py-3">Employee</th>
                      <th className="text-right px-5 py-3">Days Present</th>
                      <th className="text-right px-5 py-3">In Office</th>
                      <th className="text-right px-5 py-3">Out of Office</th>
                      <th className="text-right px-5 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.employeeStats.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{emp.daysPresent}</td>
                        <td className="px-5 py-3 text-right font-medium text-green-700">{formatHours(emp.inMinutes)}</td>
                        <td className="px-5 py-3 text-right text-orange-600">{formatHours(emp.outMinutes)}</td>
                        <td className="px-5 py-3 text-right text-gray-700 font-medium">{formatHours(emp.inMinutes + emp.outMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Per-employee individual charts */}
          {data.employeeStats.some((e) => e.dailyStats.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Individual Employee Charts</h2>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />In Office</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />Out of Office</span>
                  <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-gray-400 inline-block" />8h target</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.employeeStats
                  .filter((emp) => emp.dailyStats.length > 0)
                  .map((emp) => {
                    const chartData = emp.dailyStats.map((d) => ({
                      date: format(new Date(d.date + "T12:00:00"), period === "day" ? "ha" : "MMM d"),
                      "In Office": +(d.inMinutes / 60).toFixed(2),
                      "Out of Office": +(d.outMinutes / 60).toFixed(2),
                    }));
                    const initials = emp.name.split(" ").map((n) => n[0]).join("");
                    return (
                      <div key={emp.employeeId} className="card p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                              <p className="text-xs text-gray-400">{emp.daysPresent} day{emp.daysPresent !== 1 ? "s" : ""} present</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-green-700 font-medium">{formatHours(emp.inMinutes)} in</p>
                            {emp.outMinutes > 0 && (
                              <p className="text-xs text-orange-600">{formatHours(emp.outMinutes)} out</p>
                            )}
                          </div>
                        </div>
                        {/* Chart */}
                        <EmployeeChart data={chartData} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
