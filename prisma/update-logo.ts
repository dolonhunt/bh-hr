import { db } from "../src/lib/db";
async function main() {
  await db.company.updateMany({ data: { logo: "/bh-logo.png" } });
  console.log("Company logo updated to /bh-logo.png");
}
main().catch(console.error).finally(() => db.$disconnect());
