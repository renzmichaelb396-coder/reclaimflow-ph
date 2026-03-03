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
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, Loader2, Upload, AlertTriangle } from "lucide-react";
import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending_verification: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  superseded: "bg-blue-100 text-blue-800",
};

export default function DocumentManagement() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ documentName: "", documentTypeId: "", issuedBy: "", issuedDate: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("documents");

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: documents = [], isLoading: docsLoading, refetch } = trpc.document.getByProject.useQuery(projectId ? { projectId } : skipToken);
  const { data: checklist = [], isLoading: checklistLoading, refetch: refetchChecklist } = trpc.document.getChecklist.useQuery(projectId ? { projectId } : skipToken);
  const { data: docTypes = [] } = trpc.document.getDocumentTypes.useQuery();

  const uploadMutation = trpc.document.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setUploadOpen(false);
      setUploadForm({ documentName: "", documentTypeId: "", issuedBy: "", issuedDate: "" });
      setSelectedFile(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async () => {
    if (!selectedFile || !uploadForm.documentName || !projectId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", String(projectId));
      formData.append("documentType", "project_document");
      const res = await fetch("/api/upload/document", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const uploaded = await res.json();
      await uploadMutation.mutateAsync({
        projectId: projectId!,
        documentTypeId: parseInt(uploadForm.documentTypeId) || 1,
        documentName: uploadForm.documentName,
        fileUrl: uploaded.url,
        fileKey: uploaded.key,
        fileMimeType: uploaded.mimeType,
        fileSize: uploaded.size,
        issuedBy: uploadForm.issuedBy || undefined,
        issuedDate: uploadForm.issuedDate ? new Date(uploadForm.issuedDate) : undefined,
      });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const verifyMutation = trpc.document.verify.useMutation({
    onSuccess: () => { toast.success("Document status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const checklistMutation = trpc.document.updateChecklistItem.useMutation({
    onSuccess: () => { toast.success("Checklist item updated"); refetchChecklist(); },
    onError: (e) => toast.error(e.message),
  });

  if (!projectId) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p>No project selected.</p>
          <Button className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
        </CardContent></Card>
      </div>
    );
  }

  const isEvaluator = user?.role === "admin" || user?.role === "evaluator" || user?.role === "secretariat";
  const verifiedCount = checklist.filter((i: any) => i.isVerified).length;
  const totalChecklist = checklist.length;

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2 -ml-2">← Back to Project</Button>
          <h1 className="text-2xl font-bold">Document Management</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Document Name *</Label>
                <Input value={uploadForm.documentName} onChange={(e) => setUploadForm((p) => ({ ...p, documentName: e.target.value }))} placeholder="e.g., Environmental Compliance Certificate" />
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={uploadForm.documentTypeId} onValueChange={(v) => setUploadForm((p) => ({ ...p, documentTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {docTypes.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.typeName}</SelectItem>)}
                    <SelectItem value="1">General Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File *</Label>
                <div className="mt-1">
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={(e) => { const f = e.target.files?.[0] || null; setSelectedFile(f); if (f && !uploadForm.documentName) setUploadForm(p => ({ ...p, documentName: f.name.replace(/\.[^.]+$/, "") })); }} />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Choose File
                    </Button>
                    {selectedFile ? (
                      <span className="text-sm text-muted-foreground truncate max-w-[180px]">{selectedFile.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No file chosen</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, or image (max 50MB)</p>
                </div>
              </div>
              <div>
                <Label>Issued By</Label>
                <Input value={uploadForm.issuedBy} onChange={(e) => setUploadForm((p) => ({ ...p, issuedBy: e.target.value }))} placeholder="Issuing agency or authority" />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={uploadForm.issuedDate} onChange={(e) => setUploadForm((p) => ({ ...p, issuedDate: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={!uploadForm.documentName || !selectedFile || uploading || uploadMutation.isPending}
                >
                  {(uploading || uploadMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{documents.length}</div><div className="text-sm text-muted-foreground">Total Documents</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{documents.filter((d: any) => d.status === "verified").length}</div><div className="text-sm text-muted-foreground">Verified</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalChecklist > 0 ? `${verifiedCount}/${totalChecklist}` : "—"}</div><div className="text-sm text-muted-foreground">Checklist Items</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="checklist">Compliance Checklist ({totalChecklist})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Project Documents</CardTitle></CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No documents uploaded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Issued By</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Status</TableHead>
                      {isEvaluator && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{doc.documentName}</a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{doc.issuedBy || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${STATUS_COLORS[doc.status] || "bg-gray-100 text-gray-800"}`}>{doc.status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        {isEvaluator && (
                          <TableCell>
                            <div className="flex gap-1">
                              {doc.status === "pending_verification" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => verifyMutation.mutate({ documentId: doc.id, status: "verified" })}>Verify</Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300" onClick={() => verifyMutation.mutate({ documentId: doc.id, status: "rejected" })}>Reject</Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Checklist</CardTitle>
              <CardDescription>Track required documents for full compliance</CardDescription>
            </CardHeader>
            <CardContent>
              {checklistLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : checklist.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No compliance checklist items</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklist.map((item: any) => (
                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-lg border ${item.isVerified ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        {item.isVerified ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Clock className="h-5 w-5 text-gray-400 shrink-0" />}
                        <div>
                          <div className="font-medium text-sm">{item.documentTypeId ? `Document Type #${item.documentTypeId}` : "Compliance Item"}</div>
                          {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                          {item.isRequired && <Badge variant="outline" className="text-xs border-red-300 text-red-700 mt-1">Required</Badge>}
                        </div>
                      </div>
                      {isEvaluator && (
                        <Button size="sm" variant={item.isVerified ? "outline" : "default"} className="h-7 text-xs" onClick={() => checklistMutation.mutate({ itemId: item.id, isVerified: !item.isVerified })} disabled={checklistMutation.isPending}>
                          {item.isVerified ? "Revoke" : "Verify"}
                        </Button>
                      )}
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
