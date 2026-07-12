"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, BarChart3, Settings, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const brandColor: string = user?.brandColor ?? "#4f46e5";
  const logoUrl: string | null = user?.logoUrl ?? null;

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">
      <div className="px-4 py-4 flex items-center gap-3" style={{ backgroundColor: brandColor }}>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5 shadow-sm">
          {logoUrl
            ? <Image src={logoUrl} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            : <Clock className="w-5 h-5 flex-shrink-0" style={{ color: brandColor }} />}
        </div>
        <span className="font-bold text-sm text-white truncate">{user?.tenantName || "OfficePulse"}</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              style={active ? { backgroundColor: brandColor } : undefined}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
