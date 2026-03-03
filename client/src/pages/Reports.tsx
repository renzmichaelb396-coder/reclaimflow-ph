import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { AlertTriangle, BarChart3, CheckCircle, Clock, FileText, Loader2, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

const STAGE_LABELS: Record<string, string> = {
  intake: "Intake",
  pre_qualification: "Pre-Qualification",
  mou: "MOU",
  compliance_docs: "Compliance Docs",
  full_compliance: "Full Compliance",
  evaluation: "Evaluation",
  board_review: "Board Review",
  bidding: "Bidding",
  agreement: "Agreement",
  monitoring: "Monitoring",
  closure: "Closure",
};

const STAGE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#84cc16","#22c55e","#14b8a6","#0ea5e9","#3b82f6"];
const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", in_progress: "#3b82f6", completed: "#10b981", rejected: "#ef4444", on_hold: "#6b7280" };

export default function Reports() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const now = new Date();

  const { data: stats, isLoading } = trpc.stats.getDashboardStats.useQuery();
  const { data: projects = [] } = trpc.project.list.useQuery({ limit: 50 });
  const { data: slaTimers = [] } = trpc.admin.getActiveSlaTimers.useQuery();

  const canView = user?.role === "admin" || user?.role === "evaluator" || user?.role === "secretariat";

  if (!canView) return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
        <p className="text-muted-foreground">You do not have permission to view reports.</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </CardContent></Card>
    </div>
  );

  const total = Number((stats as any)?.total ?? 0);
  const overdueCount = Number((stats as any)?.overdueTimers ?? 0);
  const activeCount = Number(((stats as any)?.byStatus || []).find((s: any) => s.status === "in_progress")?.count ?? 0);
  const completedCount = Number(((stats as any)?.byStatus || []).find((s: any) => s.status === "completed")?.count ?? 0);

  const byStage = ((stats as any)?.byStage || []).map((s: any, i: number) => ({
    name: STAGE_LABELS[s.currentStage] || s.currentStage,
    count: Number(s.count),
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  const byStatus = ((stats as any)?.byStatus || []).map((s: any) => ({
    name: (s.status || "unknown").replace(/_/g, " "),
    value: Number(s.count),
    fill: STATUS_COLORS[s.status] || "#94a3b8",
  }));

  const warningTimers = (slaTimers as any[]).filter((t: any) => {
    const d = (new Date(t.dueDate).getTime() - now.getTime()) / 86400000;
    return d <= 7 && d >= 0;
  });

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-2 -ml-2">Back to Dashboard</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Reports & Analytics</h1>
          <p className="text-muted-foreground">Project pipeline overview and compliance statistics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className="text-3xl font-bold">{total}</div><div className="text-sm text-muted-foreground mt-0.5">Total Projects</div></div><FileText className="h-8 w-8 text-blue-400 opacity-60" /></div></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className="text-3xl font-bold text-blue-600">{activeCount}</div><div className="text-sm text-muted-foreground mt-0.5">Active</div></div><TrendingUp className="h-8 w-8 text-blue-400 opacity-60" /></div></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className="text-3xl font-bold text-green-600">{completedCount}</div><div className="text-sm text-muted-foreground mt-0.5">Completed</div></div><CheckCircle className="h-8 w-8 text-green-400 opacity-60" /></div></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className={`text-3xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-600"}`}>{overdueCount}</div><div className="text-sm text-muted-foreground mt-0.5">SLA Overdue</div></div><AlertTriangle className={`h-8 w-8 opacity-60 ${overdueCount > 0 ? "text-red-400" : "text-gray-400"}`} /></div></CardContent></Card>
          </div>

          <Tabs defaultValue="pipeline">
            <TabsList className="mb-4">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="sla">SLA Monitoring</TabsTrigger>
              <TabsTrigger value="projects">All Projects</TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline">
              <Card>
                <CardHeader><CardTitle>Projects by Lifecycle Stage</CardTitle><CardDescription>Distribution across PPP lifecycle stages</CardDescription></CardHeader>
                <CardContent>
                  {byStage.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground"><BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No project data yet</p></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={byStage} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Projects" radius={[4,4,0,0]}>
                          {byStage.map((_: any, i: number) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
                  <CardContent>
                    {byStatus.length === 0 ? <p className="text-muted-foreground text-center py-8">No data</p> : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={byStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                            {byStatus.map((_: any, i: number) => <Cell key={i} fill={byStatus[i].fill} />)}
                          </Pie>
                          <Tooltip /><Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Status Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {byStatus.map((s: any) => (
                        <div key={s.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} /><span className="text-sm capitalize">{s.name}</span></div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${total > 0 ? (s.value/total)*100 : 0}%`, backgroundColor: s.fill }} /></div>
                            <span className="text-sm font-medium w-6 text-right">{s.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sla">
              <div className="space-y-4">
                {overdueCount > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="pt-4"><div className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" /><span className="font-medium">{overdueCount} project{overdueCount > 1 ? "s" : ""} with overdue SLA timers</span></div></CardContent></Card>}
                {warningTimers.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50"><CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-yellow-700 mb-3"><Clock className="h-5 w-5" /><span className="font-medium">{warningTimers.length} timer{warningTimers.length > 1 ? "s" : ""} due within 7 days</span></div>
                    <div className="space-y-2">{warningTimers.map((t: any) => { const d = Math.ceil((new Date(t.dueDate).getTime()-now.getTime())/86400000); return (<div key={t.id} className="flex items-center justify-between text-sm bg-white rounded p-2 border border-yellow-100"><div><span className="font-medium">{t.projectName}</span><span className="text-muted-foreground ml-2">({t.projectCode})</span></div><span className="text-yellow-700 font-medium">{d}d left</span></div>); })}</div>
                  </CardContent></Card>
                )}
                <Card>
                  <CardHeader><CardTitle>Active SLA Timers</CardTitle></CardHeader>
                  <CardContent>
                    {(slaTimers as any[]).length === 0 ? <div className="text-center py-8 text-muted-foreground"><Clock className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No active timers</p></div> : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Stage</TableHead><TableHead>Due Date</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {(slaTimers as any[]).map((t: any) => {
                            const d = Math.ceil((new Date(t.dueDate).getTime()-now.getTime())/86400000);
                            const ov = d < 0; const warn = d <= 7 && d >= 0;
                            return (
                              <TableRow key={t.id}>
                                <TableCell><div className="font-medium text-sm">{t.projectName}</div><div className="text-xs text-muted-foreground">{t.projectCode}</div></TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[t.stage]||t.stage}</Badge></TableCell>
                                <TableCell className="text-sm">{new Date(t.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell><span className={`font-medium text-sm ${ov?"text-red-600":warn?"text-yellow-600":"text-green-600"}`}>{ov?`${Math.abs(d)}d overdue`:`${d}d`}</span></TableCell>
                                <TableCell>{ov?<Badge className="text-xs bg-red-100 text-red-800">Overdue</Badge>:warn?<Badge className="text-xs bg-yellow-100 text-yellow-800">Warning</Badge>:<Badge className="text-xs bg-green-100 text-green-800">On Track</Badge>}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="projects">
              <Card>
                <CardHeader><CardTitle>Project Pipeline</CardTitle><CardDescription>All projects and their current lifecycle stage</CardDescription></CardHeader>
                <CardContent>
                  {(projects as any[]).length === 0 ? <div className="text-center py-8 text-muted-foreground">No projects yet.</div> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Project Name</TableHead><TableHead>Proponent</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(projects as any[]).map((p: any) => (
                          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/projects/"+p.id)}>
                            <TableCell className="font-medium">{p.projectName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.proponentName||"—"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[p.currentStage]||p.currentStage}</Badge></TableCell>
                            <TableCell><Badge variant={p.status==="in_progress"?"default":"secondary"} className="text-xs">{p.status?.replace(/_/g," ")}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.createdAt?new Date(p.createdAt).toLocaleDateString():"—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
