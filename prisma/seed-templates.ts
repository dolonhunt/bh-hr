// Seed additional document templates.
// Adds 10 new HR document templates (Promotion, Transfer, Warning, Show Cause,
// Salary Certificate, Increment, Resignation Acceptance, Relieving, NOC,
// Employment Certificate) to the existing DocumentTemplate table.
//
// Idempotent: if a template with the same code already exists, it is updated
// instead of duplicated.
//
// Run with: bun run prisma/seed-templates.ts
import { db } from "../src/lib/db";

type TemplateInput = {
  name: string;
  code: string;
  type: string;
  category: string;
  subject: string;
  content: string;
  emailSubject: string;
  emailBody: string;
  status?: string;
  version?: string;
};

const TEMPLATES: TemplateInput[] = [
  // 1. Promotion Letter
  {
    name: "Promotion Letter",
    code: "PROMO",
    type: "PROMOTION",
    category: "HR",
    subject: "Promotion Letter - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<p>Email: {{company.email}} | Phone: {{company.phone}}</p>
<hr/>
<h3>Promotion Letter</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>We are delighted to inform you that, in recognition of your outstanding performance and contributions to {{company.name}}, you have been <strong>promoted</strong> to the role of <strong>{{employee.role}}</strong> in the {{employee.department}} department.</p>
<p>This promotion is effective from <strong>{{employee.confirmation_date}}</strong>. Your revised compensation and benefits will be communicated separately by the HR team.</p>
<p>We congratulate you on this well-deserved recognition and look forward to your continued success at {{company.name}}.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
    emailSubject: "Promotion at {{company.name}} - {{employee.name}}",
    emailBody: `Dear {{employee.name}},\n\nCongratulations! Please find attached your promotion letter ({{document.number}}) dated {{document.date}}.\n\nWe look forward to your continued contributions.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 2. Transfer Letter
  {
    name: "Transfer Letter",
    code: "TRANS",
    type: "TRANSFER",
    category: "HR",
    subject: "Transfer Letter - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Transfer Letter</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>This is to inform you that, in the interest of the company's operations, you have been <strong>transferred</strong> from your current department to a new role in the {{employee.department}} department effective from <strong>{{employee.confirmation_date}}</strong>.</p>
<p>Your employment terms and conditions remain unchanged unless otherwise communicated in writing. Please report to the new department head on the effective date for further instructions.</p>
<p>We appreciate your cooperation and wish you the best in your new assignment.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
    emailSubject: "Transfer Notification - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nPlease find attached your transfer letter ({{document.number}}) dated {{document.date}}.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 3. Warning Letter
  {
    name: "Warning Letter",
    code: "WARN",
    type: "WARNING",
    category: "HR",
    subject: "Warning Letter - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Warning Letter</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>This letter serves as a <strong>formal written warning</strong> regarding your recent conduct, which is inconsistent with the company's policies and expected standards of professional behaviour.</p>
<p>The company takes such matters seriously. We expect an immediate and sustained improvement. Any recurrence may result in further disciplinary action, up to and including termination of employment.</p>
<p>You are advised to treat this as a serious matter and ensure compliance with company policies going forward.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
    emailSubject: "Warning Letter - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nA formal warning letter ({{document.number}}) dated {{document.date}} has been issued. Please find it attached.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 4. Show Cause Notice
  {
    name: "Show Cause Notice",
    code: "SCN",
    type: "SHOW_CAUSE",
    category: "HR",
    subject: "Show Cause Notice - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Show Cause Notice</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>The company has received a report regarding your recent conduct/performance that, if substantiated, may amount to a violation of company policy. You are hereby called upon to <strong>show cause</strong> in writing within <strong>three (3) working days</strong> from the date of this notice as to why disciplinary action should not be taken against you.</p>
<p>Your explanation should include all relevant facts and supporting documents. Failure to respond within the stipulated time will be treated as <em>no response</em>, and the company may proceed to take appropriate action on the basis of available records.</p>
<p>Please treat this matter with the seriousness it deserves.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
    emailSubject: "Show Cause Notice - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nA show cause notice ({{document.number}}) dated {{document.date}} has been issued to you. Please find it attached and respond within the stipulated time.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 5. Salary Certificate
  {
    name: "Salary Certificate",
    code: "SALC",
    type: "SALARY_CERT",
    category: "SALARY",
    subject: "Salary Certificate - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<p>Email: {{company.email}} | Phone: {{company.phone}}</p>
<hr/>
<h3>Salary Certificate</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To Whom It May Concern,</p>
<p>This is to certify that <strong>{{employee.name}}</strong> (Employee ID: {{employee.id}}) is a regular employee of {{company.name}}, currently holding the position of <strong>{{employee.designation}}</strong> in the {{employee.department}} department since <strong>{{employee.joining_date}}</strong>.</p>
<p>The current monthly salary breakdown of the employee is as follows:</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;">
<tr><th>Description</th><th>Amount</th></tr>
<tr><td>Basic Salary</td><td>{{employee.salary}}</td></tr>
<tr><td>Allowances</td><td>{{payroll.allowances}}</td></tr>
<tr><td>Deductions</td><td>{{payroll.deductions}}</td></tr>
<tr><td><strong>Net Monthly Salary</strong></td><td><strong>{{payroll.net_salary}}</strong></td></tr>
</table>
<br/>
<p>This certificate is issued at the request of the employee for official purposes only and carries no financial liability on the part of {{company.name}}.</p>
<br/>
<p>For {{company.name}},</p>
<p><strong>HR Department</strong></p>`,
    emailSubject: "Salary Certificate - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nPlease find attached your salary certificate ({{document.number}}) dated {{document.date}}.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 6. Increment Letter
  {
    name: "Increment Letter",
    code: "INCR",
    type: "INCREMENT",
    category: "SALARY",
    subject: "Increment Letter - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Salary Increment Letter</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>We are pleased to inform you that, based on your performance review, the management has approved a salary revision for you. Effective from <strong>{{employee.confirmation_date}}</strong>, your revised monthly basic salary will be <strong>{{employee.salary}}</strong>.</p>
<p>The revised compensation structure, including allowances and deductions, will be reflected in your upcoming payslip. All other terms of your employment remain unchanged.</p>
<p>We appreciate your hard work and look forward to your continued contribution to {{company.name}}.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
    emailSubject: "Salary Increment - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nGood news! Your salary has been revised. Please find attached your increment letter ({{document.number}}) dated {{document.date}}.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 7. Resignation Acceptance
  {
    name: "Resignation Acceptance",
    code: "RESIG",
    type: "RESIGN_ACCEPT",
    category: "SEPARATION",
    subject: "Resignation Acceptance - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Resignation Acceptance</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To,</p>
<p><strong>{{employee.name}}</strong></p>
<p>Employee ID: {{employee.id}}</p>
<p>{{employee.designation}}, {{employee.department}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>We acknowledge receipt of your resignation letter dated {{document.date}}. The management has <strong>accepted</strong> your resignation, and you will be relieved from your duties at the close of business on <strong>{{employee.confirmation_date}}</strong>, which will be your last working day.</p>
<p>You are requested to complete the handover of all company property, documents, and ongoing assignments to your reporting manager before your last working day. The full and final settlement will be processed as per company policy.</p>
<p>We thank you for your contributions to {{company.name}} and wish you the very best in your future endeavours.</p>
<br/>
<p>Sincerely,</p>
<p><strong>HR Department</strong><br/>{{company.name}}</p>`,
    emailSubject: "Resignation Accepted - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nYour resignation has been accepted. Please find attached the formal acceptance letter ({{document.number}}) dated {{document.date}}.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 8. Relieving Letter
  {
    name: "Relieving Letter",
    code: "REL",
    type: "RELIEVING",
    category: "SEPARATION",
    subject: "Relieving Letter - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Relieving Letter</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To Whom It May Concern,</p>
<p>This is to certify that <strong>{{employee.name}}</strong> (Employee ID: {{employee.id}}) was employed with {{company.name}} as <strong>{{employee.designation}}</strong> in the {{employee.department}} department from <strong>{{employee.joining_date}}</strong> to <strong>{{employee.confirmation_date}}</strong>.</p>
<p>The employee has been <strong>relieved</strong> from their duties with effect from the close of business on <strong>{{employee.confirmation_date}}</strong>, having duly completed all handover and clearance formalities as per company policy.</p>
<p>We wish {{employee.name}} all the best in their future endeavours.</p>
<br/>
<p>For {{company.name}},</p>
<p><strong>HR Department</strong></p>`,
    emailSubject: "Relieving Letter - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nPlease find attached your relieving letter ({{document.number}}) dated {{document.date}}.\n\nWe wish you all the best.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 9. NOC
  {
    name: "No Objection Certificate",
    code: "NOC",
    type: "NOC",
    category: "HR",
    subject: "No Objection Certificate - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>No Objection Certificate</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To Whom It May Concern,</p>
<p>This is to certify that <strong>{{employee.name}}</strong> (Employee ID: {{employee.id}}) is currently employed with {{company.name}} as <strong>{{employee.designation}}</strong> in the {{employee.department}} department since <strong>{{employee.joining_date}}</strong>.</p>
<p>This No Objection Certificate is issued at the request of the employee. The company has <strong>no objection</strong> to {{employee.name}} pursuing the purpose for which this certificate has been requested, including but not limited to visa processing, higher studies, or other personal requirements.</p>
<p>This certificate does not create any financial or legal obligation on the part of {{company.name}} and is valid for a period of sixty (60) days from the date of issue.</p>
<br/>
<p>For {{company.name}},</p>
<p><strong>HR Department</strong></p>`,
    emailSubject: "No Objection Certificate - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nPlease find attached your No Objection Certificate ({{document.number}}) dated {{document.date}}.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
  // 10. Employment Certificate
  {
    name: "Employment Certificate",
    code: "EMPC",
    type: "EMPLOYMENT_CERT",
    category: "HR",
    subject: "Employment Certificate - {{employee.name}}",
    content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<p>Email: {{company.email}} | Phone: {{company.phone}}</p>
<hr/>
<h3>Employment Certificate</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>To Whom It May Concern,</p>
<p>This is to certify that <strong>{{employee.name}}</strong> (Employee ID: {{employee.id}}) is a confirmed, full-time employee of {{company.name}}, currently serving as <strong>{{employee.designation}}</strong> in the {{employee.department}} department.</p>
<p>The employee joined the organisation on <strong>{{employee.joining_date}}</strong> and was confirmed in service on <strong>{{employee.confirmation_date}}</strong>. The employee's current employment status is <strong>active</strong> as of the date of this certificate.</p>
<p>This certificate is issued at the request of the employee for official purposes only.</p>
<br/>
<p>For {{company.name}},</p>
<p><strong>HR Department</strong></p>`,
    emailSubject: "Employment Certificate - {{company.name}}",
    emailBody: `Dear {{employee.name}},\n\nPlease find attached your employment certificate ({{document.number}}) dated {{document.date}}.\n\nRegards,\nHR Team\n{{company.name}}`,
  },
];

async function main() {
  console.log("📜 Seeding additional document templates...");

  const hrUser = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const createdBy = hrUser?.id ?? null;

  let created = 0;
  let updated = 0;

  for (const t of TEMPLATES) {
    const existing = await db.documentTemplate.findUnique({
      where: { code: t.code },
    });
    const data = {
      name: t.name,
      code: t.code,
      type: t.type,
      category: t.category,
      subject: t.subject,
      content: t.content,
      emailSubject: t.emailSubject,
      emailBody: t.emailBody,
      status: t.status ?? "ACTIVE",
      version: t.version ?? "1.0",
      createdBy,
    };
    if (existing) {
      await db.documentTemplate.update({ where: { id: existing.id }, data });
      updated += 1;
      console.log(`   ↻ Updated ${t.code} (${t.name})`);
    } else {
      await db.documentTemplate.create({ data });
      created += 1;
      console.log(`   + Created ${t.code} (${t.name})`);
    }
  }

  console.log(`✅ Done. Created ${created}, updated ${updated} template(s).`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
