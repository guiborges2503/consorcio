import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  color?: "purple" | "blue" | "green" | "orange";
}

const colorClasses = {
  purple: "bg-slate-100 text-slate-700 border border-slate-200/80",
  blue: "bg-slate-50 text-slate-600 border border-slate-200/80",
  green: "bg-emerald-50 text-emerald-800 border border-emerald-100/90",
  orange: "bg-amber-50 text-amber-900 border border-amber-100/90",
};

export function StatCard({ title, value, icon: Icon, trend, color = "purple" }: StatCardProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums mb-2 text-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={`text-sm ${trend.positive ? "text-emerald-700/90" : "text-red-600/90"}`}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={`shrink-0 rounded-xl p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      </div>
    </Card>
  );
}
