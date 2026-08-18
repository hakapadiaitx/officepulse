-- Late alert fields on Tenant
ALTER TABLE "Tenant" ADD COLUMN "lateAlertEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "lateAlertTime" TEXT NOT NULL DEFAULT '09:30';
ALTER TABLE "Tenant" ADD COLUMN "lateAlertSentDate" TEXT;

-- Leave request enums
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'OTHER');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- LeaveRequest table
CREATE TABLE "LeaveRequest" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate"  TEXT NOT NULL,
    "endDate"    TEXT NOT NULL,
    "type"       "LeaveType" NOT NULL DEFAULT 'ANNUAL',
    "reason"     TEXT,
    "status"     "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeaveRequest_tenantId_idx"              ON "LeaveRequest"("tenantId");
CREATE INDEX "LeaveRequest_employeeId_idx"            ON "LeaveRequest"("employeeId");
CREATE INDEX "LeaveRequest_tenantId_startDate_endDate_idx" ON "LeaveRequest"("tenantId", "startDate", "endDate");

ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
