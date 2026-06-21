"use client";

import { useState, type ReactNode } from "react";

/**
 * Menampilkan logo dari /public. Bila file belum ada / gagal dimuat,
 * menampilkan `fallback` (atau menyembunyikan diri) sehingga tidak ada
 * ikon gambar rusak.
 */
export function BrandLogo({
  src,
  alt,
  className = "",
  fallback = null,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setOk(false)}
      className={className}
    />
  );
}
