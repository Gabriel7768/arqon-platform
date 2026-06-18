import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { 
  useListDataSources, 
  getListDataSourcesQueryKey,
  useCreateDataSource,
  useUploadDataSourceFile,
  useAnalyzeDataSource,
  useDeleteDataSource
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { Database, Plus, Upload, Play, Trash2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function DataSourcesPage() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceDesc, setNewSourceDesc] = useState("");

  const { data: sources, isLoading } = useListDataSources(orgId!, {
    query: {
      enabled: !!orgId,
      queryKey: getListDataSourcesQueryKey(orgId!),
      refetchInterval: 5000 // Poll for status updates
    }
  });

  const createMutation = useCreateDataSource();
  const uploadMutation = useUploadDataSourceFile();
  const analyzeMutation = useAnalyzeDataSource();
  const deleteMutation = useDeleteDataSource();

  const handleCreate = () => {
    if (!orgId || !newSourceName) return;
    
    createMutation.mutate(
      { orgId, data: { name: newSourceName, description: newSourceDesc, type: "csv" } },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewSourceName("");
          setNewSourceDesc("");
          queryClient.invalidateQueries({ queryKey: getListDataSourcesQueryKey(orgId) });
          toast({ title: "Source created", description: "Ready for data upload" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to create source" });
        }
      }
    );
  };

  const handleUpload = (sourceId: number, file: File) => {
    if (!orgId) return;
    
    // We send FormData with a 'file' field as required by useUploadDataSourceFile
    const formData = new FormData();
    formData.append("file", file);
    
    // Convert to Blob to match CsvUploadInput if strictly typed, but FormData usually works with customFetch if handled correctly.
    // Wait, the API spec says it takes multipart/form-data. The generated client might expect `{ file: Blob }`.
    // Actually, looking at customFetch, if body is an object and not FormData, we might need to be careful.
    // Let's pass the object { file } if that's what the mutation body requires, or FormData directly.
    // The type `BodyType<CsvUploadInput>` is `{ file: Blob }`.
    
    uploadMutation.mutate(
      { orgId, id: sourceId, data: { file } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDataSourcesQueryKey(orgId) });
          toast({ title: "Upload complete", description: "File successfully uploaded to source." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Upload failed", description: "Could not upload file." });
        }
      }
    );
  };

  const handleAnalyze = (sourceId: number) => {
    if (!orgId) return;
    analyzeMutation.mutate(
      { orgId, id: sourceId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDataSourcesQueryKey(orgId) });
          toast({ title: "Analysis started", description: "The engine is now processing the data." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Analysis failed", description: "Could not start analysis." });
        }
      }
    );
  };

  const handleDelete = (sourceId: number) => {
    if (!orgId) return;
    deleteMutation.mutate(
      { orgId, id: sourceId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDataSourcesQueryKey(orgId) });
          toast({ title: "Source deleted" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to delete source" });
        }
      }
    );
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Data Sources</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="uppercase tracking-widest text-xs font-bold">
              <Plus className="mr-2 h-4 w-4" /> New Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-widest text-muted-foreground text-xs">Configure Data Source</DialogTitle>
              <DialogDescription>
                Create a new ingestion point for ARQON analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Source Name</Label>
                <Input 
                  id="name" 
                  value={newSourceName} 
                  onChange={(e) => setNewSourceName(e.target.value)} 
                  placeholder="Q3 Billing Data" 
                  className="font-mono bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input 
                  id="desc" 
                  value={newSourceDesc} 
                  onChange={(e) => setNewSourceDesc(e.target.value)} 
                  placeholder="Export from Stripe" 
                  className="font-mono bg-background"
                />
              </div>
            </div>
            <Button 
              onClick={handleCreate} 
              disabled={!newSourceName || createMutation.isPending}
              className="w-full uppercase tracking-wider font-bold"
            >
              Initialize Source
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="font-mono text-muted-foreground animate-pulse">Loading sources...</div>
        ) : sources && sources.length > 0 ? (
          sources.map((source) => (
            <Card key={source.id} className="border-border bg-card shadow-sm">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{source.name}</h3>
                      <StatusBadge status={source.status} />
                    </div>
                    {source.description && (
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mt-2">
                      <span>TYPE: {source.type.toUpperCase()}</span>
                      {source.fileName && <span>FILE: {source.fileName}</span>}
                      {source.rowCount !== null && source.rowCount !== undefined && (
                        <span>ROWS: {source.rowCount}</span>
                      )}
                      {source.lastAnalyzedAt && (
                        <span>ANALYZED: {formatDateTime(source.lastAnalyzedAt)}</span>
                      )}
                    </div>
                    {source.errorMessage && (
                      <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {source.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input 
                      type="file" 
                      accept=".csv"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUpload(source.id, e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadMutation.isPending || source.status === 'processing'}
                    />
                    <Button variant="outline" size="sm" className="font-mono text-xs uppercase" disabled={uploadMutation.isPending || source.status === 'processing'}>
                      <Upload className="h-4 w-4 mr-2" /> Upload
                    </Button>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="font-mono text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleAnalyze(source.id)}
                    disabled={analyzeMutation.isPending || source.status === 'processing' || !source.fileName}
                  >
                    <Play className="h-4 w-4 mr-2" /> Analyze
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(source.id)}
                    disabled={deleteMutation.isPending || source.status === 'processing'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-12 border border-dashed border-border rounded-lg bg-background/50">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-bold uppercase tracking-widest mb-2">No Data Sources</h3>
            <p className="text-sm font-mono text-muted-foreground mb-6">Initialize a data source to begin ingestion and analysis.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="uppercase tracking-widest text-xs font-bold">
              Configure Source
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
