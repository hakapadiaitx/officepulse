import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder") {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured in environment variables." }, { status: 400 });
  }

  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@resend.dev>";
  const to   = (session as any).user?.email;

  if (!to) {
    return NextResponse.json({ error: "Could not determine admin email from session." }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const { data, error: sendError } = await resend.emails.send({
    from,
    to,
    subject: "OfficePulse — email test",
    html: `<p>This is a test email from OfficePulse. If you received this, email delivery is working correctly.</p><p>Sent from: <strong>${from}</strong></p>`,
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message, from, to }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: data?.id, from, to });
}
