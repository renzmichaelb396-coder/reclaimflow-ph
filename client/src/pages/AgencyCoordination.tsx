import { useAuth } from "@/_core/hooks/useAuth";
import { skipToken } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Building2, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  acknowledged: "bg-blue-100 text-blue-800",
  in_review: "bg-purple-100 text-purple-800",
  responded: "bg-green-100 text-green-800",
  escalated: "bg-red-100 text-red-800",
  closed: "bg-gray-100 text-gray-800",
};

const AGENCIES = ["DENR", "NEDA", "DPWH", "DOF", "DILG", "HLURB", "LGU", "Other"];

export default function AgencyCoordination() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ agencyName: "DENR", requestType: "", details: "" });

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: requests = [], isLoading, refetch } = trpc.agency.getRequests.useQuery(
    projectId ? { projectId } : skipToken
  );

  const createMutation = trpc.agency.submitRequest.useMutation({
    onSuccess: () => { toast.success("Agency request created"); setCreateOpen(false); setForm({ agencyName: "DENR", requestType: "", details: "" }); refetch(); },
    onError: (e: any) => toast.error(e.message),
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

  const canCreate = user?.role === "admin" || user?.role === "evaluator" || user?.role === "secretariat";
  const pending = requests.filter((r: any) => r.status === "pending" || r.status === "acknowledged").length;
  const responded = requests.filter((r: any) => r.status === "responded" || r.status === "closed").length;

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects/" + projectId)} className="mb-2 -ml-2">Back to Project</Button>
          <h1 className="text-2xl font-bold">Inter-Agency Coordination</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Agency Request</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Agency *</Label>
                  <Select value={form.agencyName} onValueChange={(v) => setForm(p => ({ ...p, agencyName: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AGENCIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Request Type *</Label>
                  <Input value={form.requestType} onChange={e => setForm(p => ({ ...p, requestType: e.target.value }))} placeholder="e.g. Clearance, Endorsement, Review" />
                </div>
                <div>
                  <Label>Details *</Label>
                  <Textarea value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))} placeholder="Detailed description of the request..." rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={() => createMutation.mutate({ projectId: projectId!, agencyName: form.agencyName, requestType: form.requestType, details: form.details, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })} disabled={!form.requestType || !form.details || createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Submit
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{requests.length}</div><div className="text-sm text-muted-foreground">Total Requests</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{pending}</div><div className="text-sm text-muted-foreground">Pending Response</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{responded}</div><div className="text-sm text-muted-foreground">Responded</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Agency Requests</CardTitle>
          <CardDescription>Track coordination requests to DENR, NEDA, and other government agencies</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No agency requests yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference No.</TableHead><TableHead>Agency</TableHead><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.referenceNumber}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.agencyName}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.requestType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.requestDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge className={"text-xs " + (STATUS_COLORS[r.status] || "bg-gray-100 text-gray-800")}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
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
