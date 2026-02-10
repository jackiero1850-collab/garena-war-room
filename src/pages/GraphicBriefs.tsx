import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Layers, CheckCircle2, Clock, User } from "lucide-react";
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

const GraphicBriefs = () => {
  const { user, role } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [graphicMembers, setGraphicMembers] = useState<{ id: string; name: string; nickname: string | null }[]>([]);
  const [briefTypes, setBriefTypes] = useState<{ id: string; name: string }[]>([]);

  const [briefType, setBriefType] = useState("");
  const [description, setDescription] = useState("");
  const [graphicMemberId, setGraphicMemberId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const [{ data: bData }, { data: pData }, { data: gData }, { data: btData }] = await Promise.all([
      supabase.from("graphic_briefs").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, email"),
      supabase.from("team_members").select("id, name, nickname, role").eq("role", "Graphic").order("name"),
      supabase.from("master_brief_types").select("id, name").order("name"),
    ]);
    setBriefs((bData as Brief[]) || []);
    const pMap: Record<string, string> = {};
    (pData || []).forEach((p: any) => { pMap[p.id] = p.username || p.email; });
    setProfiles(pMap);
    setGraphicMembers((gData as any[]) || []);
    setBriefTypes((btData as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

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
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ส่งบรีฟแล้ว" });
      setDescription(""); setBriefType("");
      fetchData();
    }
  };

  const markDone = async (briefId: string) => {
    const { error } = await supabase.from("graphic_briefs").update({
      status: "done" as any,
      completion_date: new Date().toISOString(),
    }).eq("id", briefId);
    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const activeBriefs = briefs.filter((b) => b.status !== "done");
  const doneBriefs = briefs.filter((b) => b.status === "done");

  // Graphic member lookup
  const graphicMap: Record<string, string> = {};
  graphicMembers.forEach((g) => { graphicMap[g.id] = g.nickname || g.name; });

  // Workload summary
  const workloadMap: Record<string, { name: string; total: number }> = {};
  graphicMembers.forEach((g) => {
    workloadMap[g.id] = { name: g.nickname || g.name, total: 0 };
  });
  activeBriefs.forEach((b) => {
    if (b.graphic_user_id && workloadMap[b.graphic_user_id]) {
      workloadMap[b.graphic_user_id].total++;
    }
  });

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd-MM-yyyy"); } catch { return d; }
  };
  const formatTime = (d: string) => {
    try { return format(new Date(d), "HH:mm"); } catch { return ""; }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl text-foreground">บรีฟกราฟิก</h1>

      {/* Designer Workload Banner */}
      {graphicMembers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {graphicMembers.map((g) => {
            const w = workloadMap[g.id];
            return (
              <div key={g.id} className="flex items-center gap-3 rounded border border-border bg-card p-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold", w.total === 0 ? "bg-[hsl(var(--warroom-success))]/20 text-[hsl(var(--warroom-success))]" : w.total >= 5 ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400")}>
                  {w.total}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {w.total === 0 ? "ว่าง" : `${w.total} งานค้าง`}
                  </p>
                </div>
                <div className={cn("h-2 w-2 rounded-full", w.total === 0 ? "bg-[hsl(var(--warroom-success))]" : w.total >= 5 ? "bg-destructive animate-pulse" : "bg-yellow-400")} />
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded border border-border bg-card p-5 space-y-4">
            <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">คำขอใหม่</h3>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ประเภท</Label>
              <Select value={briefType} onValueChange={setBriefType}>
                <SelectTrigger className="border-border bg-muted/50"><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>
                  {briefTypes.length === 0 ? (
                    <SelectItem value="none" disabled>ไม่พบประเภท — เพิ่มในตั้งค่าระบบ</SelectItem>
                  ) : briefTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">กราฟิกดีไซเนอร์</Label>
              <Select value={graphicMemberId} onValueChange={setGraphicMemberId}>
                <SelectTrigger className="border-border bg-muted/50"><SelectValue placeholder="เลือกดีไซเนอร์" /></SelectTrigger>
                <SelectContent>
                  {graphicMembers.length === 0 ? (
                    <SelectItem value="none" disabled>ไม่พบสมาชิกกราฟิก — เพิ่มในรายชื่อพนักงาน</SelectItem>
                  ) : (
                    graphicMembers.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nickname || g.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">รายละเอียด</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border-border bg-muted/50" placeholder="อธิบายบรีฟ..." rows={4} />
            </div>

            <Button type="submit" disabled={submitting || !briefType} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Layers className="mr-2 h-4 w-4" />
              {submitting ? "กำลังส่ง..." : "ส่งบรีฟ"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">คิวที่กำลังทำ</h3>

          {activeBriefs.length === 0 ? (
            <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              ไม่มีบรีฟที่กำลังทำ
            </div>
          ) : (
            <div className="space-y-2">
              {activeBriefs.map((brief) => (
                <div key={brief.id} className="flex items-center gap-3 rounded border border-border bg-card p-3">
                  <Badge variant="outline" className="shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Clock className="mr-1 h-3 w-3" /> รอดำเนินการ
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{brief.brief_type}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary">{profiles[brief.sales_user_id] || "—"}</span>
                      {" → "}
                      {brief.graphic_user_id ? graphicMap[brief.graphic_user_id] || "—" : "ยังไม่มอบหมาย"}
                      {" · "}
                      {formatTime(brief.created_at)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => markDone(brief.id)} className="shrink-0 text-xs text-[hsl(var(--warroom-success))]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> เสร็จ
                  </Button>
                </div>
              ))}
            </div>
          )}

          {doneBriefs.length > 0 && (
            <>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground mt-6">เสร็จสมบูรณ์</h3>
              <div className="space-y-2">
                {doneBriefs.slice(0, 10).map((brief) => (
                  <div key={brief.id} className="flex items-center gap-3 rounded border border-border bg-card/50 p-3 opacity-60">
                    <Badge variant="outline" className="shrink-0 bg-[hsl(var(--warroom-success))]/20 text-[hsl(var(--warroom-success))] border-[hsl(var(--warroom-success))]/30">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> เสร็จแล้ว
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{brief.brief_type}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-primary">{profiles[brief.sales_user_id] || "—"}</span>
                        {" → "}
                        {brief.graphic_user_id ? graphicMap[brief.graphic_user_id] || "—" : "—"}
                        {" · "}
                        {brief.completion_date ? formatDate(brief.completion_date) : "—"}
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
