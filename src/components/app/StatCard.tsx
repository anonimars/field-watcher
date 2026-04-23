import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
}

const toneStyles: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-card border-border text-foreground",
  success: "bg-green-50 border-green-200 text-green-900",
  warning: "bg-orange-50 border-orange-200 text-orange-900",
  danger: "bg-red-50 border-red-200 text-red-900",
  muted: "bg-muted border-border text-foreground",
};

export function StatCard({ label, value, icon: Icon, tone = "default" }: Props) {
  return (
    <Card className={`${toneStyles[tone]} border`}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium opacity-80">{label}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
        <Icon className="w-8 h-8 opacity-60" />
      </CardContent>
    </Card>
  );
}
