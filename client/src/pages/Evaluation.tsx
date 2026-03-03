import { useAuth } from "@/_core/hooks/useAuth";
import { skipToken } from "@tanstack/react-query";
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
import { AlertTriangle, CheckCircle2, Loader2, Plus, Star } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function Evaluation() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;
  const [addEvalOpen, setAddEvalOpen] = useState(false);
  const [addRiskOpen, setAddRiskOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({ category: "", score: "", maxScore: "100", notes: "" });
  const [riskForm, setRiskForm] = useState({ riskTitle: "", riskLevel: "medium", description: "", mitigationPlan: "" });

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: evaluations = [], isLoading: evalLoading, refetch: refetchEvals } = trpc.evaluation.getByProject.useQuery(projectId ? { projectId } : skipToken);
  const { data: risks = [], isLoading: riskLoading, refetch: refetchRisks } = trpc.evaluation.getRisks.useQuery(projectId ? { projectId } : skipToken);

  const addEvalMutation = trpc.evaluation.addScore.useMutation({
    onSuccess: () => { toast.success("Score added"); setAddEvalOpen(false); setEvalForm({ category: "", score: "", maxScore: "100", notes: "" }); refetchEvals(); },
    onError: (e) => toast.error(e.message),
  });
  const addRiskMutation = trpc.evaluation.addRisk.useMutation({
    onSuccess: () => { toast.success("Risk added"); setAddRiskOpen(false); setRiskForm({ riskTitle: "", riskLevel: "medium", description: "", mitigationPlan: "" }); refetchRisks(); },
    onError: (e) => toast.error(e.message),
  });
  const updateRiskMutation = trpc.evaluation.updateRiskStatus.useMutation({
    onSuccess: () => { toast.success("Risk updated"); refetchRisks(); },
    onError: (e) => toast.error(e.message),
  });

  if (!projectId) return (
    <div className="container py-8"><Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" /><p>No project selected.</p>
      <Button className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
    </CardContent></Card></div>
  );

  const isEvaluator = user?.role === "admin" || user?.role === "evaluator";
  const totalScore = evaluations.reduce((s: number, e: any) => s + parseFloat(e.score || 0), 0);
  const maxScore = evaluations.reduce((s: number, e: any) => s + parseFloat(e.maxScore || 100), 0);
  const avgPct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2 -ml-2">← Back to Project</Button>
        <h1 className="text-2xl font-bold">Evaluation Workspace</h1>
        {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{evaluations.length}</div><div className="text-sm text-muted-foreground">Criteria Evaluated</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalScore.toFixed(0)}/{maxScore.toFixed(0)}</div><div className="text-sm text-muted-foreground">Total Score</div></CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className={`text-2xl font-bold ${avgPct >= 70 ? "text-green-600" : avgPct >= 50 ? "text-yellow-600" : "text-red-600"}`}>{avgPct}%</div>
          <div className="text-sm text-muted-foreground">Overall Rating</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="scores">
        <TabsList className="mb-4">
          <TabsTrigger value="scores">Scores ({evaluations.length})</TabsTrigger>
          <TabsTrigger value="risks">Risk Register ({risks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Scoring Matrix</CardTitle><CardDescription>Evaluate project across key criteria</CardDescription></div>
              {isEvaluator && (
                <Dialog open={addEvalOpen} onOpenChange={setAddEvalOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Score</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Evaluation Score</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div><Label>Category *</Label><Input value={evalForm.category} onChange={(e) => setEvalForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g., Technical Feasibility" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Score *</Label><Input type="number" min="0" value={evalForm.score} onChange={(e) => setEvalForm((p) => ({ ...p, score: e.target.value }))} /></div>
                        <div><Label>Max Score</Label><Input type="number" min="1" value={evalForm.maxScore} onChange={(e) => setEvalForm((p) => ({ ...p, maxScore: e.target.value }))} /></div>
                      </div>
                      <div><Label>Notes</Label><Textarea value={evalForm.notes} onChange={(e) => setEvalForm((p) => ({ ...p, notes: e.target.value }))} rows={3} /></div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddEvalOpen(false)}>Cancel</Button>
                        <Button onClick={() => addEvalMutation.mutate({ projectId: projectId!, category: evalForm.category, score: parseFloat(evalForm.score), maxScore: parseFloat(evalForm.maxScore) || 100, notes: evalForm.notes })} disabled={!evalForm.category || !evalForm.score || addEvalMutation.isPending}>
                          {addEvalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {evalLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                : evaluations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Star className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No scores yet</p></div>
                ) : (
                  <div className="space-y-3">
                    {evaluations.map((ev: any) => {
                      const pct = parseFloat(ev.maxScore) > 0 ? Math.round((parseFloat(ev.score) / parseFloat(ev.maxScore)) * 100) : 0;
                      return (
                        <div key={ev.id} className="p-4 rounded-lg border bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{ev.evaluationType}</span>
                            <span className="text-sm font-bold">{ev.score}/{ev.maxScore} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          {ev.notes && <p className="text-sm text-muted-foreground mt-2">{ev.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Risk Register</CardTitle><CardDescription>Identify and track project risks</CardDescription></div>
              {isEvaluator && (
                <Dialog open={addRiskOpen} onOpenChange={setAddRiskOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Risk</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Risk</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div><Label>Risk Title *</Label><Input value={riskForm.riskTitle} onChange={(e) => setRiskForm((p) => ({ ...p, riskTitle: e.target.value }))} /></div>
                      <div><Label>Risk Level *</Label>
                        <Select value={riskForm.riskLevel} onValueChange={(v) => setRiskForm((p) => ({ ...p, riskLevel: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["low", "medium", "high", "critical"].map((l) => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Description</Label><Textarea value={riskForm.description} onChange={(e) => setRiskForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                      <div><Label>Mitigation Plan</Label><Textarea value={riskForm.mitigationPlan} onChange={(e) => setRiskForm((p) => ({ ...p, mitigationPlan: e.target.value }))} rows={2} /></div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddRiskOpen(false)}>Cancel</Button>
                        <Button onClick={() => addRiskMutation.mutate({ projectId: projectId!, riskTitle: riskForm.riskTitle, riskLevel: riskForm.riskLevel as any, description: riskForm.description, mitigationPlan: riskForm.mitigationPlan })} disabled={!riskForm.riskTitle || addRiskMutation.isPending}>
                          {addRiskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {riskLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                : risks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No risks identified yet</p></div>
                ) : (
                  <div className="space-y-3">
                    {risks.map((risk: any) => (
                      <div key={risk.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{risk.riskDescription?.split(":")[0] || "Risk"}</span>
                              <Badge className={`text-xs ${RISK_COLORS[risk.likelihood] || "bg-gray-100 text-gray-800"}`}>{risk.likelihood}</Badge>
                              {risk.status === "mitigated" && <Badge className="text-xs bg-green-100 text-green-800">Mitigated</Badge>}
                            </div>
                            {risk.mitigationStrategy && <p className="text-sm text-blue-700"><span className="font-medium">Mitigation:</span> {risk.mitigationStrategy}</p>}
                          </div>
                          {isEvaluator && risk.status !== "mitigated" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => updateRiskMutation.mutate({ riskId: risk.id, status: "mitigated" })} disabled={updateRiskMutation.isPending}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Mitigate
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
    </div>
  );
}
