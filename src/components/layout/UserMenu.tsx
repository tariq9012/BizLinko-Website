import { useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LayoutDashboard,
  User,
  Settings,
  Building2,
  PlusCircle,
  FileText,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { displayName, roleLabel, type AppRole } from "@/lib/auth-utils";
import { initials } from "@/lib/format";

function menuItems(role: AppRole | null) {
  if (role === "admin") {
    return [{ to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard }];
  }
  if (role === "employer") {
    return [
      { to: "/employer", label: "Employer Dashboard", icon: LayoutDashboard },
      { to: "/employer/company", label: "Company", icon: Building2 },
      { to: "/employer/post-job", label: "Post Job", icon: PlusCircle },
      { to: "/employer/applications", label: "Applications", icon: FileText },
      { to: "/employer/settings", label: "Settings", icon: Settings },
    ];
  }
  return [
    { to: "/job-seeker", label: "Dashboard", icon: LayoutDashboard },
    { to: "/job-seeker/profile", label: "Profile", icon: User },
    { to: "/job-seeker/applications", label: "Applications", icon: FileText },
    { to: "/job-seeker/saved-jobs", label: "Saved Jobs", icon: Bookmark },
    { to: "/job-seeker/settings", label: "Settings", icon: Settings },
  ];
}

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, currentUser, role, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const name = displayName(profile ?? { email: currentUser?.email ?? null });
  const items = menuItems(role);

  async function handleSignOut() {
    onNavigate?.();
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    toast.success("You've been signed out.");
    navigate({ to: "/", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="size-7">
            {profile?.profile_image ? <AvatarImage src={profile.profile_image} alt={name} /> : null}
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-28 truncate text-sm font-medium">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {role ? roleLabel[role] : "Member"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} onClick={onNavigate} className="flex items-center gap-2">
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()} className="flex items-center gap-2">
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
