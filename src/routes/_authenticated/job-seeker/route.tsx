import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  Calendar,
  FileStack,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RoleGate } from "@/components/dashboard/RoleGate";

const items = [
  { to: "/job-seeker", label: "Dashboard", icon: LayoutDashboard },
  { to: "/job-seeker/profile", label: "My Profile", icon: User },
  { to: "/job-seeker/resumes", label: "My Resumes", icon: FileStack },
  { to: "/job-seeker/applications", label: "Applications", icon: FileText },
  { to: "/job-seeker/recommended-jobs", label: "Recommended", icon: Sparkles },
  { to: "/job-seeker/interviews", label: "Interviews", icon: Calendar },
  { to: "/job-seeker/messages", label: "Messages", icon: MessageSquare },
  { to: "/job-seeker/notifications", label: "Notifications", icon: Bell },
  { to: "/job-seeker/saved-jobs", label: "Saved Jobs", icon: Bookmark },
  { to: "/job-seeker/settings", label: "Settings", icon: Settings },
];

// Mobile bottom tab bar: the 4 most-used job-seeker destinations. `/jobs`
// is the existing public search route (not `/job-seeker/*`) — reused here
// rather than inventing a job-seeker-scoped duplicate.
const bottomNavItems = [
  { to: "/job-seeker", label: "Home", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Search },
  { to: "/job-seeker/applications", label: "Applications", icon: FileText },
  { to: "/job-seeker/messages", label: "Messages", icon: MessageSquare },
];

export const Route = createFileRoute("/_authenticated/job-seeker")({
  component: () => (
    <RoleGate allow="job_seeker">
      <DashboardLayout title="Job Seeker" items={items} bottomNavItems={bottomNavItems}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
