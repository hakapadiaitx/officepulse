import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["First Name", "Last Name", "Email", "PIN"],
    ["John", "Doe", "john@example.com", "1234"],
    ["Jane", "Smith", "", "5678"],
  ]);

  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 8 }];

  XLSX.utils.book_append_sheet(wb, ws, "Employees");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="employees-template.xlsx"',
    },
  });
}
