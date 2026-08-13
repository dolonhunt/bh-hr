"use client";

import { useApp } from "@/lib/store";
import { EmployeeFormDialog } from "./modules/employee-form-dialog";
import { GenerateDocumentDialog } from "./modules/generate-document-dialog";
import { BulkGenerateDialog } from "./modules/bulk-generate-dialog";
import { PayslipDialog } from "./modules/payslip-dialog";
import { AttendanceEntryDialog } from "./modules/attendance-entry-dialog";
import { LeaveEntryDialog } from "./modules/leave-entry-dialog";
import { PayrollBatchDialog } from "./modules/payroll-batch-dialog";

export function QuickActions() {
  const quickAction = useApp((s) => s.quickAction);
  const setQuickAction = useApp((s) => s.setQuickAction);

  return (
    <>
      <EmployeeFormDialog
        open={quickAction === "add-employee"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <GenerateDocumentDialog
        open={quickAction === "generate-document"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <BulkGenerateDialog
        open={quickAction === "bulk-generate"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <PayslipDialog
        open={quickAction === "create-payslip"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <PayrollBatchDialog
        open={quickAction === "payroll-batch-create"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <AttendanceEntryDialog
        open={quickAction === "add-attendance"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <LeaveEntryDialog
        open={quickAction === "add-leave"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
    </>
  );
}
