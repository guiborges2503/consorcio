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
  purple: "bg-gradient-to-br from-purple-500 to-purple-600",
  blue: "bg-gradient-to-br from-blue-500 to-blue-600",
  green: "bg-gradient-to-br from-green-500 to-green-600",
  orange: "bg-gradient-to-br from-orange-500 to-orange-600",
};

export function StatCard({ title, value, icon: Icon, trend, color = "purple" }: StatCardProps) {
  return (
    <Card className="p-6 rounded-3xl border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold mb-2">{value}</p>
          {trend && (
            <p className={`text-sm ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${colorClasses[color]} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}
