import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AppProviders } from "@/components/layout/AppProviders";
import { BrandColorProvider } from "@/components/layout/BrandColorProvider";

const HR_ALLOWED = ["/leaves", "/support"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // HR users (MANAGER role) may only access leave-related and support pages
  const role = (session.user as any).role as string;
  if (role === "MANAGER") {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";
    const allowed = HR_ALLOWED.some((p) => pathname.startsWith(p));
    if (!allowed && pathname !== "") redirect("/leaves");
  }

  return (
    <AppProviders>
      <BrandColorProvider />
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </AppProviders>
  );
}
