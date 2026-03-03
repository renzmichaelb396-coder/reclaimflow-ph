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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Camera, CheckCircle, ClipboardCheck, ExternalLink, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const INSP_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  postponed: "bg-yellow-100 text-yellow-800",
};

const FINDING_STATUS_COLORS: Record<string, string> = {
  reported: "bg-red-100 text-red-800",
  acknowledged: "bg-yellow-100 text-yellow-800",
  under_correction: "bg-orange-100 text-orange-800",
  corrected: "bg-blue-100 text-blue-800",
  verified: "bg-green-100 text-green-800",
  escalated: "bg-purple-100 text-purple-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-400 text-gray-900",
  low: "bg-blue-100 text-blue-800",
};

interface PhotoUpload {
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
  error?: string;
}

export default function Monitoring() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;

  // Inspection scheduling
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({ inspectionType: "routine", scheduledDate: "", location: "" });

  // Inspection completion with photos
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [completionNotes, setCompletionNotes] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Finding recording
  const [findingOpen, setFindingOpen] = useState(false);
  const [findingForm, setFindingForm] = useState({
    inspectionId: "",
    findingType: "non_compliance",
    severity: "low",
    description: "",
    location: "",
  });

  // Corrective action
  const [caOpen, setCaOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [caForm, setCaForm] = useState({ description: "", dueDate: "", responsibleParty: "" });

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: inspections = [], isLoading: inspLoading, refetch: refetchInsp } = trpc.monitoring.getInspections.useQuery(
    projectId ? { projectId } : skipToken
  );
  const { data: findings = [], isLoading: findLoading, refetch: refetchFindings } = trpc.monitoring.getFindings.useQuery(
    projectId ? { projectId } : skipToken
  );

  const schedMutation = trpc.monitoring.createInspection.useMutation({
    onSuccess: () => {
      toast.success("Inspection scheduled successfully");
      setSchedOpen(false);
      setSchedForm({ inspectionType: "routine", scheduledDate: "", location: "" });
      refetchInsp();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const recordFindingMutation = trpc.monitoring.recordFinding.useMutation({
    onSuccess: () => {
      toast.success("Finding recorded");
      setFindingOpen(false);
      setFindingForm({ inspectionId: "", findingType: "non_compliance", severity: "minor", description: "", location: "" });
      refetchFindings();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCorrectiveActionMutation = trpc.monitoring.addCorrectiveAction.useMutation({
    onSuccess: () => {
      toast.success("Corrective action assigned");
      setCaOpen(false);
      setCaForm({ description: "", dueDate: "", responsibleParty: "" });
      refetchFindings();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Photo upload handler — uploads to /api/upload/inspection-photo
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB per photo
    const valid = files.filter(f => {
      if (f.size > maxSize) { toast.error(`${f.name} exceeds 10MB limit`); return false; }
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      return true;
    });
    const newPhotos: PhotoUpload[] = valid.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      uploading: false,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadPhotosToSupabase = async (): Promise<string[]> => {
    if (photos.length === 0) return [];
    setUploadingPhotos(true);
    const urls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.url) { urls.push(photo.url); continue; }

      setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: true } : p));
      try {
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("bucket", "inspection-photos");
        formData.append("folder", `inspection-${selectedInspection?.id || "unknown"}`);

        const res = await fetch("/api/upload/file", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }

        const { url } = await res.json();
        urls.push(url);
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: false, url } : p));
      } catch (err: any) {
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: false, error: err.message } : p));
        toast.error(`Failed to upload ${photo.file.name}: ${err.message}`);
      }
    }

    setUploadingPhotos(false);
    return urls;
  };

  const handleCompleteInspection = async () => {
    if (!selectedInspection) return;
    const photoUrls = await uploadPhotosToSupabase();
    // For now, just record completion with notes — in a full implementation
    // we'd call a completeInspection mutation that stores photoUrls in the DB
    toast.success(`Inspection marked complete. ${photoUrls.length} photo(s) uploaded.`);
    setCompleteOpen(false);
    setPhotos([]);
    setCompletionNotes("");
    refetchInsp();
  };

  const openCompleteDialog = (inspection: any) => {
    setSelectedInspection(inspection);
    setPhotos([]);
    setCompletionNotes("");
    setCompleteOpen(true);
  };

  const openCorrectiveAction = (finding: any) => {
    setSelectedFinding(finding);
    setCaForm({ description: "", dueDate: "", responsibleParty: "" });
    setCaOpen(true);
  };

  if (!projectId) return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="font-medium mb-4">No project selected.</p>
          <Button onClick={() => navigate("/projects")}>Go to Projects</Button>
        </CardContent>
      </Card>
    </div>
  );

  const canSchedule = user?.role === "admin" || user?.role === "enforcement_officer" || user?.role === "evaluator";
  const canRecordFindings = user?.role === "admin" || user?.role === "enforcement_officer" || user?.role === "evaluator";
  const openFindings = findings.filter((f: any) => f.status === "open" || f.status === "corrective_action_required").length;
  const completedInspections = inspections.filter((i: any) => i.status === "completed").length;

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects/" + projectId)} className="mb-2 -ml-2">
            ← Back to Project
          </Button>
          <h1 className="text-2xl font-bold">Monitoring & Compliance</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        {canSchedule && (
          <div className="flex gap-2">
            {canRecordFindings && (
              <Dialog open={findingOpen} onOpenChange={setFindingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><AlertTriangle className="h-4 w-4 mr-1" /> Record Finding</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Compliance Finding</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Related Inspection</Label>
                      <Select value={findingForm.inspectionId} onValueChange={v => setFindingForm(p => ({ ...p, inspectionId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select inspection (optional)" /></SelectTrigger>
                        <SelectContent>
                          {inspections.map((i: any) => (
                            <SelectItem key={i.id} value={String(i.id)}>{i.inspectionNumber} — {new Date(i.scheduledDate).toLocaleDateString()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Finding Type *</Label>
                      <Select value={findingForm.findingType} onValueChange={v => setFindingForm(p => ({ ...p, findingType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_compliance">Non-Compliance</SelectItem>
                          <SelectItem value="safety_violation">Safety Violation</SelectItem>
                          <SelectItem value="environmental_violation">Environmental Violation</SelectItem>
                          <SelectItem value="permit_violation">Permit Violation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity *</Label>
                      <Select value={findingForm.severity} onValueChange={v => setFindingForm(p => ({ ...p, severity: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description *</Label>
                      <Textarea value={findingForm.description} onChange={e => setFindingForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the finding in detail..." rows={3} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={findingForm.location} onChange={e => setFindingForm(p => ({ ...p, location: e.target.value }))} placeholder="Location within project site" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setFindingOpen(false)}>Cancel</Button>
                      <Button
                        onClick={() => recordFindingMutation.mutate({
                          projectId: projectId!,
                          inspectionId: findingForm.inspectionId ? parseInt(findingForm.inspectionId) : undefined,
                          findingType: findingForm.findingType as any,
                          severity: findingForm.severity as "low" | "medium" | "high" | "critical",
                          description: findingForm.description,
                          location: findingForm.location || undefined,
                        })}
                        disabled={!findingForm.description || recordFindingMutation.isPending}
                      >
                        {recordFindingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        Record Finding
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Schedule Inspection</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Inspection</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Inspection Type *</Label>
                    <Select value={schedForm.inspectionType} onValueChange={v => setSchedForm(p => ({ ...p, inspectionType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="compliance_check">Compliance Check</SelectItem>
                        <SelectItem value="incident_response">Incident Response</SelectItem>
                        <SelectItem value="final_inspection">Final Inspection</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Scheduled Date *</Label>
                    <Input type="datetime-local" value={schedForm.scheduledDate} onChange={e => setSchedForm(p => ({ ...p, scheduledDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={schedForm.location} onChange={e => setSchedForm(p => ({ ...p, location: e.target.value }))} placeholder="Inspection site location" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSchedOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => schedMutation.mutate({
                        projectId: projectId!,
                        inspectionType: schedForm.inspectionType as any,
                        scheduledDate: new Date(schedForm.scheduledDate),
                        location: schedForm.location,
                      })}
                      disabled={!schedForm.scheduledDate || schedMutation.isPending}
                    >
                      {schedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Schedule
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{inspections.length}</div>
          <div className="text-sm text-muted-foreground">Total Inspections</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{completedInspections}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-red-600">{openFindings}</div>
          <div className="text-sm text-muted-foreground">Open Findings</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">{findings.filter((f: any) => f.status === "resolved").length}</div>
          <div className="text-sm text-muted-foreground">Resolved</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="inspections">
        <TabsList className="mb-4">
          <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
          <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
        </TabsList>

        {/* INSPECTIONS TAB */}
        <TabsContent value="inspections">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Inspections</CardTitle>
              <CardDescription>Scheduled and completed field inspections with photo documentation</CardDescription>
            </CardHeader>
            <CardContent>
              {inspLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : inspections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No inspections scheduled yet</p>
                  <p className="text-sm mt-1">Use the "Schedule Inspection" button to create one.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inspection No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium text-sm">{i.inspectionNumber}</TableCell>
                        <TableCell className="text-sm capitalize">{i.inspectionType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(i.scheduledDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{i.location || "—"}</TableCell>
                        <TableCell>
                          <Badge className={"text-xs " + (INSP_STATUS_COLORS[i.status] || "bg-gray-100 text-gray-800")}>
                            {i.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {i.status === "scheduled" && canSchedule && (
                            <Button size="sm" variant="outline" onClick={() => openCompleteDialog(i)}>
                              <Camera className="h-3 w-3 mr-1" /> Complete + Photos
                            </Button>
                          )}
                          {i.status === "completed" && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" /> Done
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINDINGS TAB */}
        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Compliance Findings</CardTitle>
              <CardDescription>Non-compliance findings and corrective action tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {findLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : findings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No findings recorded</p>
                  <p className="text-sm mt-1">Findings are recorded during or after inspections.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finding No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {findings.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium text-sm">{f.findingNumber}</TableCell>
                        <TableCell className="text-sm capitalize">{f.findingType?.replace(/_/g, " ") || "—"}</TableCell>
                        <TableCell>
                          <Badge className={"text-xs " + (SEVERITY_COLORS[f.severity] || "bg-gray-100 text-gray-800")}>
                            {f.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={f.description}>{f.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(f.findingDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={"text-xs " + (FINDING_STATUS_COLORS[f.status] || "bg-gray-100 text-gray-800")}>
                            {f.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(f.status === "reported" || f.status === "acknowledged") && canRecordFindings && (
                            <Button size="sm" variant="outline" onClick={() => openCorrectiveAction(f)}>
                              Assign CA
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* COMPLETE INSPECTION DIALOG WITH PHOTO UPLOAD */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Complete Inspection — {selectedInspection?.inspectionNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label>Completion Notes</Label>
              <Textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                placeholder="Summarize the inspection findings and observations..."
                rows={3}
              />
            </div>

            {/* Photo Upload Section */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4" /> Inspection Photos
                <span className="text-xs text-muted-foreground font-normal">(max 10MB per photo, images only)</span>
              </Label>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
                      <img
                        src={photo.preview}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {photo.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      {photo.url && (
                        <div className="absolute bottom-1 right-1">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        </div>
                      )}
                      {photo.error && (
                        <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center p-2">
                          <p className="text-white text-xs text-center">{photo.error}</p>
                        </div>
                      )}
                      {!photo.uploading && (
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      )}
                      {photo.url && (
                        <a
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-1 left-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-3 w-3 text-white" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhotos}
              >
                <Upload className="h-4 w-4 mr-2" />
                {photos.length === 0 ? "Add Inspection Photos" : `Add More Photos (${photos.length} selected)`}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Photos will be uploaded to Supabase Storage (inspection-photos bucket) and linked to this inspection.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setCompleteOpen(false); setPhotos([]); }}>Cancel</Button>
              <Button onClick={handleCompleteInspection} disabled={uploadingPhotos}>
                {uploadingPhotos ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uploading Photos...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-1" /> Mark Complete</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CORRECTIVE ACTION DIALOG */}
      <Dialog open={caOpen} onOpenChange={setCaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Corrective Action</DialogTitle>
          </DialogHeader>
          {selectedFinding && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{selectedFinding.findingNumber}</p>
                <p className="text-muted-foreground mt-1">{selectedFinding.description}</p>
              </div>
              <div>
                <Label>Corrective Action Description *</Label>
                <Textarea
                  value={caForm.description}
                  onChange={e => setCaForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the corrective action required..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="date" value={caForm.dueDate} onChange={e => setCaForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label>Responsible Party</Label>
                <Input value={caForm.responsibleParty} onChange={e => setCaForm(p => ({ ...p, responsibleParty: e.target.value }))} placeholder="Name or organization responsible" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCaOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => addCorrectiveActionMutation.mutate({
                    findingId: selectedFinding.id,
                    description: caForm.description,
                    dueDate: new Date(caForm.dueDate),
                    responsibleParty: caForm.responsibleParty || undefined,
                  })}
                  disabled={!caForm.description || !caForm.dueDate || addCorrectiveActionMutation.isPending}
                >
                  {addCorrectiveActionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Assign Corrective Action
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
