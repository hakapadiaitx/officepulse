-- AlterTable: add requireGeolocation to Tenant
ALTER TABLE "Tenant" ADD COLUMN "requireGeolocation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add location columns to AttendanceLog
ALTER TABLE "AttendanceLog" ADD COLUMN "checkInLat" DOUBLE PRECISION;
ALTER TABLE "AttendanceLog" ADD COLUMN "checkInLng" DOUBLE PRECISION;
ALTER TABLE "AttendanceLog" ADD COLUMN "checkOutLat" DOUBLE PRECISION;
ALTER TABLE "AttendanceLog" ADD COLUMN "checkOutLng" DOUBLE PRECISION;
