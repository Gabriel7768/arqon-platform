import { useAuth } from "@/lib/auth";
import { useGetRecommendations, getGetRecommendationsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Zap, ArrowRight, CheckSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RecommendationsPage() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const { data: recommendations, isLoading } = useGetRecommendations(orgId!, {
    query: {
      enabled: !!orgId,
      queryKey: getGetRecommendationsQueryKey(orgId!)
    }
  });

  const pending = recommendations?.filter(r => r.status === 'pending' || r.status === 'in_progress').sort((a, b) => b.estimatedRecovery - a.estimatedRecovery) || [];
  const completed = recommendations?.filter(r => r.status === 'completed' || r.status === 'dismissed').sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()) || [];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Action Items</h2>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="pending" className="uppercase tracking-widest text-xs font-bold">Pending Interventions</TabsTrigger>
          <TabsTrigger value="completed" className="uppercase tracking-widest text-xs font-bold">Historical Record</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <div className="grid gap-4">
            {isLoading ? (
              <div className="p-8 font-mono text-muted-foreground animate-pulse text-center">Loading priority queue...</div>
            ) : pending.length > 0 ? (
              pending.map(rec => (
                <Card key={rec.id} className="border-border bg-card shadow-sm hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={rec.priority} />
                          <StatusBadge status={rec.status} />
                          <span className="text-xs font-mono text-muted-foreground">ID: {rec.id} • Finding: {rec.findingId}</span>
                        </div>
                        <h3 className="font-bold text-lg">{rec.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{rec.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Target Yield</div>
                        <div className="font-mono text-2xl font-bold text-primary">
                          {formatCurrency(rec.estimatedRecovery, activeOrganization?.currency)}
                        </div>
                      </div>
                      <Button asChild className="uppercase tracking-widest text-xs font-bold">
                        <Link href={`/recommendations/${rec.id}`}>
                          {rec.actionLabel || "Execute"} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-12 border border-dashed border-border rounded-lg bg-background/50">
                <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Queue Empty</h3>
                <p className="text-sm font-mono text-muted-foreground">All priority actions have been addressed.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6">
          <div className="grid gap-4">
            {completed.length > 0 ? (
              completed.map(rec => (
                <Card key={rec.id} className="border-border bg-card shadow-sm opacity-70 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <StatusBadge status={rec.status} />
                      <span className="font-medium text-sm">{rec.title}</span>
                      <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block">
                        Completed: {rec.completedAt ? formatDateTime(rec.completedAt) : 'Unknown'}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold">
                      {formatCurrency(rec.estimatedRecovery, activeOrganization?.currency)}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-12 text-muted-foreground font-mono text-sm">
                No historical records found.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
