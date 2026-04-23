import { stageColor } from "@/lib/status-utils";

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stageColor(stage)}`}>
      {stage}
    </span>
  );
}
