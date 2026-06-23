import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Logbook PPDS USU",
  description:
    "Logbook PPDS Universitas Sumatera Utara — platform multi-program untuk pencatatan & pemantauan pencapaian kompetensi.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Logbook USU",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

// Terapkan tema & ukuran font sebelum paint agar tidak ada kedipan (flash).
const themeScript = `
(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');var f=parseInt(localStorage.getItem('fontScale'),10);if(!isNaN(f)){f=Math.min(140,Math.max(80,f));document.documentElement.style.fontSize=f+'%';}}catch(e){}})();
`;

// Tangkap event "beforeinstallprompt" sedini mungkin (sebelum React mount)
// agar tombol/pop-up pemasangan aplikasi bisa memakainya.
const installScript = `
(function(){try{window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;window.dispatchEvent(new Event('bip-ready'));});window.addEventListener('appinstalled',function(){window.__bip=null;window.dispatchEvent(new Event('bip-ready'));});}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: installScript }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
