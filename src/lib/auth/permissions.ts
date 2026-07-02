import { UserRoleCode } from "@prisma/client";

export type Permission =
  | "schools:read"
  | "schools:create"
  | "schools:update"
  | "schools:delete"
  | "academic-years:read"
  | "academic-years:create"
  | "academic-years:update"
  | "academic-years:delete"
  | "calendar:read"
  | "calendar:create"
  | "calendar:update"
  | "calendar:delete"
  | "classrooms:read"
  | "classrooms:create"
  | "classrooms:update"
  | "classrooms:delete"
  | "teachers:read"
  | "teachers:create"
  | "teachers:update"
  | "teachers:delete"
  | "students:read"
  | "students:create"
  | "students:update"
  | "students:delete"
  | "enrollments:read"
  | "enrollments:create"
  | "enrollments:update"
  | "enrollments:delete"
  | "attendance:read"
  | "attendance:create"
  | "attendance:update"
  | "assessments:read"
  | "assessments:create"
  | "assessments:update"
  | "assessments:delete"
  | "grading-scale:read"
  | "grading-scale:update"
  | "reports:read"
  | "reports:export"
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "promotion:execute"
  | "dashboard:super-admin"
  | "dashboard:school-admin"
  | "dashboard:teacher"
  | "dashboard:read-only";

const ALL_PERMISSIONS: Permission[] = [
  "schools:read",
  "schools:create",
  "schools:update",
  "schools:delete",
  "academic-years:read",
  "academic-years:create",
  "academic-years:update",
  "academic-years:delete",
  "calendar:read",
  "calendar:create",
  "calendar:update",
  "calendar:delete",
  "classrooms:read",
  "classrooms:create",
  "classrooms:update",
  "classrooms:delete",
  "teachers:read",
  "teachers:create",
  "teachers:update",
  "teachers:delete",
  "students:read",
  "students:create",
  "students:update",
  "students:delete",
  "enrollments:read",
  "enrollments:create",
  "enrollments:update",
  "enrollments:delete",
  "attendance:read",
  "attendance:create",
  "attendance:update",
  "assessments:read",
  "assessments:create",
  "assessments:update",
  "assessments:delete",
  "grading-scale:read",
  "grading-scale:update",
  "reports:read",
  "reports:export",
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "promotion:execute",
  "dashboard:super-admin",
  "dashboard:school-admin",
  "dashboard:teacher",
  "dashboard:read-only",
];

const READ_ONLY_PERMISSIONS: Permission[] = [
  "schools:read",
  "academic-years:read",
  "calendar:read",
  "classrooms:read",
  "teachers:read",
  "students:read",
  "enrollments:read",
  "attendance:read",
  "assessments:read",
  "reports:read",
  "dashboard:read-only",
];

const TEACHER_PERMISSIONS: Permission[] = [
  "dashboard:teacher",
  "attendance:read",
  "attendance:create",
  "attendance:update",
  "assessments:read",
  "assessments:create",
  "assessments:update",
];

const SCHOOL_ADMIN_PERMISSIONS: Permission[] = [
  ...ALL_PERMISSIONS.filter(
    (p) =>
      !p.startsWith("dashboard:") &&
      p !== "schools:create" &&
      p !== "schools:delete" &&
      p !== "grading-scale:update" &&
      p !== "users:delete"
  ),
  "dashboard:school-admin",
];

export const ROLE_PERMISSIONS: Record<UserRoleCode, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  SCHOOL_ADMIN: SCHOOL_ADMIN_PERMISSIONS,
  TEACHER: TEACHER_PERMISSIONS,
  READ_ONLY: READ_ONLY_PERMISSIONS,
};

export function hasPermission(
  roles: UserRoleCode[],
  permission: Permission
): boolean {
  if (roles.includes("SUPER_ADMIN")) return true;
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function getPrimaryRole(roles: UserRoleCode[]): UserRoleCode {
  const priority: UserRoleCode[] = [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "TEACHER",
    "READ_ONLY",
  ];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return "READ_ONLY";
}

export function getLandingPath(role: UserRoleCode): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/dashboard/super-admin";
    case "SCHOOL_ADMIN":
      return "/dashboard/school-admin";
    case "TEACHER":
      return "/dashboard/teacher";
    case "READ_ONLY":
      return "/dashboard/read-only";
    default:
      return "/login";
  }
}

