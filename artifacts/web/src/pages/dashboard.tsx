import { useAuth } from "@/lib/auth";
import { useGetOrganizationStats, getGetOrganizationStatsQueryKey, useGetFindings, getGetFindingsQueryKey, useGetRecommendations, getGetRecommendationsQueryKey } from "@workspace/api-client-react";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { AlertCircle, Target, ArrowRight, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const { data: stats, isLoading: statsLoading } = useGetOrganizationStats(orgId!, {
    query: {
      enabled: !!orgId,
      queryKey: getGetOrganizationStatsQueryKey(orgId!)
    }
  });

  const { data: recommendations, isLoading: recsLoading } = useGetRecommendations(orgId!, {
    query: {
      enabled: !!orgId,
      queryKey: getGetRecommendationsQueryKey(orgId!)
    }
  });

  const pendingRecs = recommendations?.filter(r => r.status === 'pending' || r.status === 'in_progress').sort((a, b) => b.estimatedRecovery - a.estimatedRecovery).slice(0, 5) || [];

  if (statsLoading) {
    return <div className="p-8 font-mono text-muted-foreground animate-pulse">Aggregating telemetry...</div>;
  }

  if (!orgId) {
    return <div className="p-8 font-mono text-muted-foreground">No active organizational context found.</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Command Center</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="font-mono text-xs">
            Export Report
          </Button>
          <Button asChild>
            <Link href="/data-sources">Ingest Data</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue At Risk"
          value={formatCurrency(stats?.totalAtRisk || 0, activeOrganization?.currency)}
          highlight
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Open Critical Findings"
          value={formatNumber(stats?.openFindingsCount || 0)}
          icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
        />
        <StatCard
          title="Pending Actions"
          value={formatNumber(stats?.pendingRecommendationsCount || 0)}
          icon={<Target className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Recovered YTD"
          value={formatCurrency(0, activeOrganization?.currency)} // Placeholder since not in stats yet
          icon={<Target className="h-4 w-4 text-green-500" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-xs text-muted-foreground font-semibold">Priority Action Items</CardTitle>
            <CardDescription>Highest value recovery targets requiring immediate intervention.</CardDescription>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="font-mono text-sm text-muted-foreground">Analyzing recommendations...</div>
            ) : pendingRecs.length > 0 ? (
              <div className="space-y-4">
                {pendingRecs.map(rec => (
                  <div key={rec.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-background hover:border-primary/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={rec.priority} />
                        <span className="font-medium text-sm">{rec.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground max-w-[300px] truncate">{rec.description}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-primary">
                          {formatCurrency(rec.estimatedRecovery, activeOrganization?.currency)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Recovery</div>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href={`/recommendations/${rec.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-border rounded-lg bg-background/50">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">No pending actions detected</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-xs text-muted-foreground font-semibold">Exposure by Typology</CardTitle>
            <CardDescription>Distribution of identified revenue leaks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats?.byType && stats.byType.length > 0 ? (
                stats.byType.map((typeStat) => (
                  <div key={typeStat.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{typeStat.type.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-primary font-bold">{formatCurrency(typeStat.totalAtRisk, activeOrganization?.currency)}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min(100, (typeStat.totalAtRisk / (stats.totalAtRisk || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">{typeStat.count} anomalies detected</div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8">
                  <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Insufficient Data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
