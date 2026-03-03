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
import { AlertTriangle, Loader2, Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const EVENT_STATUS_COLORS: Record<string, string> = {
  published: "bg-blue-100 text-blue-800",
  pre_bid_held: "bg-purple-100 text-purple-800",
  bids_received: "bg-yellow-100 text-yellow-800",
  evaluation_ongoing: "bg-orange-100 text-orange-800",
  awarded: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function BiddingWorkflow() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = id ? parseInt(id) : null;
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [submitBidOpen, setSubmitBidOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState({
    selectionMode: "solicited",
    publicationDate: "",
    bidSubmissionDeadline: "",
    bidOpeningDate: "",
  });
  const [bidForm, setBidForm] = useState({ bidderName: "", bidAmount: "", bidDocumentUrl: "" });

  const { data: project } = trpc.project.getById.useQuery(projectId ? { projectId } : skipToken);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = trpc.bidding.getEvents.useQuery(
    projectId ? { projectId } : skipToken
  );
  const { data: bids = [], isLoading: bidsLoading, refetch: refetchBids } = trpc.bidding.getBids.useQuery(
    selectedEventId ? { biddingEventId: selectedEventId } : skipToken
  );

  const createEventMutation = trpc.bidding.createEvent.useMutation({
    onSuccess: () => {
      toast.success("Bidding event created");
      setCreateEventOpen(false);
      setEventForm({ selectionMode: "solicited", publicationDate: "", bidSubmissionDeadline: "", bidOpeningDate: "" });
      refetchEvents();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitBidMutation = trpc.bidding.submitBid.useMutation({
    onSuccess: () => {
      toast.success("Bid submitted successfully");
      setSubmitBidOpen(false);
      setBidForm({ bidderName: "", bidAmount: "", bidDocumentUrl: "" });
      refetchBids();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!projectId) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p>No project selected.</p>
            <Button className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEvaluator = user?.role === "admin" || user?.role === "evaluator" || user?.role === "secretariat";
  const isProponent = user?.role === "proponent" || user?.role === "admin";

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2 -ml-2">
            ← Back to Project
          </Button>
          <h1 className="text-2xl font-bold">Competitive Selection & Bidding</h1>
          {project && <p className="text-muted-foreground">{(project as any).projectName}</p>}
        </div>
        {isEvaluator && (
          <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Create Bidding Event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Bidding Event</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Selection Mode *</Label>
                  <Select value={eventForm.selectionMode} onValueChange={(v) => setEventForm((p) => ({ ...p, selectionMode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solicited">Solicited</SelectItem>
                      <SelectItem value="unsolicited">Unsolicited</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Publication Date *</Label>
                  <Input type="datetime-local" value={eventForm.publicationDate} onChange={(e) => setEventForm((p) => ({ ...p, publicationDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Bid Submission Deadline *</Label>
                  <Input type="datetime-local" value={eventForm.bidSubmissionDeadline} onChange={(e) => setEventForm((p) => ({ ...p, bidSubmissionDeadline: e.target.value }))} />
                </div>
                <div>
                  <Label>Bid Opening Date *</Label>
                  <Input type="datetime-local" value={eventForm.bidOpeningDate} onChange={(e) => setEventForm((p) => ({ ...p, bidOpeningDate: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateEventOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createEventMutation.mutate({
                      projectId: projectId!,
                      selectionMode: eventForm.selectionMode as any,
                      publicationDate: new Date(eventForm.publicationDate),
                      bidSubmissionDeadline: new Date(eventForm.bidSubmissionDeadline),
                      bidOpeningDate: new Date(eventForm.bidOpeningDate),
                    })}
                    disabled={!eventForm.publicationDate || !eventForm.bidSubmissionDeadline || !eventForm.bidOpeningDate || createEventMutation.isPending}
                  >
                    {createEventMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{events.length}</div>
          <div className="text-sm text-muted-foreground">Bidding Events</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{bids.length}</div>
          <div className="text-sm text-muted-foreground">Bids Received</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{events.filter((e: any) => e.status === "awarded").length}</div>
          <div className="text-sm text-muted-foreground">Awarded</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="mb-4">
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="bids">Bids {selectedEventId ? `(${bids.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Bidding Events</CardTitle>
              <CardDescription>Competitive selection events for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No bidding events yet</p>
                  {isEvaluator && <p className="text-sm mt-1">Create a bidding event to start the competitive selection process.</p>}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidding No.</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Submission Deadline</TableHead>
                      <TableHead>Opening Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev: any) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.biddingNumber}</TableCell>
                        <TableCell className="capitalize">{ev.selectionMode}</TableCell>
                        <TableCell className="text-sm">{new Date(ev.bidSubmissionDeadline).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{new Date(ev.bidOpeningDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${EVENT_STATUS_COLORS[ev.status] || "bg-gray-100 text-gray-800"}`}>
                            {ev.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedEventId(ev.id)}>
                            View Bids
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bids">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bid Submissions</CardTitle>
                <CardDescription>{selectedEventId ? `Bidding Event #${selectedEventId}` : "Select an event from the Events tab to view bids"}</CardDescription>
              </div>
              {isProponent && selectedEventId && (
                <Dialog open={submitBidOpen} onOpenChange={setSubmitBidOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Submit Bid</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Submit Bid</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label>Bidder Name *</Label>
                        <Input value={bidForm.bidderName} onChange={(e) => setBidForm((p) => ({ ...p, bidderName: e.target.value }))} placeholder="Company or individual name" />
                      </div>
                      <div>
                        <Label>Bid Amount (PHP) *</Label>
                        <Input type="number" min="0" step="0.01" value={bidForm.bidAmount} onChange={(e) => setBidForm((p) => ({ ...p, bidAmount: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Bid Document URL *</Label>
                        <Input value={bidForm.bidDocumentUrl} onChange={(e) => setBidForm((p) => ({ ...p, bidDocumentUrl: e.target.value }))} placeholder="https://..." />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSubmitBidOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => submitBidMutation.mutate({
                            biddingEventId: selectedEventId!,
                            bidderName: bidForm.bidderName,
                            bidAmount: parseFloat(bidForm.bidAmount),
                            bidDocumentUrl: bidForm.bidDocumentUrl,
                          })}
                          disabled={!bidForm.bidderName || !bidForm.bidAmount || !bidForm.bidDocumentUrl || submitBidMutation.isPending}
                        >
                          {submitBidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                          Submit Bid
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!selectedEventId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Select a bidding event from the Events tab to view its bids.</p>
                </div>
              ) : bidsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : bids.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="font-medium">No bids submitted yet for this event</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidder</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid: any) => (
                      <TableRow key={bid.id}>
                        <TableCell className="font-medium">{bid.bidderName}</TableCell>
                        <TableCell>₱{parseFloat(bid.bidAmount).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(bid.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{bid.status}</Badge></TableCell>
                        <TableCell>
                          <a href={bid.bidDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View</a>
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
    </div>
  );
}
