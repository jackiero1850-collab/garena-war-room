import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Shield, Globe, Users, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Website { id: string; name: string; }
interface Team { id: string; name: string; }

const SystemSettings = () => {
  const { role } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  // Dialog state
  const [dialogType, setDialogType] = useState<"website" | "team" | "role" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");

  const fetchData = async () => {
    const [{ data: wData }, { data: tData }, { data: mData }] = await Promise.all([
      supabase.from("websites").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("team_members").select("role"),
    ]);
    setWebsites((wData as Website[]) || []);
    setTeams((tData as Team[]) || []);
    const uniqueRoles = [...new Set((mData || []).map((m: any) => m.role))].sort();
    // Ensure defaults
    ["Manager", "Leader", "Sales", "Graphic"].forEach((r) => {
      if (!uniqueRoles.includes(r)) uniqueRoles.push(r);
    });
    setRoles(uniqueRoles.sort());
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-muted-foreground">เฉพาะผู้จัดการเท่านั้น</p>
      </div>
    );
  }

  const openCreate = (type: "website" | "team" | "role") => {
    setDialogType(type); setEditId(null); setFormName("");
  };
  const openEdit = (type: "website" | "team", id: string, name: string) => {
    setDialogType(type); setEditId(id); setFormName(name);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (dialogType === "website") {
      if (editId) {
        const { error } = await supabase.from("websites").update({ name: formName.trim() }).eq("id", editId);
        if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      } else {
        const { error } = await supabase.from("websites").insert({ name: formName.trim() } as any);
        if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      }
    } else if (dialogType === "team") {
      if (editId) {
        const { error } = await supabase.from("teams").update({ name: formName.trim() }).eq("id", editId);
        if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      } else {
        const { error } = await supabase.from("teams").insert({ name: formName.trim() } as any);
        if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
      }
    } else if (dialogType === "role") {
      // Roles are just stored in team_members, we track unique values
      if (!roles.includes(formName.trim())) {
        setRoles((prev) => [...prev, formName.trim()].sort());
      }
    }
    toast({ title: "บันทึกแล้ว" });
    setDialogType(null);
    fetchData();
  };

  const handleDelete = async (type: "website" | "team", id: string) => {
    const table = type === "website" ? "websites" : "teams";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ลบแล้ว" });
    fetchData();
  };

  const dialogTitle = dialogType === "website" ? (editId ? "แก้ไขเว็บไซต์" : "เพิ่มเว็บไซต์")
    : dialogType === "team" ? (editId ? "แก้ไขทีม" : "เพิ่มทีม")
    : "เพิ่มตำแหน่ง";

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl text-foreground">ตั้งค่าระบบ</h1>

      <Tabs defaultValue="websites" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="websites" className="gap-2"><Globe className="h-3.5 w-3.5" /> เว็บไซต์</TabsTrigger>
          <TabsTrigger value="teams" className="gap-2"><Users className="h-3.5 w-3.5" /> ทีม</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Tag className="h-3.5 w-3.5" /> ตำแหน่ง</TabsTrigger>
        </TabsList>

        {/* Websites Tab */}
        <TabsContent value="websites" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCreate("website")} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มเว็บไซต์
            </Button>
          </div>
          <div className="rounded border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-muted-foreground">ชื่อเว็บไซต์</TableHead>
                  <TableHead className="text-right text-xs uppercase text-muted-foreground">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites.map((w) => (
                  <TableRow key={w.id} className="border-border">
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit("website", w.id, w.name)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete("website", w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCreate("team")} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มทีม
            </Button>
          </div>
          <div className="rounded border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-muted-foreground">ชื่อทีม</TableHead>
                  <TableHead className="text-right text-xs uppercase text-muted-foreground">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((t) => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit("team", t.id, t.name)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete("team", t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCreate("role")} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มตำแหน่ง
            </Button>
          </div>
          <div className="rounded border border-border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span key={r} className="rounded bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">{r}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">ตำแหน่งจะถูกเพิ่มอัตโนมัติเมื่อใช้ในหน้าทีมรอสเตอร์</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Shared Dialog */}
      <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{dialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อ</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-border bg-muted/50" placeholder="ระบุชื่อ..." />
            </div>
            <Button onClick={handleSave} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
              บันทึก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemSettings;
