export const RISK_KEYWORDS = ["pest", "drought", "disease", "flood", "damage", "wilting", "infection"];

export function stageColor(stage: string): string {
  switch (stage) {
    case "Planted": return "bg-blue-100 text-blue-800 border-blue-300";
    case "Growing": return "bg-green-100 text-green-800 border-green-300";
    case "Ready": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "Harvested": return "bg-amber-200 text-amber-900 border-amber-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "Active": return "bg-green-100 text-green-800 border-green-300";
    case "At Risk": return "bg-red-100 text-red-800 border-red-300";
    case "Completed": return "bg-gray-200 text-gray-700 border-gray-300";
    default: return "bg-muted";
  }
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
