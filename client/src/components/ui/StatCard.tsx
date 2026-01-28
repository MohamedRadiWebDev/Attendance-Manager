import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow duration-200",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary/5 rounded-xl text-primary">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-foreground font-cairo">{value}</h3>
      </div>
    </div>
  );
}
