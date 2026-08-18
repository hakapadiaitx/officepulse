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

interface PasswordResetEmailParams {
  to: string;
  firstName: string;
  resetUrl: string;
}

function passwordResetHtml(p: PasswordResetEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your OfficePulse password</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">OfficePulse</h1>
          <p style="margin:4px 0 0;color:#c7d2fe;font-size:14px;">Password Reset</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${p.firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#4f46e5;border-radius:8px;">
              <a href="${p.resetUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                Reset my password →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Or copy this link: ${p.resetUrl}</p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">OfficePulse · If you didn't request this, no action is needed.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping password reset email");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: "Reset your OfficePulse password",
    html: passwordResetHtml(params),
  });
  if (error) console.error("[email] Password reset email failed:", error);
}

interface CancellationEmailParams {
  to: string;
  firstName: string;
  companyName: string;
  planName: string;
  accessEndsAt: Date;
  loginUrl: string;
}

function cancellationHtml(p: CancellationEmailParams): string {
  const expiryDate = p.accessEndsAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your OfficePulse subscription has been cancelled</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">OfficePulse</h1>
          <p style="margin:4px 0 0;color:#c7d2fe;font-size:14px;">Subscription Cancellation</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${p.firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            We've received your cancellation request for the <strong>${p.planName}</strong> plan on your <strong>${p.companyName}</strong> workspace.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">Your access continues until</p>
              <p style="margin:0;font-size:18px;font-weight:700;color:#78350f;">${expiryDate}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#92400e;">You will not be charged again. After this date your workspace will revert to the free trial limits.</p>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            Changed your mind? You can resubscribe any time before <strong>${expiryDate}</strong> and keep all your data.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#4f46e5;border-radius:8px;">
              <a href="${p.loginUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                Resubscribe →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Thank you for using OfficePulse. We hope to see you again.<br>
            — The OfficePulse Team
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            OfficePulse · You're receiving this because you cancelled your subscription at officepulse.app
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCancellationEmail(params: CancellationEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping cancellation email");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Your OfficePulse subscription has been cancelled — access ends ${params.accessEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    html: cancellationHtml(params),
  });
  if (error) console.error("[email] Cancellation email failed:", error);
}

export interface DigestEmailParams {
  to: string;
  adminFirstName: string;
  companyName: string;
  date: string; // e.g. "Thursday, Aug 13 2026"
  stats: { inCount: number; outCount: number; notArrivedCount: number; leftCount: number; totalMinutes: number };
  employees: { name: string; status: "in" | "out" | "not_arrived" | "left"; lastAction: string | null; purpose: string | null }[];
  dashboardUrl: string;
}

function digestHtml(p: DigestEmailParams): string {
  const statusLabel: Record<string, string> = { in: "At Work", out: "Out of Office", not_arrived: "Not Arrived", left: "Left for Day" };
  const statusColor: Record<string, string> = { in: "#16a34a", out: "#ea580c", not_arrived: "#9ca3af", left: "#6b7280" };
  const statusBg:    Record<string, string> = { in: "#dcfce7", out: "#ffedd5", not_arrived: "#f3f4f6", left: "#f3f4f6" };

  const totalHours = (p.stats.totalMinutes / 60).toFixed(1);

  const statBoxes = [
    { label: "At Work",       value: p.stats.inCount,          color: "#16a34a", bg: "#dcfce7" },
    { label: "Not Arrived",   value: p.stats.notArrivedCount,  color: "#6b7280", bg: "#f3f4f6" },
    { label: "Out of Office", value: p.stats.outCount,         color: "#ea580c", bg: "#ffedd5" },
    { label: "Left for Day",  value: p.stats.leftCount,        color: "#6b7280", bg: "#f3f4f6" },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Daily Attendance Digest</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr><td style="background:#4f46e5;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">OfficePulse</h1>
          <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">Daily Attendance Digest · ${p.companyName}</p>
        </td></tr>

        <!-- Date bar -->
        <tr><td style="background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:14px 40px;">
          <p style="margin:0;font-size:14px;color:#6b7280;">
            <strong style="color:#111827;">${p.date}</strong> &nbsp;·&nbsp; ${totalHours}h tracked today
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi ${p.adminFirstName}, here's today's attendance summary.</p>

          <!-- Stat boxes -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              ${statBoxes.map(s => `
              <td width="25%" style="padding:0 4px 0 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:${s.bg};border-radius:8px;">
                  <tr><td style="padding:14px;text-align:center;">
                    <p style="margin:0;font-size:22px;font-weight:700;color:${s.color};">${s.value}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${s.label}</p>
                  </td></tr>
                </table>
              </td>`).join("")}
            </tr>
          </table>

          <!-- Employee list -->
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Employee Status</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            ${p.employees.map((emp, i) => `
            <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
              <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;">${emp.name}</td>
              <td style="padding:10px 16px;text-align:right;">
                <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${statusBg[emp.status]};color:${statusColor[emp.status]};">
                  ${statusLabel[emp.status]}
                </span>
              </td>
            </tr>`).join("")}
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
            <tr><td style="background:#4f46e5;border-radius:8px;">
              <a href="${p.dashboardUrl}" style="display:inline-block;padding:12px 24px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
                View live dashboard →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            OfficePulse · <a href="${p.dashboardUrl}/settings" style="color:#9ca3af;">Manage digest settings</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendDailyDigest(params: DigestEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping daily digest");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Attendance digest · ${params.date} · ${params.companyName}`,
    html: digestHtml(params),
  });
  if (error) console.error("[email] Daily digest failed:", error);
}

