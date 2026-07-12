"use client";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div>
        <p className="text-sm text-gray-500">
          Workspace: <span className="font-semibold text-gray-900">{user?.tenantName}</span>
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-gray-600">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">
          {user?.name?.charAt(0) ?? "U"}
        </div>
      </div>
    </header>
  );
}
