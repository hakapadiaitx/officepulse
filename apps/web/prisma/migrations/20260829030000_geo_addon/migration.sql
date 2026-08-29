ALTER TABLE "Tenant" ADD COLUMN "geoAddonActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "geoAddonSubscriptionId" TEXT;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_geoAddonSubscriptionId_key" UNIQUE ("geoAddonSubscriptionId");
