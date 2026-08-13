"use client";

import { PageHeader } from "../shared/page-header";
import { EmptyState } from "../shared/empty-state";
import { ExportButton } from "../shared/export-button";
import { TrendingUp } from "lucide-react";

// PLACEHOLDER — to be replaced by the Performance module agent.
// The ExportButton is wired to /api/export?module=performance and remains
// functional even while the rest of the module is being built.
export function PerformanceModule() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Track employee goals, reviews, and ratings"
        icon={<TrendingUp className="size-5" />}
        actions={<ExportButton module="performance" filters={{}} />}
      />
      <EmptyState
        icon={TrendingUp}
        title="Performance module coming soon"
        description="This module is being built by another agent. It will include performance reviews, goal tracking, and rating history."
      />
    </div>
  );
}
