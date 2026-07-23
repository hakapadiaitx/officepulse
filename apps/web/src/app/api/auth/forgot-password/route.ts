import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, tenantSlug } = schema.parse(body);

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), tenant: { slug: tenantSlug } },
      include: { tenant: true },
    });

    // Always return success to avoid leaking whether an account exists
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://officepulse.app";
    const baseUrl = new URL(appUrl).origin;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
