import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Profile Settings</h2>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" /> Identity Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input value={user?.name || ""} disabled className="font-mono bg-secondary/50 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input value={user?.email || ""} disabled className="font-mono bg-secondary/50 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-md border border-border max-w-md">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Access Level: {user?.role}</span>
          </div>

          <div className="pt-4 border-t border-border max-w-md">
            <Button variant="destructive" onClick={() => logout()} className="w-full uppercase tracking-widest text-xs font-bold">
              <LogOut className="mr-2 h-4 w-4" /> Terminate Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
