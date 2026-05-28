import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * HTTP Security Headers
 *
 * Content-Security-Policy directives:
 *   default-src 'self'          — only same-origin resources by default
 *   script-src  'self' 'unsafe-inline'
 *                               — same-origin scripts + inline handlers required by Next.js
 *                                 TODO: migrate to nonce-based CSP using next/headers once
 *                                 the app adopts the App Router middleware nonce pattern
 *   style-src   'self' 'unsafe-inline' fonts.googleapis.com
 *                               — Tailwind inlines styles; Google Fonts stylesheet
 *   font-src    'self' fonts.gstatic.com
 *                               — Google Fonts font files
 *   img-src     'self' data: blob:
 *                               — same-origin images, inline data URIs (QR codes), blob URLs
 *   connect-src 'self' *.stellar.org *.soroban.stellar.org *.vercel-insights.com
 *                               — Stellar Soroban RPC (testnet + mainnet), Vercel Analytics
 *   frame-ancestors 'none'      — prevents clickjacking (equivalent to X-Frame-Options: DENY)
 *   base-uri    'self'          — prevents base-tag injection attacks
 *   form-action 'self'          — forms may only submit to same origin
 *   block-all-mixed-content     — block HTTP resources on HTTPS pages
 *   upgrade-insecure-requests   — auto-upgrade HTTP sub-resource requests to HTTPS
 *
 * Other headers:
 *   X-Frame-Options: DENY                    — legacy clickjacking protection
 *   X-Content-Type-Options: nosniff          — prevent MIME-type sniffing
 *   Referrer-Policy: strict-origin-when-cross-origin
 *                                            — send full referrer on same-origin, origin only cross-origin
 *   Permissions-Policy                       — disable camera, microphone, geolocation APIs
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // TODO: replace 'unsafe-inline' with nonce-based CSP using next/headers
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      [
        "connect-src 'self'",
        "https://*.stellar.org",
        "https://*.soroban.stellar.org",
        "https://soroban-testnet.stellar.org",
        "https://soroban-mainnet.stellar.org",
        "https://*.vercel-insights.com",
      ].join(" "),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "block-all-mixed-content",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Service worker must never be cached so browsers always get the latest version
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // PWA manifest
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
