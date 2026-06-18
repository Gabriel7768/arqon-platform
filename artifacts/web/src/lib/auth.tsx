import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter, useGetMe, useListOrganizations } from "@workspace/api-client-react";
import type { UserProfile, Organization } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  activeOrganization: Organization | null;
  setActiveOrganizationId: (id: number) => void;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("arqon_token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("arqon_token"));
  }, []);

  const { data: meData, isLoading: isMeLoading, error: meError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: ["me"],
    }
  });

  const { data: orgsData, isLoading: isOrgsLoading } = useListOrganizations({
    query: {
      enabled: !!token && !!user,
      queryKey: ["organizations"],
    }
  });

  useEffect(() => {
    if (meError) {
      logout();
    } else if (meData) {
      setUser(meData);
    }
  }, [meData, meError]);

  const activeOrganization = orgsData?.find(o => o.id === activeOrgId) || orgsData?.[0] || null;

  useEffect(() => {
    if (orgsData && orgsData.length > 0 && !activeOrgId) {
      setActiveOrgId(orgsData[0].id);
    }
  }, [orgsData, activeOrgId]);

  const login = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem("arqon_token", newToken);
    setAuthTokenGetter(() => newToken);
    setToken(newToken);
    setUser(newUser);
    setLocation("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("arqon_token");
    setAuthTokenGetter(() => null);
    setToken(null);
    setUser(null);
    setActiveOrgId(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeOrganization,
        setActiveOrganizationId: setActiveOrgId,
        login,
        logout,
        isLoading: isMeLoading || (!!token && !!user && isOrgsLoading)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
