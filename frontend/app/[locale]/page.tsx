import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Package, MapPin, QrCode, Users, ArrowRight,
  Github, BookOpen, Zap, CheckCircle, ShieldCheck, Scan,
} from "lucide-react";

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-xl font-bold tracking-tight">Supply-Link</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            {t("nav.dashboard")}
          </Link>
          <Link href="/dashboard" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
            {t("nav.getStarted")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-24 md:py-36 max-w-7xl mx-auto text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium mb-6">
          <Zap size={12} />
          {t("hero.badge")}
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          {t("hero.title")}{" "}
          <span className="text-violet-500">{t("hero.titleHighlight")}</span>
        </h1>
        <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors">
            {t("hero.cta")} <ArrowRight size={16} />
          </Link>
          <Link href="/verify/demo" className="flex items-center gap-2 px-6 py-3 border border-[var(--card-border)] hover:border-violet-500/50 rounded-xl font-semibold transition-colors">
            <Scan size={16} /> {t("hero.verify")}
          </Link>
        </div>

        {/* Journey */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-0">
          {[
            { key: "harvest", icon: "🌱", color: "bg-green-500/10 border-green-500/30 text-green-400" },
            { key: "processing", icon: "⚙️", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
            { key: "shipping", icon: "🚢", color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
            { key: "retail", icon: "🏪", color: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
          ].map((step, i, arr) => (
            <div key={step.key} className="flex items-center">
              <div className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border ${step.color}`}>
                <span className="text-3xl">{step.icon}</span>
                <span className="text-sm font-medium">{t(`journey.${step.key}` as any)}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight className="mx-2 text-[var(--muted)] shrink-0 hidden sm:block" size={20} />}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t("features.heading")}</h2>
        <p className="text-center text-[var(--muted)] mb-14 max-w-xl mx-auto">{t("features.subheading")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: "registration", icon: <Package size={24} className="text-violet-400" /> },
            { key: "tracking", icon: <MapPin size={24} className="text-blue-400" /> },
            { key: "qr", icon: <QrCode size={24} className="text-green-400" /> },
            { key: "auth", icon: <Users size={24} className="text-orange-400" /> },
          ].map((f) => (
            <div key={f.key} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] flex flex-col gap-4 hover:border-violet-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[var(--muted-bg)] flex items-center justify-center">{f.icon}</div>
              <h3 className="font-semibold text-lg">{t(`features.${f.key}.title` as any)}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{t(`features.${f.key}.desc` as any)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-[var(--muted-bg)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t("howItWorks.heading")}</h2>
          <p className="text-center text-[var(--muted)] mb-14">{t("howItWorks.subheading")}</p>
          <div className="flex flex-col gap-8">
            {[
              { n: "01", key: "step1", icon: <Package size={20} className="text-violet-400" /> },
              { n: "02", key: "step2", icon: <Users size={20} className="text-blue-400" /> },
              { n: "03", key: "step3", icon: <MapPin size={20} className="text-green-400" /> },
              { n: "04", key: "step4", icon: <QrCode size={20} className="text-orange-400" /> },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-6">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center font-mono font-bold text-sm text-[var(--muted)]">
                  {step.n}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    {step.icon} {t(`howItWorks.${step.key}.title` as any)}
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{t(`howItWorks.${step.key}.desc` as any)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t("useCases.heading")}</h2>
        <p className="text-center text-[var(--muted)] mb-14 max-w-xl mx-auto">{t("useCases.subheading")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: "food", emoji: "🌾" },
            { key: "pharma", emoji: "💊" },
            { key: "fashion", emoji: "👗" },
            { key: "electronics", emoji: "💻" },
          ].map((uc) => (
            <div key={uc.key} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] flex flex-col gap-3 hover:border-violet-500/40 transition-colors">
              <span className="text-4xl">{uc.emoji}</span>
              <h3 className="font-semibold text-lg">{t(`useCases.${uc.key}.title` as any)}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{t(`useCases.${uc.key}.desc` as any)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-violet-600 p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("cta.heading")}</h2>
          <p className="text-violet-200 mb-8 max-w-lg mx-auto">{t("cta.subheading")}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-violet-700 rounded-xl font-semibold hover:bg-violet-50 transition-colors">
            {t("cta.button")} <ArrowRight size={16} />
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
            <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors">
              <Github size={15} /> GitHub
            </a>
            <Link href="/api-docs" className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors">
              <BookOpen size={15} /> API Docs
            </Link>
            <a href="https://developers.stellar.org/docs/smart-contracts" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors">
              <BookOpen size={15} /> Docs
            </a>
            <a href="https://stellar.org" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors">
              <CheckCircle size={15} /> Stellar
            </a>
          </div>
          <p className="text-xs text-[var(--muted)]">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
