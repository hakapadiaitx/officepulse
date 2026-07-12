import { formatDistanceToNow } from "date-fns";

type Status = "not_arrived" | "in" | "out" | "left";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  status: Status;
  lastAction: Date | null;
  purpose: string | null;
}

const statusConfig: Record<Status, { label: string; dot: string; badge: string; text: string }> = {
  in:          { label: "At Work",       dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700" },
  out:         { label: "Out of Office", dot: "bg-orange-500", badge: "bg-orange-100", text: "text-orange-700" },
  not_arrived: { label: "Not Arrived",   dot: "bg-gray-300",   badge: "bg-gray-100",   text: "text-gray-500" },
  left:        { label: "Left for Day",  dot: "bg-gray-400",   badge: "bg-gray-100",   text: "text-gray-400" },
};

export function EmployeeStatusList({ employees }: { employees: Employee[] }) {
  const sortOrder: Status[] = ["in", "out", "not_arrived", "left"];
  const sorted = [...employees].sort((a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status));

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Employee Status</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {sorted.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No employees added yet.</p>
        )}
        {sorted.map((emp) => {
          const cfg = statusConfig[emp.status];
          return (
            <div key={emp.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                  {emp.purpose && emp.status === "out" && (
                    <p className="text-xs text-gray-400">{emp.purpose}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {emp.lastAction && emp.status !== "not_arrived" && (
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(emp.lastAction), { addSuffix: true })}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
