// Seed script: populates the HR database with a realistic company + employees
// Run with: bun run db:seed
import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding HR database...");

  // Clean
  await db.emailLog.deleteMany();
  await db.generatedDocument.deleteMany();
  await db.documentTemplate.deleteMany();
  await db.documentNumbering.deleteMany();
  await db.emailSetting.deleteMany();
  await db.auditLog.deleteMany();
  await db.activity.deleteMany();
  await db.candidate.deleteMany();
  await db.job.deleteMany();
  await db.performance.deleteMany();
  await db.payroll.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.attendance.deleteMany();
  await db.employee.deleteMany();
  await db.designation.deleteMany();
  await db.leaveType.deleteMany();
  await db.role.deleteMany();
  await db.department.deleteMany();
  await db.company.deleteMany();
  await db.user.deleteMany();

  // Company
  const company = await db.company.create({
    data: {
      name: "Beyond Headlines",
      legalName: "Beyond Headlines Pvt Ltd",
      address: "14 Garden Road, Level 5",
      city: "Dhaka",
      state: "Dhaka",
      country: "Bangladesh",
      zipCode: "1213",
      email: "hr@beyondheadlines.io",
      phone: "+880 1700-000000",
      website: "https://beyondheadlines.io",
      taxId: "TIN-9988776655",
    },
  });

  // HR user
  const hrUser = await db.user.create({
    data: {
      email: "hr@beyondheadlines.io",
      name: "Tahmina Akter",
      password: "demo1234",
      role: "HR_ADMIN",
    },
  });

  // Departments
  const departments = await db.department.createManyAndReturn({
    data: [
      { name: "Human Resources", color: "#10b981" },
      { name: "Engineering", color: "#0ea5e9" },
      { name: "Product", color: "#f59e0b" },
      { name: "Design", color: "#a855f7" },
      { name: "Sales", color: "#ef4444" },
      { name: "Marketing", color: "#ec4899" },
      { name: "Finance", color: "#14b8a6" },
      { name: "Operations", color: "#6366f1" },
    ],
  });
  const deptMap = Object.fromEntries(
    departments.map((d) => [d.name, d])
  );

  // Roles
  const roles = await db.role.createManyAndReturn({
    data: [
      { name: "Editor" },
      { name: "Senior Executive" },
      { name: "Executive" },
      { name: "IT Support" },
      { name: "Accountant" },
      { name: "HR Executive" },
      { name: "Software Engineer" },
      { name: "Senior Software Engineer" },
      { name: "Product Manager" },
      { name: "UX Designer" },
      { name: "Sales Executive" },
      { name: "Marketing Lead" },
    ],
  });
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r]));

  // Designations
  const designations = await db.designation.createManyAndReturn({
    data: [
      { name: "Junior Associate" },
      { name: "Associate" },
      { name: "Senior Associate" },
      { name: "Lead" },
      { name: "Manager" },
      { name: "Senior Manager" },
      { name: "Director" },
    ],
  });
  const desigMap = Object.fromEntries(designations.map((d) => [d.name, d]));

  // Leave Types
  const leaveTypes = await db.leaveType.createManyAndReturn({
    data: [
      { name: "Annual Leave", code: "AL", defaultDays: 20, paid: true, color: "#10b981" },
      { name: "Casual Leave", code: "CL", defaultDays: 10, paid: true, color: "#0ea5e9" },
      { name: "Sick Leave", code: "SL", defaultDays: 12, paid: true, color: "#f59e0b" },
      { name: "Maternity Leave", code: "ML", defaultDays: 84, paid: true, color: "#ec4899" },
      { name: "Paternity Leave", code: "PL", defaultDays: 7, paid: true, color: "#a855f7" },
      { name: "Unpaid Leave", code: "UL", defaultDays: 30, paid: false, color: "#6b7280" },
      { name: "Other", code: "OT", defaultDays: 5, paid: false, color: "#14b8a6" },
    ],
  });

  // Employees (20)
  const firstNames = [
    "Arif", "Nadia", "Rakib", "Sumaiya", "Tanvir", "Farhana", "Imran", "Maliha",
    "Sajid", "Rumana", "Hasan", "Tania", "Rifat", "Sadia", "Naimur", "Lamia",
    "Saif", "Jerin", "Rashed", "Priya",
  ];
  const lastNames = [
    "Hossain", "Rahman", "Ahmed", "Khan", "Islam", "Chowdhury", "Karim", "Akter",
    "Begum", "Sarkar", "Das", "Roy",
  ];

  const employees = [];
  const today = new Date();
  for (let i = 0; i < 20; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const deptKeys = Object.keys(deptMap);
    const roleKeys = Object.keys(roleMap);
    const desigKeys = Object.keys(desigMap);
    const dept = deptMap[deptKeys[i % deptKeys.length]];
    const role = roleMap[roleKeys[(i * 2) % roleKeys.length]];
    const desig = desigMap[desigKeys[i % desigKeys.length]];
    const empId = `EMP${String(i + 1).padStart(3, "0")}`;
    const joiningDate = new Date(today);
    joiningDate.setDate(joiningDate.getDate() - (i + 1) * 30);
    const basic = 35000 + i * 3500;
    const allowances = Math.round(basic * 0.35);
    const tax = Math.round(basic * 0.05);
    const deductions = Math.round(basic * 0.03);

    const emp = await db.employee.create({
      data: {
        employeeId: empId,
        fullName: `${fn} ${ln}`,
        firstName: fn,
        lastName: ln,
        dateOfBirth: new Date(1990 + (i % 12), (i * 5) % 12, (i * 7) % 28 + 1),
        gender: i % 3 === 0 ? "FEMALE" : "MALE",
        phone: `+880 17${String(10000000 + i * 123456).slice(0, 8)}`,
        personalEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`,
        officialEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}@beyondheadlines.io`,
        address: `House ${10 + i}, Road ${5 + (i % 7)}, Block C`,
        city: "Dhaka",
        state: "Dhaka",
        country: "Bangladesh",
        zipCode: "1212",
        emergencyContactName: `${ln} ${fn === "Arif" ? "Father" : "Spouse"}`,
        emergencyContactPhone: `+880 18${String(10000000 + i * 654321).slice(0, 8)}`,
        emergencyRelation: i % 2 === 0 ? "Parent" : "Spouse",

        departmentId: dept.id,
        roleId: role.id,
        designationId: desig.id,
        employmentType:
          i % 5 === 0 ? "PROBATION" : i % 7 === 0 ? "CONTRACT" : "FULL_TIME",
        joiningDate,
        confirmationDate: i % 5 === 0 ? null : new Date(joiningDate.getTime() + 180 * 86400000),
        employmentStatus: "ACTIVE",
        workLocation: i % 4 === 0 ? "Remote" : "HQ - Dhaka",

        basicSalary: basic,
        allowances,
        deductions,
        tax,
        bankName: i % 2 === 0 ? "BRAC Bank" : "Dutch-Bangla Bank",
        bankAccount: `1${String(2000000000 + i * 123456789).slice(0, 9)}`,
        bankIfsc: i % 2 === 0 ? "BACBBDBD" : "DBBLBDDH",
        paymentMethod: "BANK_TRANSFER",
      },
    });
    employees.push(emp);
  }

  // Attendance for last 7 days
  const todayOnly = new Date();
  todayOnly.setHours(0, 0, 0, 0);
  for (let d = 0; d < 7; d++) {
    const date = new Date(todayOnly);
    date.setDate(date.getDate() - d);
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const seed = (d * 7 + i) % 10;
      const status =
        seed === 0 ? "LEAVE" : seed === 1 ? "ABSENT" : seed === 2 ? "LATE" : "PRESENT";
      const checkIn = new Date(date);
      checkIn.setHours(9, status === "LATE" ? 25 + (i % 30) : 5 + (i % 20), 0, 0);
      const checkOut = new Date(date);
      checkOut.setHours(18, (i * 3) % 50, 0, 0);
      const workingHours =
        (checkOut.getTime() - checkIn.getTime()) / 3600000;
      await db.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          checkIn: status === "LEAVE" || status === "ABSENT" ? null : checkIn,
          checkOut: status === "LEAVE" || status === "ABSENT" ? null : checkOut,
          workingHours:
            status === "LEAVE" || status === "ABSENT" ? 0 : workingHours,
          late: status === "LATE",
          lateMinutes: status === "LATE" ? 25 + (i % 30) : 0,
          overtime: workingHours > 9 ? workingHours - 9 : 0,
          status,
        },
      });
    }
  }

  // Leave requests
  const lt = leaveTypes;
  for (let i = 0; i < 12; i++) {
    const emp = employees[i % employees.length];
    const ltRow = lt[i % lt.length];
    const start = new Date(todayOnly);
    start.setDate(start.getDate() + (i - 5));
    const end = new Date(start);
    end.setDate(end.getDate() + 1 + (i % 3));
    const days = (end.getTime() - start.getTime()) / 86400000 + 1;
    await db.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: ltRow.id,
        startDate: start,
        endDate: end,
        days,
        reason:
          i % 3 === 0
            ? "Family emergency"
            : i % 3 === 1
              ? "Medical appointment"
              : "Personal work",
        status:
          i % 4 === 0 ? "PENDING" : i % 4 === 1 ? "APPROVED" : i % 4 === 2 ? "REJECTED" : "APPROVED",
        approverId: hrUser.id,
        approverNote:
          i % 4 === 1 ? "Approved - coverage arranged." : i % 4 === 2 ? "Rejected - peak period." : null,
        decidedAt: i % 4 === 0 ? null : new Date(),
      },
    });
  }

  // Payroll for current month
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  for (const emp of employees.slice(0, 18)) {
    const net = emp.basicSalary + emp.allowances - emp.deductions - emp.tax;
    await db.payroll.create({
      data: {
        employeeId: emp.id,
        payrollMonth: month,
        basicSalary: emp.basicSalary,
        allowances: emp.allowances,
        deductions: emp.deductions,
        tax: emp.tax,
        netSalary: net,
        paymentDate: new Date(),
        status: emp.employmentType === "PROBATION" ? "DRAFT" : "PAID",
      },
    });
  }

  // Document templates
  const templates = [
    {
      name: "Appointment Letter",
      code: "APPT",
      type: "APPOINTMENT",
      category: "EMPLOYMENT",
      subject: "Appointment Letter - {{employee.name}}",
      content: `<h2>{{company.name}}</h2>
<p>{{company.address}}, {{company.city}}, {{company.country}}</p>
<p>Email: {{company.email}} | Phone: {{company.phone}}</p>
<hr/>
<h3>Appointment Letter</h3>
<p>Document No: <strong>{{document.number}}</strong></p>
<p>Date: <strong>{{document.date}}</strong></p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>We are pleased to confirm your appointment as <strong>{{employee.designation}}</strong> in the {{employee.department}} department at {{company.name}}, effective from <strong>{{employee.joining_date}}</strong>.</p>
<p>Your starting basic salary will be <strong>{{employee.salary}}</strong> per month, plus applicable allowances as per company policy.</p>
<p>You will be on probation for six (6) months, after which your employment will be confirmed subject to satisfactory performance.</p>
<p>We look forward to a long and productive association.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
      emailSubject: "Your Appointment Letter - {{company.name}}",
      emailBody: `Dear {{employee.name}},\n\nPlease find attached your appointment letter ({{document.number}}) dated {{document.date}}.\n\nIf you have any questions, please reach out to HR.\n\nRegards,\nHR Team\n{{company.name}}`,
    },
    {
      name: "Offer Letter",
      code: "OFFER",
      type: "OFFER",
      category: "EMPLOYMENT",
      subject: "Offer Letter - {{employee.name}}",
      content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Offer of Employment</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>We are delighted to offer you the position of <strong>{{employee.designation}}</strong> in our {{employee.department}} team.</p>
<p>Your joining date will be <strong>{{employee.joining_date}}</strong> with a monthly basic salary of <strong>{{employee.salary}}</strong>.</p>
<p>Please sign and return this letter as acceptance of the offer.</p>
<br/>
<p>Warm regards,</p>
<p>HR Team<br/>{{company.name}}</p>`,
      emailSubject: "Job Offer from {{company.name}}",
      emailBody: `Dear {{employee.name}},\n\nCongratulations! Please find attached your offer letter.\n\nWe look forward to welcoming you to {{company.name}}.\n\nRegards,\nHR Team`,
    },
    {
      name: "Payslip Template",
      code: "PAYSLIP",
      type: "PAYSLIP",
      category: "SALARY",
      subject: "Payslip - {{payroll.month}} - {{employee.name}}",
      content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Salary Slip</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
<tr><td><strong>Employee Name</strong></td><td>{{employee.name}}</td><td><strong>Employee ID</strong></td><td>{{employee.id}}</td></tr>
<tr><td><strong>Department</strong></td><td>{{employee.department}}</td><td><strong>Designation</strong></td><td>{{employee.designation}}</td></tr>
<tr><td><strong>Pay Period</strong></td><td>{{payroll.month}}</td><td><strong>Payment Date</strong></td><td>{{document.date}}</td></tr>
</table>
<br/>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
<tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
<tr><td>Basic Salary</td><td>{{payroll.basic_salary}}</td><td>Tax</td><td>{{payroll.tax}}</td></tr>
<tr><td>Allowances</td><td>{{payroll.allowances}}</td><td>Deductions</td><td>{{payroll.deductions}}</td></tr>
<tr><td colspan="2"></td><td><strong>Net Pay</strong></td><td><strong>{{payroll.net_salary}}</strong></td></tr>
</table>
<br/>
<p>This is a system-generated payslip and does not require a signature.</p>`,
      emailSubject: "Your Payslip for {{payroll.month}}",
      emailBody: `Dear {{employee.name}},\n\nPlease find attached your payslip for {{payroll.month}}.\n\nRegards,\nHR Team\n{{company.name}}`,
    },
    {
      name: "Experience Certificate",
      code: "EXP",
      type: "EXPERIENCE",
      category: "HR",
      subject: "Experience Certificate - {{employee.name}}",
      content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Experience Certificate</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>This is to certify that <strong>{{employee.name}}</strong> (Employee ID: {{employee.id}}) was employed with {{company.name}} as <strong>{{employee.designation}}</strong> in the {{employee.department}} department from <strong>{{employee.joining_date}}</strong>.</p>
<p>During the tenure, we found {{employee.name}} to be sincere, hardworking, and professional.</p>
<p>We wish {{employee.name}} all the best in future endeavors.</p>
<br/>
<p>For {{company.name}}</p>
<p><strong>HR Department</strong></p>`,
      emailSubject: "Your Experience Certificate",
      emailBody: `Dear {{employee.name}},\n\nPlease find attached your experience certificate ({{document.number}}).\n\nRegards,\nHR Team`,
    },
    {
      name: "Leave Approval Letter",
      code: "LA",
      type: "LEAVE_APPROVAL",
      category: "LEAVE",
      subject: "Leave Approval - {{employee.name}}",
      content: `<h2>{{company.name}}</h2>
<hr/>
<h3>Leave Approval</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>We are pleased to inform you that your leave request has been <strong>approved</strong>.</p>
<p>Please ensure proper handover before proceeding on leave.</p>
<br/>
<p>Regards,<br/>HR Team<br/>{{company.name}}</p>`,
      emailSubject: "Leave Approved - {{company.name}}",
      emailBody: `Dear {{employee.name}},\n\nYour leave request has been approved. Please see attached letter.\n\nRegards,\nHR Team`,
    },
  ];
  for (const t of templates) {
    await db.documentTemplate.create({
      data: { ...t, status: "ACTIVE", createdBy: hrUser.id, version: "1.0" },
    });
  }

  // Document numbering pattern
  await db.documentNumbering.create({
    data: {
      name: "Default",
      pattern: "{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}",
      prefix: "BH",
      padding: 4,
      nextSeq: 1,
    },
  });

  // Email setting
  await db.emailSetting.create({
    data: {
      senderName: "Beyond Headlines HR",
      senderEmail: "hr@beyondheadlines.io",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      username: "hr@beyondheadlines.io",
      password: "",
      encryption: "TLS",
      isDefault: true,
    },
  });

  // Jobs
  await db.job.createMany({
    data: [
      {
        title: "Senior Backend Engineer",
        departmentId: deptMap["Engineering"].id,
        employmentType: "FULL_TIME",
        location: "Dhaka",
        vacancy: 2,
        closingDate: new Date(today.getTime() + 30 * 86400000),
        description: "We are hiring a senior backend engineer to scale our payments platform.",
        requirements: "5+ years Node.js / Go, distributed systems, PostgreSQL",
        salaryMin: 120000,
        salaryMax: 180000,
        status: "OPEN",
      },
      {
        title: "Product Designer",
        departmentId: deptMap["Design"].id,
        employmentType: "FULL_TIME",
        location: "Remote",
        vacancy: 1,
        closingDate: new Date(today.getTime() + 21 * 86400000),
        description: "Lead end-to-end product design for our HR module.",
        requirements: "4+ years, Figma, design systems",
        salaryMin: 80000,
        salaryMax: 120000,
        status: "OPEN",
      },
      {
        title: "Sales Executive",
        departmentId: deptMap["Sales"].id,
        employmentType: "FULL_TIME",
        location: "Dhaka",
        vacancy: 3,
        closingDate: new Date(today.getTime() + 45 * 86400000),
        description: "Drive B2B SaaS sales across South Asia.",
        requirements: "2+ years B2B SaaS sales",
        salaryMin: 50000,
        salaryMax: 80000,
        status: "OPEN",
      },
    ],
  });

  // Candidates
  const candNames = [
    "Ayesha Siddiqua", "Mahin Rahman", "Sabbir Ahmed", "Nusrat Jahan", "Fahim Ahmed",
    "Tahsin Khan", "Mitu Akter", "Rashed Khan",
  ];
  const jobs = await db.job.findMany();
  const stages = ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW", "SELECTED", "OFFER"];
  candNames.forEach(async (name, idx) => {
    await db.candidate.create({
      data: {
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
        phone: `+880 17${String(11000000 + idx * 222222).slice(0, 8)}`,
        jobId: jobs[idx % jobs.length].id,
        experience: 1 + (idx % 6),
        skills: ["Node.js", "React", "SQL", "AWS"].slice(0, (idx % 4) + 1).join(", "),
        interviewNotes: idx % 2 === 0 ? "Strong technical round." : "Pending interview.",
        expectedSalary: 60000 + idx * 8000,
        status: stages[idx % stages.length],
      },
    });
  });

  // Performance reviews
  for (const emp of employees.slice(0, 8)) {
    const g = 60 + (Math.floor(Math.random() * 40));
    const q = 60 + (Math.floor(Math.random() * 40));
    const a = 60 + (Math.floor(Math.random() * 40));
    const t = 60 + (Math.floor(Math.random() * 40));
    const c = 60 + (Math.floor(Math.random() * 40));
    await db.performance.create({
      data: {
        employeeId: emp.id,
        reviewPeriod: "Q2 2025",
        reviewer: "Tahmina Akter",
        goals: g,
        quality: q,
        attendance: a,
        teamwork: t,
        communication: c,
        overallScore: Math.round((g + q + a + t + c) / 5),
        comments: "Consistent performer. Recommend stretch goals next quarter.",
        status: "SUBMITTED",
      },
    });
  }

  // Audit log entry
  await db.auditLog.create({
    data: {
      userId: hrUser.id,
      action: "LOGIN",
      entityType: "User",
      entityId: hrUser.id,
      description: "HR user logged in.",
      ipAddress: "127.0.0.1",
    },
  });

  console.log("✅ Seed complete.");
  console.log(`   - Company: ${company.name}`);
  console.log(`   - HR login: ${hrUser.email} / demo1234`);
  console.log(`   - Employees: ${employees.length}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
