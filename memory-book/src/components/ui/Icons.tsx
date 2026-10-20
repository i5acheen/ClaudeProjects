/** Tiny line icons for the app chrome. */

type IconProps = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const BookIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
    <path d="M12 6.5v13" />
  </svg>
);

export const GridIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const GearIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const ChevronLeft = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronRight = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const PenIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
    <path d="M14.5 6.5l3 3" />
  </svg>
);

export const FolderIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
  </svg>
);

export const ExpandIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const SunIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);

export const MoonIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

export const CameraIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </svg>
);

export const ImagesIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5" width="14" height="13" rx="2.5" />
    <path d="M7 5V4.5A1.5 1.5 0 0 1 8.5 3h10A2 2 0 0 1 20.5 5v10a1.5 1.5 0 0 1-1.5 1.5H17.5" />
    <circle cx="8.5" cy="9.5" r="1.4" />
    <path d="M3.5 15.5l4-3.5 3.5 3 2.5-2 4 3.5" />
  </svg>
);

export const RefreshIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M20 11.5A8 8 0 0 0 6 6.5L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 12.5a8 8 0 0 0 14 5l2-2" />
    <path d="M20 20v-4.5h-4.5" />
  </svg>
);

export const CloudUpIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4.75 4.75 0 0 1-.5 9.5" />
    <path d="M12 12.5v7M9 15l3-3 3 3" />
  </svg>
);

export const MailIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="M4.5 7.5l7.5 5.5 7.5-5.5" />
  </svg>
);

export const PaletteIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.6-2.1-.5-1.3.3-2.4 1.7-2.4H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z" />
    <circle cx="7.8" cy="11" r="1.2" />
    <circle cx="10.5" cy="7.5" r="1.2" />
    <circle cx="15" cy="8" r="1.2" />
  </svg>
);

export const SparklesIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z" />
    <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </svg>
);

export const StarIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />
  </svg>
);

export const LockIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const CakeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4.5 20.5h15M5.5 20.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6" />
    <path d="M5.5 16c1.2 1 2.3 1 3.3 0s2.1-1 3.2 0 2.1 1 3.2 0 2.1-1 3.3 0" />
    <path d="M12 12.5V9M12 6.5c-.8-.8-.8-1.7 0-3 .8 1.3.8 2.2 0 3z" />
  </svg>
);

/** Memory Book's mark: an open book with a little heart, on a sky-to-sunshine tile. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fd0f5" />
          <stop offset="1" stopColor="#b9a8f0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#logo-tile)" />
      <path d="M24 15c-3.6-2.4-8.2-3-13-2.2v20.4c4.8-.8 9.4-.2 13 2.3 3.6-2.5 8.2-3.1 13-2.3V12.8c-4.8-.8-9.4-.2-13 2.2z" fill="#fff" />
      <path d="M24 15v20.5" stroke="#b9a8f0" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30.6 18.4a2.1 2.1 0 0 0-3.1.4 2.1 2.1 0 0 0-3.1-.4c-.9.8-.8 2.2.1 3.1l3 2.8 3-2.8c.9-.9 1-2.3.1-3.1z" fill="#ffcd3c" transform="translate(-0.5 1)" />
    </svg>
  );
}

export const BabyIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 5.5c-1.6-.4-2.4-1.6-1.6-2.6.8-.9 2.6-.4 2.4 1" />
    <path d="M9.3 12.2h.01M14.7 12.2h.01" strokeWidth="2.6" />
    <path d="M9.8 15.6c1.3 1 3.1 1 4.4 0" />
  </svg>
);

export const ChecklistIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 6.5l1.6 1.6L8.5 5M4 12.5l1.6 1.6 2.9-3.1M4 18.5l1.6 1.6 2.9-3.1" />
    <path d="M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5" />
  </svg>
);

export const RainbowIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 18a9 9 0 0 1 18 0" />
    <path d="M6.5 18a5.5 5.5 0 0 1 11 0" />
    <path d="M10 18a2 2 0 0 1 4 0" />
  </svg>
);

export const CalendarIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeWidth="2.4" />
  </svg>
);

export const PrinterIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M7 9V4h10v5" />
    <rect x="3.5" y="9" width="17" height="8" rx="2.5" />
    <path d="M7 14.5h10V20H7z" />
    <path d="M17 12h.01" strokeWidth="2.6" />
  </svg>
);
