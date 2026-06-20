import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logbook Onkologi Ginekologi",
  description:
    "Logbook interaktif PPDS Subspesialis Onkologi Ginekologi — pencatatan & pemantauan pencapaian kompetensi.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
