import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { sendWelcomeEmail, sendInternalNotification } from "@/lib/email";

const schema = z.object({
  companyName: z.string().min(2).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#4f46e5"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Check for existing account with same company name + email before generating slug
    const existingAccount = await prisma.user.findFirst({
      where: {
        email: data.email.toLowerCase(),
        tenant: { name: { equals: data.companyName, mode: "insensitive" } },
      },
    });
    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this email already exists for this company.", existingAccount: true },
        { status: 409 }
      );
    }

    const baseSlug = slugify(data.companyName);
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = await prisma.tenant.create({
      data: {
        name: data.companyName,
        slug,
        maxEmployees: 5,
        subscriptionStatus: "TRIALING",
        trialEndsAt,
        brandColor: data.brandColor,
        users: {
          create: {
            email: data.email.toLowerCase(),
            passwordHash: await hashPassword(data.password),
            firstName: data.firstName,
            lastName: data.lastName,
            role: "OWNER",
          },
        },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const loginUrl = `${appUrl}/login`;
    const kioskUrl = `${appUrl}/kiosk/${tenant.slug}`;

    // Fire emails in parallel — failures don't block registration
    await Promise.allSettled([
      sendWelcomeEmail({
        to: data.email,
        firstName: data.firstName,
        companyName: data.companyName,
        tenantSlug: tenant.slug,
        loginUrl,
        kioskUrl,
        trialEndsAt,
      }),
      sendInternalNotification({
        companyName: data.companyName,
        adminName: `${data.firstName} ${data.lastName}`,
        adminEmail: data.email,
        tenantSlug: tenant.slug,
        trialEndsAt,
      }),
    ]);

    return NextResponse.json({ tenantSlug: tenant.slug, tenantName: tenant.name }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
