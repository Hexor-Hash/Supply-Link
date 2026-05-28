import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Verify a Product — Consumer Guide | Supply-Link",
  description:
    "Learn how to scan a QR code, read a product's journey, and confirm authenticity with the Verified on Stellar badge. No account or technical knowledge required.",
};

export default function ConsumerGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>
        <div className="flex items-center gap-2 font-bold text-sm">
          <ShieldCheck size={16} className="text-violet-500" aria-hidden="true" />
          Supply-Link
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium mb-4">
            Consumer Guide
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            How to Verify a Product
          </h1>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            Check whether a product is genuine and trace its journey from origin
            to the shelf — no account or technical knowledge required.
          </p>
        </div>

        {/* What is Supply-Link */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">What is Supply-Link?</h2>
          <p className="text-[var(--muted)] leading-relaxed">
            Supply-Link lets producers record every step of a product&apos;s
            life — from harvest to retail — on a public, tamper-proof ledger. As
            a consumer, you can read that record at any time to confirm a product
            is authentic and see exactly where it has been.
          </p>
        </section>

        <hr className="border-[var(--card-border)] mb-10" />

        {/* Step 1 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xl font-bold">Find the QR Code on the Product</h2>
          </div>
          <p className="text-[var(--muted)] leading-relaxed ml-11">
            Look for a QR code on the product&apos;s label, packaging, or
            receipt. It usually appears alongside text like &ldquo;Verify
            authenticity&rdquo; or &ldquo;Scan to trace.&rdquo;
          </p>
        </section>

        {/* Step 2 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-xl font-bold">Scan or Enter the Product ID</h2>
          </div>
          <div className="ml-11 space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Option A — Scan with your phone camera</h3>
              <ol className="list-decimal list-inside space-y-1 text-[var(--muted)] text-sm leading-relaxed">
                <li>
                  Go to{" "}
                  <Link href="/" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    the Supply-Link home page
                  </Link>{" "}
                  on your phone.
                </li>
                <li>
                  In the <strong className="text-[var(--foreground)]">Verify a Product</strong> section, tap{" "}
                  <strong className="text-[var(--foreground)]">Scan QR</strong>.
                </li>
                <li>Allow camera access when your browser asks.</li>
                <li>
                  Point your camera at the QR code on the product. The app reads
                  it automatically — no button press needed.
                </li>
              </ol>
              <div className="mt-3 p-3 rounded-lg bg-[var(--muted-bg)] border border-[var(--card-border)] text-xs text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Camera not working?</strong> Some browsers block
                camera access by default. Check your browser settings and make
                sure the site has permission to use the camera. You can also use
                Option B instead.
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Option B — Type the product ID manually</h3>
              <ol className="list-decimal list-inside space-y-1 text-[var(--muted)] text-sm leading-relaxed">
                <li>
                  Find the product ID printed near the QR code (it looks like{" "}
                  <code className="font-mono bg-[var(--muted-bg)] px-1 rounded">prod-001</code> or a longer code).
                </li>
                <li>
                  Type or paste it into the{" "}
                  <strong className="text-[var(--foreground)]">Enter product ID</strong> field on the home page.
                </li>
                <li>
                  Press <strong className="text-[var(--foreground)]">Verify</strong>.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-xl font-bold">Read the Product Journey</h2>
          </div>
          <div className="ml-11">
            <p className="text-[var(--muted)] text-sm leading-relaxed mb-4">
              After scanning or entering the ID, you will see the product&apos;s
              full history as a timeline. Each entry shows:
            </p>
            <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-[var(--muted-bg)]">
                    <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">
                      What you see
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">
                      What it means
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {[
                    {
                      label: "Harvest 🌱",
                      desc: "The product was collected or produced at this location and date.",
                    },
                    {
                      label: "Processing ⚙️",
                      desc: "The product was cleaned, sorted, or transformed at this facility.",
                    },
                    {
                      label: "Shipping 🚢",
                      desc: "The product left this location and was transported.",
                    },
                    {
                      label: "Retail 🏪",
                      desc: "The product arrived at a store or distribution point.",
                    },
                  ].map((row) => (
                    <tr key={row.label} className="bg-[var(--card)]">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)] whitespace-nowrap">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--muted)] mt-3">
              Each step also shows the date and time it was recorded, and the
              location where it happened.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-xl font-bold">
              Check the &ldquo;Verified on Stellar&rdquo; Badge
            </h2>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-[var(--muted)] text-sm leading-relaxed">
              At the top of the product page you will see a badge that reads{" "}
              <strong className="text-[var(--foreground)]">
                &ldquo;Verified on Stellar · View Contract&rdquo;
              </strong>
              .
            </p>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500 shrink-0">✓</span>
                This badge means the product&apos;s history is stored on the
                Stellar network — a public record that nobody can secretly change
                or delete.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500 shrink-0">✓</span>
                Clicking the badge opens the Stellar Explorer, where you can see
                the raw on-chain record if you want to dig deeper.
              </li>
            </ul>
            <div className="p-3 rounded-lg bg-[var(--muted-bg)] border border-[var(--card-border)] text-xs text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">
                If the badge is missing or the page shows &ldquo;Product Not
                Found&rdquo;
              </strong>
              , the product ID does not match any registered product. This could
              mean the QR code is damaged or counterfeit, the product was not
              registered with Supply-Link, or you may have mistyped the ID — try
              scanning the QR code instead.
            </div>
          </div>
        </section>

        <hr className="border-[var(--card-border)] mb-10" />

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Do I need an account to verify a product?",
                a: "No. Verification is completely open. Anyone can check any product at any time.",
              },
              {
                q: "Do I need a crypto wallet?",
                a: "No. Wallets are only needed by producers and logistics partners who add information to the record. As a consumer, you just read it.",
              },
              {
                q: "Is my scan tracked or stored?",
                a: "No personal data is collected when you verify a product. The verification page is read-only.",
              },
              {
                q: "What if the timeline only shows one or two steps?",
                a: "Not every product goes through all four stages. A locally produced item might only have a Harvest and Retail entry. Fewer steps are not a sign of a problem — what matters is that the steps shown are genuine.",
              },
              {
                q: "Can the history be faked?",
                a: "Each entry is written to the Stellar network by an authorized party and cannot be altered after the fact. Only actors that the product owner has explicitly approved can add events. If an entry appears, it was genuinely recorded by someone in the supply chain.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">{q}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center">
          <p className="text-[var(--muted)] mb-4 text-sm">
            Ready to verify a product?
          </p>
          <Link
            href="/#verify"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Go to Verify a Product
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--card-border)] px-6 py-8 mt-12">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--foreground)]">
            <ShieldCheck size={16} className="text-violet-500" aria-hidden="true" />
            Supply-Link
          </div>
          <p>© {new Date().getFullYear()} Supply-Link. MIT License.</p>
        </div>
      </footer>
    </div>
  );
}
