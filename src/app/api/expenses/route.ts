import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Expense Management
//
// Expenses are stored in the Activity model (no schema change needed):
//
//   type        = "EXPENSE"
//   title       = expense type  (TRAVEL | MEALS | ACCOMMODATION | SUPPLIES |
//                                TRANSPORT | TRAINING | OTHER)
//                              ← stored as an indexed-style queryable field
//   employeeId  = submitter's Employee.id  (FK)
//   description = JSON string {
//                   employeeId,
//                   employeeName,    // denormalised for display
//                   employeePhoto,   // denormalised for display
//                   type,
//                   description,     // free-text expense description
//                   amount,          // number
//                   currency,        // "BDT" | "USD" | ...
//                   date,            // ISO date the expense was incurred
//                   receipt,         // string (URL) | null
//                   status,          // DRAFT | PENDING | APPROVED | REJECTED | REIMBURSED
//                   submittedAt,     // ISO | null
//                   approvedBy,      // string | null  (approver name/id)
//                   approvedAt,      // ISO | null
//                   notes,           // string | null  (approver notes)
//                   rejectReason,    // string | null
//                   reimbursementDate, // ISO | null
//                   paymentRef       // string | null
//                 }
//   createdAt   = submission timestamp
// ============================================================

export type ExpenseType =
  | "TRAVEL"
  | "MEALS"
  | "ACCOMMODATION"
  | "SUPPLIES"
  | "TRANSPORT"
  | "TRAINING"
  | "OTHER";

export type ExpenseStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REIMBURSED";

export const EXPENSE_TYPES: ExpenseType[] = [
  "TRAVEL",
  "MEALS",
  "ACCOMMODATION",
  "SUPPLIES",
  "TRANSPORT",
  "TRAINING",
  "OTHER",
];

export const EXPENSE_STATUSES: ExpenseStatus[] = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REIMBURSED",
];

interface ExpenseMeta {
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  type: ExpenseType;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receipt: string | null;
  status: ExpenseStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  rejectReason: string | null;
  reimbursementDate: string | null;
  paymentRef: string | null;
}

export interface ExpenseDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  type: ExpenseType;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receipt: string | null;
  status: ExpenseStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  rejectReason: string | null;
  reimbursementDate: string | null;
  paymentRef: string | null;
  createdAt: string;
}

export function parseExpenseMeta(description: string | null): ExpenseMeta | null {
  if (!description) return null;
  try {
    const p = JSON.parse(description);
    const type = String(p.type ?? "OTHER").toUpperCase() as ExpenseType;
    const status = String(p.status ?? "DRAFT").toUpperCase() as ExpenseStatus;
    return {
      employeeId: String(p.employeeId ?? ""),
      employeeName: String(p.employeeName ?? ""),
      employeePhoto: p.employeePhoto ?? null,
      type: EXPENSE_TYPES.includes(type) ? type : "OTHER",
      description: String(p.description ?? ""),
      amount:
        typeof p.amount === "number" && isFinite(p.amount)
          ? p.amount
          : Number(p.amount ?? 0) || 0,
      currency: String(p.currency ?? "BDT"),
      date: p.date ?? new Date().toISOString(),
      receipt: p.receipt ?? null,
      status: EXPENSE_STATUSES.includes(status) ? status : "DRAFT",
      submittedAt: p.submittedAt ?? null,
      approvedBy: p.approvedBy ?? null,
      approvedAt: p.approvedAt ?? null,
      notes: p.notes ?? null,
      rejectReason: p.rejectReason ?? null,
      reimbursementDate: p.reimbursementDate ?? null,
      paymentRef: p.paymentRef ?? null,
    };
  } catch {
    return null;
  }
}

export function toExpenseDTO(a: any): ExpenseDTO | null {
  const m = parseExpenseMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    employeeId: m.employeeId || a.employeeId || "",
    employeeName: m.employeeName || a.employee?.fullName || "",
    employeePhoto: m.employeePhoto ?? a.employee?.photo ?? null,
    type: m.type,
    description: m.description,
    amount: m.amount,
    currency: m.currency,
    date: m.date,
    receipt: m.receipt,
    status: m.status,
    submittedAt: m.submittedAt,
    approvedBy: m.approvedBy,
    approvedAt: m.approvedAt,
    notes: m.notes,
    rejectReason: m.rejectReason,
    reimbursementDate: m.reimbursementDate,
    paymentRef: m.paymentRef,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

// GET /api/expenses  → list expenses with filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const status = (searchParams.get("status") || "").toUpperCase();
  const type = (searchParams.get("type") || "").toUpperCase();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const search = (searchParams.get("search") || "").toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(500, parseInt(searchParams.get("pageSize") || "50", 10))
  );

  const where: any = { type: "EXPENSE" };
  if (employeeId) where.employeeId = employeeId;
  if (type) where.title = type; // title stores the type for fast filtering

  const records = await db.activity.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          employeeId: true,
          photo: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let items = records
    .map(toExpenseDTO)
    .filter((x): x is ExpenseDTO => x !== null);

  if (status) items = items.filter((x) => x.status === status);
  if (search) {
    items = items.filter(
      (x) =>
        x.description.toLowerCase().includes(search) ||
        x.employeeName.toLowerCase().includes(search) ||
        x.type.toLowerCase().includes(search)
    );
  }
  if (from) {
    const f = new Date(from).getTime();
    items = items.filter((x) => new Date(x.date).getTime() >= f);
  }
  if (to) {
    const t = new Date(to).getTime();
    items = items.filter((x) => new Date(x.date).getTime() <= t);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return NextResponse.json({
    items: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// POST /api/expenses  → create expense (status = DRAFT)
export async function POST(req: NextRequest) {
  const body = await req.json();

  const employeeId = String(body.employeeId ?? "").trim();
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, fullName: true, employeeId: true, photo: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  const type = String(body.type ?? "OTHER").toUpperCase() as ExpenseType;
  if (!EXPENSE_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${EXPENSE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const description = String(body.description ?? "").trim();
  if (!description) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const rawAmount = body.amount;
  const amount =
    typeof rawAmount === "number" && isFinite(rawAmount)
      ? Math.max(0, rawAmount)
      : typeof rawAmount === "string" &&
          rawAmount.trim() !== "" &&
          !isNaN(Number(rawAmount))
        ? Math.max(0, Number(rawAmount))
        : 0;
  if (amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  const currency = String(body.currency ?? "BDT").toUpperCase() || "BDT";
  const date = body.date ? new Date(body.date).toISOString() : new Date().toISOString();
  const receipt =
    body.receipt === null ||
    body.receipt === undefined ||
    body.receipt === ""
      ? null
      : String(body.receipt);
  const notes =
    body.notes === null ||
    body.notes === undefined ||
    body.notes === ""
      ? null
      : String(body.notes);

  const meta: ExpenseMeta = {
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeePhoto: employee.photo ?? null,
    type,
    description,
    amount,
    currency,
    date,
    receipt,
    status: "DRAFT",
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    notes,
    rejectReason: null,
    reimbursementDate: null,
    paymentRef: null,
  };

  const activity = await db.activity.create({
    data: {
      type: "EXPENSE",
      title: type,
      employeeId: employee.id,
      description: JSON.stringify(meta),
    },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_CREATE",
      entityType: "Expense",
      entityId: activity.id,
      description: `Created ${type.toLowerCase()} expense for ${employee.fullName} (${currency} ${amount}).`,
    },
  });

  const dto = toExpenseDTO(activity);
  return NextResponse.json(dto, { status: 201 });
}
