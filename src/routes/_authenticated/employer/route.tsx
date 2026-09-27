import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RoleGate } from "@/components/dashboard/RoleGate";

const items = [
  { to: "/employer", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employer/company", label: "Company Profile", icon: Building2 },
  { to: "/employer/post-job", label: "Post a Job", icon: PlusCircle },
  { to: "/employer/jobs", label: "My Jobs", icon: Briefcase },
  { to: "/employer/applications", label: "Applications", icon: FileText },
  { to: "/employer/candidates", label: "Find Candidates", icon: Users },
  { to: "/employer/interviews", label: "Interviews", icon: Calendar },
  { to: "/employer/messages", label: "Messages", icon: MessageSquare },
  { to: "/employer/notifications", label: "Notifications", icon: Bell },
  { to: "/employer/settings", label: "Settings", icon: Settings },
];

// Mobile bottom tab bar: the 4 most-used employer destinations.
const bottomNavItems = [
  { to: "/employer", label: "Home", icon: LayoutDashboard },
  { to: "/employer/jobs", label: "My Jobs", icon: Briefcase },
  { to: "/employer/applications", label: "Applications", icon: FileText },
  { to: "/employer/messages", label: "Messages", icon: MessageSquare },
];

export const Route = createFileRoute("/_authenticated/employer")({
  component: () => (
    <RoleGate allow="employer">
      <DashboardLayout title="Employer" items={items} bottomNavItems={bottomNavItems}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
