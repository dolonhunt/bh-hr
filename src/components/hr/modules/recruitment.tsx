"use client";

import { PageHeader } from "../shared/page-header";
import { EmptyState } from "../shared/empty-state";
import { ExportButton } from "../shared/export-button";
import { Briefcase } from "lucide-react";

// PLACEHOLDER — to be replaced by the Recruitment module agent.
// The ExportButton is wired to /api/export?module=candidates (Candidates tab)
// and remains functional even while the rest of the module is being built.
export function RecruitmentModule() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Manage job postings and candidate pipelines"
        icon={<Briefcase className="size-5" />}
        actions={<ExportButton module="candidates" filters={{}} />}
      />
      <EmptyState
        icon={Briefcase}
        title="Recruitment module coming soon"
        description="This module is being built by another agent. It will include job postings, candidate tracking, and interview scheduling."
      />
    </div>
  );
}
