import { db } from "@/lib/db";

// ============================================================
// Notification generation logic — kept in a separate lib file so
// it can be imported by BOTH the GET route AND the "mark all read"
// endpoint (which must enumerate the current notifications to mark
// each one as read). Next.js App Router route.ts files cannot be
// imported for non-HTTP exports.
// ============================================================

export type NotificationType =
  | "LEAVE_PENDING"
  | "DOCUMENT_PENDING_APPROVAL"
  | "BIRTHDAY_UPCOMING"
  | "TASK_OVERDUE"
  | "PAYROLL_PENDING"
  | "ATTENDANCE_ANOMALY"
  | "SYSTEM";

export type NotificationSeverity = "info" | "warning" | "urgent";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "LEAVE_PENDING",
  "DOCUMENT_PENDING_APPROVAL",
  "BIRTHDAY_UPCOMING",
  "TASK_OVERDUE",
  "PAYROLL_PENDING",
  "ATTENDANCE_ANOMALY",
  "SYSTEM",
];

export const DEFAULT_PREFERENCES: Record<NotificationType, boolean> = {
  LEAVE_PENDING: true,
  DOCUMENT_PENDING_APPROVAL: true,
  BIRTHDAY_UPCOMING: true,
  TASK_OVERDUE: true,
  PAYROLL_PENDING: true,
  ATTENDANCE_ANOMALY: true,
  SYSTEM: true,
};

// Stable id derived from type + entity id — so the same pending
// leave always yields the same notification id (and therefore the
// same read-state entry).
function nid(type: string, entityId: string) {
  return `notif_${type.toLowerCase()}_${entityId}`;
}

export async function getReadSet(): Promise<Set<string>> {
  const rows = await db.setting.findMany({
    where: { key: { startsWith: "notification_read_" } },
    select: { key: true },
  });
  return new Set(rows.map((r) => r.key.replace("notification_read_", "")));
}

export async function getNotificationPreferences(): Promise<
  Record<NotificationType, boolean>
