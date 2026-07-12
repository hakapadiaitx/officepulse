"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DailyPoint {
  date: string;
  "In Office": number;
  "Out of Office": number;
  employees: number;
}

export function DailyChart({ data }: { data: DailyPoint[] }) {
  const enriched = data.map((d) => ({
    ...d,
    target: d.employees > 0 ? 8 * d.employees : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={enriched} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          formatter={(value, name) => {
            const v = Number(value);
            if (name === "target") return [`${v}h target`, "8h / employee"];
            return [`${v.toFixed(1)}h`, String(name)];
          }}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="In Office" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={48} />
        <Bar dataKey="Out of Office" fill="#fb923c" radius={[3, 3, 0, 0]} maxBarSize={48} />
        <Line
          dataKey="target"
          stroke="#9ca3af"
          strokeDasharray="5 3"
          dot={false}
          strokeWidth={1.5}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
