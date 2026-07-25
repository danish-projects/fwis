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
  | "staff:read"
  | "staff:create"
  | "staff:update"
  | "staff:delete"
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
  | "lesson-plans:read"
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
  "staff:read",
  "staff:create",
  "staff:update",
  "staff:delete",
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
  "lesson-plans:read",
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
  "staff:read",
  "students:read",
  "enrollments:read",
  "attendance:read",
  "assessments:read",
  "lesson-plans:read",
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
  "lesson-plans:read",
  // Scoped via assertStudentAccess (classroom enrollments only)
  "students:read",
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
  NIGRA: ALL_PERMISSIONS,
  SCHOOL_ADMIN: SCHOOL_ADMIN_PERMISSIONS,
  PRINCIPAL: SCHOOL_ADMIN_PERMISSIONS,
  TEACHER: TEACHER_PERMISSIONS,
  SUBSTITUTE: TEACHER_PERMISSIONS,
  READ_ONLY: READ_ONLY_PERMISSIONS,
};

export function hasPermission(
  roles: UserRoleCode[],
  permission: Permission
): boolean {
  if (roles.includes("NIGRA")) return true;
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function getPrimaryRole(roles: UserRoleCode[]): UserRoleCode {
  const priority: UserRoleCode[] = [
    "NIGRA",
    "PRINCIPAL",
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUBSTITUTE",
    "READ_ONLY",
  ];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return "READ_ONLY";
}

export function getLandingPath(role: UserRoleCode): string {
  switch (role) {
    case "NIGRA":
      return "/dashboard/super-admin";
    case "PRINCIPAL":
    case "SCHOOL_ADMIN":
      return "/dashboard/school-admin";
    case "TEACHER":
    case "SUBSTITUTE":
      return "/dashboard/teacher";
    case "READ_ONLY":
      return "/dashboard/read-only";
    default:
      return "/login";
  }
}

export type NavItem = {
  title: string;
  /** Present for leaf links; omit for parent groups with children. */
  href?: string;
  icon: string;
  permissions?: Permission[];
  roles?: UserRoleCode[];
  children?: NavItem[];
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
    roles: ["NIGRA"],
  },
  {
    title: "School Dashboard",
    href: "/dashboard/school-admin",
    icon: "LayoutDashboard",
    roles: ["SCHOOL_ADMIN", "PRINCIPAL"],
  },
  {
    title: "My Dashboard",
    href: "/dashboard/teacher",
    icon: "LayoutDashboard",
    roles: ["TEACHER", "SUBSTITUTE"],
  },
];

const SETUP_NAV: NavItem[] = [
  {
    title: "Schools",
    href: "/schools",
    icon: "School",
    permissions: ["schools:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Academic Years",
    href: "/academic-years",
    icon: "CalendarRange",
    permissions: ["academic-years:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: "Calendar",
    permissions: ["calendar:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Grades",
    href: "/grades",
    icon: "DoorOpen",
    permissions: ["classrooms:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Staff",
    href: "/staff",
    icon: "Users",
    permissions: ["staff:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Grading Scale",
    href: "/grading-scale",
    icon: "Scale",
    permissions: ["grading-scale:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL"],
  },
  {
    title: "Data Backup",
    href: "/backup",
    icon: "Download",
    permissions: ["reports:export"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL"],
  },
];

const STUDENTS_NAV: NavItem[] = [
  {
    title: "Students",
    href: "/students",
    icon: "GraduationCap",
    permissions: ["students:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Enrollments",
    href: "/enrollments",
    icon: "UserPlus",
    permissions: ["enrollments:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
];

const CLASSROOM_NAV: NavItem[] = [
  {
    title: "Attendance",
    href: "/teacher/attendance",
    icon: "ClipboardCheck",
    roles: ["TEACHER", "SUBSTITUTE"],
  },
  {
    title: "Consolidate Attendance",
    href: "/teacher/attendance/consolidate",
    icon: "Table2",
    roles: ["TEACHER", "SUBSTITUTE"],
  },
  {
    title: "Course Materials",
    icon: "Library",
    roles: ["TEACHER", "SUBSTITUTE"],
    children: [
      {
        title: "Lesson Plans",
        href: "/teacher/lesson-plans",
        icon: "BookOpen",
        roles: ["TEACHER", "SUBSTITUTE"],
      },
      {
        title: "Assessments",
        href: "/teacher/assessments",
        icon: "FileText",
        roles: ["TEACHER", "SUBSTITUTE"],
      },
    ],
  },
  {
    title: "Transcript",
    href: "/teacher/transcript",
    icon: "ScrollText",
    roles: ["TEACHER", "SUBSTITUTE"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: "ClipboardCheck",
    permissions: ["attendance:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Consolidate Attendance",
    href: "/attendance/consolidate",
    icon: "Table2",
    permissions: ["attendance:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL"],
  },
  {
    title: "Course Materials",
    icon: "Library",
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
    children: [
      {
        title: "Lesson Plans",
        href: "/lesson-plans",
        icon: "BookOpen",
        permissions: ["lesson-plans:read"],
        roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL"],
      },
      {
        title: "Assessments",
        href: "/assessments",
        icon: "FileText",
        permissions: ["assessments:read"],
        roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
      },
    ],
  },
  {
    title: "Transcript",
    href: "/transcript",
    icon: "ScrollText",
    permissions: ["assessments:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
  {
    title: "Rankings",
    href: "/rankings",
    icon: "Trophy",
    permissions: ["assessments:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL", "READ_ONLY"],
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    title: "Users",
    href: "/users",
    icon: "Shield",
    permissions: ["users:read"],
    roles: ["NIGRA", "SCHOOL_ADMIN", "PRINCIPAL"],
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
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((item) =>
    item.children?.length ? item.children : [item]
  )
);

function itemMatchesRoleAndPermission(
  item: NavItem,
  roles: UserRoleCode[]
): boolean {
  if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
  if (
    item.permissions &&
    !item.permissions.some((p) => hasPermission(roles, p))
  ) {
    return false;
  }
  return true;
}

function filterNavItems(
  items: NavItem[],
  roles: UserRoleCode[],
  seen: Set<string>
): NavItem[] {
  const result: NavItem[] = [];

  for (const item of items) {
    if (!itemMatchesRoleAndPermission(item, roles)) continue;

    if (item.children?.length) {
      const children = filterNavItems(item.children, roles, seen);
      if (children.length === 0) continue;
      result.push({ ...item, children });
      continue;
    }

    if (!item.href || seen.has(item.href)) continue;
    seen.add(item.href);
    result.push(item);
  }

  return result;
}

export function collectNavHrefs(items: NavItem[]): string[] {
  const hrefs: string[] = [];
  for (const item of items) {
    if (item.href) hrefs.push(item.href);
    if (item.children) hrefs.push(...collectNavHrefs(item.children));
  }
  return hrefs;
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