> {
  const row = await db.setting.findUnique({
    where: { key: "notification_preferences" },
  });
  if (!row?.value) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function generateNotifications(): Promise<NotificationDTO[]> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    pendingLeaves,
    pendingDocs,
    draftPayrolls,
    onboardingTasks,
    employees,
  ] = await Promise.all([
    db.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { appliedAt: "desc" },
      take: 50,
    }),
    db.generatedDocument.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.payroll.findMany({
      where: { status: "DRAFT" },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.activity.findMany({
      where: { type: "ONBOARDING_TASK" },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    }),
    db.employee.findMany({
      where: {
        status: "ACTIVE",
        dateOfBirth: { not: null },
        employmentStatus: { notIn: ["RESIGNED", "TERMINATED"] },
      },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        dateOfBirth: true,
        department: { select: { name: true } },
      },
    }),
  ]);

  const [readSet, prefs] = await Promise.all([
    getReadSet(),
    getNotificationPreferences(),
  ]);

  const out: NotificationDTO[] = [];

  // LEAVE_PENDING
  if (prefs.LEAVE_PENDING) {
    for (const lr of pendingLeaves) {
      const id = nid("LEAVE_PENDING", lr.id);
      out.push({
        id,
        type: "LEAVE_PENDING",
        title: `Leave request from ${lr.employee?.fullName ?? "—"}`,
        message: `${lr.employee?.employeeId ?? ""} · ${
          lr.leaveType?.name ?? "Leave"
        } · ${lr.days} day(s)`.trim(),
        severity: "warning",
        link: "/?module=leave",
        read: readSet.has(id),
        createdAt: lr.appliedAt?.toISOString?.() ?? now.toISOString(),
        metadata: {
          employeeId: lr.employee?.id,
          employeeName: lr.employee?.fullName,
          leaveRequestId: lr.id,
          leaveType: lr.leaveType?.name,
          days: lr.days,
        },
      });
    }
  }

  // DOCUMENT_PENDING_APPROVAL
  if (prefs.DOCUMENT_PENDING_APPROVAL) {
    for (const d of pendingDocs) {
      const id = nid("DOCUMENT_PENDING_APPROVAL", d.id);
      out.push({
        id,
        type: "DOCUMENT_PENDING_APPROVAL",
        title: `Document awaiting approval: ${d.documentNumber}`,
        message: `${d.employee?.fullName ?? "—"} · ${d.type}`,
        severity: "warning",
        link: "/?module=documents&tab=approval-queue",
        read: readSet.has(id),
        createdAt: d.createdAt?.toISOString?.() ?? now.toISOString(),
        metadata: {
          documentId: d.id,
          documentNumber: d.documentNumber,
          employeeId: d.employee?.id,
          employeeName: d.employee?.fullName,
          type: d.type,
        },
      });
    }
  }

  // PAYROLL_PENDING (draft payrolls)
  if (prefs.PAYROLL_PENDING) {
    for (const p of draftPayrolls) {
      const id = nid("PAYROLL_PENDING", p.id);
      out.push({
        id,
        type: "PAYROLL_PENDING",
        title: `Draft payroll for ${p.employee?.fullName ?? "—"}`,
        message: `${p.employee?.employeeId ?? ""} · ${p.payrollMonth} · Net ${p.netSalary.toFixed(0)}`.trim(),
        severity: "info",
        link: "/?module=payroll",
        read: readSet.has(id),
        createdAt: p.createdAt?.toISOString?.() ?? now.toISOString(),
        metadata: {
          payrollId: p.id,
          employeeId: p.employee?.id,
          employeeName: p.employee?.fullName,
          month: p.payrollMonth,
          netSalary: p.netSalary,
        },
      });
    }
  }

  // TASK_OVERDUE (onboarding tasks past dueDate and not completed/skipped)
  if (prefs.TASK_OVERDUE) {
    interface TaskMeta {
      dueDate?: string | null;
      status?: string;
    }
    for (const a of onboardingTasks) {
      let meta: TaskMeta = {};
      try {
        meta = a.description ? JSON.parse(a.description) : {};
      } catch {
        meta = {};
      }
      if (!meta.dueDate) continue;
      if (meta.status === "COMPLETED" || meta.status === "SKIPPED") continue;
      const due = new Date(meta.dueDate);
      if (isNaN(due.getTime()) || due.getTime() > now.getTime()) continue;

      const id = nid("TASK_OVERDUE", a.id);
      out.push({
        id,
        type: "TASK_OVERDUE",
        title: `Overdue: ${a.title}`,
        message: `${a.employee?.fullName ?? "—"} · was due ${due.toLocaleDateString(
          "en-GB",
          { day: "2-digit", month: "short", year: "numeric" }
        )}`,
        severity: "urgent",
        link: a.employeeId
          ? `/?module=employees&employee=${a.employeeId}`
          : undefined,
        read: readSet.has(id),
        createdAt: due.toISOString(),
        metadata: {
          taskId: a.id,
          employeeId: a.employeeId,
          employeeName: a.employee?.fullName,
          title: a.title,
          dueDate: meta.dueDate,
        },
      });
    }
  }

  // BIRTHDAY_UPCOMING (next 7 days, ignoring year)
  if (prefs.BIRTHDAY_UPCOMING) {
    const mmddNow = now.getMonth() * 100 + now.getDate();
    const mmddFuture = in7Days.getMonth() * 100 + in7Days.getDate();
    for (const emp of employees) {
      if (!emp.dateOfBirth) continue;
      const dob = new Date(emp.dateOfBirth);
      if (isNaN(dob.getTime())) continue;
      const mmdd = dob.getMonth() * 100 + dob.getDate();
      // Handle wrap-around year-end (e.g. Dec 30 → Jan 2)
      const inWindow =
        mmddNow <= mmddFuture
          ? mmdd >= mmddNow && mmdd <= mmddFuture
          : mmdd >= mmddNow || mmdd <= mmddFuture;
      if (!inWindow) continue;
      const id = nid(
        "BIRTHDAY_UPCOMING",
        `${emp.id}_${dob.getMonth() + 1}_${dob.getDate()}`
      );
      // Use this year's birthday (or next year's if it has already passed)
      const year = now.getFullYear();
      const thisYearBday = new Date(
        year,
        dob.getMonth(),
        dob.getDate(),
        9,
        0,
        0
      );
      if (thisYearBday.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        thisYearBday.setFullYear(year + 1);
      }
      out.push({
        id,
        type: "BIRTHDAY_UPCOMING",
        title: `🎂 ${emp.fullName}'s birthday is coming up`,
        message: `${emp.employeeId}${
          emp.department ? ` · ${emp.department.name}` : ""
        } · ${thisYearBday.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })}`,
        severity: "info",
        link: emp.id ? `/?module=employees&employee=${emp.id}` : undefined,
        read: readSet.has(id),
        createdAt: thisYearBday.toISOString(),
        metadata: {
          employeeId: emp.id,
          employeeName: emp.fullName,
          dateOfBirth: emp.dateOfBirth.toISOString(),
        },
      });
    }
  }

  // Sort: unread first, then by createdAt desc
  out.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return out;
}
