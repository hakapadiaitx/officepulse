"use client";
// Re-export all recharts primitives we use so they can be dynamic-imported
// with { ssr: false } from the reports page, preventing build-time useContext errors.
export {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
