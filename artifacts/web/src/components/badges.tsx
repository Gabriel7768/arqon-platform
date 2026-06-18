import { Badge } from "@/components/ui/badge";

export function SeverityBadge({ severity }: { severity: string }) {
  const getBadgeVariant = () => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getCustomStyles = () => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-destructive text-destructive-foreground border-transparent uppercase tracking-wider text-[10px] animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]";
      case "high":
        return "bg-orange-500/20 text-orange-500 border-orange-500/50 uppercase tracking-wider text-[10px]";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 uppercase tracking-wider text-[10px]";
      case "low":
        return "bg-muted text-muted-foreground border-muted-foreground/30 uppercase tracking-wider text-[10px]";
      default:
        return "uppercase tracking-wider text-[10px]";
    }
  };

  return (
    <Badge variant={getBadgeVariant()} className={getCustomStyles()}>
      {severity}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const getCustomStyles = () => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-primary/20 text-primary border-primary/50 uppercase tracking-wider text-[10px]";
      case "acknowledged":
        return "bg-blue-500/20 text-blue-500 border-blue-500/50 uppercase tracking-wider text-[10px]";
      case "resolved":
      case "completed":
        return "bg-green-500/20 text-green-500 border-green-500/50 uppercase tracking-wider text-[10px]";
      case "dismissed":
        return "bg-muted text-muted-foreground border-muted-foreground/30 uppercase tracking-wider text-[10px]";
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 uppercase tracking-wider text-[10px]";
      case "pending":
        return "bg-primary/20 text-primary border-primary/50 uppercase tracking-wider text-[10px]";
      case "processing":
        return "bg-blue-500/20 text-blue-500 border-blue-500/50 uppercase tracking-wider text-[10px] animate-pulse";
      case "ready":
        return "bg-green-500/20 text-green-500 border-green-500/50 uppercase tracking-wider text-[10px]";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/50 uppercase tracking-wider text-[10px]";
      default:
        return "uppercase tracking-wider text-[10px]";
    }
  };

  return (
    <Badge variant="outline" className={getCustomStyles()}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <SeverityBadge severity={priority} />;
}
