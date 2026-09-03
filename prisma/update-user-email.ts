import { db } from "../src/lib/db";

async function main() {
  const user = await db.user.update({
    where: { email: "hr@northwindlabs.io" },
    data: { email: "hr@beyondheadlines.io" },
  });
  console.log("Updated user email:", user.email);
  
  // Also update employees' official emails
  const employees = await db.employee.updateMany({
    where: { officialEmail: { contains: "northwindlabs" } },
    data: {},
  });
  
  // Need to update each employee's email individually
  const allEmps = await db.employee.findMany({ where: { officialEmail: { contains: "northwindlabs" } } });
  for (const emp of allEmps) {
    const newEmail = emp.officialEmail?.replace("northwindlabs.io", "beyondheadlines.io") || emp.officialEmail;
    const newPersonalEmail = emp.personalEmail?.replace("northwindlabs.io", "beyondheadlines.io") || emp.personalEmail;
    await db.employee.update({
      where: { id: emp.id },
      data: { officialEmail: newEmail, personalEmail: newPersonalEmail },
    });
  }
  console.log(`Updated ${allEmps.length} employee emails`);
  
  // Update company email
  await db.company.updateMany({
    where: { email: { contains: "northwindlabs" } },
    data: { email: "hr@beyondheadlines.io", website: "https://beyondheadlines.io" },
  });
  console.log("Updated company email");
}

main().catch(console.error).finally(() => db.$disconnect());
