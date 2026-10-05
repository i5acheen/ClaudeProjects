export default function StaleBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
      Stale · {days}d old
    </span>
  );
}
