"use client";
import { useSession } from "next-auth/react";
import { Bell, X, CalendarDays } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface PendingLeave {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string };
}

const typeLabels: Record<string, string> = {
  ANNUAL: "Annual Leave", SICK: "Sick Leave", PERSONAL: "Personal", OTHER: "Other",
};

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const router = useRouter();

  const [open, setOpen]       = useState(false);
  const [leaves, setLeaves]   = useState<PendingLeave[]>([]);
  const panelRef              = useRef<HTMLDivElement>(null);
  const buttonRef             = useRef<HTMLButtonElement>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/leaves?status=PENDING");
      if (res.ok) setLeaves(await res.json());
    } catch {}
  }, []);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    if (!session) return;
    fetchPending();
    const t = setInterval(fetchPending, 60_000);
    return () => clearInterval(t);
  }, [session, fetchPending]);

  // Re-fetch when panel opens so it's always fresh
  useEffect(() => { if (open) fetchPending(); }, [open, fetchPending]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const count = leaves.length;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div>
        <p className="text-sm text-gray-500">
          Workspace: <span className="font-semibold text-gray-900">{user?.tenantName}</span>
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Bell button */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setOpen((o) => !o)}
            className="relative text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">Pending Leave Requests</span>
                  {count > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                  )}
                </div>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {leaves.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                    <CalendarDays className="w-8 h-8 opacity-40" />
                    <p className="text-sm">No pending requests</p>
                  </div>
                ) : (
                  leaves.map((leave) => {
                    const initials = leave.employee.firstName[0] + leave.employee.lastName[0];
                    const days = Math.round(
                      (new Date(leave.endDate + "T12:00:00Z").getTime() - new Date(leave.startDate + "T12:00:00Z").getTime()) / 86400000
                    ) + 1;
                    return (
                      <button
                        key={leave.id}
                        onClick={() => { setOpen(false); router.push("/leaves"); }}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors flex items-start gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {leave.employee.firstName} {leave.employee.lastName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {typeLabels[leave.type] ?? leave.type} · {leave.startDate} → {leave.endDate} ({days}d)
                          </p>
                          {leave.reason && (
                            <p className="text-xs text-gray-400 truncate mt-0.5 italic">{leave.reason}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(leave.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-1">
                          PENDING
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {count > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <button
                    onClick={() => { setOpen(false); router.push("/leaves"); }}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700 w-full text-center"
                  >
                    Review all {count} request{count !== 1 ? "s" : ""} →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">
          {user?.name?.charAt(0) ?? "U"}
        </div>
      </div>
    </header>
  );
}
