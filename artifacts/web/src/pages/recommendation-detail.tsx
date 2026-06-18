import { useAuth } from "@/lib/auth";
import { useGetRecommendation, getGetRecommendationQueryKey, useUpdateRecommendation } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Zap, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { RecommendationUpdateStatus } from "@workspace/api-client-react";

export default function RecommendationDetailPage() {
  const [match, params] = useRoute("/recommendations/:id");
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const recId = params?.id ? parseInt(params.id, 10) : 0;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rec, isLoading } = useGetRecommendation(orgId!, recId, {
    query: {
      enabled: !!orgId && !!recId,
      queryKey: getGetRecommendationQueryKey(orgId!, recId)
    }
  });

  const updateMutation = useUpdateRecommendation();

  const handleUpdateStatus = (newStatus: RecommendationUpdateStatus) => {
    if (!orgId || !recId) return;
    
    updateMutation.mutate(
      { orgId, id: recId, data: { status: newStatus } },
      {
        onSuccess: (updatedData) => {
          queryClient.setQueryData(getGetRecommendationQueryKey(orgId, recId), updatedData);
          queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] }); 
          toast({ title: "Status updated", description: `Action marked as ${newStatus}` });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Update failed", description: "Could not update status." });
        }
      }
    );
  };

  if (isLoading) return <div className="p-8 font-mono text-muted-foreground animate-pulse">Retrieving action details...</div>;
  if (!rec) return <div className="p-8 font-mono text-muted-foreground">Action not found.</div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/recommendations"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <PriorityBadge priority={rec.priority} />
          <StatusBadge status={rec.status} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">{rec.title}</h2>
            <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              ACTION ID: {rec.id} • GENERATED: {formatDateTime(rec.createdAt)}
            </div>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-secondary/20 pb-4 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" /> Execution Blueprint
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{rec.description}</p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button variant="outline" asChild className="uppercase tracking-widest text-xs font-bold border-primary text-primary hover:bg-primary/10">
              <Link href={`/findings/${rec.findingId}`}>
                View Source Finding <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-6 shrink-0">
          <Card className="border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)] relative overflow-hidden bg-card">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Yield</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono tracking-tighter text-primary">
                {formatCurrency(rec.estimatedRecovery, activeOrganization?.currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Execution Status</div>
                
                {rec.status !== 'completed' && (
                  <Button 
                    className="w-full justify-start bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/50" 
                    variant="outline"
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                  </Button>
                )}
                
                {rec.status === 'pending' && (
                  <Button 
                    className="w-full justify-start text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-500 border-yellow-500/50" 
                    variant="outline"
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={updateMutation.isPending}
                  >
                    <Clock className="mr-2 h-4 w-4" /> Start Execution
                  </Button>
                )}
                
                {rec.status !== 'dismissed' && (
                  <Button 
                    className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive border-border mt-4" 
                    variant="outline"
                    onClick={() => handleUpdateStatus('dismissed')}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Dismiss Action
                  </Button>
                )}

                {rec.status === 'completed' && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-md border border-green-500/30 text-green-500 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Completed {rec.completedAt ? formatDateTime(rec.completedAt) : ''}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
