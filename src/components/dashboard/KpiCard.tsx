import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  highlight?: boolean;
}

const KpiCard = ({ title, value, icon: Icon, subtitle, highlight }: KpiCardProps) => {
  return (
    <div
      className={cn(
        "rounded border bg-card p-4 transition-colors",
        highlight ? "border-primary/40 glow-red-sm" : "border-border"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="font-display text-2xl text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded border border-border bg-muted/50 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
