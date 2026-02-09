import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Pencil, Trash2, Search, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables, Enums } from "@/integrations/supabase/types";

const ROLES: Enums<"app_role">[] = ["manager", "leader", "sales", "graphic"];

const UserManagement = () => {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<(Tables<"profiles"> & { role?: Enums<"app_role"> | null; teamName?: string })[]>([]);
  const [teams, setTeams] = useState<Tables<"teams">[]>([]);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<string>("sales");
  const [editTeamId, setEditTeamId] = useState<string>("none");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUsers = async () => {
    const [{ data: profilesData }, { data: rolesData }, { data: teamsData }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("teams").select("*"),
    ]);
    setTeams(teamsData || []);
    const roleMap: Record<string, Enums<"app_role">> = {};
    (rolesData || []).forEach((r) => { roleMap[r.user_id] = r.role; });
    const teamMap: Record<string, string> = {};
    (teamsData || []).forEach((t) => { teamMap[t.id] = t.name; });

    setProfiles(
      (profilesData || []).map((p) => ({
        ...p,
        role: roleMap[p.id] || null,
        teamName: p.team_id ? teamMap[p.team_id] || "—" : "—",
      }))
    );
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditUsername(user.username || "");
    setEditRole(user.role || "sales");
    setEditTeamId(user.team_id || "none");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editUser) return;

    // Update profile
    await supabase.from("profiles").update({
      username: editUsername || null,
      team_id: editTeamId === "none" ? null : editTeamId,
    }).eq("id", editUser.id);

    // Upsert role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", editUser.id)
      .maybeSingle();

    if (existingRole) {
      await supabase.from("user_roles").update({ role: editRole as any }).eq("id", existingRole.id);
    } else {
      await supabase.from("user_roles").insert({ user_id: editUser.id, role: editRole as any });
    }

    toast({ title: "User updated" });
    setDialogOpen(false);
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    toast({ title: "User role removed" });
    fetchUsers();
  };

  const filtered = profiles.filter(
    (p) =>
      (p.username || "").toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">User Management</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-border bg-card pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="rounded border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground">Email</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Username</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Team</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id} className="border-border">
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.username || "—"}</TableCell>
                <TableCell>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                    {user.role || "unassigned"}
                  </span>
                </TableCell>
                <TableCell>{user.teamName}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input value={editUser?.email || ""} disabled className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="border-border bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="border-border bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Team</Label>
              <Select value={editTeamId} onValueChange={setEditTeamId}>
                <SelectTrigger className="border-border bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
