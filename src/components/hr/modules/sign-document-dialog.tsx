"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Stamp,
  PenLine,
  Type,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/store";
import { SignaturePad } from "../shared/signature-pad";
import { cn } from "@/lib/utils";

// =============================================================
// SignDocumentDialog
//
// Lets HR add a digital signature to a generated document (offer
// letter, appointment letter, etc.) so the document becomes official.
//
// Signature method toggle:
//   "Draw Signature" — uses the canvas SignaturePad component.
//   "Type Name"      — uses the signer name rendered in a cursive font.
//
// On sign → POST /api/documents/[id]/sign
//   Body: { signerName, signerTitle, signatureData?, reason? }
//   The backend appends a signature block to the document's HTML content,
//   sets status to "ISSUED" (signed = issued/finalized), and writes
//   an AuditLog entry (action="DOCUMENT_SIGNED").
// =============================================================

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
  onSigned?: () => void;
}

type SignatureMethod = "draw" | "type";

export function SignDocumentDialog({
  open,
  onOpenChange,
  documentId,
  onSigned,
}: Props) {
  const qc = useQueryClient();
  const authUser = useApp((s) => s.authUser);

  const [method, setMethod] = useState<SignatureMethod>("draw");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("HR Manager");
  const [reason, setReason] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [signing, setSigning] = useState(false);

  // Load the document to display its info + check current status.
  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => fetch(`/api/documents/${documentId}`).then((r) => r.json()),
    enabled: open && !!documentId,
  });

  // Pre-fill signer name from the logged-in user.
  useEffect(() => {
    if (!open) return;
    setSignerName(authUser?.name ?? "");
  }, [open, authUser]);

  // Reset transient state when the dialog closes.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMethod("draw");
        setSignatureData("");
        setReason("");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleSign() {
    if (!signerName.trim()) {
      toast.error("Signer name is required.");
      return;
    }
    if (!signerTitle.trim()) {
      toast.error("Signer title is required.");
      return;
    }
    if (method === "draw" && !signatureData) {
      toast.error("Please draw your signature and click Done.");
      return;
    }

    setSigning(true);
    try {
      const r = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          signatureData: method === "draw" ? signatureData : undefined,
          reason: reason.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to sign document");
      }
      const data = await r.json();
      toast.success(
        `Document signed and issued. Verification: ${data.shortHash ?? ""}`
      );
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onSigned?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Sign failed");
    } finally {
      setSigning(false);
    }
  }

  const docNumber = doc?.documentNumber ?? "—";
  const docType = doc?.type?.replace(/_/g, " ") ?? "—";
  const docTitle = doc?.title ?? "—";
  const employeeName = doc?.employee?.fullName ?? "—";
  const currentStatus = doc?.status;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="size-5 text-primary" />
            Sign &amp; Issue Document
          </DialogTitle>
          <DialogDescription>
            Add a digital signature to make this document official. The document
            will be marked as ISSUED and its content locked.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Document info */}
          <div className="rounded-md border border-border bg-muted/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Document No.
              </div>
              <div className="font-mono font-medium truncate">{docNumber}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Type
              </div>
              <div className="font-medium truncate">{docType}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Employee
              </div>
              <div className="font-medium truncate">{employeeName}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </div>
              <div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {currentStatus}
                </Badge>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="size-3.5 animate-spin" />
              Loading document…
            </div>
          )}

          {/* Signer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Signer Name *
              </Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Signer Title *
              </Label>
              <Input
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g. HR Manager"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Reason (optional)
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Approved for issue"
            />
          </div>

          {/* Signature method toggle */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Signature Method
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("draw")}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  method === "draw"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                )}
              >
                <PenLine className="size-4" />
                Draw Signature
              </button>
              <button
                type="button"
                onClick={() => setMethod("type")}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  method === "type"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Type className="size-4" />
                Type Name
              </button>
            </div>
          </div>

          {/* Signature input */}
          {method === "draw" ? (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Draw Your Signature
              </Label>
              <SignaturePad
                onChange={(data) => setSignatureData(data)}
                className="w-full"
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Typed Signature Preview
              </Label>
              <div className="rounded-md border border-border bg-white p-4 min-h-[120px] flex items-center justify-center">
                <div
                  className="text-4xl text-[#1a1a1a]"
                  style={{
                    fontFamily:
                      "'Brush Script MT', 'Lucida Handwriting', cursive, serif",
                    transform: "rotate(-2deg)",
                    display: "inline-block",
                  }}
                >
                  {signerName.trim() || "Your Name"}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                The typed signer name will be rendered in a cursive font in the
                final document.
              </p>
            </div>
          )}

          {/* Verification info */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-800">
              <div className="font-medium">Tamper-evident signature</div>
              <div className="mt-0.5 text-emerald-700/80">
                A SHA-256 verification hash of the document content + signer +
                date is embedded in the signature block. Anyone can verify the
                signature later via the &ldquo;Verify Signature&rdquo; action.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={signing || !signerName.trim() || !signerTitle.trim() || (method === "draw" && !signatureData)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {signing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Sign Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
