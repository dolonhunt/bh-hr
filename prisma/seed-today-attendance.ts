import { db } from "../src/lib/db";

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Delete existing attendance for today
  await db.attendance.deleteMany({ where: { date: today } });

  const employees = await db.employee.findMany({ where: { status: "ACTIVE" } });

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const seed = i % 10;
    const status = seed === 0 ? "LEAVE" : seed === 1 ? "ABSENT" : seed === 2 ? "LATE" : "PRESENT";
    const checkIn = new Date(today);
    checkIn.setHours(9, status === "LATE" ? 25 + (i % 30) : 5 + (i % 20), 0, 0);
    const checkOut = new Date(today);
    checkOut.setHours(18, (i * 3) % 50, 0, 0);
    const workingHours = (checkOut.getTime() - checkIn.getTime()) / 3600000;

    await db.attendance.create({
      data: {
        employeeId: emp.id,
        date: today,
        checkIn: status === "LEAVE" || status === "ABSENT" ? null : checkIn,
        checkOut: status === "LEAVE" || status === "ABSENT" ? null : checkOut,
        workingHours: status === "LEAVE" || status === "ABSENT" ? 0 : workingHours,
        late: status === "LATE",
        lateMinutes: status === "LATE" ? 25 + (i % 30) : 0,
        overtime: workingHours > 9 ? workingHours - 9 : 0,
        status,
      },
    });
  }
  console.log(`Seeded ${employees.length} attendance records for today (${today.toISOString().slice(0,10)})`);
}
main().catch(console.error).finally(() => db.$disconnect());
