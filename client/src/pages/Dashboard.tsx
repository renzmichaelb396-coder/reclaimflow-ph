import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { BarChart3, Clock, FileText, Users, AlertCircle, CheckCircle, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery({
    limit: 10,
    offset: 0,
  });

  const { data: myTasks, isLoading: tasksLoading } = trpc.task.getAssignedToMe.useQuery();

  const { data: myNotifications, isLoading: notificationsLoading } =
    trpc.notification.getMyNotifications.useQuery({ unreadOnly: true });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (projectsLoading || tasksLoading || notificationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  const projectsByStage = {
    intake: projects?.filter((p) => p.currentStage === "intake").length || 0,
    preQual: projects?.filter((p) => p.currentStage === "pre_qualification").length || 0,
    evaluation: projects?.filter((p) => p.currentStage === "evaluation").length || 0,
    completed: projects?.filter((p) => p.currentStage === "closure").length || 0,
  };

  const overdueTasks = myTasks?.filter((t) => t.status === "pending").length || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ReclaimFlow PH</h1>
            <p className="text-sm text-slate-600">Project Lifecycle Management</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-600 capitalize">{user?.role.replace("_", " ")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {projects?.length || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active and completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                In Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {projectsByStage.evaluation}
              </div>
              <p className="text-xs text-slate-500 mt-1">Awaiting assessment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{myTasks?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                {overdueTasks} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {myNotifications?.length || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unread messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {projects && projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.slice(0, 5).map((project) => (
                      <div
                        key={project.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">
                              {project.projectName}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {project.projectCode} • {project.location}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {project.currentStage.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                {project.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            {project.status === "approved" ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : project.status === "rejected" ? (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No projects yet</p>
                    <Button className="mt-4" onClick={() => navigate("/projects")}>
                      View All Projects
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/projects")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View All Projects
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/reports")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
                {(user?.role === "admin" || user?.role === "enforcement_officer") && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => navigate("/enforcement")}
                  >
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Enforcement
                  </Button>
                )}
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/admin")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stage Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Projects by Stage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Intake</span>
                    <span className="font-semibold">{projectsByStage.intake}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((projectsByStage.intake || 0) / (projects?.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Pre-Qualification</span>
                    <span className="font-semibold">{projectsByStage.preQual}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{
                        width: `${((projectsByStage.preQual || 0) / (projects?.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Evaluation</span>
                    <span className="font-semibold">{projectsByStage.evaluation}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${((projectsByStage.evaluation || 0) / (projects?.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Completed</span>
                    <span className="font-semibold">{projectsByStage.completed}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${((projectsByStage.completed || 0) / (projects?.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
