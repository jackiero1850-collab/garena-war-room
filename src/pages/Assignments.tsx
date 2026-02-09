import { useState, useEffect } from "react";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, CheckCircle2, Clock, ChevronLeft, ChevronRight, Image, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { compressToWebp } from "@/lib/imageUtils";

interface Assignment {
  id: string; title: string; description: string | null; due_date: string;
  type: string; status: string; created_by: string | null; created_at: string;
  cover_image_url: string | null; website: string | null;
}

interface Submission {
  id: string; assignment_id: string; user_id: string;
  image_proof_urls: string[]; notes: string | null; submitted_at: string;
}

const Assignments = () => {
  const { user, role } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [websites, setWebsites] = useState<{ id: string; name: string }[]>([]);
  const [assignmentTypes, setAssignmentTypes] = useState<{ id: string; name: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newType, setNewType] = useState<string>("event");
  const [newWebsite, setNewWebsite] = useState<string>("none");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>("");

  const [submitNotes, setSubmitNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const fetchData = async () => {
    const [{ data: aData }, { data: sData }, { data: pData }, { data: wData }, { data: atData }] = await Promise.all([
      supabase.from("assignments").select("*").order("due_date", { ascending: true }),
      supabase.from("assignment_submissions").select("*"),
      supabase.from("profiles").select("id, username, email"),
      supabase.from("websites").select("id, name").order("name"),
      supabase.from("master_assignment_types").select("id, name").order("name"),
    ]);
    setAssignments((aData as Assignment[]) || []);
    setSubmissions((sData as Submission[]) || []);
    const pMap: Record<string, string> = {};
    (pData || []).forEach((p: any) => { pMap[p.id] = p.username || p.email; });
    setProfiles(pMap);
    setWebsites((wData as any[]) || []);
    setAssignmentTypes((atData as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingAssignment(null);
    setNewTitle(""); setNewDesc(""); setNewDueDate(format(new Date(), "yyyy-MM-dd")); setNewType("event"); setNewWebsite("none"); setCoverUrl("");
    setShowCreate(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setNewTitle(a.title); setNewDesc(a.description || ""); setNewDueDate(a.due_date); setNewType(a.type); setNewWebsite(a.website || "none"); setCoverUrl(a.cover_image_url || "");
    setShowCreate(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCoverUploading(true);
    try {
      const webpFile = await compressToWebp(file, 1200, 0.8);
      const path = `covers/${Date.now()}_cover.webp`;
      const { error } = await supabase.storage.from("assignment-proofs").upload(path, webpFile);
      if (!error) {
        const { data } = supabase.storage.from("assignment-proofs").getPublicUrl(path);
        setCoverUrl(data.publicUrl);
      }
    } catch {}
    setCoverUploading(false);
  };

  const handleCreateOrEdit = async () => {
    if (!newTitle.trim()) return;
    const payload: any = {
      title: newTitle.trim(), description: newDesc.trim() || null, due_date: newDueDate,
      type: newType, cover_image_url: coverUrl || null, website: newWebsite === "none" ? null : newWebsite,
    };
    if (editingAssignment) {
      const { error } = await supabase.from("assignments").update(payload).eq("id", editingAssignment.id);
      if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      toast({ title: "อัปเดตงานแล้ว" });
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("assignments").insert(payload as any);
      if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      toast({ title: "สร้างงานแล้ว" });
    }
    setShowCreate(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ลบงานแล้ว" }); setSelectedAssignment(null); fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const webpFile = await compressToWebp(file);
        const path = `${user.id}/${Date.now()}_proof.webp`;
        const { error } = await supabase.storage.from("assignment-proofs").upload(path, webpFile);
        if (!error) {
          const { data } = supabase.storage.from("assignment-proofs").getPublicUrl(path);
          urls.push(data.publicUrl);
        }
      } catch {}
    }
    setUploadedUrls((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmitProof = async () => {
    if (!selectedAssignment || !user) return;
    const { error } = await supabase.from("assignment_submissions").insert({
      assignment_id: selectedAssignment.id, user_id: user.id,
      image_proof_urls: uploadedUrls, notes: submitNotes.trim() || null,
    } as any);
    if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ส่งหลักฐานแล้ว!" });
    setShowSubmit(false); setSubmitNotes(""); setUploadedUrls([]); fetchData();
  };

  const getCountdownBadge = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px]">เลยกำหนด</Badge>;
    if (days <= 3) return <Badge className="bg-primary/20 text-primary animate-pulse text-[10px]">อีก {days} วัน</Badge>;
    return null;
  };

  const hasSubmitted = (assignmentId: string) =>
    submissions.some((s) => s.assignment_id === assignmentId && s.user_id === user?.id);

  const getSubmitters = (assignmentId: string) =>
    submissions.filter((s) => s.assignment_id === assignmentId).map((s) => profiles[s.user_id] || "ไม่ทราบ");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: addDays(monthStart, -monthStart.getDay()), end: addDays(monthEnd, 6 - monthEnd.getDay()) });

  const getAssignmentsForDay = (day: Date) => assignments.filter((a) => isSameDay(new Date(a.due_date), day));

  // Mission view data
  const today = new Date();
  const todayMissions = assignments.filter((a) => isSameDay(new Date(a.due_date), today));
  const incomingMissions = assignments.filter((a) => {
    const d = new Date(a.due_date);
    const diff = differenceInDays(d, today);
    return diff >= 1 && diff <= 3;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">งานที่มอบหมาย</h1>
        {role === "manager" && (
          <Button onClick={openCreate} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
            <Plus className="mr-2 h-4 w-4" /> สร้างงานใหม่
          </Button>
        )}
      </div>

      {/* Calendar */}
      <div className="rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => addDays(startOfMonth(m), -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="font-display text-sm uppercase tracking-wider text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => addDays(endOfMonth(m), 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 border-b border-border">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div key={d} className="p-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayAssignments = getAssignmentsForDay(day);
            const isToday = isSameDay(day, today);
            return (
              <div key={i} className={cn("min-h-[90px] border-b border-r border-border p-1", !isSameMonth(day, currentMonth) && "bg-muted/20", isToday && "bg-primary/5")}>
                <span className={cn("block text-xs", isToday ? "font-bold text-primary" : "text-muted-foreground")}>{format(day, "d")}</span>
                {dayAssignments.map((a) => (
                  <button key={a.id} onClick={() => setSelectedAssignment(a)}
                    className={cn("mt-0.5 w-full rounded px-1 py-0.5 text-left text-[10px] font-medium flex items-center gap-1", a.type === "event" ? "bg-primary/20 text-primary" : "bg-accent/40 text-accent-foreground")}>
                    {a.cover_image_url && <img src={a.cover_image_url} alt="" className="h-5 w-5 rounded-sm object-cover shrink-0" />}
                    <span className="truncate">{a.title}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission Split View */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Missions */}
        <div className="rounded border border-primary/30 bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h3 className="font-display text-sm uppercase tracking-wider text-foreground">ภารกิจวันนี้</h3>
            <Badge variant="outline" className="ml-auto text-xs">{todayMissions.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {todayMissions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">ไม่มีภารกิจวันนี้</p>
            ) : todayMissions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                {a.cover_image_url && <img src={a.cover_image_url} alt="" className="h-10 w-10 rounded object-cover shrink-0 border border-border" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a.website && <span className="text-[10px] text-muted-foreground">{a.website}</span>}
                  </div>
                </div>
                {hasSubmitted(a.id) ? (
                  <Badge className="bg-[hsl(var(--warroom-success))]/20 text-[hsl(var(--warroom-success))] shrink-0"><CheckCircle2 className="mr-1 h-3 w-3" />ส่งแล้ว</Badge>
                ) : (
                  <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0" onClick={() => { setSelectedAssignment(a); setShowSubmit(true); }}>
                    <Upload className="mr-1 h-3 w-3" /> ส่งงาน
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Missions */}
        <div className="rounded border border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="font-display text-sm uppercase tracking-wider text-foreground">กำลังจะมาถึง (3 วัน)</h3>
            <Badge variant="outline" className="ml-auto text-xs">{incomingMissions.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {incomingMissions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">ไม่มีงานใน 3 วันข้างหน้า</p>
            ) : incomingMissions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedAssignment(a)}>
                {a.cover_image_url && <img src={a.cover_image_url} alt="" className="h-10 w-10 rounded object-cover shrink-0 border border-border" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  {a.website && <span className="text-[10px] text-muted-foreground">{a.website}</span>}
                </div>
                {getCountdownBadge(a.due_date)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Assignment Detail */}
      {selectedAssignment && !showSubmit && (
        <div className="rounded border border-primary/30 bg-card p-5 space-y-4">
          <div className="flex items-start gap-4">
            {selectedAssignment.cover_image_url && (
              <img src={selectedAssignment.cover_image_url} alt="Cover" className="h-24 w-36 rounded border border-border object-cover shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-foreground">{selectedAssignment.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(null)} className="text-muted-foreground">✕</Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{selectedAssignment.type}</Badge>
                {selectedAssignment.website && <Badge variant="outline">{selectedAssignment.website}</Badge>}
                {getCountdownBadge(selectedAssignment.due_date)}
                <span className="text-sm text-muted-foreground">กำหนด: {format(new Date(selectedAssignment.due_date), "dd MMM yyyy")}</span>
              </div>
              {selectedAssignment.description && <p className="text-sm text-muted-foreground">{selectedAssignment.description}</p>}
              <div className="space-y-2 pt-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">สถานะการส่ง</p>
                {getSubmitters(selectedAssignment.id).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {getSubmitters(selectedAssignment.id).map((name, i) => (
                      <Badge key={i} className="bg-[hsl(var(--warroom-success))]/20 text-[hsl(var(--warroom-success))]"><CheckCircle2 className="mr-1 h-3 w-3" /> {name}</Badge>
                    ))}
                  </div>
                ) : (<p className="text-sm text-muted-foreground">ยังไม่มีคนส่ง</p>)}
              </div>
              <div className="flex gap-2 pt-2">
                {!hasSubmitted(selectedAssignment.id) ? (
                  <Button onClick={() => setShowSubmit(true)} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
                    <Upload className="mr-2 h-4 w-4" /> ส่งหลักฐาน
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded bg-[hsl(var(--warroom-success))]/10 px-4 py-2 text-[hsl(var(--warroom-success))]">
                    <CheckCircle2 className="h-4 w-4" /><span className="text-sm font-medium">คุณส่งแล้ว</span>
                  </div>
                )}
                {role === "manager" && (
                  <>
                    <Button variant="outline" size="icon" onClick={() => { const a = selectedAssignment; setSelectedAssignment(null); openEdit(a); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(selectedAssignment.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Proof Dialog */}
      <Dialog open={showSubmit} onOpenChange={(o) => { if (!o) { setShowSubmit(false); setUploadedUrls([]); setSubmitNotes(""); } }}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">ส่งหลักฐาน</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">อัปโหลดรูปภาพ</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-border p-6 hover:border-primary/50 transition-colors">
                <Image className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลด"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              {uploadedUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {uploadedUrls.map((url, i) => (<img key={i} src={url} alt="proof" className="h-16 w-16 rounded border border-border object-cover" />))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">หมายเหตุ</Label>
              <Textarea value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} className="border-border bg-muted/50" placeholder="หมายเหตุเพิ่มเติม..." />
            </div>
            <Button onClick={handleSubmitProof} disabled={uploadedUrls.length === 0} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">ส่ง</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Assignment Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{editingAssignment ? "แก้ไขงาน" : "สร้างงานใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่องาน</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="border-border bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">รายละเอียด</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="border-border bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">กำหนดส่ง</Label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="border-border bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">ประเภท</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assignmentTypes.map((t) => (<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">เว็บไซต์</Label>
              <Select value={newWebsite} onValueChange={setNewWebsite}>
                <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่มี</SelectItem>
                  {websites.map((w) => (<SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ภาพปก</Label>
              {coverUrl && <img src={coverUrl} alt="Cover" className="w-full h-32 object-cover rounded border border-border mb-2" />}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-border p-4 hover:border-primary/50 transition-colors">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{coverUploading ? "กำลังอัปโหลด..." : "อัปโหลดภาพปก"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={coverUploading} />
              </label>
            </div>
            <Button onClick={handleCreateOrEdit} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
              {editingAssignment ? "บันทึก" : "สร้าง"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assignments;
