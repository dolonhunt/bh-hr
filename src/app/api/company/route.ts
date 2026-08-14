import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const company = await db.company.findFirst({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(company);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const existing = await db.company.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const data = {
    name: body.name,
    legalName: body.legalName,
    address: body.address,
    city: body.city,
    state: body.state,
    country: body.country,
    zipCode: body.zipCode,
    email: body.email,
    phone: body.phone,
    website: body.website,
    logo: body.logo,
    taxId: body.taxId,
  };

  let company;
  if (existing) {
    company = await db.company.update({ where: { id: existing.id }, data });
  } else {
    company = await db.company.create({ data: { ...data } as any });
  }

  await db.auditLog.create({
    data: {
      action: "COMPANY_UPDATE",
      entityType: "Company",
      entityId: company.id,
      description: `Updated company profile: ${company.name}`,
    },
  });

  return NextResponse.json(company);
}
