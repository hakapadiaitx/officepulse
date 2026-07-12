"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface EmployeePoint {
  date: string;
  "In Office": number;
  "Out of Office": number;
}

export function EmployeeChart({ data }: { data: EmployeePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          formatter={(value, name) => [`${Number(value).toFixed(1)}h`, String(name)]}

          labelStyle={{ fontSize: 11, fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 11 }}
        />
        <Bar dataKey="In Office" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={40} />
        <Bar dataKey="Out of Office" fill="#fb923c" radius={[3, 3, 0, 0]} maxBarSize={40} />
        <ReferenceLine y={8} stroke="#9ca3af" strokeDasharray="5 3" strokeWidth={1.5} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
