import { useAuth } from "@/_core/hooks/useAuth";
import { skipToken } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, Loader2, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function PreQualification() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ itemName: "", isRequired: true, notes: "" });
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});

  const { data: project, isLoading: projectLoading } = trpc.project.getById.useQuery(
    projectId ? { projectId } : skipToken
  );

  const { data: checklist = [], isLoading: checklistLoading, refetch } = trpc.project.getPreQualChecklist.useQuery(
    projectId ? { projectId } : skipToken
  );

  const addItemMutation = trpc.project.addPreQualItem.useMutation({
    onSuccess: () => {
      toast.success("Checklist item added");
      setAddItemOpen(false);
      setNewItem({ itemName: "", isRequired: true, notes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyItemMutation = trpc.project.verifyPreQualItem.useMutation({
    onSuccess: () => { toast.success("Item updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const generateNoticeMutation = trpc.project.generateDeficiencyNotice.useMutation({
    onSuccess: () => { toast.success("Deficiency notice generated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const advanceStageMutation = trpc.project.advanceStage.useMutation({
    onSuccess: () => { toast.success("Project advanced to MOU stage"); navigate(`/projects/${projectId}`); },
    onError: (e) => toast.error(e.message),
  });

  if (!projectId) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No project selected.</p>
            <Button className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectLoading || checklistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalItems = checklist.length;
  const compliantItems = checklist.filter((i: any) => i.isCompliant).length;
  const requiredItems = checklist.filter((i: any) => i.isRequired);
  const allRequiredCompliant = requiredItems.every((i: any) => i.isCompliant);
  const completionPct = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 0;
  const canAdvance = allRequiredCompliant && totalItems > 0;
  const isEvaluator = user?.role === "admin" || user?.role === "evaluator" || user?.role === "secretariat";

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2 -ml-2">
            ← Back to Project
          </Button>
          <h1 className="text-2xl font-bold">Pre-Qualification Assessment</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        <div className="flex gap-2">
          {isEvaluator && (
            <>
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Checklist Item</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Item Name *</Label>
                      <Input value={newItem.itemName} onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))} placeholder="e.g., Certificate of Registration" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="required" checked={newItem.isRequired} onCheckedChange={(v) => setNewItem((p) => ({ ...p, isRequired: !!v }))} />
                      <Label htmlFor="required">Required item</Label>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={newItem.notes} onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))} rows={2} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
                      <Button onClick={() => addItemMutation.mutate({ projectId: projectId!, itemName: newItem.itemName, isRequired: newItem.isRequired, notes: newItem.notes })} disabled={!newItem.itemName || addItemMutation.isPending}>
                        {addItemMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add Item
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {!canAdvance && totalItems > 0 && (
                <Button variant="destructive" size="sm" onClick={() => generateNoticeMutation.mutate({ projectId: projectId! })} disabled={generateNoticeMutation.isPending}>
                  <FileText className="h-4 w-4 mr-1" /> Generate Deficiency Notice
                </Button>
              )}
              {canAdvance && (
                <Button size="sm" onClick={() => advanceStageMutation.mutate({ projectId: projectId!, targetStage: "mou" })} disabled={advanceStageMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Advance to MOU Stage
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Items", value: totalItems, color: "" },
          { label: "Compliant", value: compliantItems, color: "text-green-600" },
          { label: "Non-Compliant", value: totalItems - compliantItems, color: "text-red-600" },
          { label: "Completion", value: `${completionPct}%`, color: "" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
              {s.label === "Completion" && <Progress value={completionPct} className="mt-2 h-1.5" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {totalItems > 0 && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${canAdvance ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          {canAdvance ? (
            <><CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /><div><div className="font-semibold text-green-800">All Required Items Compliant</div><div className="text-sm text-green-700">This project is ready to advance to the MOU stage.</div></div></>
          ) : (
            <><AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" /><div><div className="font-semibold text-yellow-800">Pre-Qualification Incomplete</div><div className="text-sm text-yellow-700">{requiredItems.filter((i: any) => !i.isCompliant).length} required item(s) still need verification.</div></div></>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Pre-Qualification Checklist</CardTitle>
          <CardDescription>Verify each item to determine project eligibility</CardDescription>
        </CardHeader>
        <CardContent>
          {checklist.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No checklist items yet</p>
              {isEvaluator && <p className="text-sm mt-1">Click "Add Item" to create the pre-qualification checklist.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {checklist.map((item: any) => (
                <div key={item.id} className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${item.isCompliant ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="mt-0.5">
                    {item.isCompliant ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.itemName}</span>
                      {item.isRequired && <Badge variant="outline" className="text-xs border-red-300 text-red-700">Required</Badge>}
                      {item.isCompliant && <Badge className="text-xs bg-green-100 text-green-800 border-0">Verified</Badge>}
                    </div>
                    {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
                    {item.verifiedAt && <p className="text-xs text-muted-foreground mt-1">Verified {new Date(item.verifiedAt).toLocaleDateString()}</p>}
                    {isEvaluator && !item.isCompliant && (
                      <div className="mt-2 flex gap-2">
                        <Input size={1} className="h-7 text-xs" placeholder="Verification notes..." value={notesMap[item.id] || ""} onChange={(e) => setNotesMap((p) => ({ ...p, [item.id]: e.target.value }))} />
                        <Button size="sm" className="h-7 text-xs" onClick={() => verifyItemMutation.mutate({ itemId: item.id, isCompliant: true, notes: notesMap[item.id] })} disabled={verifyItemMutation.isPending}>Mark Compliant</Button>
                      </div>
                    )}
                    {isEvaluator && item.isCompliant && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs mt-1 text-red-600 hover:text-red-700" onClick={() => verifyItemMutation.mutate({ itemId: item.id, isCompliant: false, notes: "" })} disabled={verifyItemMutation.isPending}>Revoke Compliance</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
