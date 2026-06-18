import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  highlight?: boolean;
}

export function StatCard({ title, value, description, icon, trend, highlight }: StatCardProps) {
  return (
    <Card className={highlight ? "border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)] relative overflow-hidden" : ""}>
      {highlight && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tracking-tight ${highlight ? "text-primary font-mono text-3xl" : "font-mono"}`}>
          {value}
        </div>
        {(description || trend) && (
          <div className="mt-1 flex items-center text-xs text-muted-foreground">
            {trend && (
              <span className={`mr-2 font-medium ${trend.positive ? "text-green-500" : "text-destructive"}`}>
                {trend.positive ? "+" : ""}{trend.value}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
