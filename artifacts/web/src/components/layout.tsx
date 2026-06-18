import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, LayoutDashboard, Database, AlertCircle, Zap, Settings, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, activeOrganization, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/findings", label: "Findings", icon: AlertCircle },
    { href: "/recommendations", label: "Recommendations", icon: Zap },
    { href: "/data-sources", label: "Data Sources", icon: Database },
  ];

  const settingsItems = [
    { href: "/organizations", label: "Organization", icon: Building2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <div className="w-3 h-3 bg-card rounded-sm" />
            </div>
            <span className="font-bold text-lg tracking-tight uppercase">ARQON</span>
          </div>
        </div>

        <ScrollArea className="flex-1 py-6 px-4">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Active Context
            </p>
            <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 border border-border">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{activeOrganization?.name || "No Organization"}</span>
                <span className="text-xs text-muted-foreground mt-1">{activeOrganization?.currency || "USD"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Engine
            </p>
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 space-y-1">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Configuration
            </p>
            {settingsItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background focus:outline-none">
        {children}
      </main>
    </div>
  );
}
