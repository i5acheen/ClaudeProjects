import type { ControlStatusValue } from "@/lib/types";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";

export default function StatusBadge({ status }: { status: ControlStatusValue }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
