import { useAuth } from "@/_core/hooks/useAuth";
import { skipToken } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectIntake() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "upload" | "review">("form");
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    location: "",
    estimatedCost: "",
    proponentName: "",
    proponentEmail: "",
    contactPerson: "",
    contactPhone: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectId = new URLSearchParams(window.location.search).get("projectId");
  const parsedProjectId = projectId ? parseInt(projectId) : null;
  const { data: project, isLoading: projectLoading } = trpc.project.getById.useQuery(
    parsedProjectId ? { projectId: parsedProjectId } : skipToken
  );

  const createIntakeMutation = trpc.project.createIntake.useMutation({
    onSuccess: (data) => {
      toast.success("LOI submitted successfully");
      navigate(`/projects/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit LOI");
    },
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
    toast.success(`${files.length} file(s) added`);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.projectName || !formData.description || !formData.proponentName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createIntakeMutation.mutateAsync({
        projectName: formData.projectName,
        description: formData.description,
        location: formData.location,
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        proponentName: formData.proponentName,
        proponentEmail: formData.proponentEmail,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        documentCount: uploadedFiles.length,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Project Letter of Intent (LOI)</h1>
          <p className="text-gray-600">Submit your project proposal for pre-qualification review</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex gap-4">
          <div
            className={`flex-1 p-4 rounded-lg border-2 ${
              step === "form" ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
          >
            <div className="font-semibold">Step 1: Project Details</div>
          </div>
          <div
            className={`flex-1 p-4 rounded-lg border-2 ${
              step === "upload" ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
          >
            <div className="font-semibold">Step 2: Documents</div>
          </div>
          <div
            className={`flex-1 p-4 rounded-lg border-2 ${
              step === "review" ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
          >
            <div className="font-semibold">Step 3: Review</div>
          </div>
        </div>

        {/* Step 1: Form */}
        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Provide details about your proposed project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleFormChange}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="Enter project location"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describe your project in detail"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="estimatedCost">Estimated Cost (PHP)</Label>
                <Input
                  id="estimatedCost"
                  name="estimatedCost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={handleFormChange}
                  placeholder="0.00"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Proponent Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="proponentName">Proponent Name *</Label>
                    <Input
                      id="proponentName"
                      name="proponentName"
                      value={formData.proponentName}
                      onChange={handleFormChange}
                      placeholder="Enter proponent name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="proponentEmail">Email *</Label>
                    <Input
                      id="proponentEmail"
                      name="proponentEmail"
                      type="email"
                      value={formData.proponentEmail}
                      onChange={handleFormChange}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleFormChange}
                      placeholder="Enter contact person"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleFormChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button variant="outline" onClick={() => navigate(`/projects`)}>
                  Cancel
                </Button>
                <Button onClick={() => setStep("upload")} className="ml-auto">
                  Next: Upload Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Supporting Documents</CardTitle>
              <CardDescription>Attach required documents for your LOI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Required documents: Business registration, financial statements, technical proposal, environmental assessment
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="font-semibold mb-2">Click to upload or drag and drop</div>
                  <div className="text-sm text-gray-600">PDF, DOC, DOCX, XLS up to 10MB each</div>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Uploaded Files ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <Button variant="outline" onClick={() => setStep("form")}>
                  Back
                </Button>
                <Button onClick={() => setStep("review")} className="ml-auto">
                  Next: Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Submission</CardTitle>
              <CardDescription>Please review all information before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Project Details</div>
                    <div className="text-sm text-gray-600">{formData.projectName}</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Proponent Information</div>
                    <div className="text-sm text-gray-600">{formData.proponentName}</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Documents</div>
                    <div className="text-sm text-gray-600">{uploadedFiles.length} files attached</div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  By submitting this LOI, you confirm that all information is accurate and complete.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4 pt-6">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || createIntakeMutation.isPending}
                  className="ml-auto"
                >
                  {isSubmitting || createIntakeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit LOI"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