export interface LeaveRequestEmailParams {
  to: string;
  adminFirstName: string;
  companyName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  appUrl: string;
}

function leaveRequestHtml(p: LeaveRequestEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Leave Request</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#4f46e5;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">OfficePulse</h1>
          <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">New Leave Request · ${p.companyName}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${p.adminFirstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>${p.employeeName}</strong> has submitted a leave request that requires your approval.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Employee</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${p.employeeName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Leave Type</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;">${p.leaveType}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Dates</p>
                <p style="margin:4px 0 0;font-size:15px;color:#111827;">${p.startDate} → ${p.endDate} <span style="color:#6b7280;">(${p.days} day${p.days !== 1 ? "s" : ""})</span></p>
              </td>
            </tr>
            ${p.reason ? `<tr>
              <td style="padding:14px 20px;">
                <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Reason</p>
                <p style="margin:4px 0 0;font-size:14px;color:#374151;">${p.reason}</p>
              </td>
            </tr>` : ""}
          </table>

          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#4f46e5;border-radius:8px;">
              <a href="${p.appUrl}/leaves" style="display:inline-block;padding:12px 24px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
                Review &amp; Approve →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">OfficePulse · Approve or reject this request in your dashboard.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLeaveRequestNotification(params: LeaveRequestEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping leave request email");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Leave request from ${params.employeeName} · ${params.days} day${params.days !== 1 ? "s" : ""} · ${params.companyName}`,
    html: leaveRequestHtml(params),
  });
  if (error) console.error("[email] Leave request notification failed:", error);
}

export interface LateAlertEmailParams {
  to: string;
  adminFirstName: string;
  companyName: string;
  date: string;
  alertTime: string;
  lateEmployees: { name: string }[];
  dashboardUrl: string;
}

function lateAlertHtml(p: LateAlertEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Late Arrival Alert</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#f59e0b;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">OfficePulse</h1>
          <p style="margin:4px 0 0;color:#fef3c7;font-size:13px;">Late Arrival Alert · ${p.companyName}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${p.adminFirstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            It's past <strong>${p.alertTime} UTC</strong> on ${p.date} and the following
            ${p.lateEmployees.length === 1 ? "employee has" : `${p.lateEmployees.length} employees have`} not yet arrived:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            ${p.lateEmployees.map((e, i) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
              <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:8px;vertical-align:middle;"></span>
                ${e.name}
              </td>
            </tr>`).join("")}
          </table>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#4f46e5;border-radius:8px;">
              <a href="${p.dashboardUrl}/attendance" style="display:inline-block;padding:12px 24px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
                View attendance →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            OfficePulse · <a href="${p.dashboardUrl}/settings" style="color:#9ca3af;">Manage alert settings</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLateAlert(params: LateAlertEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping late alert");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "OfficePulse <onboarding@officepulse.app>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `⚠️ ${params.lateEmployees.length} employee${params.lateEmployees.length > 1 ? "s" : ""} not yet arrived · ${params.companyName}`,
    html: lateAlertHtml(params),
  });
  if (error) console.error("[email] Late alert email failed:", error);
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
