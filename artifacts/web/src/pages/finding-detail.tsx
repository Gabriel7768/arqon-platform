import { useAuth } from "@/lib/auth";
import { useGetFinding, getGetFindingQueryKey, useUpdateFinding } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { FindingUpdateStatus } from "@workspace/api-client-react";

export default function FindingDetailPage() {
  const [match, params] = useRoute("/findings/:id");
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const findingId = params?.id ? parseInt(params.id, 10) : 0;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: finding, isLoading } = useGetFinding(orgId!, findingId, {
    query: {
      enabled: !!orgId && !!findingId,
      queryKey: getGetFindingQueryKey(orgId!, findingId)
    }
  });

  const updateMutation = useUpdateFinding();

  const handleUpdateStatus = (newStatus: FindingUpdateStatus) => {
    if (!orgId || !findingId) return;
    
    updateMutation.mutate(
      { orgId, id: findingId, data: { status: newStatus } },
      {
        onSuccess: (updatedData) => {
          queryClient.setQueryData(getGetFindingQueryKey(orgId, findingId), updatedData);
          queryClient.invalidateQueries({ queryKey: ['/api/findings'] }); // Invalidate list
          toast({ title: "Status updated", description: `Finding marked as ${newStatus}` });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Update failed", description: "Could not update status." });
        }
      }
    );
  };

  if (isLoading) return <div className="p-8 font-mono text-muted-foreground animate-pulse">Retrieving telemetry details...</div>;
  if (!finding) return <div className="p-8 font-mono text-muted-foreground">Finding not found.</div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/findings"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={finding.severity} />
          <StatusBadge status={finding.status} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">{finding.title}</h2>
            <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              ID: {finding.id} • TYPE: {finding.type.replace(/_/g, ' ')} • DETECTED: {formatDateTime(finding.createdAt)}
            </div>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Description</h3>
              <p className="text-base leading-relaxed">{finding.description}</p>
            </CardContent>
          </Card>

          {finding.metadata && Object.keys(finding.metadata).length > 0 && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Raw Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted/50 rounded-md text-xs font-mono overflow-x-auto text-primary">
                  {JSON.stringify(finding.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="w-full md:w-80 space-y-6 shrink-0">
          <Card className="border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)] relative overflow-hidden bg-card">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Est. Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono tracking-tighter text-primary">
                {formatCurrency(finding.estimatedImpact, activeOrganization?.currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Affected Entity</div>
                <div className="font-mono text-base">{finding.affectedEntity || "Unknown"}</div>
              </div>
              <Separator />
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Duration</div>
                <div className="font-mono text-base">{finding.daysOverdue !== null && finding.daysOverdue !== undefined ? `${finding.daysOverdue} Days` : "N/A"}</div>
              </div>
              <Separator />
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Intervention Actions</div>
                {finding.status !== 'resolved' && (
                  <Button 
                    className="w-full justify-start bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/50" 
                    variant="outline"
                    onClick={() => handleUpdateStatus('resolved')}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
                  </Button>
                )}
                {finding.status !== 'acknowledged' && finding.status !== 'resolved' && (
                  <Button 
                    className="w-full justify-start text-blue-500 hover:bg-blue-500/10 hover:text-blue-500 border-blue-500/50" 
                    variant="outline"
                    onClick={() => handleUpdateStatus('acknowledged')}
                    disabled={updateMutation.isPending}
                  >
                    <Clock className="mr-2 h-4 w-4" /> Acknowledge
                  </Button>
                )}
                {finding.status !== 'dismissed' && (
                  <Button 
                    className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive border-border" 
                    variant="outline"
                    onClick={() => handleUpdateStatus('dismissed')}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Dismiss Finding
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
