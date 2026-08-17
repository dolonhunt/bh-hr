import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== "bh-hr-setup-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const userCount = await db.user.count();
    if (userCount > 0) {
      return NextResponse.json({ status: "already-seeded", userCount });
    }
    const company = await db.company.create({ data: { name: "BH", legalName: "Beyond Headlines", address: "14 Garden Road, Level 5", city: "Dhaka", state: "Dhaka", country: "Bangladesh", zipCode: "1213", email: "hr@beyondheadlines.io", phone: "+880 1700-000000", website: "https://beyondheadlines.io", logo: "/bh-logo.png", taxId: "TIN-9988776655" } });
    const hrUser = await db.user.create({ data: { email: "hr@beyondheadlines.io", name: "Tahmina Akter", password: "demo1234", role: "HR_ADMIN" } });
    const deptData = [{ name: "Human Resources", color: "#0D5C5A" },{ name: "Engineering", color: "#5A8AAF" },{ name: "Product", color: "#C49450" },{ name: "Design", color: "#8B5CF6" },{ name: "Sales", color: "#C75450" },{ name: "Marketing", color: "#EC4899" },{ name: "Finance", color: "#4A8B6F" },{ name: "Operations", color: "#6B7280" }];
    const departments = [];
    for (const d of deptData) { departments.push(await db.department.create({ data: d })); }
    const roleData = [{ name: "Editor" },{ name: "Senior Executive" },{ name: "Executive" },{ name: "IT Support" },{ name: "Accountant" },{ name: "HR Executive" },{ name: "Software Engineer" },{ name: "Senior Software Engineer" },{ name: "Product Manager" },{ name: "UX Designer" },{ name: "Sales Executive" },{ name: "Marketing Lead" }];
    const roles = [];
    for (const r of roleData) { roles.push(await db.role.create({ data: r })); }
    const desigData = [{ name: "Junior Associate" },{ name: "Associate" },{ name: "Senior Associate" },{ name: "Lead" },{ name: "Manager" },{ name: "Senior Manager" },{ name: "Director" }];
    const designations = [];
    for (const d of desigData) { designations.push(await db.designation.create({ data: d })); }
    const ltData = [{ name: "Annual Leave", code: "AL", defaultDays: 20, paid: true, color: "#0D5C5A" },{ name: "Casual Leave", code: "CL", defaultDays: 10, paid: true, color: "#5A8AAF" },{ name: "Sick Leave", code: "SL", defaultDays: 12, paid: true, color: "#C49450" },{ name: "Maternity Leave", code: "ML", defaultDays: 84, paid: true, color: "#EC4899" },{ name: "Paternity Leave", code: "PL", defaultDays: 7, paid: true, color: "#8B5CF6" },{ name: "Unpaid Leave", code: "UL", defaultDays: 30, paid: false, color: "#6B7280" },{ name: "Other", code: "OT", defaultDays: 5, paid: false, color: "#4A8B6F" }];
    for (const lt of ltData) { await db.leaveType.create({ data: lt }); }
    const firstNames = ["Arif","Nadia","Rakib","Sumaiya","Tanvir","Farhana","Imran","Maliha","Sajid","Rumana","Hasan","Tania","Rifat","Sadia","Naimur","Lamia","Saif","Jerin","Rashed","Priya"];
    const lastNames = ["Hossain","Rahman","Ahmed","Khan","Islam","Chowdhury","Karim","Akter","Begum","Sarkar","Das","Roy"];
    const today = new Date();
    for (let i = 0; i < 20; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 3) % lastNames.length];
      const dept = departments[i % departments.length];
      const role = roles[(i * 2) % roles.length];
      const desig = designations[i % designations.length];
      const joiningDate = new Date(today); joiningDate.setDate(joiningDate.getDate() - (i + 1) * 30);
      const basic = 35000 + i * 3500;
      await db.employee.create({ data: { employeeId: `EMP${String(i + 1).padStart(3, "0")}`, fullName: `${fn} ${ln}`, firstName: fn, lastName: ln, dateOfBirth: new Date(1990 + (i % 12), (i * 5) % 12, (i * 7) % 28 + 1), gender: i % 3 === 0 ? "FEMALE" : "MALE", phone: `+880 17${String(10000000 + i * 123456).slice(0, 8)}`, personalEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`, officialEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}@beyondheadlines.io`, address: `House ${10 + i}, Road ${5 + (i % 7)}, Block C`, city: "Dhaka", state: "Dhaka", country: "Bangladesh", zipCode: "1212", emergencyContactName: `${ln} Parent`, emergencyContactPhone: `+880 18${String(10000000 + i * 654321).slice(0, 8)}`, emergencyRelation: i % 2 === 0 ? "Parent" : "Spouse", departmentId: dept.id, roleId: role.id, designationId: desig.id, employmentType: i % 5 === 0 ? "PROBATION" : "FULL_TIME", joiningDate, confirmationDate: i % 5 === 0 ? null : new Date(joiningDate.getTime() + 180 * 86400000), employmentStatus: "ACTIVE", workLocation: i % 4 === 0 ? "Remote" : "HQ - Dhaka", basicSalary: basic, allowances: Math.round(basic * 0.35), deductions: Math.round(basic * 0.03), tax: Math.round(basic * 0.05), bankName: i % 2 === 0 ? "BRAC Bank" : "Dutch-Bangla Bank", bankAccount: `1${String(2000000000 + i * 123456789).slice(0, 9)}`, bankIfsc: i % 2 === 0 ? "BACBBDBD" : "DBBLBDDH", paymentMethod: "BANK_TRANSFER" } });
    }
    const todayOnly = new Date(); todayOnly.setHours(0, 0, 0, 0);
    const allEmployees = await db.employee.findMany();
    for (let i = 0; i < allEmployees.length; i++) {
      const emp = allEmployees[i]; const seed = i % 10;
      const status = seed === 0 ? "LEAVE" : seed === 1 ? "ABSENT" : seed === 2 ? "LATE" : "PRESENT";
      const checkIn = new Date(todayOnly); checkIn.setHours(9, status === "LATE" ? 25 + (i % 30) : 5 + (i % 20), 0, 0);
      const checkOut = new Date(todayOnly); checkOut.setHours(18, (i * 3) % 50, 0, 0);
      const wh = (checkOut.getTime() - checkIn.getTime()) / 3600000;
      await db.attendance.create({ data: { employeeId: emp.id, date: todayOnly, checkIn: status === "LEAVE" || status === "ABSENT" ? null : checkIn, checkOut: status === "LEAVE" || status === "ABSENT" ? null : checkOut, workingHours: status === "LEAVE" || status === "ABSENT" ? 0 : wh, late: status === "LATE", lateMinutes: status === "LATE" ? 25 + (i % 30) : 0, overtime: wh > 9 ? wh - 9 : 0, status } });
    }
    const leaveTypes = await db.leaveType.findMany();
    for (let i = 0; i < 12; i++) {
      const emp = allEmployees[i % allEmployees.length]; const lt = leaveTypes[i % leaveTypes.length];
      const start = new Date(todayOnly); start.setDate(start.getDate() + (i - 5));
      const end = new Date(start); end.setDate(end.getDate() + 1 + (i % 3));
      const days = (end.getTime() - start.getTime()) / 86400000 + 1;
      await db.leaveRequest.create({ data: { employeeId: emp.id, leaveTypeId: lt.id, startDate: start, endDate: end, days, reason: i % 3 === 0 ? "Family emergency" : i % 3 === 1 ? "Medical" : "Personal", status: i % 4 === 0 ? "PENDING" : i % 4 === 1 ? "APPROVED" : i % 4 === 2 ? "REJECTED" : "APPROVED", approverId: hrUser.id, decidedAt: i % 4 === 0 ? null : new Date() } });
    }
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    for (const emp of allEmployees.slice(0, 18)) {
      const net = emp.basicSalary + emp.allowances - emp.deductions - emp.tax;
      await db.payroll.create({ data: { employeeId: emp.id, payrollMonth: month, basicSalary: emp.basicSalary, allowances: emp.allowances, deductions: emp.deductions, tax: emp.tax, netSalary: net, paymentDate: new Date(), status: emp.employmentType === "PROBATION" ? "DRAFT" : "PAID" } });
    }
    const templates = [
      { name: "Appointment Letter", code: "APPT", type: "APPOINTMENT", category: "EMPLOYMENT", subject: "Appointment Letter - {{employee.name}}", content: `<h2>{{company.name}}</h2><p>{{company.address}}</p><hr/><h3>Appointment Letter</h3><p>Document No: <strong>{{document.number}}</strong></p><p>Date: <strong>{{document.date}}</strong></p><p>Dear {{employee.name}},</p><p>We are pleased to confirm your appointment as <strong>{{employee.designation}}</strong> at {{company.name}}, effective <strong>{{employee.joining_date}}</strong>.</p><p>Basic salary: <strong>{{employee.salary}}</strong></p><br/><p>Sincerely,<br/>HR Department<br/>{{company.name}}</p>`, emailSubject: "Your Appointment Letter - {{company.name}}", emailBody: "Dear {{employee.name}},\n\nPlease find attached your appointment letter.\n\nRegards,\nHR Team", status: "ACTIVE", version: "1.0", createdBy: hrUser.id },
      { name: "Offer Letter", code: "OFFER", type: "OFFER", category: "EMPLOYMENT", subject: "Offer Letter - {{employee.name}}", content: `<h2>{{company.name}}</h2><hr/><h3>Offer of Employment</h3><p>Ref: {{document.number}}</p><p>Dear {{employee.name}},</p><p>We offer you the position of <strong>{{employee.designation}}</strong> in {{employee.department}}.</p><p>Joining: <strong>{{employee.joining_date}}</strong>, Salary: <strong>{{employee.salary}}</strong></p><br/><p>HR Team<br/>{{company.name}}</p>`, emailSubject: "Job Offer from {{company.name}}", emailBody: "Dear {{employee.name}},\n\nCongratulations! Please find attached your offer letter.\n\nRegards,\nHR Team", status: "ACTIVE", version: "1.0", createdBy: hrUser.id },
      { name: "Payslip Template", code: "PAYSLIP", type: "PAYSLIP", category: "SALARY", subject: "Payslip - {{payroll.month}}", content: `<h2>{{company.name}}</h2><hr/><h3>Salary Slip</h3><table border="1" cellpadding="6"><tr><td><strong>Employee</strong></td><td>{{employee.name}}</td><td><strong>ID</strong></td><td>{{employee.id}}</td></tr><tr><td><strong>Pay Period</strong></td><td>{{payroll.month}}</td><td><strong>Date</strong></td><td>{{document.date}}</td></tr></table><br/><table border="1" cellpadding="6"><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr><tr><td>Basic</td><td>{{payroll.basic_salary}}</td><td>Tax</td><td>{{payroll.tax}}</td></tr><tr><td>Allowances</td><td>{{payroll.allowances}}</td><td>Deductions</td><td>{{payroll.deductions}}</td></tr><tr><td colspan="2"></td><td><strong>Net</strong></td><td><strong>{{payroll.net_salary}}</strong></td></tr></table>`, emailSubject: "Your Payslip for {{payroll.month}}", emailBody: "Dear {{employee.name}},\n\nPlease find attached your payslip for {{payroll.month}}.\n\nRegards,\nHR Team", status: "ACTIVE", version: "1.0", createdBy: hrUser.id },
      { name: "Experience Certificate", code: "EXP", type: "EXPERIENCE", category: "HR", subject: "Experience Certificate - {{employee.name}}", content: `<h2>{{company.name}}</h2><hr/><h3>Experience Certificate</h3><p>Ref: {{document.number}}</p><p>This certifies that <strong>{{employee.name}}</strong> ({{employee.id}}) was employed as <strong>{{employee.designation}}</strong> in {{employee.department}} from <strong>{{employee.joining_date}}</strong>.</p><br/><p>HR Department<br/>{{company.name}}</p>`, emailSubject: "Your Experience Certificate", emailBody: "Dear {{employee.name}},\n\nPlease find attached your experience certificate.\n\nRegards,\nHR Team", status: "ACTIVE", version: "1.0", createdBy: hrUser.id },
      { name: "Leave Approval Letter", code: "LA", type: "LEAVE_APPROVAL", category: "LEAVE", subject: "Leave Approval - {{employee.name}}", content: `<h2>{{company.name}}</h2><hr/><h3>Leave Approval</h3><p>Ref: {{document.number}}</p><p>Dear {{employee.name}},</p><p>Your leave request has been <strong>approved</strong>.</p><br/><p>HR Team<br/>{{company.name}}</p>`, emailSubject: "Leave Approved", emailBody: "Dear {{employee.name}},\n\nYour leave has been approved.\n\nRegards,\nHR Team", status: "ACTIVE", version: "1.0", createdBy: hrUser.id },
    ];
    for (const t of templates) { await db.documentTemplate.create({ data: t as any }); }
    await db.documentNumbering.create({ data: { name: "Default", pattern: "{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}", prefix: "BH", padding: 4, nextSeq: 1 } });
    await db.emailSetting.create({ data: { senderName: "BH HR", senderEmail: "hr@beyondheadlines.io", smtpHost: "smtp.gmail.com", smtpPort: 587, encryption: "TLS", isDefault: true } });
    const deptMap = Object.fromEntries(departments.map(d => [d.name, d]));
    await db.job.createMany({ data: [{ title: "Senior Backend Engineer", departmentId: deptMap["Engineering"]?.id ?? null, employmentType: "FULL_TIME", location: "Dhaka", vacancy: 2, closingDate: new Date(Date.now() + 30 * 86400000), description: "Scale our payments platform.", requirements: "5+ years Node.js", salaryMin: 120000, salaryMax: 180000, status: "OPEN" },{ title: "Product Designer", departmentId: deptMap["Design"]?.id ?? null, employmentType: "FULL_TIME", location: "Remote", vacancy: 1, closingDate: new Date(Date.now() + 21 * 86400000), description: "Lead product design.", requirements: "4+ years Figma", salaryMin: 80000, salaryMax: 120000, status: "OPEN" },{ title: "Sales Executive", departmentId: deptMap["Sales"]?.id ?? null, employmentType: "FULL_TIME", location: "Dhaka", vacancy: 3, closingDate: new Date(Date.now() + 45 * 86400000), description: "Drive B2B sales.", requirements: "2+ years sales", salaryMin: 50000, salaryMax: 80000, status: "OPEN" }] });
    await db.auditLog.create({ data: { userId: hrUser.id, action: "SETUP", entityType: "System", entityId: "setup", description: "Database setup completed via /api/setup", ipAddress: "127.0.0.1" } });
    return NextResponse.json({ status: "success", message: "Database seeded! Company: BH, User: hr@beyondheadlines.io, Employees: 20, Templates: 5" });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
