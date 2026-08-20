-- CreateTable
CREATE TABLE "LeaveAllowance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "allowedDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveAllowance_tenantId_idx" ON "LeaveAllowance"("tenantId");

-- CreateIndex
CREATE INDEX "LeaveAllowance_employeeId_idx" ON "LeaveAllowance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveAllowance_tenantId_employeeId_year_leaveType_key" ON "LeaveAllowance"("tenantId", "employeeId", "year", "leaveType");

-- AddForeignKey
ALTER TABLE "LeaveAllowance" ADD CONSTRAINT "LeaveAllowance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveAllowance" ADD CONSTRAINT "LeaveAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