export type NavItem = {
  title: string;
  href: string;
  icon: string;
  permissions?: Permission[];
  roles?: UserRoleCode[];
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

const DASHBOARD_NAV: NavItem[] = [
  {
    title: "Super Admin",
    href: "/dashboard/super-admin",
    icon: "LayoutDashboard",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "School Dashboard",
    href: "/dashboard/school-admin",
    icon: "LayoutDashboard",
    roles: ["SCHOOL_ADMIN"],
  },
  {
    title: "My Dashboard",
    href: "/dashboard/teacher",
    icon: "LayoutDashboard",
    roles: ["TEACHER"],
  },
];

const SETUP_NAV: NavItem[] = [
  {
    title: "Schools",
    href: "/schools",
    icon: "School",
    permissions: ["schools:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Academic Years",
    href: "/academic-years",
    icon: "CalendarRange",
    permissions: ["academic-years:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: "Calendar",
    permissions: ["calendar:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Grades",
    href: "/grades",
    icon: "DoorOpen",
    permissions: ["classrooms:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Teachers",
    href: "/teachers",
    icon: "Users",
    permissions: ["teachers:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Grading Scale",
    href: "/grading-scale",
    icon: "Scale",
    permissions: ["grading-scale:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  },
  {
    title: "Data Backup",
    href: "/backup",
    icon: "Download",
    permissions: ["reports:export"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  },
];

const STUDENTS_NAV: NavItem[] = [
  {
    title: "Students",
    href: "/students",
    icon: "GraduationCap",
    permissions: ["students:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Enrollments",
    href: "/enrollments",
    icon: "UserPlus",
    permissions: ["enrollments:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
];

const CLASSROOM_NAV: NavItem[] = [
  {
    title: "Attendance",
    href: "/teacher/attendance",
    icon: "ClipboardCheck",
    roles: ["TEACHER"],
  },
  {
    title: "Consolidate Attendance",
    href: "/teacher/attendance/consolidate",
    icon: "Table2",
    roles: ["TEACHER"],
  },
  {
    title: "Assessments",
    href: "/teacher/assessments",
    icon: "FileText",
    roles: ["TEACHER"],
  },
  {
    title: "Transcript",
    href: "/teacher/transcript",
    icon: "ScrollText",
    roles: ["TEACHER"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: "ClipboardCheck",
    permissions: ["attendance:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Consolidate Attendance",
    href: "/attendance/consolidate",
    icon: "Table2",
    permissions: ["attendance:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  },
  {
    title: "Assessments",
    href: "/assessments",
    icon: "FileText",
    permissions: ["assessments:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
  {
    title: "Transcript",
    href: "/transcript",
    icon: "ScrollText",
    permissions: ["assessments:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "READ_ONLY"],
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    title: "Users",
    href: "/users",
    icon: "Shield",
    permissions: ["users:read"],
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  },
];

export const NAV_GROUPS: NavGroup[] = [
  { items: DASHBOARD_NAV },
  { title: "Classroom", items: CLASSROOM_NAV },
  { title: "Setup", items: SETUP_NAV },
  { title: "Students", items: STUDENTS_NAV },
  { items: ADMIN_NAV },
];

/** @deprecated Use NAV_GROUPS */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

function filterNavItems(items: NavItem[], roles: UserRoleCode[], seen: Set<string>) {
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
    if (
      item.permissions &&
      !item.permissions.some((p) => hasPermission(roles, p))
    ) {
      return false;
    }
    seen.add(item.href);
    return true;
  });
}

export function getNavGroupsForUser(roles: UserRoleCode[]): NavGroup[] {
  const seen = new Set<string>();
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: filterNavItems(group.items, roles, seen),
  })).filter((group) => group.items.length > 0);
}

export function getNavForUser(roles: UserRoleCode[]): NavItem[] {
  return getNavGroupsForUser(roles).flatMap((group) => group.items);
}
