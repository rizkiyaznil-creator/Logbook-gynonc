"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ComboOption = { value: string; label: string };

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

/**
 * Dropdown yang bisa dicari. Mengirim `value` (id) lewat hidden input `name`,
 * sehingga kompatibel dengan form/server action yang sudah ada.
 */
export function Combobox({
  name,
  options,
  defaultValue,
  placeholder = "Ketik untuk mencari…",
  onValueChange,
}: {
  name: string;
  options: ComboOption[];
  defaultValue?: string | null;
  placeholder?: string;
  /** Dipanggil saat nilai (value/id) terpilih berubah. */
  onValueChange?: (value: string) => void;
}) {
  const initial = options.find((o) => o.value === defaultValue);
  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(initial?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (
    q.length === 0
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(q))
  ).slice(0, 50);

  function choose(o: ComboOption) {
    setValue(o.value);
    onValueChange?.(o.value);
    setQuery(o.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        choose(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onBlurResolve() {
    // Bila teks cocok persis dengan satu opsi, pilih otomatis; jika tidak,
    // kembalikan teks ke pilihan terakhir yang valid (atau kosongkan).
    const exact = options.find(
      (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
    );
    if (exact) {
      setValue(exact.value);
      onValueChange?.(exact.value);
      setQuery(exact.label);
    } else {
      const current = options.find((o) => o.value === value);
      setQuery(current?.label ?? "");
    }
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setValue("");
          onValueChange?.("");
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlurResolve}
        className={inputCls}
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 text-sm shadow-lg"
        >
          {filtered.map((o, i) => (
            <li
              key={o.value}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-1.5 ${
                i === highlight ? "bg-teal-50 text-teal-800" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-400 dark:text-slate-500 shadow-lg">
          Tidak ada hasil untuk “{query}”.
        </div>
      )}
    </div>
  );
}
