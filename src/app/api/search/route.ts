import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  if (!q) {
    return NextResponse.json({ employees: [], documents: [], candidates: [] });
  }

  const [employees, documents, candidates] = await Promise.all([
    db.employee.findMany({
      where: {
        OR: [
          { fullName: { contains: q } },
          { employeeId: { contains: q } },
          { officialEmail: { contains: q } },
          { personalEmail: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      take: limit,
      include: {
        department: { select: { id: true, name: true, color: true } },
        designation: { select: { id: true, name: true } },
      },
    }),
    db.generatedDocument.findMany({
      where: {
        OR: [
          { documentNumber: { contains: q } },
          { title: { contains: q } },
          { type: { contains: q } },
        ],
      },
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            photo: true,
          },
        },
        template: { select: { id: true, name: true } },
      },
    }),
    db.candidate.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { skills: { contains: q } },
        ],
      },
      take: limit,
      include: {
        job: { select: { id: true, title: true } },
      },
    }),
  ]);

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      fullName: e.fullName,
      photo: e.photo,
      officialEmail: e.officialEmail,
      department: e.department,
      designation: e.designation,
      type: "employee",
    })),
    documents: documents.map((d) => ({
      id: d.id,
      documentNumber: d.documentNumber,
      title: d.title,
      type: d.type,
      status: d.status,
      createdAt: d.createdAt,
      employee: d.employee,
      template: d.template,
      type_label: "document",
    })),
    candidates: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      appliedAt: c.appliedAt,
      job: c.job,
      type: "candidate",
    })),
    total: employees.length + documents.length + candidates.length,
  });
}
