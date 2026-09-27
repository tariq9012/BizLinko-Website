import { useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Menu, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: DashboardNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.soon ? (
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Phase — mobile responsive pass. Bottom tab bar for the two consumer-style
 * authenticated sections (job seeker, employer): ~4 primary destinations
 * (existing routes only) plus a "More" tab that opens the same full nav
 * Sheet used everywhere else. Admin intentionally does NOT get this — it
 * keeps the plain drawer/menu below, per the request that admin use a
 * responsive drawer rather than consumer-style bottom navigation.
 *
 * `env(safe-area-inset-bottom)` padding keeps the bar (and its tap targets)
 * clear of a phone's home-indicator area; DashboardLayout adds matching
 * bottom padding to the page content so nothing renders underneath it.
 */
function BottomNav({
  items,
  pathname,
  onMore,
}: {
  items: DashboardNavItem[];
  pathname: string;
  onMore: () => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5 items-stretch">
        {items.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="size-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

export function DashboardLayout({
  title,
  items,
  bottomNavItems,
  children,
}: {
  title: string;
  items: DashboardNavItem[];
  /** ~4 primary routes for a mobile bottom tab bar. Omit (e.g. for admin)
   *  to keep the plain top "menu" button + full-list Sheet on mobile. */
  bottomNavItems?: DashboardNavItem[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="container-page py-6 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <NavList items={items} pathname={pathname} />
          </div>
        </aside>

        <div className={cn("min-w-0 flex-1", bottomNavItems ? "pb-20" : undefined)}>
          {bottomNavItems ? null : (
            <div className="mb-4 lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Menu className="size-4" />
                    {title} menu
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 overflow-y-auto p-4">
                  <SheetTitle className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {title}
                  </SheetTitle>
                  <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
          )}
          {children ?? <Outlet />}
        </div>
      </div>

      {bottomNavItems ? (
        <>
          <BottomNav items={bottomNavItems} pathname={pathname} onMore={() => setOpen(true)} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="w-72 overflow-y-auto p-4">
              <SheetTitle className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </SheetTitle>
              <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      ) : null}
    </div>
  );
}
