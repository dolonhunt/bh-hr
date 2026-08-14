import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toEnrollmentDTO, parseEnrollmentMeta } from "../route";

// GET /api/training/enrollments
// Returns all training enrollments with employee + course info.
// Optional filters: ?status=&courseId=&employeeId=&search=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "").toUpperCase();
  const courseId = searchParams.get("courseId") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const search = (searchParams.get("search") || "").toLowerCase();

  const where: any = { type: "TRAINING_ENROLLMENT" };
  if (employeeId) where.employeeId = employeeId;

  const all = await db.activity.findMany({
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

  let items = all.map((a) => toEnrollmentDTO(a, a.employee));

  if (status) items = items.filter((i) => i.status === status);
  if (courseId) items = items.filter((i) => i.courseId === courseId);
  if (search) {
    items = items.filter(
      (i) =>
        (i.employeeName ?? "").toLowerCase().includes(search) ||
        (i.employeeCode ?? "").toLowerCase().includes(search) ||
        i.courseTitle.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ items, total: items.length });
}
