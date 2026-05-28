import Link from "next/link";
import {
  Package,
  MapPin,
  QrCode,
  Users,
  ArrowRight,
  Github,
  BookOpen,
  Zap,
  CheckCircle,
  ShieldCheck,
  Scan,
} from "lucide-react";
import { VerifyWidget } from "@/components/tracking/VerifyWidget";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-xl font-bold tracking-tight">Supply-Link</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-24 md:py-36 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium mb-6">
          <Zap size={12} />
          Powered by Stellar &amp; Soroban
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Transparent Supply Chains,{" "}
          <span className="text-violet-500">On-Chain</span>
        </h1>
        <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10">
          Register products, track every event from harvest to retail, and let anyone verify
          authenticity with a QR scan — all secured by Soroban smart contracts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors"
          >
            Get Started <ArrowRight size={16} />
          </Link>
          <Link
            href="/verify/demo"
            className="flex items-center gap-2 px-6 py-3 border border-[var(--card-border)] hover:border-violet-500/50 rounded-xl font-semibold transition-colors"
          >
            <Scan size={16} /> Verify a Product
          </Link>
        </div>

        {/* Journey illustration */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-0">
          {[
            { label: "Harvest", icon: "🌱", color: "bg-green-500/10 border-green-500/30 text-green-400" },
            { label: "Processing", icon: "⚙️", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
            { label: "Shipping", icon: "🚢", color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
            { label: "Retail", icon: "🏪", color: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center">
              <div className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border ${step.color}`}>
                <span className="text-3xl">{step.icon}</span>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="mx-2 text-[var(--muted)] shrink-0 hidden sm:block" size={20} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Verify a Product ─────────────────────────────────────────────────── */}
      <section
        id="verify"
        className="px-6 py-20 max-w-7xl mx-auto"
        aria-labelledby="verify-heading"
      >
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-10 md:p-14 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-6">
            <Scan size={28} className="text-violet-400" aria-hidden="true" />
          </div>

          <h2
            id="verify-heading"
            className="text-3xl md:text-4xl font-bold mb-3"
          >
            Verify a Product
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-lg mx-auto text-sm md:text-base">
            Scan the QR code on any Supply-Link product or enter its ID to see
            the full journey and confirm it&apos;s genuine — no account needed.
          </p>

          {/* Widget (client component) */}
          <VerifyWidget />

          {/* Guide link */}
          <p className="mt-6 text-xs text-[var(--muted)]">
            Not sure how this works?{" "}
            <Link
              href="/docs/user-guide-consumer"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              Read the consumer guide
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Everything you need</h2>
        <p className="text-center text-[var(--muted)] mb-14 max-w-xl mx-auto">
          A complete toolkit for producers, logistics partners, and consumers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Package size={24} className="text-violet-400" />,
              title: "Product Registration",
              desc: "Register any physical product on-chain with a unique ID, origin, and metadata.",
            },
            {
              icon: <MapPin size={24} className="text-blue-400" />,
              title: "Event Tracking",
              desc: "Log every supply chain event — harvest, processing, shipping, retail — with timestamps.",
            },
            {
              icon: <QrCode size={24} className="text-green-400" />,
              title: "QR Verification",
              desc: "Consumers scan a QR code to instantly verify product authenticity and full history.",
            },
            {
              icon: <Users size={24} className="text-orange-400" />,
              title: "Multi-party Auth",
              desc: "Authorize multiple actors per product. Only approved parties can add events.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] flex flex-col gap-4 hover:border-violet-500/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--muted-bg)] flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-[var(--muted-bg)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-center text-[var(--muted)] mb-14">Four steps from registration to consumer verification.</p>
          <div className="flex flex-col gap-8">
            {[
              {
                n: "01",
                icon: <Package size={20} className="text-violet-400" />,
                title: "Register your product",
                desc: "Connect your Freighter wallet and register a product on the Soroban smart contract. You get a unique on-chain ID.",
              },
              {
                n: "02",
                icon: <Users size={20} className="text-blue-400" />,
                title: "Authorize supply chain actors",
                desc: "Add logistics partners, processors, and retailers as authorized actors who can log events.",
              },
              {
                n: "03",
                icon: <MapPin size={20} className="text-green-400" />,
                title: "Log events at each stage",
                desc: "Each authorized actor logs events (harvest, processing, shipping, retail) with location and metadata.",
              },
              {
                n: "04",
                icon: <QrCode size={20} className="text-orange-400" />,
                title: "Consumers verify with QR",
                desc: "A QR code links to the full on-chain history. Anyone can verify authenticity without a wallet.",
              },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-6">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center font-mono font-bold text-sm text-[var(--muted)]">
                  {step.n}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    {step.icon} {step.title}
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Built for every industry</h2>
        <p className="text-center text-[var(--muted)] mb-14 max-w-xl mx-auto">
          From farm to pharmacy, Supply-Link adapts to any physical supply chain.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { emoji: "🌾", title: "Food & Beverage", desc: "Trace organic certifications, cold-chain compliance, and farm-to-table provenance." },
            { emoji: "💊", title: "Pharmaceuticals", desc: "Ensure drug authenticity, track lot numbers, and prevent counterfeits." },
            { emoji: "👗", title: "Fashion", desc: "Verify ethical sourcing, material origins, and fair-trade certifications." },
            { emoji: "💻", title: "Electronics", desc: "Track component origins, assembly locations, and warranty chains." },
          ].map((uc) => (
            <div
              key={uc.title}
              className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] flex flex-col gap-3 hover:border-violet-500/40 transition-colors"
            >
              <span className="text-4xl">{uc.emoji}</span>
              <h3 className="font-semibold text-lg">{uc.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-violet-600 p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-violet-200 mb-8 max-w-lg mx-auto">
            Connect your Freighter wallet and register your first product in under a minute.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-violet-700 rounded-xl font-semibold hover:bg-violet-50 transition-colors"
          >
            Launch App <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--card-border)] px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldCheck size={20} className="text-violet-500" />
            Supply-Link
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
            >
              <Github size={15} /> GitHub
            </a>
            <a
              href="https://github.com/your-org/supply-link/blob/main/docs/user-guide-producer.md"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
            >
              <BookOpen size={15} /> User Guide
            </a>
            <a
              href="https://developers.stellar.org/docs/smart-contracts"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
            >
              <BookOpen size={15} /> Docs
            </a>
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
            >
              <CheckCircle size={15} /> Stellar
            </a>
            <Link
              href="/docs/user-guide-consumer"
              className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
            >
              <BookOpen size={15} /> Consumer Guide
            </Link>
          </div>
          <p className="text-xs text-[var(--muted)]">© {new Date().getFullYear()} Supply-Link. MIT License.</p>
        </div>
      </footer>
    </div>
  );
}
