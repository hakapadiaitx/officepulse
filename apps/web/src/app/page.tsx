import Link from "next/link";
import {
  CheckCircle, Users, BarChart3, Clock, Shield, Smartphone,
  CalendarDays, QrCode, Bell, FileSpreadsheet, Mail, ChevronRight,
  CheckCheck, X, Coffee, Home, LogOut,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">OfficePulse</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Sign in</Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start free trial <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <CheckCircle className="w-3.5 h-3.5" /> 14-day free trial · No credit card required
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
              Attendance & leave<br />management your<br />
              <span className="text-indigo-600">team will actually use</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              A PIN-based kiosk terminal, leave approvals, balance tracking, and live reports — all in one place. Deployed in minutes on any device.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                Get started free <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                View pricing
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">No app install for employees. Works on any browser.</p>
          </div>

          {/* Kiosk mockup */}
          <div className="lg:flex justify-center hidden">
            <div className="w-80 rounded-2xl overflow-hidden shadow-2xl border border-gray-100" style={{ background: "#f8fafc" }}>
              {/* Kiosk header */}
              <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">OfficePulse</p>
                  <p className="text-indigo-200 text-xs">Attendance Terminal</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-xl tabular-nums">09:14</p>
                  <p className="text-indigo-200 text-xs">Friday, Aug 22</p>
                </div>
              </div>
              {/* Status strip */}
              <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-4 text-xs">
                <span className="font-bold text-green-600">4 <span className="font-normal text-gray-400">At Work</span></span>
                <span className="font-bold text-gray-400">1 <span className="font-normal text-gray-400">Not Arrived</span></span>
                <span className="font-bold text-blue-500">2 <span className="font-normal text-gray-400">On Leave</span></span>
              </div>
              {/* Employee cards */}
              <div className="p-3 space-y-2">
                {[
                  { name: "Alice Brown", init: "AB", status: "At Work", since: "8:53 am", dot: "bg-green-400", badge: "bg-green-100 text-green-700", actions: ["Check Out", "Leave"] },
                  { name: "Bob Chen",    init: "BC", status: "On Leave", since: "",        dot: "bg-blue-400",  badge: "bg-blue-100 text-blue-600",  actions: [] },
                  { name: "Sara Patel",  init: "SP", status: "At Work", since: "9:02 am", dot: "bg-green-400", badge: "bg-green-100 text-green-700", actions: ["Check Out", "Leave"] },
                ].map((e) => (
                  <div key={e.name} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {e.init}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{e.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${e.badge}`}>{e.status}</span>
                        {e.since && <span className="text-[10px] text-gray-400">since {e.since}</span>}
                      </div>
                    </div>
                    {e.actions.length > 0 && (
                      <div className="flex gap-1">
                        {e.actions.map((a) => (
                          <span key={a} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ──────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-5">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-gray-500">
            {["Works on any browser", "No app install for staff", "PWA — installs like a native app", "Automatic email digests", "Leave approvals & balance tracking"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-indigo-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-indigo-600 font-semibold text-sm mb-2">Simple setup</p>
          <h2 className="text-3xl font-bold text-gray-900">Up and running in minutes</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              n: "1",
              icon: Users,
              title: "Add your employees",
              desc: "Create employee profiles and assign each person a private 4-digit PIN. No app download required — they use the PIN at the kiosk.",
            },
            {
              n: "2",
              icon: QrCode,
              title: "Deploy the kiosk",
              desc: "Scan the QR code on any tablet, phone, or PC. Tap 'Add to Home Screen' for a full-screen native experience. Done.",
            },
            {
              n: "3",
              icon: BarChart3,
              title: "Track, approve & report",
              desc: "See live attendance, manage leave requests, and get a morning digest emailed to you every day. Everything in one dashboard.",
            },
          ].map((step) => (
            <div key={step.n} className="relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-indigo-600 font-semibold text-sm mb-2">Full-featured</p>
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to manage your team</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Real-time Attendance",
                desc: "See who's at work, out of office, or on leave — live. Employees tap Arrive, Check Out, Return, or Leave for Day with their PIN.",
              },
              {
                icon: CalendarDays,
                title: "Leave Management",
                desc: "Employees submit leave requests from the kiosk. Admins approve or reject with one click. Email notifications sent automatically.",
              },
              {
                icon: Shield,
                title: "Leave Balance Tracking",
                desc: "Set annual, sick, personal, and other leave allowances. Override per-employee for seniors. Balances shown on kiosk after PIN entry.",
              },
              {
                icon: BarChart3,
                title: "Leave Calendar",
                desc: "Month-view calendar of approved leaves on the web. 'Upcoming Leaves' tab on the kiosk shows who's out for the next 30 days.",
              },
              {
                icon: Mail,
                title: "Daily Digest & Alerts",
                desc: "Get a daily attendance email every morning. Late arrival alerts notify you when employees haven't arrived past a threshold.",
              },
              {
                icon: FileSpreadsheet,
                title: "Reports & Excel Export",
                desc: "Generate attendance reports by day, week, month, or quarter. Export to Excel for payroll or compliance.",
              },
              {
                icon: QrCode,
                title: "QR Code Kiosk Deploy",
                desc: "Each workspace gets a unique QR code. Scan it on any device to open the terminal. Add to home screen for a native app feel.",
              },
              {
                icon: Smartphone,
                title: "PWA — No App Store",
                desc: "The kiosk installs as a Progressive Web App on iOS and Android. Full-screen, offline-capable, no App Store needed.",
              },
              {
                icon: Bell,
                title: "Custom Branding",
                desc: "Upload your company logo and choose a brand colour. It appears on the kiosk terminal and all employee-facing screens.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leave workflow highlight ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Leave flow visual */}
          <div className="space-y-3">
            {[
              { icon: CalendarDays, color: "bg-indigo-100 text-indigo-600", label: "Employee submits request", sub: "Via the kiosk terminal after PIN entry", arrow: true },
              { icon: Bell,         color: "bg-amber-100 text-amber-600",   label: "Admin receives email",    sub: "Instant notification with leave details", arrow: true },
              { icon: CheckCircle,  color: "bg-green-100 text-green-600",   label: "Approved or rejected",    sub: "One click in the dashboard, with optional note", arrow: true },
              { icon: Mail,         color: "bg-blue-100 text-blue-600",     label: "Employee notified",        sub: "Email sent with the decision and reason", arrow: true },
              { icon: Clock,        color: "bg-purple-100 text-purple-600", label: "Kiosk reflects status",   sub: "Employee shows 'On Leave' — actions disabled", arrow: false },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step.color}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                    <p className="text-xs text-gray-400">{step.sub}</p>
                  </div>
                </div>
                {step.arrow && <div className="ml-5 border-l-2 border-dashed border-gray-200 h-3" />}
              </div>
            ))}
          </div>

          {/* Copy */}
          <div>
            <p className="text-indigo-600 font-semibold text-sm mb-3">Leave management</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-5">The full leave cycle, automated</h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              From the moment an employee submits a request at the kiosk to the moment the kiosk shows them as "On Leave" — every step happens automatically. No spreadsheets, no manual status updates.
            </p>
            <ul className="space-y-3">
              {[
                "Annual, Sick, Personal & Other leave types",
                "Policy-level allowances with per-employee overrides",
                "Leave balance visible to employees on the kiosk",
                "Month-view calendar of all approved leaves",
                "Upcoming leaves panel on the kiosk for the next 30 days",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Kiosk actions highlight ─────────────────────────────────────────── */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-indigo-200 font-semibold text-sm mb-3">The kiosk terminal</p>
              <h2 className="text-3xl font-bold text-white mb-5">Four actions, zero confusion</h2>
              <p className="text-indigo-100 leading-relaxed mb-8">
                The kiosk keeps it simple. Employees enter their PIN and tap one button. Their status updates instantly across every device.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Home,    action: "Arrive",       desc: "Start of the work day",          color: "bg-green-500" },
                  { icon: Coffee,  action: "Check Out",    desc: "Temporary absence with purpose",  color: "bg-orange-400" },
                  { icon: Home,    action: "Return",       desc: "Back from a break or errand",     color: "bg-blue-400" },
                  { icon: LogOut,  action: "Leave for Day", desc: "Clocked out for the day",        color: "bg-gray-500" },
                ].map((a) => (
                  <div key={a.action} className="bg-white/10 rounded-xl p-4">
                    <div className={`w-8 h-8 ${a.color} rounded-lg flex items-center justify-center mb-2`}>
                      <a.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-white font-semibold text-sm">{a.action}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {/* Mini attendance summary card */}
              <div className="bg-white/10 rounded-2xl p-5 text-white">
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-4">Today · Acme Corp</p>
                <div className="grid grid-cols-4 gap-2 text-center mb-5">
                  {[["6", "At Work", "text-green-300"], ["1", "Out", "text-orange-300"], ["2", "Not In", "text-gray-300"], ["2", "On Leave", "text-blue-300"]].map(([n, label, clr]) => (
                    <div key={label}>
                      <p className={`text-2xl font-bold ${clr}`}>{n}</p>
                      <p className="text-indigo-200 text-[10px] leading-tight mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {[
                    { init: "SJ", name: "Sarah J.", status: "At Work", clr: "bg-green-400", badge: "text-green-300" },
                    { init: "MK", name: "Mike K.", status: "Out · Client meeting", clr: "bg-orange-400", badge: "text-orange-300" },
                    { init: "RP", name: "Raj P.", status: "On Leave", clr: "bg-blue-400", badge: "text-blue-300" },
                  ].map((e) => (
                    <div key={e.name} className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2">
                      <div className={`w-7 h-7 rounded-full ${e.clr} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>{e.init}</div>
                      <p className="text-white text-xs font-medium flex-1 truncate">{e.name}</p>
                      <p className={`text-[10px] ${e.badge} truncate`}>{e.status}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Daily digest email</p>
                  <p className="text-indigo-200 text-xs">Sent every morning with full attendance summary, hours tracked, and absentee list.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof / CTA ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to ditch the spreadsheet?</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Set up your workspace in under 5 minutes. Add employees, deploy the kiosk QR, and start tracking — today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
              Start free 14-day trial <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-xl transition-colors">
              See pricing
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">No credit card required. Cancel any time.</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">OfficePulse</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/pricing" className="hover:text-gray-600 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-gray-600 transition-colors">Sign up</Link>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} OfficePulse</p>
        </div>
      </footer>

    </div>
  );
}
