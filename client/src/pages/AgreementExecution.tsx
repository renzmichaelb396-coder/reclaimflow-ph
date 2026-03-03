import { useAuth } from "@/_core/hooks/useAuth";
import { skipToken } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, FileSignature, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  under_review: "bg-yellow-100 text-yellow-800",
  pending_signatures: "bg-orange-100 text-orange-800",
  approved: "bg-blue-100 text-blue-800",
  executed: "bg-green-100 text-green-800",
  active: "bg-teal-100 text-teal-800",
  terminated: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600",
};

const AGREEMENT_TYPES = [
  { value: "moa", label: "Memorandum of Agreement" },
  { value: "implementing_agreement", label: "Implementing Agreement" },
  { value: "concession", label: "Concession Agreement" },
  { value: "lease", label: "Lease Agreement" },
  { value: "other", label: "Other" },
];

export default function AgreementExecution() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;
  const [createOpen, setCreateOpen] = useState(false);
  const [agreementType, setAgreementType] = useState("moa");

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: agreements = [], isLoading, refetch } = trpc.agreement.getByProject.useQuery(
    projectId ? { projectId } : skipToken
  );

  const createMutation = trpc.agreement.create.useMutation({
    onSuccess: () => { toast.success("Agreement created"); setCreateOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!projectId) return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p>No project selected.</p>
        <Button className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
      </CardContent></Card>
    </div>
  );

  const isSecretariat = user?.role === "admin" || user?.role === "secretariat";
  const executedCount = agreements.filter((a: any) => a.status === "executed" || a.status === "active").length;

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects/" + projectId)} className="mb-2 -ml-2">Back to Project</Button>
          <h1 className="text-2xl font-bold">Agreement Execution</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        {isSecretariat && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Create Agreement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Agreement</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Agreement Type</Label>
                  <Select value={agreementType} onValueChange={setAgreementType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AGREEMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={() => createMutation.mutate({ projectId: projectId!, agreementType: agreementType as any })} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{agreements.length}</div><div className="text-sm text-muted-foreground">Total Agreements</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{executedCount}</div><div className="text-sm text-muted-foreground">Executed</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{agreements.filter((a: any) => ["draft","under_review","pending_signatures"].includes(a.status)).length}</div><div className="text-sm text-muted-foreground">Pending</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Agreements</CardTitle>
          <CardDescription>Track agreement drafting, review, signatory workflow, and execution</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : agreements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No agreements yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agreement No.</TableHead><TableHead>Type</TableHead><TableHead>Effective Date</TableHead><TableHead>Expiry Date</TableHead><TableHead>Status</TableHead><TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((ag: any) => (
                    <TableRow key={ag.id}>
                      <TableCell className="font-medium">{ag.agreementNumber}</TableCell>
                      <TableCell className="text-sm">{AGREEMENT_TYPES.find(t => t.value === ag.agreementType)?.label || ag.agreementType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ag.effectiveDate ? new Date(ag.effectiveDate).toLocaleDateString() : "N/A"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ag.expiryDate ? new Date(ag.expiryDate).toLocaleDateString() : "N/A"}</TableCell>
                      <TableCell><Badge className={"text-xs " + (STATUS_COLORS[ag.status] || "bg-gray-100 text-gray-800")}>{ag.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>
                        {ag.draftUrl && <a href={ag.draftUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mr-2">Draft</a>}
                        {ag.executedUrl && <a href={ag.executedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">Executed</a>}
                        {!ag.draftUrl && !ag.executedUrl && <span className="text-xs text-muted-foreground">None</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
