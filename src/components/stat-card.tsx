import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  /** Linha auxiliar abaixo do título (altura fixa para alinhar o grid). */
  subtitle?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  color?: "purple" | "blue" | "green" | "orange";
  valueClassName?: string;
}

const colorClasses = {
  purple: "bg-slate-100 text-slate-700 border border-slate-200/80",
  blue: "bg-slate-50 text-slate-600 border border-slate-200/80",
  green: "bg-emerald-50 text-emerald-800 border border-emerald-100/90",
  orange: "bg-amber-50 text-amber-900 border border-amber-100/90",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color = "purple",
  valueClassName,
}: StatCardProps) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 min-h-[2.5rem] text-xs leading-snug text-muted-foreground">
            {subtitle ?? "\u00a0"}
          </p>
          <p
            className={`mt-auto pt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground ${valueClassName ?? ""}`}
          >
            {value}
          </p>
          {trend && (
            <p
              className={`mt-1 text-sm ${trend.positive ? "text-emerald-700/90" : "text-red-600/90"}`}
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
