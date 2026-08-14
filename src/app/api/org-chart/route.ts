import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Org chart tree builder.
//
// Returns a recursive tree starting from employees with no
// reportingManagerId. Each node includes its direct subordinates
// up to MAX_DEPTH levels (root = level 0).
// ============================================================

const MAX_DEPTH = 3;

interface OrgNode {
  id: string;
  employeeId: string;
  fullName: string;
  photo: string | null;
  designation: string | null;
  department: string | null;
  departmentColor: string | null;
  role: string | null;
  employmentStatus: string;
  subordinates: OrgNode[];
  subordinateCount: number;
  _depth: number;
}

export async function GET(_req: NextRequest) {
  // Load all employees with their manager + department info in a single query
  // (org charts typically have fewer than a few thousand nodes; for larger
  // orgs, a recursive CTE or cursor-paginated fetch would be more efficient).
  const employees = await db.employee.findMany({
    where: {
      // Skip resigned/terminated so the chart shows current hierarchy only.
      employmentStatus: { notIn: ["RESIGNED", "TERMINATED"] },
    },
    include: {
      department: true,
      role: true,
      designation: true,
    },
    orderBy: { joiningDate: "asc" },
  });

  // Build a lookup table keyed by employee id.
  type Emp = (typeof employees)[number];
  const byId = new Map<string, Emp>();
  for (const e of employees) byId.set(e.id, e);

  // Group employees by reportingManagerId.
  const childrenByParent = new Map<string | null, Emp[]>();
  for (const e of employees) {
    const key = e.reportingManagerId ?? null;
    const list = childrenByParent.get(key);
    if (list) list.push(e);
    else childrenByParent.set(key, [e]);
  }

  // Detect cycles defensively: if an employee's managerId points back at
  // themselves or forms a loop, treat them as a root.
  function hasCycle(emp: Emp): boolean {
    let current: Emp | undefined = emp;
    const seen = new Set<string>();
    while (current?.reportingManagerId) {
      if (seen.has(current.id)) return true;
      seen.add(current.id);
      const next = byId.get(current.reportingManagerId);
      if (!next) break;
      current = next;
    }
    return false;
  }

  // Detect orphaned managers (managerId references a non-existent employee or
  // forms a cycle) — they should be treated as roots.
  const roots: Emp[] = [];
  for (const e of employees) {
    const noManager = !e.reportingManagerId;
    const managerMissing =
      !!e.reportingManagerId && !byId.has(e.reportingManagerId);
    const cycle = hasCycle(e);
    if (noManager || managerMissing || cycle) {
      roots.push(e);
    }
  }

  // Deduplicate roots (in case a cycle made multiple employees qualify).
  const rootIds = new Set(roots.map((r) => r.id));
  const rootList = Array.from(rootIds)
    .map((id) => byId.get(id)!)
    .filter(Boolean)
    .sort((a, b) => {
      // Most senior (oldest joining date) first.
      const ta = a.joiningDate?.getTime() ?? 0;
      const tb = b.joiningDate?.getTime() ?? 0;
      return ta - tb;
    });

  function buildNode(emp: Emp, depth: number, visited: Set<string>): OrgNode | null {
    if (visited.has(emp.id)) return null;
    visited.add(emp.id);

    const children = childrenByParent.get(emp.id) ?? [];
    const subordinates: OrgNode[] = [];
    if (depth < MAX_DEPTH) {
      for (const child of children) {
        const node = buildNode(child, depth + 1, new Set(visited));
        if (node) subordinates.push(node);
      }
    }

    // Compute total descendant count (full hierarchy, ignoring MAX_DEPTH cap).
    let totalDescendants = 0;
    function countDescendants(parentId: string, seen: Set<string>) {
      const direct = childrenByParent.get(parentId) ?? [];
      for (const c of direct) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        totalDescendants += 1;
        countDescendants(c.id, seen);
      }
    }
    countDescendants(emp.id, new Set([emp.id]));

    return {
      id: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      photo: emp.photo,
      designation: emp.designation?.name ?? null,
      department: emp.department?.name ?? null,
      departmentColor: emp.department?.color ?? null,
      role: emp.role?.name ?? null,
      employmentStatus: emp.employmentStatus,
      subordinateCount: totalDescendants,
      subordinates,
      _depth: depth,
    };
  }

  const tree: OrgNode[] = [];
  for (const root of rootList) {
    const node = buildNode(root, 0, new Set());
    if (node) tree.push(node);
  }

  // Build a flat list of all nodes for the legend / search.
  const departments = new Map<string, { name: string; color: string | null; count: number }>();
  for (const e of employees) {
    const key = e.department?.name ?? "Unassigned";
    const existing = departments.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      departments.set(key, {
        name: key,
        color: e.department?.color ?? null,
        count: 1,
      });
    }
  }

  return NextResponse.json({
    tree,
    departments: Array.from(departments.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    totalEmployees: employees.length,
    totalRoots: tree.length,
    maxDepth: MAX_DEPTH,
  });
}
