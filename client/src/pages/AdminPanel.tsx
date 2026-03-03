import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, RotateCcw, Settings, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-800" },
  { value: "evaluator", label: "Evaluator", color: "bg-purple-100 text-purple-800" },
  { value: "secretariat", label: "Secretariat", color: "bg-blue-100 text-blue-800" },
  { value: "board_member", label: "Board Member", color: "bg-indigo-100 text-indigo-800" },
  { value: "proponent", label: "Proponent", color: "bg-green-100 text-green-800" },
  { value: "agency_reviewer", label: "Agency Reviewer", color: "bg-yellow-100 text-yellow-800" },
  { value: "enforcement_officer", label: "Enforcement Officer", color: "bg-orange-100 text-orange-800" },
  { value: "public", label: "Public", color: "bg-gray-100 text-gray-800" },
];

const STAGE_NAMES = [
  "intake","pre_qualification","mou","compliance_docs","full_compliance",
  "evaluation","board_review","bidding","agreement","monitoring","closure",
];

const STAGE_LABELS: Record<string, string> = {
  intake: "Intake", pre_qualification: "Pre-Qualification", mou: "MOU",
  compliance_docs: "Compliance Docs", full_compliance: "Full Compliance",
  evaluation: "Evaluation", board_review: "Board Review", bidding: "Bidding",
  agreement: "Agreement", monitoring: "Monitoring", closure: "Closure",
};

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.value === role);
  return r
    ? <Badge className={`text-xs ${r.color}`}>{r.label}</Badge>
    : <Badge variant="outline" className="text-xs">{role}</Badge>;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [editingUser, setEditingUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [slaForm, setSlaForm] = useState<{ stageName: string; defaultDays: number; escalationDays: number; description: string } | null>(null);

  const { data: users = [], isLoading: usersLoading } = trpc.admin.getUsers.useQuery();
  const { data: slaConfigs = [], isLoading: slaLoading } = trpc.admin.getSLAConfigs.useQuery();
  const { data: slaTimers = [] } = trpc.admin.getActiveSlaTimers.useQuery();
  const { data: stats } = trpc.stats.getDashboardStats.useQuery();

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.admin.getUsers.invalidate(); setEditingUser(null); },
    onError: (e) => toast.error(e.message),
  });

  const upsertSla = trpc.admin.upsertSLAConfig.useMutation({
    onSuccess: () => { toast.success("SLA config saved"); utils.admin.getSLAConfigs.invalidate(); setSlaForm(null); },
    onError: (e) => toast.error(e.message),
  });

  const checkSla = trpc.admin.checkSla.useMutation({
    onSuccess: (d) => { toast.success(`SLA check: ${d.overdue} overdue, ${d.warnings} warnings`); utils.admin.getActiveSlaTimers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [demoResetConfirm, setDemoResetConfirm] = useState(false);
  const [demoResetLog, setDemoResetLog] = useState("");
  const resetDemo = trpc.admin.resetDemo.useMutation({
    onSuccess: (d) => {
      setDemoResetLog(d.seedOutput || "");
      setDemoResetConfirm(false);
      toast.success(`Demo reset complete — ${d.deletedRows} rows cleared, 12 projects re-seeded`);
      utils.admin.getUsers.invalidate();
      utils.admin.getActiveSlaTimers.invalidate();
      utils.stats.getDashboardStats.invalidate();
    },
    onError: (e) => { toast.error(`Reset failed: ${e.message}`); setDemoResetConfirm(false); },
  });

  if (user?.role !== "admin") return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
        <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="font-medium">Admin Access Required</p>
        <p className="text-muted-foreground text-sm mt-1">Only administrators can access this panel.</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </CardContent></Card>
    </div>
  );

  const overdueCount = Number((stats as any)?.overdueTimers ?? 0);
  const total = Number((stats as any)?.total ?? 0);
  const now = new Date();

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-2 -ml-2">Back to Dashboard</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Admin Panel</h1>
          <p className="text-muted-foreground">System configuration, user management, and SLA monitoring</p>
        </div>
      </div>

      {/* System Health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className="text-3xl font-bold">{(users as any[]).length}</div><div className="text-sm text-muted-foreground mt-0.5">Total Users</div></div><Users className="h-8 w-8 text-blue-400 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className="text-3xl font-bold">{total}</div><div className="text-sm text-muted-foreground mt-0.5">Projects</div></div><CheckCircle className="h-8 w-8 text-green-400 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className="text-3xl font-bold">{(slaTimers as any[]).length}</div><div className="text-sm text-muted-foreground mt-0.5">Active Timers</div></div><RefreshCw className="h-8 w-8 text-indigo-400 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><div className={`text-3xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-600"}`}>{overdueCount}</div><div className="text-sm text-muted-foreground mt-0.5">SLA Overdue</div></div><AlertTriangle className={`h-8 w-8 opacity-60 ${overdueCount > 0 ? "text-red-400" : "text-gray-400"}`} /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="sla">SLA Configuration</TabsTrigger>
          <TabsTrigger value="timers">Active Timers</TabsTrigger>
          <TabsTrigger value="demo">Demo Reset</TabsTrigger>
        </TabsList>

        {/* User Management */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> User Management</CardTitle>
              <CardDescription>Manage user roles and access permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                : (users as any[]).length === 0 ? <div className="text-center py-8 text-muted-foreground">No users registered yet.</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                        <TableHead>Last Sign In</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users as any[]).map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                          <TableCell><RoleBadge role={u.role} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            {u.id === user?.id
                              ? <span className="text-xs text-muted-foreground">You</span>
                              : <Button variant="outline" size="sm" onClick={() => { setEditingUser(u); setNewRole(u.role); }}>Change Role</Button>
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Configuration */}
        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> SLA Configuration</CardTitle>
                  <CardDescription>Configure deadline days for each lifecycle stage</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => checkSla.mutate()} disabled={checkSla.isPending}>
                    {checkSla.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Run SLA Check
                  </Button>
                  <Button size="sm" onClick={() => setSlaForm({ stageName: "", defaultDays: 30, escalationDays: 45, description: "" })}>
                    Add Config
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {slaLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                <>
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Stage SLA Reference</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {STAGE_NAMES.map(s => (
                        <div key={s} className="flex items-center justify-between text-xs bg-background rounded p-2 border">
                          <span className="text-muted-foreground">{STAGE_LABELS[s]}</span>
                          <span className="font-medium">{(slaConfigs as any[]).find((c: any) => c.stageName === s)?.defaultDays ?? "—"}d</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {(slaConfigs as any[]).length === 0
                    ? <div className="text-center py-6 text-muted-foreground text-sm">No custom SLA configurations. Using workflow engine defaults.</div>
                    : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Stage</TableHead><TableHead>Default Days</TableHead><TableHead>Escalation Days</TableHead>
                            <TableHead>Description</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(slaConfigs as any[]).map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[c.stageName] || c.stageName}</Badge></TableCell>
                              <TableCell className="font-medium">{c.defaultDays}d</TableCell>
                              <TableCell className="text-muted-foreground">{c.escalationDays ? `${c.escalationDays}d` : "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.description || "—"}</TableCell>
                              <TableCell>{c.isActive ? <Badge className="text-xs bg-green-100 text-green-800">Active</Badge> : <Badge variant="secondary" className="text-xs">Inactive</Badge>}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => setSlaForm({ stageName: c.stageName, defaultDays: c.defaultDays, escalationDays: c.escalationDays || 0, description: c.description || "" })}>Edit</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Timers */}
        <TabsContent value="timers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Active SLA Timers</CardTitle>
              <CardDescription>All active deadline timers across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {(slaTimers as any[]).length === 0
                ? <div className="text-center py-8 text-muted-foreground">No active SLA timers.</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead><TableHead>Stage</TableHead><TableHead>Due Date</TableHead>
                        <TableHead>Days Remaining</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(slaTimers as any[]).map((t: any) => {
                        const d = Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / 86400000);
                        const ov = d < 0; const warn = d <= 7 && d >= 0;
                        return (
                          <TableRow key={t.id}>
                            <TableCell><div className="font-medium text-sm">{t.projectName}</div><div className="text-xs text-muted-foreground">{t.projectCode}</div></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[t.stage] || t.stage}</Badge></TableCell>
                            <TableCell className="text-sm">{new Date(t.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell><span className={`font-medium text-sm ${ov ? "text-red-600" : warn ? "text-yellow-600" : "text-green-600"}`}>{ov ? `${Math.abs(d)}d overdue` : `${d}d`}</span></TableCell>
                            <TableCell>{ov ? <Badge className="text-xs bg-red-100 text-red-800">Overdue</Badge> : warn ? <Badge className="text-xs bg-yellow-100 text-yellow-800">Warning</Badge> : <Badge className="text-xs bg-green-100 text-green-800">On Track</Badge>}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demo Mode Reset Tab */}
        <TabsContent value="demo">
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <RotateCcw className="h-5 w-5" />
                Demo Mode Reset
              </CardTitle>
              <CardDescription>
                Wipe all seed demo data and re-populate with 12 fresh Philippine reclamation projects (one per lifecycle stage).
                This action is irreversible and will delete all data associated with seed projects and users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800 text-sm">Destructive Operation</p>
                  <p className="text-orange-700 text-sm mt-1">
                    This will permanently delete all projects with code <code className="bg-orange-100 px-1 rounded">PRA-2024-*</code> and
                    all users with seed IDs, then re-run the seed generator. Only use this to reset a demo environment.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Projects", value: "12", sub: "One per lifecycle stage" },
                  { label: "Seed Users", value: "11", sub: "All 8 roles covered" },
                  { label: "SLA Configs", value: "11", sub: "All stages" },
                  { label: "Audit Logs", value: "~24", sub: "Per project" },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-2xl font-bold text-slate-800">{item.value}</div>
                    <div className="text-sm font-medium text-slate-700">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.sub}</div>
                  </div>
                ))}
              </div>
              {!demoResetConfirm ? (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => setDemoResetConfirm(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Demo Data
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-700">
                    Are you sure? This will delete all seed projects and users, then re-seed.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => resetDemo.mutate()}
                      disabled={resetDemo.isPending}
                    >
                      {resetDemo.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Resetting...</>
                      ) : (
                        <><RotateCcw className="h-4 w-4 mr-2" />Yes, Reset Now</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setDemoResetConfirm(false)} disabled={resetDemo.isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {demoResetLog && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Seed Output (last 500 chars):</p>
                  <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">{demoResetLog}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change User Role</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">User</Label>
              <p className="text-sm text-muted-foreground mt-1">{editingUser?.name || editingUser?.email || `User #${editingUser?.id}`}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Current Role</Label>
              <div className="mt-1">{editingUser && <RoleBadge role={editingUser.role} />}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={() => updateRole.mutate({ userId: editingUser.id, role: newRole as any })} disabled={updateRole.isPending || newRole === editingUser?.role}>
              {updateRole.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SLA Config Dialog */}
      <Dialog open={!!slaForm} onOpenChange={() => setSlaForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>SLA Configuration</DialogTitle></DialogHeader>
          {slaForm && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Stage</Label>
                <Select value={slaForm.stageName} onValueChange={v => setSlaForm({ ...slaForm, stageName: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>{STAGE_NAMES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Default Days</Label>
                <Input type="number" min={1} value={slaForm.defaultDays} onChange={e => setSlaForm({ ...slaForm, defaultDays: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Escalation Days (optional)</Label>
                <Input type="number" min={0} value={slaForm.escalationDays || ""} onChange={e => setSlaForm({ ...slaForm, escalationDays: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Description (optional)</Label>
                <Input value={slaForm.description} onChange={e => setSlaForm({ ...slaForm, description: e.target.value })} placeholder="e.g. Time for pre-qualification review" className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlaForm(null)}>Cancel</Button>
            <Button onClick={() => slaForm && upsertSla.mutate({ stageName: slaForm.stageName, defaultDays: slaForm.defaultDays, escalationDays: slaForm.escalationDays || undefined, description: slaForm.description || undefined })} disabled={upsertSla.isPending || !slaForm?.stageName || !slaForm?.defaultDays}>
              {upsertSla.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
