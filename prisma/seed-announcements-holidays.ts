// Seed script: announcements (notice board) + Bangladesh holidays 2026
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding announcements & holidays...");

  // ---- Announcements ----
  await db.announcement.deleteMany();
  const now = Date.now();
  const announcements = [
    {
      title: "Welcome to the new BH HR Console",
      body: "We have launched our brand-new HR Operations Console. Employees can now be managed, documents generated, and notices published — all in one place. Explore the dashboard to get started.",
      priority: "NORMAL",
      pinned: true,
      publishedAt: new Date(now - 2 * 86400000),
      expiresAt: null,
    },
    {
      title: "Office closed — Eid holidays",
      body: "The office will remain closed for the Eid break. Emergency HR support remains available via the HR hotline (+880 1700-000000). Regular operations resume the following working day.",
      priority: "HIGH",
      pinned: true,
      publishedAt: new Date(now - 86400000),
      expiresAt: new Date(now + 60 * 86400000),
    },
    {
      title: "Timesheet submissions due Friday",
      body: "All project teams must submit weekly timesheets by 6:00 PM Friday for payroll processing. Late submissions may delay salary credits.",
      priority: "NORMAL",
      pinned: false,
      publishedAt: new Date(now - 3 * 86400000),
      expiresAt: new Date(now + 5 * 86400000),
    },
    {
      title: "New expense policy effective this month",
      body: "Updated travel and meal reimbursement limits are now in effect: domestic travel ceiling raised to BDT 15,000 per trip and meal allowance to BDT 800 per day. Claims must be filed within 14 days of expense date.",
      priority: "NORMAL",
      pinned: false,
      publishedAt: new Date(now - 6 * 86400000),
      expiresAt: null,
    },
    {
      title: "Fire safety drill this Thursday",
      body: "A mandatory fire safety drill will be conducted at the HQ building at 11:00 AM Thursday. Please follow the evacuation marshals' instructions and assemble at the designated point in the parking area.",
      priority: "URGENT",
      pinned: false,
      publishedAt: new Date(now - 12 * 3600000),
      expiresAt: new Date(now + 3 * 86400000),
    },
    {
      title: "Q3 performance reviews open",
      body: "The Q3 review cycle is now open for managers. Please complete self-assessments and manager reviews before the end of the month.",
      priority: "LOW",
      pinned: false,
      publishedAt: new Date(now - 10 * 86400000),
      expiresAt: new Date(now + 20 * 86400000),
    },
  ];
  for (const a of announcements) {
    await db.announcement.create({ data: a });
  }
  console.log(`  + ${announcements.length} announcements seeded`);

  // ---- Holidays (Bangladesh 2026) ----
  await db.holiday.deleteMany();
  const year = new Date().getFullYear();
  const holidays = [
    { name: "Language Martyrs Day (Shaheed Dibosh)", date: `${year}-02-21`, type: "PUBLIC", description: "International Mother Language Day" },
    { name: "Independence Day of Bangladesh", date: `${year}-03-26`, type: "PUBLIC", description: "Shadhinota Dibosh" },
    { name: "Bengali New Year (Pohela Boishakh)", date: `${year}-04-14`, type: "PUBLIC", description: "Traditional new year celebrations" },
    { name: "May Day", date: `${year}-05-01`, type: "PUBLIC", description: "International Workers' Day" },
    { name: "Eid-ul-Adha", date: `${year}-05-27`, type: "PUBLIC", description: "Feast of the Sacrifice (subject to moon sighting)" },
    { name: "Eid-ul-Adha Holiday", date: `${year}-05-28`, type: "PUBLIC", description: null },
    { name: "Eid-ul-Adha Holiday", date: `${year}-05-29`, type: "PUBLIC", description: null },
    { name: "Ashura", date: `${year}-06-25`, type: "OPTIONAL", description: null },
    { name: "Eid-e-Miladunnabi", date: `${year}-08-25`, type: "PUBLIC", description: null },
    { name: "Durga Puja (Bijoya Dashami)", date: `${year}-10-20`, type: "OPTIONAL", description: null },
    { name: "Victory Day of Bangladesh", date: `${year}-12-16`, type: "PUBLIC", description: "Bijoy Dibosh" },
    { name: "Christmas Day", date: `${year}-12-25`, type: "PUBLIC", description: "Boro Din" },
    { name: "BH Founders' Day", date: `${year}-11-09`, type: "COMPANY", description: "Company anniversary celebration" },
    { name: "Annual Company Retreat", date: `${year}-11-20`, type: "COMPANY", description: "Team building offsite" },
  ];
  for (const h of holidays) {
    await db.holiday.create({
      data: { ...h, date: new Date(`${h.date}T00:00:00.000Z`) },
    });
  }
  console.log(`  + ${holidays.length} holidays seeded for ${year}`);
  console.log("✅ Done.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
