import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

type P = SVGProps<SVGSVGElement>;

export const Icons = {
  dashboard: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  logbook: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
      <path d="M8 7h7M8 11h7" />
    </svg>
  ),
  plus: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  brain: (p: P) => (
    <svg {...base} {...p}>
      <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V4a3 3 0 0 0-3-1z" />
      <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1" />
    </svg>
  ),
  verify: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  clipboard: (p: P) => (
    <svg {...base} {...p}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9z" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  ),
  chart: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 4v16h16" />
      <path d="M8 14v3M12 10v7M16 6v11" />
    </svg>
  ),
  users: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M16 6a3 3 0 0 1 0 6M21 20c0-2.5-1.5-4.3-4-4.8" />
    </svg>
  ),
  user: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  ),
  activity: (p: P) => (
    <svg {...base} {...p}>
      <path d="M3 12h4l2 6 4-14 2 8h6" />
    </svg>
  ),
  stethoscope: (p: P) => (
    <svg {...base} {...p}>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M10 16a5 5 0 0 0 10 0v-2" />
      <circle cx="20" cy="11" r="2" />
      <path d="M10 16v-4" />
    </svg>
  ),
  dna: (p: P) => (
    <svg {...base} {...p}>
      <path d="M7 3c0 5 10 7 10 12M17 3c0 5-10 7-10 12M7 21c0-2 10-4 10-9M17 21c0-2-10-4-10-9" />
      <path d="M8 6h8M8 18h8M9.5 9h5M9.5 15h5" />
    </svg>
  ),
  shield: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  ),
  research: (p: P) => (
    <svg {...base} {...p}>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M7.5 14h9" />
    </svg>
  ),
  printer: (p: P) => (
    <svg {...base} {...p}>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v7H6z" />
    </svg>
  ),
  download: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
  check: (p: P) => (
    <svg {...base} {...p}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  bell: (p: P) => (
    <svg {...base} {...p}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  menu: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (p: P) => (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  logout: (p: P) => (
    <svg {...base} {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 12H3M3 12l3-3M3 12l3 3" />
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
