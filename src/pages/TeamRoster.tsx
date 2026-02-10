import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Pencil, Trash2, Search, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string;
  nickname: string | null;
  role: string;
  team_id: string | null;
  email: string | null;
  teamName?: string;
}

interface Team { id: string; name: string; }

const TeamRoster = () => {
  const { role } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  const [formName, setFormName] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("Sales");
  const [formCustomRole, setFormCustomRole] = useState("");
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [formTeamId, setFormTeamId] = useState("none");

  const fetchData = async () => {
    const [{ data: mData }, { data: tData }, { data: rData }] = await Promise.all([
      supabase.from("team_members").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("master_roles").select("name").order("name"),
    ]);
    setTeams((tData as Team[]) || []);
    const teamMap: Record<string, string> = {};
    (tData || []).forEach((t: any) => { teamMap[t.id] = t.name; });
    const membersList = ((mData as any[]) || []).map((m) => ({
      ...m,
      teamName: m.team_id ? teamMap[m.team_id] || "—" : "—",
    }));
    setMembers(membersList);
    const dbRoles = ((rData as any[]) || []).map((r) => r.name);
    setAllRoles(dbRoles.length > 0 ? dbRoles : ["Sales"]);
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">เฉพาะผู้จัดการเท่านั้น</p>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditMember(null);
    setFormName(""); setFormNickname(""); setFormEmail(""); setFormRole("Sales"); setFormCustomRole(""); setUseCustomRole(false); setFormTeamId("none");
    setDialogOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditMember(m);
    setFormName(m.name);
    setFormNickname(m.nickname || "");
    setFormEmail(m.email || "");
    const isKnown = allRoles.includes(m.role);
    setFormRole(isKnown ? m.role : "__custom__");
    setFormCustomRole(isKnown ? "" : m.role);
    setUseCustomRole(!isKnown);
    setFormTeamId(m.team_id || "none");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "กรุณาระบุชื่อ", variant: "destructive" });
      return;
    }
    const finalRole = useCustomRole ? formCustomRole.trim() : formRole;
    if (!finalRole) {
      toast({ title: "กรุณาระบุตำแหน่ง", variant: "destructive" });
      return;
    }
    const payload = {
      name: formName.trim(),
      nickname: formNickname.trim() || null,
      email: formEmail.trim() || null,
      role: finalRole,
      team_id: formTeamId === "none" ? null : formTeamId,
    };

    if (editMember) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", editMember.id);
      if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      toast({ title: "อัปเดตแล้ว" });
    } else {
      const { error } = await supabase.from("team_members").insert(payload as any);
      if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      toast({ title: "เพิ่มสมาชิกแล้ว" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ลบแล้ว" });
    fetchData();
  };

  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(search.toLowerCase()) || (m.nickname || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">รายชื่อพนักงาน</h1>
        <Button onClick={openCreate} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
          <UserPlus className="mr-2 h-4 w-4" /> เพิ่มสมาชิก
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="ค้นหาสมาชิก..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-border bg-card pl-10" />
      </div>

      <div className="rounded border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground">ชื่อ</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">ชื่อเล่น</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">อีเมล</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">ตำแหน่ง</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">ทีม</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีสมาชิก เพิ่มสมาชิกคนแรก</TableCell></TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className="border-border">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {m.name}
                      {m.teamName && m.teamName !== "—" && (
                        <span className="rounded bg-accent/40 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">{m.teamName}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{m.nickname || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.email || "—"}</TableCell>
                  <TableCell>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{m.role}</span>
                  </TableCell>
                  <TableCell>{m.teamName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">{editMember ? "แก้ไขสมาชิก" : "เพิ่มสมาชิก"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อ</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-border bg-muted/50" placeholder="ชื่อจริง" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อเล่น</Label>
                <Input value={formNickname} onChange={(e) => setFormNickname(e.target.value)} className="border-border bg-muted/50" placeholder="ไม่บังคับ" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">อีเมล (สำหรับเชื่อมบัญชี)</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="border-border bg-muted/50" placeholder="user@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">ตำแหน่ง</Label>
                <Select value={useCustomRole ? "__custom__" : formRole} onValueChange={(v) => {
                  if (v === "__custom__") { setUseCustomRole(true); setFormRole("__custom__"); }
                  else { setUseCustomRole(false); setFormRole(v); setFormCustomRole(""); }
                }}>
                  <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allRoles.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                    <SelectItem value="__custom__">✏️ พิมพ์เอง...</SelectItem>
                  </SelectContent>
                </Select>
                {useCustomRole && (
                  <Input value={formCustomRole} onChange={(e) => setFormCustomRole(e.target.value)} className="border-border bg-muted/50 mt-2" placeholder="ระบุตำแหน่ง..." />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">ทีม</Label>
                <Select value={formTeamId} onValueChange={setFormTeamId}>
                  <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่มีทีม</SelectItem>
                    {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
              {editMember ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มสมาชิก"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamRoster;
