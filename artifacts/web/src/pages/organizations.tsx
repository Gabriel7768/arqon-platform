import { useAuth } from "@/lib/auth";
import { useCreateOrganization, useListOrganizations, getListOrganizationsQueryKey, useUpdateOrganization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function OrganizationsPage() {
  const { user, activeOrganization, setActiveOrganizationId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgCurrency, setNewOrgCurrency] = useState("USD");

  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("");

  const { data: orgs } = useListOrganizations({
    query: {
      enabled: !!user,
      queryKey: getListOrganizationsQueryKey()
    }
  });

  useEffect(() => {
    if (activeOrganization) {
      setEditName(activeOrganization.name);
      setEditCurrency(activeOrganization.currency || "USD");
    }
  }, [activeOrganization]);

  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();

  const handleCreate = () => {
    if (!newOrgName) return;
    createMutation.mutate(
      { data: { name: newOrgName, currency: newOrgCurrency } },
      {
        onSuccess: (newOrg) => {
          setIsCreateOpen(false);
          setNewOrgName("");
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          setActiveOrganizationId(newOrg.id);
          toast({ title: "Entity created", description: "Switched to new context." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to create entity." });
        }
      }
    );
  };

  const handleUpdate = () => {
    if (!activeOrganization || !editName) return;
    updateMutation.mutate(
      { id: activeOrganization.id, data: { name: editName, currency: editCurrency } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          toast({ title: "Settings updated", description: "Entity details saved." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to update entity." });
        }
      }
    );
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Entities</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="uppercase tracking-widest text-xs font-bold">
              <Plus className="mr-2 h-4 w-4" /> New Entity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-widest text-muted-foreground text-xs">Initialize Entity Context</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entity Name</Label>
                <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} className="font-mono bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Base Currency</Label>
                <Input value={newOrgCurrency} onChange={(e) => setNewOrgCurrency(e.target.value)} placeholder="USD" className="font-mono bg-background uppercase" maxLength={3} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newOrgName || createMutation.isPending} className="w-full uppercase tracking-wider font-bold">
              Create Context
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Available Contexts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {orgs?.map((org) => (
                <div 
                  key={org.id}
                  onClick={() => setActiveOrganizationId(org.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors border-l-2 ${
                    activeOrganization?.id === org.id 
                      ? "border-l-primary bg-secondary/50" 
                      : "border-l-transparent hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className={`h-4 w-4 ${activeOrganization?.id === org.id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${activeOrganization?.id === org.id ? "text-foreground" : "text-muted-foreground"}`}>
                      {org.name}
                    </span>
                  </div>
                  {activeOrganization?.id === org.id && <ArrowRight className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {activeOrganization && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl tracking-tight">Configuration: {activeOrganization.name}</CardTitle>
                <CardDescription className="font-mono uppercase text-xs tracking-wider">ID: {activeOrganization.id} • Registered: {new Date(activeOrganization.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entity Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-mono bg-background max-w-md" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Base Currency</Label>
                    <Input value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} className="font-mono bg-background max-w-xs uppercase" maxLength={3} />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUpdate} 
                    disabled={updateMutation.isPending || !editName || (editName === activeOrganization.name && editCurrency === activeOrganization.currency)}
                    className="uppercase tracking-widest text-xs font-bold"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
