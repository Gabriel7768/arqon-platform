import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useGetFindings, getGetFindingsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { AlertCircle, Filter, ArrowRight, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FindingsPage() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: findings, isLoading } = useGetFindings(orgId!, {
    query: {
      enabled: !!orgId,
      queryKey: getGetFindingsQueryKey(orgId!)
    }
  });

  const filteredFindings = findings?.filter(f => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.affectedEntity?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
      <div className="flex items-center justify-between space-y-2 shrink-0">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Findings</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 shrink-0 bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities or titles..."
            className="pl-8 font-mono bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px] font-mono text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] font-mono text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] font-mono text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="overdue_invoice">Overdue Invoice</SelectItem>
              <SelectItem value="inactive_customer">Inactive Customer</SelectItem>
              <SelectItem value="stalled_opportunity">Stalled Opportunity</SelectItem>
              <SelectItem value="contract_expiration">Contract Expiration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-8 font-mono text-muted-foreground animate-pulse text-center">Loading telemetry...</div>
        ) : filteredFindings && filteredFindings.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Severity</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Finding</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Entity</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Exposure</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFindings.map((finding) => (
                <tr key={finding.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SeverityBadge severity={finding.severity} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{finding.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">{finding.type.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {finding.affectedEntity || "-"}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-primary">
                    {formatCurrency(finding.estimatedImpact, activeOrganization?.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={finding.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/findings/${finding.id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center p-12">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-bold uppercase tracking-widest mb-2">No Findings Found</h3>
            <p className="text-sm font-mono text-muted-foreground">Adjust filters or run analysis to generate telemetry.</p>
          </div>
        )}
      </div>
    </div>
  );
}
