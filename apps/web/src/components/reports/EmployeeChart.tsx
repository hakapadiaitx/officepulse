"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface DayPoint { date: string; "In Office": number; "Out of Office": number; }

export function EmployeeChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} unit="h" axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [v != null ? `${Number(v).toFixed(1)}h` : "0h", ""]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="In Office" stackId="a" fill="#16a34a" />
        <Bar dataKey="Out of Office" stackId="a" fill="#fb923c" radius={[3, 3, 0, 0]} />
        <ReferenceLine y={8} stroke="#9ca3af" strokeDasharray="4 3" strokeWidth={1.5} />
      </BarChart>
    </ResponsiveContainer>
  );
}
