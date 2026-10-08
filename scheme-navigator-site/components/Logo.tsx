import { rich } from '@/lib/placeholders';

/** Simple abstract mark (two linked paths). Deliberately not a medical or government emblem. */
export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="size-9 shrink-0">
        <rect width="40" height="40" rx="12" fill="#0b6b63" />
        <path
          d="M11 22c0-5 4-9 9-9"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M29 18c0 5-4 9-9 9"
          stroke="#fed7aa"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="20" cy="13" r="2.6" fill="#fff" />
        <circle cx="20" cy="27" r="2.6" fill="#fed7aa" />
      </svg>
      <span className="text-[1.05rem] leading-tight font-bold text-ink sm:text-lg">{rich(name)}</span>
    </span>
  );
}
