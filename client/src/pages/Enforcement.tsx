/**
 * Enforcement Module
 * Stage 11 of the PRA Reclamation Workflow
 *
 * Features:
 * - Enforcement case intake form (case number, type, location, parties, evidence)
 * - Case status progression: intake → investigation → enforcement → resolved → closed
 * - Action timeline view per case
 * - Stop Work Order issuance and lifting
 * - Supabase document upload for evidence attachments
 * - RBAC: enforcement_officer + admin only for mutations
 * - Audit logs on all write operations (handled server-side)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

// ── Status helpers ────────────────────────────────────────────────────────────

const CASE_STATUS_STEPS = ["intake", "investigation", "enforcement", "resolved", "closed"] as const;
type CaseStatus = (typeof CASE_STATUS_STEPS)[number];

const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  intake: "Intake",
  investigation: "Investigation",
  enforcement: "Enforcement",
  resolved: "Resolved",
  closed: "Closed",
};

const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  intake: "bg-blue-100 text-blue-800",
  investigation: "bg-yellow-100 text-yellow-800",
  enforcement: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
};

const SWO_STATUS_COLORS: Record<string, string> = {
  issued: "bg-red-100 text-red-800",
  acknowledged: "bg-orange-100 text-orange-800",
  active: "bg-red-200 text-red-900",
  lifted: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Enforcement() {
  const { user } = useAuth();
  const isOfficer = user?.role === "admin" || user?.role === "enforcement_officer";

  // Queries
  const { data: cases = [], isLoading: casesLoading, refetch: refetchCases } = trpc.enforcement.getCases.useQuery();
  const { data: stopWorkOrders = [], isLoading: swoLoading, refetch: refetchSwo } = trpc.enforcement.getStopWorkOrders.useQuery();

  // Dialogs
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [swoOpen, setSwoOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);

  // Forms
  const [caseForm, setCaseForm] = useState({
    caseNumber: "",
    complaintType: "",
    location: "",
    suspectedParties: "",
    evidence: "",
  });
  const [statusForm, setStatusForm] = useState({
    caseStatus: "investigation" as CaseStatus,
    enforcementActions: "",
  });
  const [swoForm, setSwoForm] = useState({
    projectId: "",
    orderNumber: "",
    reason: "",
    effectiveDate: "",
  });

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const createCaseMutation = trpc.enforcement.createCase.useMutation({
    onSuccess: () => {
      toast.success("Enforcement case created");
      setNewCaseOpen(false);
      setCaseForm({ caseNumber: "", complaintType: "", location: "", suspectedParties: "", evidence: "" });
      setUploadedUrl("");
      refetchCases();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.enforcement.updateCaseStatus.useMutation({
    onSuccess: () => {
      toast.success("Case status updated");
      setUpdateStatusOpen(false);
      setSelectedCase(null);
      refetchCases();
    },
    onError: (e) => toast.error(e.message),
  });

  const issueSwoMutation = trpc.enforcement.issueStopWorkOrder.useMutation({
    onSuccess: () => {
      toast.success("Stop Work Order issued");
      setSwoOpen(false);
      setSwoForm({ projectId: "", orderNumber: "", reason: "", effectiveDate: "" });
      refetchSwo();
    },
    onError: (e) => toast.error(e.message),
  });

  const liftSwoMutation = trpc.enforcement.liftStopWorkOrder.useMutation({
    onSuccess: () => {
      toast.success("Stop Work Order lifted");
      refetchSwo();
    },
    onError: (e) => toast.error(e.message),
  });

  // File upload handler (Supabase via /api/upload/document)
  const handleFileUpload = async (file: File) => {
    if (file.size > 52 * 1024 * 1024) {
      toast.error("File exceeds 52MB limit");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "enforcement_evidence");
      formData.append("projectId", "enforcement");
      const response = await fetch("/api/upload/document", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }
      const result = await response.json();
      setUploadedUrl(result.signedUrl || result.url);
      setCaseForm((f) => ({ ...f, evidence: `[Attached: ${file.name}] ${result.signedUrl || result.url}` }));
      toast.success(`${file.name} uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Stats
  const activeCases = cases.filter((c: any) => c.caseStatus !== "closed").length;
  const activeSwo = stopWorkOrders.filter((s: any) => s.status === "issued" || s.status === "active").length;
  const resolvedCases = cases.filter((c: any) => c.caseStatus === "resolved" || c.caseStatus === "closed").length;

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            Enforcement
          </h1>
          <p className="text-muted-foreground mt-1">Stage 11 — Enforcement actions, stop-work orders, and case management</p>
        </div>
        {isOfficer && (
          <div className="flex gap-2">
            <Dialog open={swoOpen} onOpenChange={setSwoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                  <Ban className="h-4 w-4 mr-1" />Issue Stop Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Issue Stop Work Order</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-sm font-medium">Project ID *</Label>
                    <Input className="mt-1" placeholder="Enter project ID" type="number" value={swoForm.projectId} onChange={e => setSwoForm(f => ({ ...f, projectId: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Order Number *</Label>
                    <Input className="mt-1" placeholder="e.g. SWO-2024-001" value={swoForm.orderNumber} onChange={e => setSwoForm(f => ({ ...f, orderNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Effective Date *</Label>
                    <Input className="mt-1" type="date" value={swoForm.effectiveDate} onChange={e => setSwoForm(f => ({ ...f, effectiveDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reason / Grounds *</Label>
                    <Textarea className="mt-1" rows={4} placeholder="Describe the grounds for issuing this stop work order..." value={swoForm.reason} onChange={e => setSwoForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => setSwoOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => issueSwoMutation.mutate({
                      projectId: parseInt(swoForm.projectId),
                      orderNumber: swoForm.orderNumber,
                      reason: swoForm.reason,
                      effectiveDate: new Date(swoForm.effectiveDate),
                    })}
                    disabled={issueSwoMutation.isPending || !swoForm.projectId || !swoForm.orderNumber || !swoForm.reason || !swoForm.effectiveDate}
                  >
                    {issueSwoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Issue Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Case</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>File Enforcement Case</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-sm font-medium">Case Number *</Label>
                    <Input className="mt-1" placeholder="e.g. ENF-2024-001" value={caseForm.caseNumber} onChange={e => setCaseForm(f => ({ ...f, caseNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Complaint Type *</Label>
                    <Select value={caseForm.complaintType} onValueChange={v => setCaseForm(f => ({ ...f, complaintType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {[
                          "Unauthorized Reclamation",
                          "Environmental Violation",
                          "Permit Non-Compliance",
                          "Encroachment",
                          "Illegal Dumping",
                          "Construction Without Approval",
                          "Other",
                        ].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Location *</Label>
                    <Input className="mt-1" placeholder="e.g. Manila Bay, Parañaque shoreline" value={caseForm.location} onChange={e => setCaseForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Suspected Parties</Label>
                    <Input className="mt-1" placeholder="Names of individuals or entities" value={caseForm.suspectedParties} onChange={e => setCaseForm(f => ({ ...f, suspectedParties: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Evidence / Notes</Label>
                    <Textarea className="mt-1" rows={3} placeholder="Describe evidence or attach a file below..." value={caseForm.evidence} onChange={e => setCaseForm(f => ({ ...f, evidence: e.target.value }))} />
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs"
                      >
                        {uploading
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Uploading...</>
                          : <><Paperclip className="h-3.5 w-3.5 mr-1" />Attach Evidence File</>}
                      </Button>
                      {uploadedUrl && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />File attached successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => setNewCaseOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createCaseMutation.mutate({
                      caseNumber: caseForm.caseNumber,
                      complaintType: caseForm.complaintType,
                      location: caseForm.location,
                      suspectedParties: caseForm.suspectedParties || undefined,
                      evidence: caseForm.evidence || undefined,
                    })}
                    disabled={createCaseMutation.isPending || !caseForm.caseNumber || !caseForm.complaintType || !caseForm.location}
                  >
                    {createCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}File Case
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-orange-600">{activeCases}</div>
          <div className="text-sm text-muted-foreground">Active Cases</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-red-600">{activeSwo}</div>
          <div className="text-sm text-muted-foreground">Active Stop Work Orders</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{resolvedCases}</div>
          <div className="text-sm text-muted-foreground">Resolved / Closed</div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cases">
        <TabsList className="mb-4">
          <TabsTrigger value="cases">Enforcement Cases ({cases.length})</TabsTrigger>
          <TabsTrigger value="swo">Stop Work Orders ({stopWorkOrders.length})</TabsTrigger>
        </TabsList>

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardHeader>
              <CardTitle>Enforcement Case Registry</CardTitle>
              <CardDescription>All enforcement cases filed with the Philippine Reclamation Authority</CardDescription>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : cases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No enforcement cases on record</p>
                  {isOfficer && <p className="text-sm mt-1">Use the "New Case" button to file an enforcement case.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {(cases as any[]).map((c: any) => (
                    <div key={c.id} className="rounded-lg border p-4">
                      {/* Case Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{c.caseNumber}</span>
                            <Badge className={`text-xs ${CASE_STATUS_COLORS[c.caseStatus as CaseStatus] || "bg-gray-100 text-gray-700"}`}>
                              {CASE_STATUS_LABELS[c.caseStatus as CaseStatus] || c.caseStatus}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-700 mt-0.5">{c.complaintType}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.location}</p>
                        </div>
                        {isOfficer && c.caseStatus !== "closed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedCase(c); setStatusForm({ caseStatus: c.caseStatus, enforcementActions: c.enforcementActions || "" }); setUpdateStatusOpen(true); }}
                          >
                            Update Status
                          </Button>
                        )}
                      </div>

                      {/* Status Timeline */}
                      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                        {CASE_STATUS_STEPS.map((step, idx) => {
                          const currentIdx = CASE_STATUS_STEPS.indexOf(c.caseStatus);
                          const isPast = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          return (
                            <div key={step} className="flex items-center gap-1 flex-shrink-0">
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isCurrent ? "bg-blue-600 text-white" : isPast ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                {isPast && <CheckCircle2 className="h-3 w-3" />}
                                {CASE_STATUS_LABELS[step]}
                              </div>
                              {idx < CASE_STATUS_STEPS.length - 1 && (
                                <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {c.suspectedParties && (
                          <div><span className="font-medium text-slate-600">Parties: </span>{c.suspectedParties}</div>
                        )}
                        {c.enforcementActions && (
                          <div className="col-span-2"><span className="font-medium text-slate-600">Actions: </span>{c.enforcementActions}</div>
                        )}
                        <div><span className="font-medium text-slate-600">Filed: </span>{new Date(c.reportedAt || c.createdAt).toLocaleDateString("en-PH")}</div>
                        {c.closedAt && <div><span className="font-medium text-slate-600">Closed: </span>{new Date(c.closedAt).toLocaleDateString("en-PH")}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stop Work Orders Tab */}
        <TabsContent value="swo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-600" />Stop Work Orders
              </CardTitle>
              <CardDescription>Formal orders to cease reclamation activities pending compliance review</CardDescription>
            </CardHeader>
            <CardContent>
              {swoLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : stopWorkOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Ban className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No stop work orders issued</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(stopWorkOrders as any[]).map((swo: any) => (
                    <div key={swo.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{swo.orderNumber}</span>
                            <Badge className={`text-xs ${SWO_STATUS_COLORS[swo.status] || "bg-gray-100 text-gray-700"}`}>
                              {swo.status.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Project #{swo.projectId}</span>
                          </div>
                          <p className="text-sm text-slate-700">{swo.reason}</p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Issued: {new Date(swo.issuedAt).toLocaleDateString("en-PH")}</span>
                            <span>Effective: {new Date(swo.effectiveDate).toLocaleDateString("en-PH")}</span>
                            {swo.liftedDate && <span className="text-green-600">Lifted: {new Date(swo.liftedDate).toLocaleDateString("en-PH")}</span>}
                          </div>
                        </div>
                        {isOfficer && (swo.status === "issued" || swo.status === "active") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-300 text-green-700 hover:bg-green-50 flex-shrink-0"
                            onClick={() => liftSwoMutation.mutate({ orderId: swo.id })}
                            disabled={liftSwoMutation.isPending}
                          >
                            {liftSwoMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                            Lift Order
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Status Dialog */}
      <Dialog open={updateStatusOpen} onOpenChange={setUpdateStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Case Status</DialogTitle>
            {selectedCase && <p className="text-sm text-muted-foreground mt-1">{selectedCase.caseNumber} — {selectedCase.complaintType}</p>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">New Status *</Label>
              <Select value={statusForm.caseStatus} onValueChange={v => setStatusForm(f => ({ ...f, caseStatus: v as CaseStatus }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASE_STATUS_STEPS.map(s => (
                    <SelectItem key={s} value={s}>{CASE_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Enforcement Actions / Notes</Label>
              <Textarea
                className="mt-1"
                rows={4}
                placeholder="Describe actions taken, findings, or reasons for status change..."
                value={statusForm.enforcementActions}
                onChange={e => setStatusForm(f => ({ ...f, enforcementActions: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setUpdateStatusOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedCase && updateStatusMutation.mutate({
                caseId: selectedCase.id,
                caseStatus: statusForm.caseStatus,
                enforcementActions: statusForm.enforcementActions || undefined,
              })}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
