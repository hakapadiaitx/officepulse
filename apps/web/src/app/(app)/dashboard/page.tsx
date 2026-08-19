"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { EmployeeStatusList } from "@/components/dashboard/EmployeeStatusList";

type Status = "not_arrived" | "in" | "out" | "left" | "on_leave";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  status: Status;
  lastAction: Date | null;
  purpose: string | null;
}

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const localDate = format(new Date(), "yyyy-MM-dd");
    const res = await fetch(`/api/attendance/status?localDate=${localDate}`);
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees ?? []);
      setTodayMinutes(data.todayMinutes ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, []);

  const inCount          = employees.filter((e) => e.status === "in").length;
  const outCount         = employees.filter((e) => e.status === "out").length;
  const notArrivedCount  = employees.filter((e) => e.status === "not_arrived").length;
  const leftCount        = employees.filter((e) => e.status === "left").length;
  const onLeaveCount     = employees.filter((e) => e.status === "on_leave").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <DashboardStats
            totalEmployees={employees.length}
            inCount={inCount}
            outCount={outCount}
            notArrivedCount={notArrivedCount}
            leftCount={leftCount}
            onLeaveCount={onLeaveCount}
            todayMinutes={todayMinutes}
          />
          <EmployeeStatusList employees={employees} />
        </>
      )}
    </div>
  );
}
