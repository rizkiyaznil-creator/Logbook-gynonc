import type { NextConfig } from "next";

// Hash SHA-256 dari dua skrip inline di src/app/layout.tsx (anti-flash tema &
// penangkap beforeinstallprompt). Diperlukan agar CSP dapat mengizinkan skrip
// itu tanpa 'unsafe-inline'. Bila isi skrip diubah, perbarui hash di sini
// (lihat skrip perhitungan di histori atau hitung ulang dengan crypto sha256).
const INLINE_SCRIPT_HASHES = [
  "'sha256-zSSdrobWpFX9jR47NRP85DhrlVWtVQxxhGSAzb4rOaY='", // themeScript
  "'sha256-CKKB/oH6DZZIJV7gyS+Ay+z5CoyKPOvjZywhJohPBrQ='", // installScript
];

// Content-Security-Policy — dipasang sebagai Report-Only lebih dulu agar tidak
// memblokir apa pun pada aplikasi yang sedang live; pelanggaran hanya tercatat
// di console browser. Setelah dipantau aman, pindahkan ke header penegak
// (Content-Security-Policy) — idealnya dengan nonce untuk skrip framework Next.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' ${INLINE_SCRIPT_HASHES.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // API & realtime Supabase (anon key dari browser).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Header keamanan yang ditegakkan untuk seluruh rute.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
