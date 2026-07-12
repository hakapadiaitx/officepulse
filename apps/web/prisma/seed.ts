import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo tenant
  const slug = "demo-company";
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log("Demo tenant already exists, skipping seed.");
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
