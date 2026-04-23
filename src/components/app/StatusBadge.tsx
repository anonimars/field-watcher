import { statusColor } from "@/lib/status-utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(status)}`}>
      {status}
    </span>
  );
}
