import { db } from "@/lib/db";

// ============================================================
// Demo Data Seeder (idempotent, production-safe)
//
// Populates the operational modules that ship empty out of the
// box: Interviews, Surveys (Feedback), Expenses, Timesheets and
// Asset Maintenance. Every dataset is ONLY seeded when its
// corresponding store is empty, so running this never
// duplicates or overwrites user data. Designed to be triggered
// from Settings → Data & Backup ("Load Demo Data") or via
// POST /api/demo-data, and from the CLI seed script.
// ============================================================

export interface DemoDataResult {
  created: Record<string, number>;
  skipped: Record<string, string>;
}

const DAY = 24 * 60 * 60 * 1000;

function iso(ts: number) {
  return new Date(ts).toISOString();
}

function dateOnly(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Returns the most recent N dates ending today (inclusive), skipping Friday(5)/Saturday(6) — Bangladesh weekend. */
function recentWorkingDays(count: number): Date[] {
  const out: Date[] = [];
  let t = Date.now();
  while (out.length < count) {
    const d = new Date(t);
    const day = d.getDay(); // 5 = Fri, 6 = Sat
    if (day !== 5 && day !== 6) out.push(d);
    t -= DAY;
  }
  return out.reverse();
}

function nextWorkingDays(count: number): Date[] {
  const out: Date[] = [];
  let t = Date.now() + DAY;
  while (out.length < count) {
    const d = new Date(t);
    const day = d.getDay();
    if (day !== 5 && day !== 6) out.push(d);
    t += DAY;
  }
  return out;
}

async function seedInterviews(
  created: Record<string, number>,
  skipped: Record<string, string>
) {
  const existing = await db.activity.count({ where: { type: "INTERVIEW" } });
  if (existing > 0) {
    skipped.interviews = `${existing} already present`;
    return;
  }
  const candidates = await db.candidate.findMany({
    take: 8,
    orderBy: { appliedAt: "asc" },
  });
  if (candidates.length === 0) {
    skipped.interviews = "no candidates found";
    return;
  }
  const jobs = await db.job.findMany({ select: { id: true, title: true } });

  const upcoming = nextWorkingDays(2);
  const past = recentWorkingDays(8).slice(-6);

  const plan = [
    {
      c: candidates[0],
      when: iso(new Date(upcoming[0]).setHours(10, 30, 0, 0)),
      type: "TECHNICAL",
      status: "SCHEDULED",
      interviewer: "Saif Hossain",
      location: "HQ — Meeting Room 2",
      rating: null as number | null,
      recommendation: null as string | null,
      notes: "Focus on system design and API architecture.",
    },
    {
      c: candidates[1 % candidates.length],
      when: iso(new Date(upcoming[1]).setHours(15, 0, 0, 0)),
      type: "HR",
      status: "SCHEDULED",
      interviewer: "Tahmina Akter",
      location: "Google Meet",
      rating: null,
      recommendation: null,
      notes: "Culture fit + compensation expectations.",
    },
    {
      c: candidates[2 % candidates.length],
      when: iso(new Date(past[0]).setHours(11, 0, 0, 0)),
      type: "ONSITE",
      status: "COMPLETED",
      interviewer: "Jerin Khan",
      location: "HQ — Meeting Room 1",
      rating: 4,
      recommendation: "HIRE",
      notes: "Strong portfolio; great communication under pressure.",
    },
    {
      c: candidates[3 % candidates.length],
      when: iso(new Date(past[1]).setHours(14, 0, 0, 0)),
      type: "VIDEO",
      status: "COMPLETED",
      interviewer: "Naimur Karim",
      location: "Zoom",
      rating: 5,
      recommendation: "HIRE",
      notes: "Excellent depth in data modelling. Recommend final round.",
    },
    {
      c: candidates[4 % candidates.length],
      when: iso(new Date(past[2]).setHours(16, 0, 0, 0)),
      type: "PHONE",
      status: "COMPLETED",
      interviewer: "Lamia Sarkar",
      location: null,
      rating: 2,
      recommendation: "REJECT",
      notes: "Profile mismatch for the role scope.",
    },
    {
      c: candidates[5 % candidates.length],
      when: iso(new Date(past[3]).setHours(10, 0, 0, 0)),
      type: "FINAL",
      status: "NO_SHOW",
      interviewer: "Tahmina Akter",
      location: "HQ — Meeting Room 2",
      rating: null,
      recommendation: null,
      notes: "Candidate did not join; follow-up sent.",
    },
  ];

  for (const item of plan) {
    const c = item.c as { id: string; name?: string; jobId?: string | null };
    const candName = c.name ?? "Candidate";
    const job = c.jobId ? jobs.find((j) => j.id === c.jobId) : undefined;
    const jobTitle = job?.title ?? null;
    await db.activity.create({
      data: {
        type: "INTERVIEW",
        title: `Interview — ${candName}${jobTitle ? ` — ${jobTitle}` : ""}`,
        employeeId: null,
        description: JSON.stringify({
          candidateId: c.id,
          candidateName: candName,
          jobId: c.jobId ?? null,
          jobTitle,
          interviewerId: null,
          interviewerName: item.interviewer,
          scheduledAt: item.when,
          duration: item.type === "FINAL" ? 60 : 45,
          type: item.type,
          location: item.location,
          meetingLink: item.location === "Google Meet" ? "https://meet.google.com/bhh-hr-int" : null,
          status: item.status,
          notes: item.notes,
          rating: item.rating,
          recommendation: item.recommendation,
        }),
      },
    });
  }
  created.interviews = plan.length;
}

async function seedSurveys(
  created: Record<string, number>,
  skipped: Record<string, string>
) {
  const existing = await db.activity.count({ where: { type: "SURVEY" } });
  if (existing > 0) {
    skipped.surveys = `${existing} already present`;
    return;
  }
  const employees = await db.employee.findMany({ take: 8 });

  const engagementQs = [
    { id: "q1", text: "How satisfied are you with your current role?", type: "RATING" },
    { id: "q2", text: "How likely are you to recommend BH as a great place to work?", type: "RATING" },
    {
      id: "q3",
      text: "Which area needs the most improvement?",
      type: "SINGLE_CHOICE",
      options: ["Career growth", "Work-life balance", "Tools & equipment", "Recognition", "Communication"],
    },
    { id: "q4", text: "Any additional comments for the HR team?", type: "TEXT" },
  ];

  const remoteQs = [
    { id: "q1", text: "How productive are you when working remotely?", type: "RATING" },
    {
      id: "q2",
      text: "What is your preferred work setup?",
      type: "SINGLE_CHOICE",
      options: ["Fully remote", "Hybrid (2-3 days office)", "Mostly office"],
    },
    { id: "q3", text: "What would improve your remote experience?", type: "TEXT" },
  ];

  const now = Date.now();

  const engagement = await db.activity.create({
    data: {
      type: "SURVEY",
      title: "Q3 Employee Engagement Pulse",
      employeeId: null,
      description: JSON.stringify({
        description: "A quick 4-question pulse to understand how the team is feeling this quarter. Takes under 2 minutes — anonymous responses are reviewed by HR only.",
        status: "ACTIVE",
        createdBy: "Tahmina Akter",
        anonymous: true,
        questions: engagementQs,
      }),
    },
  });

  const remote = await db.activity.create({
    data: {
      type: "SURVEY",
      title: "Remote Work Experience Check-in",
      employeeId: null,
      description: JSON.stringify({
        description: "Help us fine-tune the hybrid policy. Your feedback shaped last year's equipment allowance — keep it coming.",
        status: "CLOSED",
        createdBy: "Tahmina Akter",
        anonymous: false,
        questions: remoteQs,
      }),
    },
  });

  await db.activity.create({
    data: {
      type: "SURVEY",
      title: "Winter Offsite Planning Survey",
      employeeId: null,
      description: JSON.stringify({
        description: "Draft — will be published once the venue shortlist is confirmed.",
        status: "DRAFT",
        createdBy: "Tahmina Akter",
        anonymous: false,
        questions: [
          { id: "q1", text: "Which location do you prefer for the offsite?", type: "SINGLE_CHOICE", options: ["Cox's Bazar", "Sylhet", "Bandarban", "Kuakata"] },
          { id: "q2", text: "Anything you'd like included in the agenda?", type: "TEXT" },
        ],
      }),
    },
  });

  // Responses for the ACTIVE engagement survey
  const ratings = [
    [4, 5, "Career growth", "Overall very positive — growth path could be clearer."],
    [5, 4, "Recognition", "Loving the new documents pipeline, saves me hours."],
    [3, 3, "Work-life balance", "Peak season is intense; a bit more breathing room would help."],
    [4, 4, "Tools & equipment", "Monitor request was approved fast, thank you!"],
    [5, 5, "Communication", "Best comms I've seen here — keep the weekly digest."],
    [2, 3, "Career growth", "Would like more training budget for certifications."],
    [4, 5, "Work-life balance", "Flexible hours are a game changer for me."],
  ];
  for (let i = 0; i < ratings.length && i < employees.length; i++) {
    const emp = employees[i];
    const [r1, r2, choice, comment] = ratings[i];
    await db.activity.create({
      data: {
        type: "SURVEY_RESPONSE",
        title: `Response — Q3 Employee Engagement Pulse`,
        employeeId: emp.id,
        description: JSON.stringify({
          surveyId: engagement.id,
          employeeId: emp.id,
          employeeName: emp.fullName,
          answers: [
            { questionId: "q1", value: r1 },
            { questionId: "q2", value: r2 },
            { questionId: "q3", value: choice },
            { questionId: "q4", value: comment },
          ],
          submittedAt: iso(now - (i + 1) * 7 * 60 * 60 * 1000),
        }),
      },
    });
  }

  // Responses for the CLOSED remote-work survey
  const remoteAnswers = [
    [4, "Hybrid (2-3 days office)", "Commute time is the biggest drain."],
    [5, "Fully remote", "No complaints — keep the async-first meetings."],
    [3, "Mostly office", "Home desk setup needs a better chair."],
    [4, "Hybrid (2-3 days office)", "Team days are the most productive ones."],
  ];
  for (let i = 0; i < remoteAnswers.length && i < employees.length; i++) {
    const emp = employees[i];
    const [r1, choice, comment] = remoteAnswers[i];
    await db.activity.create({
      data: {
        type: "SURVEY_RESPONSE",
        title: `Response — Remote Work Experience Check-in`,
        employeeId: emp.id,
        description: JSON.stringify({
          surveyId: remote.id,
          employeeId: emp.id,
          employeeName: emp.fullName,
          answers: [
            { questionId: "q1", value: r1 },
            { questionId: "q2", value: choice },
            { questionId: "q3", value: comment },
          ],
          submittedAt: iso(now - (14 + i) * DAY),
        }),
      },
    });
  }

  created.surveys = 3;
  created.surveyResponses = ratings.length + remoteAnswers.length;
}

async function seedExpenses(
  created: Record<string, number>,
  skipped: Record<string, string>
) {
  const existing = await db.activity.count({ where: { type: "EXPENSE" } });
  if (existing > 0) {
    skipped.expenses = `${existing} already present`;
    return;
  }
  const employees = await db.employee.findMany({ take: 8 });
  if (employees.length === 0) {
    skipped.expenses = "no employees found";
    return;
  }
  const now = Date.now();

  const rows = [
    { emp: 0, type: "TRAVEL", desc: "Client visit — Gulshan office, ride both ways", amount: 1250, dateOffset: 2, status: "PENDING" },
    { emp: 1, type: "MEALS", desc: "Team lunch with design sprint participants", amount: 3200, dateOffset: 3, status: "PENDING" },
    { emp: 2, type: "TRANSPORT", desc: "Airport pick-up for visiting partner", amount: 2100, dateOffset: 5, status: "PENDING" },
    { emp: 3, type: "SUPPLIES", desc: "Whiteboard markers, sticky notes & printer paper", amount: 1850, dateOffset: 6, status: "PENDING" },
    { emp: 4, type: "TRAINING", desc: "Advanced TypeScript course — self-paced", amount: 6500, dateOffset: 9, status: "APPROVED", approver: "Tahmina Akter" },
    { emp: 5, type: "ACCOMMODATION", desc: "Hotel night — Cox's Bazar sales kickoff", amount: 7800, dateOffset: 12, status: "APPROVED", approver: "Tahmina Akter" },
    { emp: 6, type: "TRAVEL", desc: "Dhaka–Chattogram bus tickets (project audit)", amount: 2400, dateOffset: 16, status: "APPROVED", approver: "Tahmina Akter" },
    { emp: 0, type: "MEALS", desc: "Client dinner — product demo evening", amount: 5400, dateOffset: 21, status: "REIMBURSED", approver: "Tahmina Akter", reimbursedAt: 15 },
    { emp: 1, type: "TRANSPORT", desc: "Monthly ride-sharing allowance", amount: 4000, dateOffset: 26, status: "REIMBURSED", approver: "Tahmina Akter", reimbursedAt: 18 },
    { emp: 2, type: "OTHER", desc: "Personal software subscription (out of policy)", amount: 990, dateOffset: 10, status: "REJECTED", approver: "Tahmina Akter", rejectReason: "Personal subscriptions are not reimbursable per policy §4.2." },
  ];

  for (const r of rows) {
    const emp = employees[r.emp % employees.length];
    const submittedAt = now - r.dateOffset * DAY;
    const meta: Record<string, unknown> = {
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeePhoto: emp.photo ?? null,
      type: r.type,
      description: r.desc,
      amount: r.amount,
      currency: "BDT",
      date: dateOnly(submittedAt),
      receipt: null,
      status: r.status,
      submittedAt: iso(submittedAt),
      approvedBy: r.status === "PENDING" ? null : (r.approver ?? null),
      approvedAt: r.status === "PENDING" ? null : iso(submittedAt + 12 * 60 * 60 * 1000),
      notes: null,
      rejectReason: r.rejectReason ?? null,
      reimbursementDate: r.reimbursedAt != null ? iso(now - r.reimbursedAt * DAY) : null,
      paymentRef: r.status === "REIMBURSED" ? `TRX-${(100000 + r.dateOffset * 137).toString(36).toUpperCase()}` : null,
    };
    await db.activity.create({
      data: {
        type: "EXPENSE",
        title: r.type,
        employeeId: emp.id,
        description: JSON.stringify(meta),
        createdAt: new Date(submittedAt),
      },
    });
  }
  created.expenses = rows.length;
}

async function seedTimesheets(
  created: Record<string, number>,
  skipped: Record<string, string>
) {
  const existing = await db.activity.count({ where: { type: "TIMESHEET" } });
  if (existing > 0) {
    skipped.timesheets = `${existing} already present`;
    return;
  }
  const employees = await db.employee.findMany({ take: 6 });
  if (employees.length === 0) {
    skipped.timesheets = "no employees found";
    return;
  }

  const projects = [
    { id: "proj-web", name: "Website Redesign" },
    { id: "proj-mobile", name: "Mobile App v2" },
    { id: "proj-brand", name: "Brand Campaign 2026" },
    { id: "proj-internal", name: "Internal Tools" },
  ];

  const tasks = [
    "Sprint work & implementation",
    "Code review + bug triage",
    "Client call & requirements notes",
    "Design QA and asset exports",
    "Documentation and handover",
    "Weekly planning and standups",
  ];

  const days = recentWorkingDays(6); // ~last week + this week
  const now = Date.now();
  let count = 0;

  for (let d = 0; d < days.length; d++) {
    const day = days[d];
    const dayTs = day.getTime();
    for (let e = 0; e < employees.length; e++) {
      const emp = employees[e];
      const project = projects[(d + e) % projects.length];
      const task = tasks[(d * 2 + e) % tasks.length];
      const hours = [7, 8, 8.5, 6, 9, 7.5, 8][(d + e) % 7];

      // Status heuristic: older days are APPROVED, mid days SUBMITTED,
      // the most recent working day is DRAFT for some employees.
      let status: "DRAFT" | "SUBMITTED" | "APPROVED" = "APPROVED";
      if (d >= days.length - 2) status = "SUBMITTED";
      if (d === days.length - 1 && e % 2 === 0) status = "DRAFT";

      const meta: Record<string, unknown> = {
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeePhoto: emp.photo ?? null,
        projectId: project.id,
        projectName: project.name,
        task,
        date: dateOnly(dayTs),
        hours,
        description: null,
        status,
        submittedAt:
          status === "DRAFT"
            ? null
            : iso(Math.min(dayTs + 9 * 60 * 60 * 1000, now - 60 * 60 * 1000)),
        approvedBy: status === "APPROVED" ? "Tahmina Akter" : null,
        approvedAt: status === "APPROVED" ? iso(Math.min(dayTs + 2 * DAY, now)) : null,
        rejectReason: null,
      };

      await db.activity.create({
        data: {
          type: "TIMESHEET",
          title: project.name,
          employeeId: emp.id,
          description: JSON.stringify(meta),
          createdAt: new Date(Math.min(dayTs + 9 * 60 * 60 * 1000, now)),
        },
      });
      count++;
    }
  }
  created.timesheets = count;
}

async function seedAssetMaintenance(
  created: Record<string, number>,
  skipped: Record<string, string>
) {
  const existing = await db.activity.count({ where: { type: "ASSET_MAINTENANCE" } });
  if (existing > 0) {
    skipped.assetMaintenance = `${existing} already present`;
    return;
  }
  const assets = await db.activity.findMany({ where: { type: "ASSET" } });
  if (assets.length === 0) {
    skipped.assetMaintenance = "no assets found";
    return;
  }
  const byName = (needle: string) =>
    assets.find((a) => a.title?.toLowerCase().includes(needle));

  const now = Date.now();
  const pick = [
    { needle: "webcam", type: "REPAIR", desc: "Autofocus motor failure — replaced focusing module", cost: 1800, vendor: "TechFix BD", status: "IN_PROGRESS", daysAgo: 2 },
    { needle: "macbook pro 16", type: "INSPECTION", desc: "Annual hardware inspection & thermal paste service", cost: 1500, vendor: "Apple Premium Reseller, Bashundhara", status: "COMPLETED", daysAgo: 20 },
    { needle: "standing desk", type: "MAINTENANCE", desc: "Lift column squeak — lubrication and bolt re-torque", cost: 800, vendor: "ErgoBD Service", status: "SCHEDULED", daysAgo: -4 },
    { needle: "iphone 15", type: "REPLACEMENT", desc: "Battery replaced under AppleCare (86% health)", cost: 8900, vendor: "Apple Authorized Service", status: "COMPLETED", daysAgo: 35 },
    { needle: "dell monitor", type: "UPGRADE", desc: "VESA arm installed for dual-monitor ergonomics", cost: 2600, vendor: "Office Solutions Ltd", status: "COMPLETED", daysAgo: 12 },
  ];

  let n = 0;
  for (const p of pick) {
    const asset = byName(p.needle);
    if (!asset) continue;
    const meta = (() => {
      try {
        return JSON.parse(asset.description ?? "{}");
      } catch {
        return {} as any;
      }
    })();
    const start = now - p.daysAgo * DAY;
    await db.activity.create({
      data: {
        type: "ASSET_MAINTENANCE",
        title: asset.id, // join key back to the asset
        employeeId: null,
        description: JSON.stringify({
          assetId: asset.id,
          assetName: meta.name ?? asset.title,
          type: p.type,
          description: p.desc,
          cost: p.cost,
          vendor: p.vendor,
          startDate: iso(start),
          endDate:
            p.status === "COMPLETED" ? iso(start + 2 * DAY) : null,
          status: p.status,
          notes: null,
        }),
        createdAt: new Date(start),
      },
    });
    n++;
  }
  if (n === 0) {
    skipped.assetMaintenance = "no matching assets";
    return;
  }
  created.assetMaintenance = n;
}

export async function ensureDemoData(): Promise<DemoDataResult> {
  const created: Record<string, number> = {};
  const skipped: Record<string, string> = {};

  await seedInterviews(created, skipped);
  await seedSurveys(created, skipped);
  await seedExpenses(created, skipped);
  await seedTimesheets(created, skipped);
  await seedAssetMaintenance(created, skipped);

  return { created, skipped };
}
