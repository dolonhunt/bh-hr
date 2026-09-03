import { db } from "../src/lib/db";

async function main() {
  // Revert company
  await db.company.updateMany({
    data: {
      name: "Northwind Labs",
      legalName: "Northwind Labs Pvt Ltd",
      logo: null,
      email: "hr@northwindlabs.io",
      website: "https://northwindlabs.io",
    },
  });
  console.log("Company reverted to Northwind Labs");

  // Revert HR user email
  const user = await db.user.findFirst({ where: { email: "hr@beyondheadlines.io" } });
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { email: "hr@northwindlabs.io" },
    });
    console.log("User email reverted");
  }

  // Revert employee emails
  const emps = await db.employee.findMany({ where: { officialEmail: { contains: "beyondheadlines" } } });
  for (const emp of emps) {
    const newOfficial = emp.officialEmail?.replace("beyondheadlines.io", "northwindlabs.io") || emp.officialEmail;
    const newPersonal = emp.personalEmail?.replace("beyondheadlines.io", "northwindlabs.io") || emp.personalEmail;
    await db.employee.update({
      where: { id: emp.id },
      data: { officialEmail: newOfficial, personalEmail: newPersonal },
    });
  }
  console.log(`Reverted ${emps.length} employee emails`);
}

main().catch(console.error).finally(() => db.$disconnect());
