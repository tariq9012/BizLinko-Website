import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  ClipboardList,
  Flag,
  LayoutDashboard,
  ScrollText,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RoleGate } from "@/components/dashboard/RoleGate";

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/companies", label: "Companies", icon: Building2 },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/applications", label: "Applications", icon: ClipboardList },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGate allow="admin">
      <DashboardLayout title="Admin" items={items}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
