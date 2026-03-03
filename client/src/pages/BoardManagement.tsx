import { useAuth } from "@/_core/hooks/useAuth";
import { skipToken } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Download, FileText, Gavel, Loader2, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const DECISION_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  approved_with_conditions: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-800",
  deferred: "bg-yellow-100 text-yellow-800",
  returned_for_revision: "bg-orange-100 text-orange-800",
};

export default function BoardManagement() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [addDecisionOpen, setAddDecisionOpen] = useState(false);
  const [addResolutionOpen, setAddResolutionOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ meetingNumber: "", meetingDate: "", location: "" });
  const [decisionForm, setDecisionForm] = useState({ boardMeetingId: "", decision: "approved", conditions: "" });
  const [resolutionForm, setResolutionForm] = useState({ boardMeetingId: "", resolutionNumber: "", title: "", content: "" });
  const [exportingPdf, setExportingPdf] = useState<number | null>(null);

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: decisions = [], isLoading: decisionsLoading, refetch: refetchDecisions } = trpc.board.getDecisions.useQuery(projectId ? { projectId } : skipToken);
  const { data: resolutions = [], isLoading: resolutionsLoading, refetch: refetchResolutions } = trpc.board.getResolutions.useQuery(projectId ? { projectId } : skipToken);
  const { data: meetings = [], isLoading: meetingsLoading, refetch: refetchMeetings } = trpc.board.getMeetings.useQuery();

  const createMeetingMutation = trpc.board.createMeeting.useMutation({
    onSuccess: () => { toast.success("Meeting scheduled"); setAddMeetingOpen(false); setMeetingForm({ meetingNumber: "", meetingDate: "", location: "" }); refetchMeetings(); },
    onError: (e) => toast.error(e.message),
  });
  const recordDecisionMutation = trpc.board.recordDecision.useMutation({
    onSuccess: () => { toast.success("Decision recorded"); setAddDecisionOpen(false); setDecisionForm({ boardMeetingId: "", decision: "approved", conditions: "" }); refetchDecisions(); },
    onError: (e) => toast.error(e.message),
  });
  const createResolutionMutation = trpc.board.createResolution.useMutation({
    onSuccess: () => {
      toast.success("Resolution created");
      setAddResolutionOpen(false);
      setResolutionForm({ boardMeetingId: "", resolutionNumber: "", title: "", content: "" });
      refetchResolutions();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleExportPdf = async (resolutionId: number, resolutionNumber: string) => {
    setExportingPdf(resolutionId);
    try {
      const response = await fetch(`/api/pdf/resolution/${resolutionId}`, { credentials: "include" });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "PDF generation failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PRA-Resolution-${resolutionNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Resolution ${resolutionNumber} exported as PDF`);
    } catch (err: any) {
      toast.error(err.message || "PDF export failed");
    } finally {
      setExportingPdf(null);
    }
  };

  if (!projectId) return (
    <div className="container py-8"><Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" /><p>No project selected.</p>
      <Button className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
    </CardContent></Card></div>
  );

  const isSecretariat = user?.role === "admin" || user?.role === "secretariat";
  const isBoardMember = user?.role === "admin" || user?.role === "board_member" || user?.role === "secretariat";

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2 -ml-2">← Back to Project</Button>
          <h1 className="text-2xl font-bold">Board Management</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        <div className="flex gap-2">
          {isSecretariat && (
            <Dialog open={addMeetingOpen} onOpenChange={setAddMeetingOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Schedule Meeting</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Board Meeting</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Meeting Number *</Label><Input value={meetingForm.meetingNumber} onChange={(e) => setMeetingForm((p) => ({ ...p, meetingNumber: e.target.value }))} placeholder="e.g., BM-2024-001" /></div>
                  <div><Label>Meeting Date *</Label><Input type="datetime-local" value={meetingForm.meetingDate} onChange={(e) => setMeetingForm((p) => ({ ...p, meetingDate: e.target.value }))} /></div>
                  <div><Label>Location</Label><Input value={meetingForm.location} onChange={(e) => setMeetingForm((p) => ({ ...p, location: e.target.value }))} placeholder="Conference Room / Online" /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddMeetingOpen(false)}>Cancel</Button>
                    <Button onClick={() => createMeetingMutation.mutate({ meetingNumber: meetingForm.meetingNumber, meetingDate: new Date(meetingForm.meetingDate), location: meetingForm.location })} disabled={!meetingForm.meetingNumber || !meetingForm.meetingDate || createMeetingMutation.isPending}>
                      {createMeetingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Schedule
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isBoardMember && (
            <Dialog open={addDecisionOpen} onOpenChange={setAddDecisionOpen}>
              <DialogTrigger asChild><Button size="sm"><Gavel className="h-4 w-4 mr-1" /> Record Decision</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Board Decision</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Meeting *</Label>
                    <Select value={decisionForm.boardMeetingId} onValueChange={(v) => setDecisionForm((p) => ({ ...p, boardMeetingId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select meeting..." /></SelectTrigger>
                      <SelectContent>
                        {meetings.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.meetingNumber} — {new Date(m.meetingDate).toLocaleDateString()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Decision *</Label>
                    <Select value={decisionForm.decision} onValueChange={(v) => setDecisionForm((p) => ({ ...p, decision: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["approved", "approved_with_conditions", "deferred", "rejected", "returned_for_revision"].map((d) => (
                          <SelectItem key={d} value={d}>{d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Conditions / Notes</Label><Textarea value={decisionForm.conditions} onChange={(e) => setDecisionForm((p) => ({ ...p, conditions: e.target.value }))} rows={3} /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddDecisionOpen(false)}>Cancel</Button>
                    <Button onClick={() => recordDecisionMutation.mutate({ projectId: projectId!, boardMeetingId: parseInt(decisionForm.boardMeetingId), decision: decisionForm.decision as any, conditions: decisionForm.conditions })} disabled={!decisionForm.boardMeetingId || recordDecisionMutation.isPending}>
                      {recordDecisionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Record
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{meetings.length}</div><div className="text-sm text-muted-foreground">Board Meetings</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{decisions.filter((d: any) => d.decision === "approved" || d.decision === "approved_with_conditions").length}</div><div className="text-sm text-muted-foreground">Approved</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{resolutions.length}</div><div className="text-sm text-muted-foreground">Resolutions</div></CardContent></Card>
      </div>

      <Tabs defaultValue="decisions">
        <TabsList className="mb-4">
          <TabsTrigger value="decisions">Decisions ({decisions.length})</TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({meetings.length})</TabsTrigger>
          <TabsTrigger value="resolutions">Resolutions ({resolutions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5" /> Board Decisions</CardTitle></CardHeader>
            <CardContent>
              {decisionsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                : decisions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Gavel className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No decisions recorded yet</p></div>
                ) : (
                  <div className="space-y-3">
                    {decisions.map((d: any) => (
                      <div key={d.id} className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          {(d.decision === "approved" || d.decision === "approved_with_conditions") ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" /> : d.decision === "rejected" ? <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={`text-xs ${DECISION_COLORS[d.decision] || "bg-gray-100 text-gray-800"}`}>{d.decision.replace(/_/g, " ")}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(d.decisionDate || d.recordedAt).toLocaleDateString()}</span>
                            </div>
                            {d.conditions && <p className="text-sm text-muted-foreground"><span className="font-medium">Conditions:</span> {d.conditions}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader><CardTitle>Board Meetings</CardTitle></CardHeader>
            <CardContent>
              {meetingsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                : meetings.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p className="font-medium">No meetings scheduled</p></div>
                : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Meeting No.</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {meetings.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.meetingNumber}</TableCell>
                          <TableCell>{new Date(m.meetingDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-muted-foreground">{m.location || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolutions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resolution Registry</CardTitle>
                  <CardDescription>Official board resolutions — export as PRA-formatted PDF</CardDescription>
                </div>
                {isSecretariat && (
                  <Dialog open={addResolutionOpen} onOpenChange={setAddResolutionOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Resolution</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader><DialogTitle>Create Board Resolution</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <Label className="text-sm font-medium">Board Meeting *</Label>
                          <Select value={resolutionForm.boardMeetingId} onValueChange={v => setResolutionForm(f => ({ ...f, boardMeetingId: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select meeting" /></SelectTrigger>
                            <SelectContent>
                              {(meetings as any[]).map((m: any) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                  {m.meetingNumber} — {new Date(m.meetingDate).toLocaleDateString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Resolution Number *</Label>
                          <Input className="mt-1" placeholder="e.g. RES-2024-001" value={resolutionForm.resolutionNumber} onChange={e => setResolutionForm(f => ({ ...f, resolutionNumber: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Title / Subject *</Label>
                          <Input className="mt-1" placeholder="e.g. Approval of Reclamation Project XYZ" value={resolutionForm.title} onChange={e => setResolutionForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Resolution Text *</Label>
                          <Textarea className="mt-1" rows={6} placeholder="WHEREAS, the Board of Directors of the Philippine Reclamation Authority..." value={resolutionForm.content} onChange={e => setResolutionForm(f => ({ ...f, content: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setAddResolutionOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => projectId && createResolutionMutation.mutate({
                            projectId,
                            boardMeetingId: parseInt(resolutionForm.boardMeetingId),
                            resolutionNumber: resolutionForm.resolutionNumber,
                            title: resolutionForm.title,
                            content: resolutionForm.content,
                          })}
                          disabled={createResolutionMutation.isPending || !resolutionForm.boardMeetingId || !resolutionForm.resolutionNumber || !resolutionForm.title || !resolutionForm.content}
                        >
                          {createResolutionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Create Resolution
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {resolutionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : resolutions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No resolutions on record</p>
                  <p className="text-sm mt-1">Create a resolution to generate an official PRA-formatted PDF.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(resolutions as any[]).map((r: any) => (
                    <div key={r.id} className="p-4 rounded-lg border bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{r.resolutionNumber}</span>
                            <Badge variant="outline" className="text-xs capitalize">{r.status}</Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-700">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(r.approvedAt || r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportPdf(r.id, r.resolutionNumber)}
                          disabled={exportingPdf === r.id}
                          className="flex-shrink-0"
                        >
                          {exportingPdf === r.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            : <Download className="h-3.5 w-3.5 mr-1" />}
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
