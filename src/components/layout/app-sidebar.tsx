"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarRange,
  ClipboardCheck,
  DoorOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  School,
  Scale,
  ScrollText,
  Shield,
  Sun,
  Table2,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AcademicYearSwitcher } from "@/components/layout/academic-year-switcher";
import { cn } from "@/lib/utils";
import { isNavLinkActive } from "@/lib/auth/nav-active";
import type { NavGroup } from "@/lib/auth/permissions";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  School,
  CalendarRange,
  Calendar,
  DoorOpen,
  Users,
  GraduationCap,
  UserPlus,
  FileText,
  Scale,
  ScrollText,
  Shield,
  ClipboardCheck,
  Table2,
};

type AppSidebarProps = {
  navGroups: NavGroup[];
  userName: string;
  userEmail: string;
  academicYears: AcademicYearSummary[];
  selectedAcademicYearId: string | null;
  sidebarSchoolName?: string | null;
  onSignOut: () => void;
};

export function AppSidebar({
  navGroups,
  userName,
  userEmail,
  academicYears,
  selectedAcademicYearId,
  sidebarSchoolName = null,
  onSignOut,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const [open, setOpen] = useState(false);
  const allHrefs = navGroups.flatMap((group) => group.items.map((item) => item.href));

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            F
          </div>
          <div>
            <p className="font-semibold leading-tight">FWIS</p>
            <p className="text-xs text-muted-foreground">Weekend Islamic School</p>
          </div>
        </Link>
      </div>

      {(sidebarSchoolName || academicYears.length > 0) && (
        <div className="space-y-3 border-b pb-3">
          {sidebarSchoolName && (
            <div className="px-3 pt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <School className="h-3.5 w-3.5" />
                School
              </p>
              <p className="text-sm font-semibold leading-snug">{sidebarSchoolName}</p>
            </div>
          )}
          <AcademicYearSwitcher
            years={academicYears}
            selectedYearId={selectedAcademicYearId}
            className={sidebarSchoolName ? "pb-0" : undefined}
          />
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navGroups.map((group, groupIndex) => (
          <div key={group.title ?? `nav-group-${groupIndex}`} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const active = isNavLinkActive(pathname, item.href, allHrefs);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t p-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={
              mounted
                ? resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
                : "Toggle theme"
            }
          >
            {!mounted ? (
              <span className="block h-4 w-4" aria-hidden />
            ) : resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold">FWIS</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-background shadow-xl">
            {content}
          </aside>
        </div>
      )}

      <aside className="hidden w-72 shrink-0 border-r bg-card lg:block">
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>
    </>
  );
}
