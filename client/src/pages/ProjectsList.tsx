import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Plus, Search, Filter, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function ProjectsList() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string | null>(null);

  const { data: projects, isLoading } = trpc.project.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const filteredProjects = projects?.filter((p) => {
    const matchesSearch =
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = !filterStage || p.currentStage === filterStage;
    return matchesSearch && matchesStage;
  });

  const stages = [
    "intake",
    "pre_qualification",
    "mou",
    "compliance_docs",
    "full_compliance",
    "evaluation",
    "board_review",
    "bidding",
    "agreement",
    "monitoring",
    "closure",
  ];

  const getModuleRoute = (stage: string, projectId: number): string => {
    switch (stage) {
      case "intake":
        return `/projects/${projectId}/intake`;
      case "pre_qualification":
        return `/projects/${projectId}/pre-qualification`;
      case "mou":
        return `/projects/${projectId}/documents`;
      case "compliance_docs":
        return `/projects/${projectId}/documents`;
      case "full_compliance":
        return `/projects/${projectId}/documents`;
      case "evaluation":
        return `/projects/${projectId}/evaluation`;
      case "board_review":
        return `/projects/${projectId}/board`;
      case "bidding":
        return `/projects/${projectId}/bidding`;
      case "agreement":
        return `/projects/${projectId}/agreements`;
      case "monitoring":
        return `/projects/${projectId}/monitoring`;
      case "closure":
        return `/projects/${projectId}`;
      default:
        return `/projects/${projectId}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <Button onClick={() => navigate("/dashboard")}>← Back to Dashboard</Button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by project name or code..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Filter className="w-4 h-4 text-slate-600 self-center" />
              <select
                value={filterStage || ""}
                onChange={(e) => setFilterStage(e.target.value || null)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="">All Stages</option>
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition cursor-pointer"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {project.projectName}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Code: {project.projectCode}
                      </p>
                      <p className="text-sm text-slate-600">
                        Location: {project.location}
                      </p>
                      <p className="text-sm text-slate-600">
                        Type: {project.proponentType}
                      </p>

                      <div className="flex gap-2 mt-4 flex-wrap">
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

                      {project.description && (
                        <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex gap-4 mt-4 text-sm text-slate-600">
                        {project.estimatedCost && (
                          <span>Cost: ₱{parseFloat(project.estimatedCost.toString()).toLocaleString()}</span>
                        )}
                        {project.estimatedArea && (
                          <span>Area: {parseFloat(project.estimatedArea.toString()).toLocaleString()} ha</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(getModuleRoute(project.currentStage, project.id))
                          }
                        >
                          Go to {project.currentStage.replace(/_/g, " ")}
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      {project.status === "approved" ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : project.status === "rejected" ? (
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      ) : (
                        <Clock className="w-8 h-8 text-orange-600" />
                      )}
                      <p className="text-xs text-slate-600 mt-2">
                        {project.updatedAt
                          ? new Date(project.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 mb-4">
                {searchTerm || filterStage ? "No projects match your filters" : "No projects yet"}
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
