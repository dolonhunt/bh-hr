import { db } from "../src/lib/db";

async function main() {
  console.log("Seeding assets and training...");

  // Seed Assets
  const assets = [
    { name: "MacBook Pro 16\"", type: "LAPTOP", serial: "MBP16-001", condition: "NEW", status: "ASSIGNED" },
    { name: "MacBook Pro 14\"", type: "LAPTOP", serial: "MBP14-002", condition: "GOOD", status: "ASSIGNED" },
    { name: "Dell Monitor 27\"", type: "MONITOR", serial: "DEL27-001", condition: "GOOD", status: "ASSIGNED" },
    { name: "LG Monitor 24\"", type: "MONITOR", serial: "LG24-002", condition: "FAIR", status: "AVAILABLE" },
    { name: "iPhone 15 Pro", type: "PHONE", serial: "IP15P-001", condition: "NEW", status: "ASSIGNED" },
    { name: "Samsung Galaxy S24", type: "PHONE", serial: "SGS24-001", condition: "GOOD", status: "AVAILABLE" },
    { name: "Logitech MX Keys", type: "KEYBOARD", serial: "LGK-001", condition: "NEW", status: "AVAILABLE" },
    { name: "Logitech MX Master 3", type: "MOUSE", serial: "LGM-001", condition: "GOOD", status: "AVAILABLE" },
    { name: "Sony WH-1000XM5", type: "HEADSET", serial: "SONY-001", condition: "NEW", status: "ASSIGNED" },
    { name: "Ergonomic Chair", type: "CHAIR", serial: "CHAIR-001", condition: "GOOD", status: "ASSIGNED" },
    { name: "Standing Desk", type: "DESK", serial: "DESK-001", condition: "NEW", status: "AVAILABLE" },
    { name: "Webcam Logitech C920", type: "CAMERA", serial: "CAM-001", condition: "FAIR", status: "DAMAGED" },
  ];

  const employees = await db.employee.findMany({ take: 6 });

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const assignedEmp = a.status === "ASSIGNED" ? employees[i % employees.length] : null;
    await db.activity.create({
      data: {
        type: "ASSET",
        title: a.name,
        employeeId: assignedEmp?.id ?? null,
        description: JSON.stringify({
          name: a.name,
          type: a.type,
          serialNumber: a.serial,
          condition: a.condition,
          status: a.status,
          notes: "",
          assignedToId: assignedEmp?.id ?? null,
          assignedToName: assignedEmp?.fullName ?? null,
          assignedDate: assignedEmp ? new Date().toISOString() : null,
          returnDate: null,
          expectedReturnDate: null,
        }),
      },
    });
  }
  console.log(`  + ${assets.length} assets seeded`);

  // Seed Training Courses
  const courses = [
    {
      title: "React Advanced Patterns",
      description: "Deep dive into advanced React patterns and best practices.",
      trainer: "Imran Karim",
      category: "TECHNICAL",
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 9 * 86400000),
      duration: 16,
      capacity: 20,
      status: "ACTIVE",
    },
    {
      title: "Effective Communication Skills",
      description: "Improve workplace communication and collaboration.",
      trainer: "Tahmina Akter",
      category: "SOFT_SKILLS",
      startDate: new Date(Date.now() + 14 * 86400000),
      endDate: new Date(Date.now() + 15 * 86400000),
      duration: 8,
      capacity: 15,
      status: "ACTIVE",
    },
    {
      title: "Leadership Essentials",
      description: "Core leadership skills for new managers.",
      trainer: "Saif Hossain",
      category: "LEADERSHIP",
      startDate: new Date(Date.now() + 21 * 86400000),
      endDate: new Date(Date.now() + 23 * 86400000),
      duration: 12,
      capacity: 10,
      status: "ACTIVE",
    },
    {
      title: "SQL & Database Fundamentals",
      description: "Learn SQL queries and database design principles.",
      trainer: "Rashed Karim",
      category: "TECHNICAL",
      startDate: new Date(Date.now() - 7 * 86400000),
      endDate: new Date(Date.now() - 5 * 86400000),
      duration: 10,
      capacity: 25,
      status: "COMPLETED",
    },
  ];

  for (const c of courses) {
    const courseId = `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.activity.create({
      data: {
        type: "TRAINING_COURSE",
        title: c.title,
        description: JSON.stringify({
          id: courseId,
          description: c.description,
          trainer: c.trainer,
          startDate: c.startDate.toISOString(),
          endDate: c.endDate.toISOString(),
          duration: c.duration,
          capacity: c.capacity,
          category: c.category,
          status: c.status,
          enrolledCount: 0,
        }),
      },
    });

    // Enroll some employees
    const enrollCount = Math.min(5, employees.length);
    for (let i = 0; i < enrollCount; i++) {
      const emp = employees[i];
      const completed = c.status === "COMPLETED";
      await db.activity.create({
        data: {
          type: "TRAINING_ENROLLMENT",
          employeeId: emp.id,
          title: c.title,
          description: JSON.stringify({
            courseId,
            courseTitle: c.title,
            enrolledAt: new Date(Date.now() - 10 * 86400000).toISOString(),
            completedAt: completed ? new Date(Date.now() - 4 * 86400000).toISOString() : null,
            score: completed ? 75 + Math.floor(Math.random() * 20) : null,
            certificate: completed ? `CERT-${emp.employeeId}-${courseId.slice(-4)}` : null,
            status: completed ? "COMPLETED" : "ENROLLED",
          }),
        },
      });
    }
  }
  console.log(`  + ${courses.length} training courses seeded with enrollments`);

  console.log("Done.");
}

main().catch(console.error).finally(() => db.$disconnect());
