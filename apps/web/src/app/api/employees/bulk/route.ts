import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { hashPin } from "@/lib/auth";

export interface BulkResult {
  row: number;
  name: string;
  status: "created" | "failed";
  error?: string;
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return NextResponse.json({ error: "Spreadsheet has no sheets" }, { status: 400 });

  // header:1 returns raw arrays; row 0 is the header
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== undefined && c !== ""));

  if (dataRows.length === 0) {
    return NextResponse.json({ error: "No data rows found in the file" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { employees: { where: { isActive: true } } } } },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const results: BulkResult[] = [];
  let currentCount = tenant._count.employees;

  for (let i = 0; i < dataRows.length; i++) {
    const [col0, col1, col2, col3] = dataRows[i];
    const firstName = String(col0 ?? "").trim();
    const lastName  = String(col1 ?? "").trim();
    const email     = String(col2 ?? "").trim();
    const pinRaw    = String(col3 ?? "").trim();
    const rowNum    = i + 2; // 1-indexed, header is row 1
    const name      = firstName && lastName ? `${firstName} ${lastName}` : `Row ${rowNum}`;

    if (!firstName) {
      results.push({ row: rowNum, name, status: "failed", error: "First name is required" });
      continue;
    }
    if (!lastName) {
      results.push({ row: rowNum, name, status: "failed", error: "Last name is required" });
      continue;
    }

    const pinStr = pinRaw.replace(/\D/g, "");
    if (!/^\d{4}$/.test(pinStr)) {
      results.push({ row: rowNum, name, status: "failed", error: "PIN must be exactly 4 digits" });
      continue;
    }

    const emailVal = email && email.toLowerCase() !== "undefined" ? email : null;
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      results.push({ row: rowNum, name, status: "failed", error: "Invalid email address" });
      continue;
    }

    if (currentCount >= tenant.maxEmployees) {
      results.push({ row: rowNum, name, status: "failed", error: `Employee limit (${tenant.maxEmployees}) reached` });
      continue;
    }

    try {
      await prisma.employee.create({
        data: { tenantId, firstName, lastName, email: emailVal, pinHash: await hashPin(pinStr) },
      });
      currentCount++;
      results.push({ row: rowNum, name, status: "created" });
    } catch {
      results.push({ row: rowNum, name, status: "failed", error: "Could not save employee" });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const failed  = results.filter((r) => r.status === "failed");
  return NextResponse.json({ created, failed, results });
}
