import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [emailSetting, documentNumbering, company, settingsArr] =
    await Promise.all([
      db.emailSetting.findFirst({
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      db.documentNumbering.findFirst({
        orderBy: { createdAt: "asc" },
      }),
      db.company.findFirst({
        orderBy: { createdAt: "asc" },
      }),
      db.setting.findMany(),
    ]);

  const settings: Record<string, string> = {};
  settingsArr.forEach((s) => {
    settings[s.key] = s.value;
  });

  return NextResponse.json({
    emailSetting,
    documentNumbering,
    company,
    settings,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // Update EmailSetting
  if (body.emailSetting) {
    const es = body.emailSetting;
    const existing = await db.emailSetting.findFirst({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    const data = {
      senderName: es.senderName,
      senderEmail: es.senderEmail,
      smtpHost: es.smtpHost,
      smtpPort: es.smtpPort ? Number(es.smtpPort) : null,
      username: es.username,
      password: es.password,
      encryption: es.encryption,
    };
    if (existing) {
      await db.emailSetting.update({ where: { id: existing.id }, data });
    } else {
      await db.emailSetting.create({
        data: { ...data, isDefault: true } as any,
      });
    }
  }

  // Update DocumentNumbering
  if (body.documentNumbering) {
    const dn = body.documentNumbering;
    const existing = await db.documentNumbering.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const data = {
      name: dn.name,
      pattern: dn.pattern,
      prefix: dn.prefix,
      padding: Number(dn.padding ?? 4),
      nextSeq: Number(dn.nextSeq ?? 1),
    };
    if (existing) {
      await db.documentNumbering.update({ where: { id: existing.id }, data });
    } else {
      await db.documentNumbering.create({ data: { ...data } as any });
    }
  }

  // Update Company
  if (body.company) {
    const c = body.company;
    const existing = await db.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const data = {
      name: c.name,
      legalName: c.legalName,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      zipCode: c.zipCode,
      email: c.email,
      phone: c.phone,
      website: c.website,
      logo: c.logo,
      taxId: c.taxId,
    };
    if (existing) {
      await db.company.update({ where: { id: existing.id }, data });
    } else {
      await db.company.create({ data: { ...data } as any });
    }
  }

  // Update misc Settings (key/value pairs)
  if (Array.isArray(body.settings)) {
    for (const s of body.settings) {
      const existing = await db.setting.findUnique({
        where: { key: s.key },
      });
      if (existing) {
        await db.setting.update({
          where: { key: s.key },
          data: { value: String(s.value) },
        });
      } else {
        await db.setting.create({
          data: { key: s.key, value: String(s.value) },
        });
      }
    }
  }

  await db.auditLog.create({
    data: {
      action: "SETTINGS_UPDATE",
      entityType: "Setting",
      description: "Updated system settings",
    },
  });

  // Return updated snapshot
  const [emailSetting, documentNumbering, company, settingsArr] =
    await Promise.all([
      db.emailSetting.findFirst({
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      db.documentNumbering.findFirst({ orderBy: { createdAt: "asc" } }),
      db.company.findFirst({ orderBy: { createdAt: "asc" } }),
      db.setting.findMany(),
    ]);
  const settings: Record<string, string> = {};
  settingsArr.forEach((s) => {
    settings[s.key] = s.value;
  });

  return NextResponse.json({
    emailSetting,
    documentNumbering,
    company,
    settings,
  });
}
