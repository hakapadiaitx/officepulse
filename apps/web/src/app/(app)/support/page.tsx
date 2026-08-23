"use client";
import { Mail, MessageCircle, BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

const SUPPORT_EMAIL = "support@officepulse.us";

const faqs = [
  {
    q: "How do I reset an employee's kiosk PIN?",
    a: "Go to Employees, click the employee's name, then click Edit. You can set a new 4-digit PIN from the edit panel. The employee can then use the new PIN at the kiosk immediately.",
  },
  {
    q: "How do I set up the kiosk on a tablet or shared device?",
    a: "Open Settings and find the Kiosk Terminal card. Copy or scan the QR code with the device you want to use as the kiosk. On iOS, tap Share → Add to Home Screen. On Android, tap the browser menu → Add to Home Screen (or Install App). The kiosk runs as a full-screen PWA with no browser chrome.",
  },
  {
    q: "Why are some employees showing the wrong attendance status?",
    a: "Attendance status is calculated from check-in/check-out logs for the current calendar day (UTC). If your timezone is significantly ahead of UTC, an employee who checked out late may show as 'Left for Day' on the next day. You can view and correct individual sessions from the Attendance page.",
  },
  {
    q: "How do I approve or reject a leave request?",
    a: "Go to Leave Requests. Pending requests show an Approve and Reject button. Approved leaves are reflected on the Leave Calendar and in the kiosk's Upcoming Leaves tab.",
  },
  {
    q: "How do I change the brand color or logo?",
    a: "Open Settings and scroll to the Branding section. Pick a preset color or enter any hex value, then save. Upload your company logo with the logo uploader. Changes take effect immediately across the web app and kiosk.",
  },
  {
    q: "The daily digest email isn't arriving — what should I check?",
    a: "First, make sure the digest toggle is enabled in Settings → Notifications. Then use the 'Send digest now' button to test immediately. If it errors, the message will tell you whether RESEND_API_KEY is missing or misconfigured. The automated digest fires at 6 PM UTC via a Vercel cron job.",
  },
  {
    q: "How do I create a schedule for my team?",
    a: "Go to Schedule in the sidebar. Click any empty cell or the 'New Entry' button to add a shift. You can set a start/end time, label, and optionally repeat the entry weekly for up to 52 weeks. Switch between week and month views using the toggle in the top-right.",
  },
  {
    q: "Can multiple employees use the same kiosk URL?",
    a: "Yes — the kiosk URL is shared for your whole workspace. Any employee in your account can check in or out by finding their name in the employee list and entering their PIN.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="text-gray-500 mt-1 text-sm">Get help with OfficePulse</p>
      </div>

      {/* Contact card */}
      <div className="card p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-base">Email support</h2>
          <p className="text-sm text-gray-500 mt-1">
            Can't find what you need below? Send us an email and we'll get back to you as soon as possible.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            {SUPPORT_EMAIL}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Response time</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              We aim to respond to all support emails within 1 business day.
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">What to include</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Your workspace name, a description of the issue, and any error messages you see.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-semibold text-gray-900 text-lg mb-4">Frequently asked questions</h2>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      {/* Footer nudge */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">
          Still stuck?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
            Email us
          </a>{" "}
          — we're happy to help.
        </p>
      </div>
    </div>
  );
}
