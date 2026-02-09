import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Shield, Globe, Users, Tag, Layers, FileType, Settings2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { compressToWebp } from "@/lib/imageUtils";

interface NamedItem { id: string; name: string; }

const SystemSettings = () => {
  const { user, role } = useAuth();
  const [websites, setWebsites] = useState<NamedItem[]>([]);
  const [teams, setTeams] = useState<NamedItem[]>([]);
  const [roles, setRoles] = useState<NamedItem[]>([]);
  const [assignmentTypes, setAssignmentTypes] = useState<NamedItem[]>([]);
  const [briefTypes, setBriefTypes] = useState<NamedItem[]>([]);

  const [appName, setAppName] = useState("WAR ROOM");
  const [appLogoUrl, setAppLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const [dialogType, setDialogType] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");

  const fetchData = async () => {
    const [{ data: wData }, { data: tData }, { data: rData }, { data: atData }, { data: btData }, { data: sData }] = await Promise.all([
      supabase.from("websites").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("master_roles").select("*").order("name"),
      supabase.from("master_assignment_types").select("*").order("name"),
      supabase.from("master_brief_types").select("*").order("name"),
      supabase.from("app_settings").select("key, value"),
    ]);
    setWebsites((wData as NamedItem[]) || []);
    setTeams((tData as NamedItem[]) || []);
    setRoles((rData as NamedItem[]) || []);
    setAssignmentTypes((atData as NamedItem[]) || []);
    setBriefTypes((btData as NamedItem[]) || []);
    const sMap: Record<string, string> = {};
    (sData || []).forEach((r: any) => { sMap[r.key] = r.value; });
    setAppName(sMap["app_name"] || "WAR ROOM");
    setAppLogoUrl(sMap["app_logo_url"] || "");
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

  const tableMap: Record<string, string> = {
    website: "websites", team: "teams", role: "master_roles",
    assignment_type: "master_assignment_types", brief_type: "master_brief_types",
  };
  const labelMap: Record<string, string> = {
    website: "เว็บไซต์", team: "ทีม", role: "ตำแหน่ง",
    assignment_type: "ประเภทงาน", brief_type: "ประเภทบรีฟ",
  };

  const openCreate = (type: string) => { setDialogType(type); setEditId(null); setFormName(""); };
  const openEdit = (type: string, id: string, name: string) => { setDialogType(type); setEditId(id); setFormName(name); };

  const handleSave = async () => {
    if (!formName.trim() || !dialogType) return;
    const table = tableMap[dialogType];
    if (!table) return;
    if (editId) {
      const { error } = await (supabase.from(table as any) as any).update({ name: formName.trim() }).eq("id", editId);
      if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await (supabase.from(table as any) as any).insert({ name: formName.trim() });
      if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "บันทึกแล้ว" });
    setDialogType(null);
    fetchData();
  };

  const handleDelete = async (type: string, id: string) => {
    const table = tableMap[type];
    if (!table) return;
    const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
    if (error) { toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ลบแล้ว" });
    fetchData();
  };

  const handleSaveAppSettings = async () => {
    await Promise.all([
      supabase.from("app_settings").update({ value: appName } as any).eq("key", "app_name"),
      supabase.from("app_settings").update({ value: appLogoUrl } as any).eq("key", "app_logo_url"),
    ]);
    toast({ title: "บันทึกการตั้งค่าแล้ว" });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLogoUploading(true);
    try {
      const webpFile = await compressToWebp(file, 256, 0.85);
      const path = `app/logo_${Date.now()}.webp`;
      const { error } = await supabase.storage.from("avatars").upload(path, webpFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAppLogoUrl(data.publicUrl);
    } catch (err: any) {
      toast({ title: "อัปโหลดล้มเหลว", description: err.message, variant: "destructive" });
    }
    setLogoUploading(false);
  };

  const renderTable = (type: string, items: NamedItem[]) => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openCreate(type)} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
          <Plus className="mr-2 h-4 w-4" /> เพิ่ม{labelMap[type]}
        </Button>
      </div>
      <div className="rounded border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground">ชื่อ</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-border">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(type, item.id, item.name)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(type, item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const dialogTitle = dialogType ? (editId ? `แก้ไข${labelMap[dialogType]}` : `เพิ่ม${labelMap[dialogType]}`) : "";

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl text-foreground">ตั้งค่าระบบ</h1>

      <Tabs defaultValue="app" className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="app" className="gap-2"><Settings2 className="h-3.5 w-3.5" /> แอป</TabsTrigger>
          <TabsTrigger value="websites" className="gap-2"><Globe className="h-3.5 w-3.5" /> เว็บไซต์</TabsTrigger>
          <TabsTrigger value="teams" className="gap-2"><Users className="h-3.5 w-3.5" /> ทีม</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Tag className="h-3.5 w-3.5" /> ตำแหน่ง</TabsTrigger>
          <TabsTrigger value="assignment_types" className="gap-2"><Layers className="h-3.5 w-3.5" /> ประเภทงาน</TabsTrigger>
          <TabsTrigger value="brief_types" className="gap-2"><FileType className="h-3.5 w-3.5" /> ประเภทบรีฟ</TabsTrigger>
        </TabsList>

        <TabsContent value="app" className="space-y-4">
          <div className="rounded border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อแอป</Label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="border-border bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">โลโก้แอป</Label>
              <div className="flex items-center gap-4">
                {appLogoUrl && <img src={appLogoUrl} alt="Logo" className="h-12 w-12 rounded border border-border object-cover" />}
                <label className="flex cursor-pointer items-center gap-2 rounded border-2 border-dashed border-border px-4 py-3 hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{logoUploading ? "กำลังอัปโหลด..." : "อัปโหลดโลโก้"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
                {appLogoUrl && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setAppLogoUrl("")}>ลบโลโก้</Button>}
              </div>
            </div>
            <Button onClick={handleSaveAppSettings} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90">บันทึก</Button>
          </div>
        </TabsContent>

        <TabsContent value="websites">{renderTable("website", websites)}</TabsContent>
        <TabsContent value="teams">{renderTable("team", teams)}</TabsContent>
        <TabsContent value="roles">{renderTable("role", roles)}</TabsContent>
        <TabsContent value="assignment_types">{renderTable("assignment_type", assignmentTypes)}</TabsContent>
        <TabsContent value="brief_types">{renderTable("brief_type", briefTypes)}</TabsContent>
      </Tabs>

      <Dialog open={!!dialogType && dialogType !== "app"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{dialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อ</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-border bg-muted/50" placeholder="ระบุชื่อ..." />
            </div>
            <Button onClick={handleSave} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">บันทึก</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemSettings;
