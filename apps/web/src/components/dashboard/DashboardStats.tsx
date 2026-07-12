import { Users, UserX, Clock, UserCheck, Home } from "lucide-react";
import { formatHours } from "@/lib/utils";

interface Props {
  totalEmployees: number;
  inCount: number;
  outCount: number;
  notArrivedCount: number;
  leftCount: number;
  todayMinutes: number;
}

export function DashboardStats({ totalEmployees, inCount, outCount, notArrivedCount, leftCount, todayMinutes }: Props) {
  const stats = [
    { label: "At Work",        value: inCount,         icon: UserCheck, color: "text-green-600",  bg: "bg-green-50" },
    { label: "Out of Office",  value: outCount,        icon: UserX,     color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Not Arrived",    value: notArrivedCount, icon: Users,     color: "text-gray-500",   bg: "bg-gray-100" },
    { label: "Left for Day",   value: leftCount,       icon: Home,      color: "text-gray-400",   bg: "bg-gray-100" },
    { label: "Hours Tracked",  value: formatHours(todayMinutes), icon: Clock, color: "text-brand-600", bg: "bg-brand-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="card p-5">
          <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          <p className="text-sm text-gray-500 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
