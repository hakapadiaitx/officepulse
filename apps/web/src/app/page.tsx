import Link from "next/link";
import { CheckCircle, Users, BarChart3, Clock, Shield, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">OfficePulse</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <CheckCircle className="w-4 h-4" /> 14-day free trial, no credit card required
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Know who is in and<br />out of your office
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          OfficePulse lets employees check in and out with a simple PIN, tracks hours automatically, and gives you beautiful reports.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="btn-primary text-base px-8 py-3">Get started free</Link>
          <Link href="/pricing" className="btn-secondary text-base px-8 py-3">View pricing</Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Employee Management", desc: "Add employees with a name and 4-digit PIN. No app installs needed for staff." },
              { icon: Clock, title: "Real-time Status", desc: "See at a glance who is in the office and who is out, with purpose and time." },
              { icon: BarChart3, title: "Reports & Analytics", desc: "Daily, weekly, monthly, and quarterly reports on hours and visit patterns." },
              { icon: Shield, title: "Secure PIN Auth", desc: "Employees authenticate with a private 4-digit PIN. No password sharing." },
              { icon: Smartphone, title: "Web & Mobile", desc: "Works in any browser and native iOS/Android app for employees." },
              { icon: CheckCircle, title: "Multi-tenant", desc: "Each company gets its own isolated workspace. Perfect for multiple locations." },
            ].map((f) => (
              <div key={f.title} className="card p-6">
                <f.icon className="w-8 h-8 text-brand-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
        <p className="text-gray-500 mb-8">Join hundreds of businesses tracking attendance with OfficePulse.</p>
        <Link href="/register" className="btn-primary text-base px-10 py-3">Start your free trial</Link>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} OfficePulse. All rights reserved.
      </footer>
    </div>
  );
}
