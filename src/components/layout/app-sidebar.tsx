"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  BookOpen,
  Download,
  DoorOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Moon,
  School,
  Scale,
  ScrollText,
  Shield,
  Sun,
  Table2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AcademicYearSwitcher } from "@/components/layout/academic-year-switcher";
import { SchoolSwitcher } from "@/components/layout/school-switcher";
import { cn } from "@/lib/utils";
import { isNavLinkActive } from "@/lib/auth/nav-active";
import {
  collectNavHrefs,
  type NavGroup,
  type NavItem,
} from "@/lib/auth/permissions";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";
import type { SchoolSummary } from "@/lib/school/constants";
import {
  APP_PRODUCT_NAME,
  formatAppVersionLine,
} from "@/lib/app-meta";

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
  BookOpen,
  Download,
  Table2,
  Trophy,
  Library,
};

type AppSidebarProps = {
  navGroups: NavGroup[];
  userName: string;
  userEmail: string;
  academicYears: AcademicYearSummary[];
  selectedAcademicYearId: string | null;
  canSwitchAcademicYear?: boolean;
  schools: SchoolSummary[];
  selectedSchoolId: string | null;
  onSignOut: () => void;
  onSchoolPendingChange?: (pending: boolean) => void;
};

function childIsActive(
  pathname: string,
  item: NavItem,
  allHrefs: string[]
): boolean {
  if (item.href && isNavLinkActive(pathname, item.href, allHrefs)) return true;
  return (
    item.children?.some((child) => childIsActive(pathname, child, allHrefs)) ??
    false
  );
}

function NavLeaf({
  item,
  pathname,
  allHrefs,
  onNavigate,
  nested = false,
}: {
  item: NavItem;
  pathname: string;
  allHrefs: string[];
  onNavigate: () => void;
  nested?: boolean;
}) {
  if (!item.href) return null;
  const Icon = ICONS[item.icon] ?? LayoutDashboard;
  const active = isNavLinkActive(pathname, item.href, allHrefs);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
        nested ? "px-3 pl-9" : "px-3",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.title}
    </Link>
  );
}

function NavBranch({
  item,
  pathname,
  allHrefs,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  allHrefs: string[];
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.icon] ?? LayoutDashboard;
  const active = childIsActive(pathname, item, allHrefs);
  const [expanded, setExpanded] = useState(active);

  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded((value: boolean) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        aria-expanded={expanded}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      {expanded &&
        item.children?.map((child) => (
          <NavLeaf
            key={child.href ?? child.title}
            item={child}
            pathname={pathname}
            allHrefs={allHrefs}
            onNavigate={onNavigate}
            nested
          />
        ))}
    </div>
  );
}

export function AppSidebar({
  navGroups,
  userName,
  userEmail,
  academicYears,
  selectedAcademicYearId,
  canSwitchAcademicYear = true,
  schools,
  selectedSchoolId,
  onSignOut,
  onSchoolPendingChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const allHrefs = collectNavHrefs(navGroups.flatMap((group) => group.items));

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            F
          </div>
          <div>
            <p className="font-semibold leading-tight">{APP_PRODUCT_NAME}</p>
            <p className="text-xs text-muted-foreground">
              {formatAppVersionLine()}
            </p>
          </div>
        </Link>
      </div>

      {(schools.length > 0 || academicYears.length > 0) && (
        <div className="space-y-0 border-b pt-3">
          <AcademicYearSwitcher
            years={academicYears}
            selectedYearId={selectedAcademicYearId}
            canSwitch={canSwitchAcademicYear}
            className={schools.length > 0 ? "pb-2" : undefined}
          />
          <SchoolSwitcher
            schools={schools}
            selectedSchoolId={selectedSchoolId}
            onPendingChange={onSchoolPendingChange}
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
            {group.items.map((item) =>
              item.children?.length ? (
                <NavBranch
                  key={`parent:${item.title}`}
                  item={item}
                  pathname={pathname}
                  allHrefs={allHrefs}
                  onNavigate={() => setOpen(false)}
                />
              ) : (
                <NavLeaf
                  key={item.href ?? item.title}
                  item={item}
                  pathname={pathname}
                  allHrefs={allHrefs}
                  onNavigate={() => setOpen(false)}
                />
              )
            )}
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
            onClick={() => {
              const isDark =
                typeof document !== "undefined" &&
                document.documentElement.classList.contains("dark");
              setTheme(isDark ? "light" : "dark");
            }}
            aria-label="Toggle theme"
          >
            <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
            <Moon className="block h-4 w-4 dark:hidden" aria-hidden />
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
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{APP_PRODUCT_NAME}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatAppVersionLine()}
          </p>
        </div>
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
