import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Layers, ArrowRight, RotateCcw, CheckCircle2, Scissors, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Brief {
  id: string;
  request_date: string;
  request_time: string;
  sales_user_id: string;
  graphic_user_id: string | null;
  brief_type: string;
  description: string | null;
  status: string;
  completion_date: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  queue: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock, label: "Queue" },
  cutting: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Scissors, label: "Cutting" },
  done: { color: "bg-warroom-success/20 text-warroom-success border-warroom-success/30", icon: CheckCircle2, label: "Done" },
  fix: { color: "bg-primary/20 text-primary border-primary/30", icon: RotateCcw, label: "Fix" },
};

const GraphicBriefs = () => {
  const { user, role } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [graphicMembers, setGraphicMembers] = useState<{ id: string; name: string; nickname: string | null }[]>([]);

  // Form state
  const [briefType, setBriefType] = useState("Banner");
  const [description, setDescription] = useState("");
  const [graphicMemberId, setGraphicMemberId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const [{ data: bData }, { data: pData }, { data: gData }] = await Promise.all([
      supabase.from("graphic_briefs").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, email"),
      supabase.from("team_members").select("id, name, nickname, role").eq("role", "Graphic").order("name"),
    ]);
    setBriefs((bData as Brief[]) || []);
    const pMap: Record<string, string> = {};
    (pData || []).forEach((p: any) => { pMap[p.id] = p.username || p.email; });
    setProfiles(pMap);
    setGraphicMembers((gData as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("briefs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "graphic_briefs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !briefType.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("graphic_briefs").insert({
      sales_user_id: user.id,
      graphic_user_id: graphicMemberId || null,
      brief_type: briefType.trim(),
      description: description.trim() || null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Brief submitted" });
      setDescription(""); setBriefType("Banner");
      fetchData();
    }
  };

  const updateStatus = async (briefId: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "done") update.completion_date = new Date().toISOString();
    const { error } = await supabase.from("graphic_briefs").update(update).eq("id", briefId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const activeBriefs = briefs.filter((b) => b.status !== "done");
  const doneBriefs = briefs.filter((b) => b.status === "done");

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl text-foreground">Graphic Briefs</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Request Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded border border-border bg-card p-5 space-y-4">
            <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">New Request</h3>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={briefType} onValueChange={setBriefType}>
                <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Banner", "Poster", "Social Post", "Video Thumbnail", "Ad Creative", "Other"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Graphic Designer</Label>
              <Select value={graphicMemberId} onValueChange={setGraphicMemberId}>
                <SelectTrigger className="border-border bg-muted/50"><SelectValue placeholder="Select designer" /></SelectTrigger>
                <SelectContent>
                  {graphicMembers.length === 0 ? (
                    <SelectItem value="none" disabled>No graphic members found</SelectItem>
                  ) : (
                    graphicMembers.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nickname || g.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border-border bg-muted/50" placeholder="Describe your brief..." rows={4} />
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Layers className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Brief"}
            </Button>
          </form>
        </div>

        {/* Right: Queue Status */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Active Queue</h3>

          {activeBriefs.length === 0 ? (
            <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No active briefs
            </div>
          ) : (
            <div className="space-y-2">
              {activeBriefs.map((brief) => {
                const statusConfig = STATUS_CONFIG[brief.status] || STATUS_CONFIG.queue;
                const StatusIcon = statusConfig.icon;
                return (
                  <div key={brief.id} className="flex items-center gap-3 rounded border border-border bg-card p-3">
                    <Badge variant="outline" className={cn("shrink-0", statusConfig.color)}>
                      <StatusIcon className="mr-1 h-3 w-3" /> {statusConfig.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{brief.brief_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {profiles[brief.sales_user_id] || "Unknown"} → {brief.graphic_user_id ? profiles[brief.graphic_user_id] || "Assigned" : "Unassigned"}
                      </p>
                      {brief.description && <p className="mt-1 truncate text-xs text-muted-foreground">{brief.description}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {brief.status === "queue" && (role === "manager" || brief.graphic_user_id === user?.id) && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(brief.id, "cutting")} className="text-xs">
                          <Scissors className="mr-1 h-3 w-3" /> Start
                        </Button>
                      )}
                      {brief.status === "cutting" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(brief.id, "done")} className="text-xs text-warroom-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                        </Button>
                      )}
                      {(brief.status === "cutting" || brief.status === "done") && (brief.sales_user_id === user?.id || role === "manager") && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(brief.id, "fix")} className="text-xs text-destructive">
                          <RotateCcw className="mr-1 h-3 w-3" /> Fix
                        </Button>
                      )}
                      {brief.status === "fix" && (role === "manager" || brief.graphic_user_id === user?.id) && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(brief.id, "queue")} className="text-xs">
                          <ArrowRight className="mr-1 h-3 w-3" /> Re-queue
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {doneBriefs.length > 0 && (
            <>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground mt-6">Completed</h3>
              <div className="space-y-2">
                {doneBriefs.slice(0, 10).map((brief) => (
                  <div key={brief.id} className="flex items-center gap-3 rounded border border-border bg-card/50 p-3 opacity-60">
                    <Badge variant="outline" className={STATUS_CONFIG.done.color}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{brief.brief_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {profiles[brief.sales_user_id] || "Unknown"} • {brief.completion_date ? format(new Date(brief.completion_date), "MMM dd") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphicBriefs;
