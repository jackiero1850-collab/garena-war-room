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

const ROLES = ["Manager", "Leader", "Sales", "Graphic"];

interface TeamMember {
  id: string;
  name: string;
  nickname: string | null;
  role: string;
  team_id: string | null;
  teamName?: string;
}

interface Team {
  id: string;
  name: string;
}

const TeamRoster = () => {
  const { role } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formRole, setFormRole] = useState("Sales");
  const [formTeamId, setFormTeamId] = useState("none");

  const fetchData = async () => {
    const [{ data: mData }, { data: tData }] = await Promise.all([
      supabase.from("team_members").select("*").order("name"),
      supabase.from("teams").select("*"),
    ]);
    setTeams((tData as Team[]) || []);
    const teamMap: Record<string, string> = {};
    (tData || []).forEach((t: any) => { teamMap[t.id] = t.name; });
    setMembers(
      ((mData as any[]) || []).map((m) => ({
        ...m,
        teamName: m.team_id ? teamMap[m.team_id] || "—" : "—",
      }))
    );
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">Access restricted to managers</p>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditMember(null);
    setFormName(""); setFormNickname(""); setFormRole("Sales"); setFormTeamId("none");
    setDialogOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditMember(m);
    setFormName(m.name);
    setFormNickname(m.nickname || "");
    setFormRole(m.role);
    setFormTeamId(m.team_id || "none");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: formName.trim(),
      nickname: formNickname.trim() || null,
      role: formRole,
      team_id: formTeamId === "none" ? null : formTeamId,
    };

    if (editMember) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", editMember.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Member updated" });
    } else {
      const { error } = await supabase.from("team_members").insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Member added" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Member removed" });
    fetchData();
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.nickname || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Team Roster</h1>
        <Button onClick={openCreate} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
          <UserPlus className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-border bg-card pl-10" />
      </div>

      <div className="rounded border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Nickname</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Team</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No members yet. Add your first team member.</TableCell></TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className="border-border">
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.nickname || "—"}</TableCell>
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
            <DialogTitle className="font-display uppercase tracking-wider">{editMember ? "Edit Member" : "Add Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-border bg-muted/50" placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nickname</Label>
              <Input value={formNickname} onChange={(e) => setFormNickname(e.target.value)} className="border-border bg-muted/50" placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Team</Label>
                <Select value={formTeamId} onValueChange={setFormTeamId}>
                  <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team</SelectItem>
                    {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
              {editMember ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamRoster;
