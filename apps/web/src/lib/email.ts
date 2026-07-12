import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_placeholder") return null;
  return new Resend(key);
}

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  companyName: string;
  tenantSlug: string;
  loginUrl: string;
  kioskUrl: string;
  trialEndsAt: Date;
}

interface NotificationEmailParams {
  companyName: string;
  adminName: string;
  adminEmail: string;
  tenantSlug: string;
  trialEndsAt: Date;
}

function welcomeHtml(p: WelcomeEmailParams): string {
  const trialDate = p.trialEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to OfficePulse</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">OfficePulse</h1>
          <p style="margin:4px 0 0;color:#c7d2fe;font-size:14px;">Employee Attendance Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${p.firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Welcome to OfficePulse! Your workspace for <strong>${p.companyName}</strong> is ready. You're on a free 14-day trial — no credit card needed.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#4f46e5;border-radius:8px;">
              <a href="${p.loginUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                Sign in to your dashboard →
              </a>
            </td></tr>
          </table>

          <!-- Details box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Your workspace details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;">Company ID</td>
                  <td style="padding:6px 0;font-size:13px;font-family:monospace;color:#111827;font-weight:600;">${p.tenantSlug}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">Login email</td>
                  <td style="padding:6px 0;font-size:13px;color:#111827;">${p.to}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">Trial ends</td>
                  <td style="padding:6px 0;font-size:13px;color:#111827;">${trialDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">Kiosk URL</td>
                  <td style="padding:6px 0;font-size:13px;font-family:monospace;color:#4f46e5;">${p.kioskUrl}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Steps -->
          <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#111827;">Get started in 3 steps:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            ${[
              ["1", "Add your employees", "Go to Employees → Add Employee. Each person gets a 4-digit PIN they use at the kiosk."],
              ["2", "Share the kiosk link", "Display the kiosk URL on a shared tablet or screen near your entrance. No login needed."],
              ["3", "Track attendance", "Employees tap Arrive, Check Out, Return, or Leave for Day using their PIN. You see it live on your dashboard."],
            ].map(([n, title, desc]) => `
            <tr><td style="padding:8px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;vertical-align:top;padding-top:2px;">
                  <div style="width:24px;height:24px;background:#ede9fe;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#4f46e5;">${n}</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${title}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join("")}
          </table>

          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Questions? Reply to this email or visit your dashboard settings for help.<br>
            — The OfficePulse Team
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            OfficePulse · You're receiving this because you created an account at officepulse.app
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function notificationHtml(p: NotificationEmailParams): string {
  const trialDate = p.trialEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New OfficePulse Signup</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#16a34a;padding:24px 32px;">
          <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">New signup — OfficePulse</h2>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">A new workspace was just created.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
            <tr><td style="padding:20px 24px;">
              ${[
                ["Company", p.companyName],
                ["Admin name", p.adminName],
                ["Admin email", p.adminEmail],
                ["Company ID (slug)", p.tenantSlug],
                ["Trial ends", trialDate],
              ].map(([label, value]) => `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
                <td style="width:130px;font-size:13px;color:#6b7280;">${label}</td>
                <td style="font-size:13px;font-weight:600;color:#111827;">${value}</td>
              </tr></table>`).join("")}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping welcome email");
    return;
  }

  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Welcome to OfficePulse — ${params.companyName} workspace is ready`,
    html: welcomeHtml(params),
  });

  if (error) console.error("[email] Welcome email failed:", error);
}

export async function sendInternalNotification(params: NotificationEmailParams): Promise<void> {
  const resend = getResend();
  const notifyEmail = process.env.NOTIFICATION_EMAIL;
  if (!resend || !notifyEmail) {
    console.warn("[email] Resend or NOTIFICATION_EMAIL not configured — skipping internal notification");
    return;
  }

  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";

  const { error } = await resend.emails.send({
    from,
    to: notifyEmail,
    subject: `New signup: ${params.companyName} (${params.adminEmail})`,
    html: notificationHtml(params),
  });

  if (error) console.error("[email] Internal notification failed:", error);
}
