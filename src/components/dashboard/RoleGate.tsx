import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { roleHome, type AppRole } from "@/lib/auth-utils";

export function RoleGate({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { role, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const allowed = role === allow;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/login", search: { redirect: href }, replace: true });
      return;
    }
    if (role && !allowed) {
      void navigate({ to: roleHome(role), replace: true });
    }
  }, [loading, isAuthenticated, role, allowed, navigate, href]);

  if (loading || !isAuthenticated || !role || !allowed) {
    return (
      <div className="container-page section-y flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
