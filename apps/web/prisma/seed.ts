import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Upsert plans — IDs match the PLANS array in stripe.ts for easy FK linking
  const plans = [
    {
      id: "starter",
      name: "Starter",
      description: "Perfect for small teams",
      maxEmployees: 10,
      priceMonthly: 19,
      priceYearly: 190,
      features: ["Up to 10 employees", "Attendance tracking", "Basic reports", "Email support"],
      sortOrder: 0,
    },
    {
      id: "professional",
      name: "Professional",
      description: "For growing businesses",
      maxEmployees: 50,
      priceMonthly: 49,
      priceYearly: 490,
      features: ["Up to 50 employees", "Advanced reporting", "Daily/weekly/monthly reports", "CSV export", "Priority support"],
      sortOrder: 1,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations",
      maxEmployees: 999999,
      priceMonthly: 149,
      priceYearly: 1490,
      features: ["Unlimited employees", "All reports & exports", "API access", "Dedicated account manager", "SLA guarantee"],
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: { ...plan },
      create: { ...plan },
    });
  }
  console.log("Plans seeded:", plans.map((p) => p.name).join(", "));

  // Create a demo tenant
  const slug = "demo-company";
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log("Demo tenant already exists, skipping tenant seed.");
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Company",
      slug,
      maxEmployees: 50,
      subscriptionStatus: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      users: {
        create: {
          email: "admin@demo.com",
          passwordHash: await bcrypt.hash("password123", 12),
          firstName: "Admin",
          lastName: "User",
          role: "OWNER",
        },
      },
    },
  });

  // Create demo employees
  const employees = [
    { firstName: "Alice", lastName: "Johnson", pin: "1234" },
    { firstName: "Bob", lastName: "Smith", pin: "2345" },
    { firstName: "Carol", lastName: "Davis", pin: "3456" },
    { firstName: "David", lastName: "Wilson", pin: "4567" },
    { firstName: "Eve", lastName: "Martinez", pin: "5678" },
  ];

  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        pinHash: await bcrypt.hash(emp.pin, 10),
      },
    });
  }

  console.log(`\nDemo data created:`);
  console.log(`  Company ID: ${slug}`);
  console.log(`  Admin email: admin@demo.com`);
  console.log(`  Admin password: password123`);
  console.log(`  Employees: ${employees.map((e) => `${e.firstName} ${e.lastName} (PIN: ${e.pin})`).join(", ")}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
