import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useParams } from "wouter";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── MOU Countdown Component ──────────────────────────────────────────────────
function MouCountdown({ slaTimers }: { slaTimers: Array<{ id: number; stage: string; dueDate: Date | string; isOverdue: boolean }> }) {
  const mouTimer = slaTimers.find((t) => t.stage === "mou_expiry");
  if (!mouTimer) return null;

  const now = new Date();
  const dueDate = new Date(mouTimer.dueDate);
  const msLeft = dueDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0 || mouTimer.isOverdue;
  const isWarning = !isExpired && daysLeft <= 60;

  const containerClass = isExpired
    ? "border-2 border-red-400 bg-red-50 rounded-xl p-5"
    : isWarning
      ? "border-2 border-orange-400 bg-orange-50 rounded-xl p-5"
      : "border-2 border-blue-300 bg-blue-50 rounded-xl p-5";

  const labelClass = isExpired
    ? "text-red-700 font-bold text-sm uppercase tracking-wide"
    : isWarning
      ? "text-orange-700 font-bold text-sm uppercase tracking-wide"
      : "text-blue-700 font-bold text-sm uppercase tracking-wide";

  const countClass = isExpired
    ? "text-red-800 text-4xl font-extrabold tabular-nums"
    : isWarning
      ? "text-orange-800 text-4xl font-extrabold tabular-nums"
      : "text-blue-800 text-4xl font-extrabold tabular-nums";

  const Icon = isExpired ? ShieldAlert : isWarning ? AlertCircle : CalendarClock;
  const iconClass = isExpired
    ? "w-7 h-7 text-red-600"
    : isWarning
      ? "w-7 h-7 text-orange-600"
      : "w-7 h-7 text-blue-600";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={iconClass} />
        <span className={labelClass}>
          {isExpired ? "MOU EXPIRED" : isWarning ? "MOU EXPIRY WARNING" : "MOU Validity Countdown"}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <span className={countClass}>
            {isExpired ? "EXPIRED" : `${daysLeft.toLocaleString()} days`}
          </span>
          <p className="text-sm text-slate-600 mt-1">
            {isExpired
              ? `Expired on ${dueDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`
              : `Expires ${dueDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`}
          </p>
        </div>
      </div>
      {isWarning && !isExpired && (
        <p className="text-orange-700 text-sm mt-3 font-medium">
          ⚠ MOU expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Initiate extension process immediately.
        </p>
      )}
      {isExpired && (
        <p className="text-red-700 text-sm mt-3 font-medium">
          🚨 This MOU has expired. Project cannot proceed until a new MOU is executed.
        </p>
      )}
      <p className="text-xs text-slate-500 mt-2">
        24-month MOU validity period • Timer ID: {mouTimer.id}
      </p>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const projectId = parseInt(id || "0");

  const { data: project, isLoading } = trpc.project.getById.useQuery({
    projectId,
  });

  const { data: dashboard } = trpc.project.getDashboard.useQuery({
    projectId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 mb-4">Project not found</p>
              <Button onClick={() => navigate("/projects")}>
                Return to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-green-600";
      case "rejected": return "text-red-600";
      case "deficient": return "text-orange-600";
      default: return "text-slate-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected": return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-orange-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate("/projects")}
          >
            ← Back to Projects
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">
                  {project.projectName}
                </h1>
                {getStatusIcon(project.status)}
              </div>
              <p className="text-slate-600">
                {project.projectCode} • {project.location}
              </p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {project.currentStage.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    project.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : project.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : project.status === "deficient"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {project.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="agency">Agency</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">Project Code</p>
                    <p className="font-semibold">{project.projectCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Proponent Type</p>
                    <p className="font-semibold capitalize">{project.proponentType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Location</p>
                    <p className="font-semibold">{project.location}</p>
                  </div>
                  {project.estimatedArea && (
                    <div>
                      <p className="text-sm text-slate-600">Estimated Area</p>
                      <p className="font-semibold">
                        {parseFloat(project.estimatedArea.toString()).toLocaleString()} hectares
                      </p>
                    </div>
                  )}
                  {project.estimatedCost && (
                    <div>
                      <p className="text-sm text-slate-600">Estimated Cost</p>
                      <p className="font-semibold">
                        ₱{parseFloat(project.estimatedCost.toString()).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status & Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">Current Stage</p>
                    <p className="font-semibold capitalize">
                      {project.currentStage.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Status</p>
                    <p className={`font-semibold capitalize ${getStatusColor(project.status)}`}>
                      {project.status}
                    </p>
                  </div>
                  {project.submittedAt && (
                    <div>
                      <p className="text-sm text-slate-600">Submitted</p>
                      <p className="font-semibold">
                        {new Date(project.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {project.completedAt && (
                    <div>
                      <p className="text-sm text-slate-600">Completed</p>
                      <p className="font-semibold">
                        {new Date(project.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {project.description && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700">{project.description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <div className="space-y-6">
              {/* MOU 24-Month Countdown — shown whenever mou_expiry timer exists */}
              {dashboard?.slaTimers && dashboard.slaTimers.some((t) => t.stage === "mou_expiry") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-blue-600" />
                      MOU Validity Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MouCountdown slaTimers={dashboard.slaTimers} />
                  </CardContent>
                </Card>
              )}

              {/* All SLA Timers */}
              <Card>
                <CardHeader>
                  <CardTitle>SLA Timers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboard?.slaTimers && dashboard.slaTimers.length > 0 ? (
                      dashboard.slaTimers.map((timer) => {
                        const dueDate = new Date(timer.dueDate);
                        const now = new Date();
                        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isExpired = timer.isOverdue || daysLeft <= 0;
                        const isWarning = !isExpired && daysLeft <= 7;
                        return (
                          <div
                            key={timer.id}
                            className={`p-4 border rounded-lg ${
                              isExpired
                                ? "border-red-300 bg-red-50"
                                : isWarning
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-slate-200"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-slate-900 capitalize">
                                  {timer.stage.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Due: {dueDate.toLocaleDateString("en-PH")}
                                  {!isExpired && ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining)`}
                                </p>
                              </div>
                              {isExpired ? (
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                              ) : isWarning ? (
                                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            {isExpired && (
                              <p className="text-xs text-red-600 mt-1 font-medium">OVERDUE — Escalation required</p>
                            )}
                            {isWarning && (
                              <p className="text-xs text-orange-600 mt-1 font-medium">WARNING — Deadline approaching</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-slate-600">No SLA timers active for this project</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.documents && dashboard.documents.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 border border-slate-200 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{doc.documentName}</p>
                          <p className="text-sm text-slate-600">
                            v{doc.version} • {doc.status}
                          </p>
                        </div>
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.checklist && dashboard.checklist.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border border-slate-200 rounded-lg flex items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={item.isVerified}
                          disabled
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{item.id}</p>
                          {item.notes && (
                            <p className="text-sm text-slate-600">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No checklist items</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Module Navigation */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Project Modules</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/projects/${projectId}/intake`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Project Intake</p>
                <p className="text-sm text-slate-600">LOI submission & processing</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/pre-qualification`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Pre-Qualification</p>
                <p className="text-sm text-slate-600">Assessment & SLA tracking</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/documents`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Documents</p>
                <p className="text-sm text-slate-600">MOU & compliance docs</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/agency-coordination`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Agency Coordination</p>
                <p className="text-sm text-slate-600">DENR/NEDA requests</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/evaluation`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Evaluation</p>
                <p className="text-sm text-slate-600">Risk & CSW assessment</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/board`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Board Management</p>
                <p className="text-sm text-slate-600">Decisions & resolutions</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/bidding`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Bidding Workflow</p>
                <p className="text-sm text-slate-600">Competitive selection</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/agreements`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Agreements</p>
                <p className="text-sm text-slate-600">Execution & signing</p>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/monitoring`)}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition"
              >
                <p className="font-semibold text-slate-900">Monitoring</p>
                <p className="text-sm text-slate-600">Inspections & compliance</p>
              </button>
            </div>
          </div>

          {/* Agency Tab */}
          <TabsContent value="agency">
            <Card>
              <CardHeader>
                <CardTitle>Agency Coordination</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Agency coordination details will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluation Tab */}
          <TabsContent value="evaluation">
            <Card>
              <CardHeader>
                <CardTitle>Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.evaluations && dashboard.evaluations.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.evaluations.map((eval_) => (
                      <div
                        key={eval_.id}
                        className="p-4 border border-slate-200 rounded-lg"
                      >
                        <p className="font-semibold capitalize">
                          {eval_.evaluationType} Evaluation
                        </p>
                        <p className="text-sm text-slate-600">
                          Score: {eval_.score} / {eval_.maxScore}
                        </p>
                        <p className="text-sm text-slate-600">Status: {eval_.status}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No evaluations yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Board Tab */}
          <TabsContent value="board">
            <Card>
              <CardHeader>
                <CardTitle>Board Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Board decisions and resolutions will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle>Monitoring & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Inspection reports and compliance findings will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
