import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  subDays,
} from "date-fns";

type Period = "day" | "week" | "month" | "quarter" | "custom";

function getPeriodRange(period: Period, date: Date, from?: string, to?: string) {
  switch (period) {
    case "day":
      return { start: startOfDay(date), end: endOfDay(date) };
    case "week":
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case "quarter":
      return { start: startOfQuarter(date), end: endOfQuarter(date) };
    case "custom":
      return {
        start: from ? startOfDay(new Date(from)) : startOfDay(subDays(date, 7)),
        end: to ? endOfDay(new Date(to)) : endOfDay(date),
      };
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const { searchParams } = new URL(req.url);

  const period = (searchParams.get("period") || "week") as Period;
  const dateParam = searchParams.get("date") || new Date().toISOString();
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;

  const { start, end } = getPeriodRange(period, new Date(dateParam), from, to);
  const now = new Date();

  // Fetch ALL logs in the period (open and closed) so we can compute out-of-office gaps
  // even when an employee checked out temporarily but hasn't returned yet
  const allLogs = await prisma.attendanceLog.findMany({
    where: {
      tenantId,
      ...(employeeId && { employeeId }),
      checkInTime: { gte: start, lte: end },
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ employeeId: "asc" }, { checkInTime: "asc" }],
  });

  let totalInMinutes = 0;
  let totalOutMinutes = 0;
  let totalCompletedSessions = 0;

  interface EmpStats {
    name: string;
    inMinutes: number;
    outMinutes: number;
    sessions: number;
    days: Set<string>;
  }

  const byEmployee: Record<string, EmpStats> = {};
  const byDay: Record<string, { date: string; employees: Set<string>; inMinutes: number; outMinutes: number }> = {};
  const byEmployeeDay: Record<string, Record<string, { inMinutes: number; outMinutes: number }>> = {};

  // Group logs by employee, already ordered by checkInTime
  const logsByEmployee: Record<string, typeof allLogs> = {};
  for (const log of allLogs) {
    if (!logsByEmployee[log.employeeId]) {
      logsByEmployee[log.employeeId] = [];
      byEmployee[log.employeeId] = {
        name: `${log.employee.firstName} ${log.employee.lastName}`,
        inMinutes: 0,
        outMinutes: 0,
        sessions: 0,
        days: new Set(),
      };
      byEmployeeDay[log.employeeId] = {};
    }
    logsByEmployee[log.employeeId].push(log);
  }

  for (const [empId, empLogs] of Object.entries(logsByEmployee)) {
    for (let i = 0; i < empLogs.length; i++) {
      const log = empLogs[i];
      const dayKey = log.checkInTime.toISOString().split("T")[0];

      if (!byDay[dayKey]) {
        byDay[dayKey] = { date: dayKey, employees: new Set(), inMinutes: 0, outMinutes: 0 };
      }
      byDay[dayKey].employees.add(empId);
      byEmployee[empId].days.add(dayKey);

      // In-office time — only for completed sessions
      if (log.checkOutTime) {
        const inMins = Math.round((log.checkOutTime.getTime() - log.checkInTime.getTime()) / 60000);
        if (inMins > 0) {
          byEmployee[empId].inMinutes += inMins;
          byEmployee[empId].sessions += 1;
          totalInMinutes += inMins;
          totalCompletedSessions += 1;
          byDay[dayKey].inMinutes += inMins;

          if (!byEmployeeDay[empId][dayKey]) byEmployeeDay[empId][dayKey] = { inMinutes: 0, outMinutes: 0 };
          byEmployeeDay[empId][dayKey].inMinutes += inMins;
        }

        // Out-of-office gap — only after a temporary checkout (not end-of-day)
        if (!log.isEndOfDay) {
          let gapEnd: Date;
          if (i + 1 < empLogs.length) {
            // Employee returned — gap ends at the next check-in
            gapEnd = empLogs[i + 1].checkInTime;
          } else {
            // Employee hasn't returned yet — cap gap at end of checkout day (or now if today)
            const checkoutDayEnd = endOfDay(log.checkOutTime);
            gapEnd = now < checkoutDayEnd ? now : checkoutDayEnd;
          }
          const outMins = Math.round((gapEnd.getTime() - log.checkOutTime.getTime()) / 60000);
          if (outMins > 0) {
            byEmployee[empId].outMinutes += outMins;
            totalOutMinutes += outMins;
            const outDayKey = log.checkOutTime.toISOString().split("T")[0];
            if (byDay[outDayKey]) byDay[outDayKey].outMinutes += outMins;

            if (!byEmployeeDay[empId][outDayKey]) byEmployeeDay[empId][outDayKey] = { inMinutes: 0, outMinutes: 0 };
            byEmployeeDay[empId][outDayKey].outMinutes += outMins;
          }
        }
      }
    }
  }

  const employeeStats = Object.entries(byEmployee)
    .map(([id, s]) => ({
      employeeId: id,
      name: s.name,
      inMinutes: s.inMinutes,
      outMinutes: s.outMinutes,
      sessions: s.sessions,
      daysPresent: s.days.size,
      dailyStats: Object.entries(byEmployeeDay[id] ?? {})
        .map(([date, d]) => ({ date, inMinutes: d.inMinutes, outMinutes: d.outMinutes }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => b.inMinutes - a.inMinutes);

  const dailyStats = Object.values(byDay)
    .map((d) => ({ date: d.date, employees: d.employees.size, inMinutes: d.inMinutes, outMinutes: d.outMinutes }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    summary: {
      totalSessions: totalCompletedSessions,
      totalEmployees: Object.keys(byEmployee).length,
      totalInMinutes,
      totalOutMinutes,
    },
    employeeStats,
    dailyStats,
  });
}
