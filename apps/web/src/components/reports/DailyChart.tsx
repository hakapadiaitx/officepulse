"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface DailyPoint { date: string; "In Office": number; "Out of Office": number; employees: number; }

export function DailyChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} unit="h" axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [v != null ? `${Number(v).toFixed(1)}h` : "0h", ""]}
          labelFormatter={(label, payload) => {
            const employees = payload?.[0]?.payload?.employees ?? 0;
            return `${label} · ${employees} employee${employees !== 1 ? "s" : ""}`;
          }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
        />
        <Bar dataKey="In Office" stackId="day" fill="#16a34a" />
        <Bar dataKey="Out of Office" stackId="day" fill="#fb923c" radius={[4, 4, 0, 0]} />
        <ReferenceLine y={8} stroke="#9ca3af" strokeDasharray="4 3" strokeWidth={1.5}
          label={{ value: "8h", position: "insideTopRight", fontSize: 11, fill: "#9ca3af", dy: -4 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
