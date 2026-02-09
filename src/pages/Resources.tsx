import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Plus, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  title: string;
  url: string;
  category: string;
  created_at: string;
}

const CATEGORIES = ["ทั่วไป", "เทมเพลต", "แนวทาง", "เครื่องมือ", "อบรม", "กฎหมาย"];

const Resources = () => {
  const { role } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("ทั่วไป");

  const fetchData = async () => {
    const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    setResources((data as Resource[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const { error } = await supabase.from("resources").insert({
      title: newTitle.trim(),
      url: newUrl.trim(),
      category: newCategory,
    } as any);
    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "เพิ่มแหล่งข้อมูลแล้ว" });
      setShowCreate(false);
      setNewTitle(""); setNewUrl("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const filtered = filterCat === "all" ? resources : resources.filter((r) => r.category === filterCat);
  const categories = [...new Set(resources.map((r) => r.category))];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">แหล่งข้อมูล</h1>
        <div className="flex items-center gap-3">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[140px] border-border bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {role === "manager" && (
            <Button onClick={() => setShowCreate(true)} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Plus className="mr-2 h-4 w-4" /> เพิ่ม
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded border border-border bg-card py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">ยังไม่มีแหล่งข้อมูล</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer"
              className="group relative flex flex-col rounded border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80">
              <div className="flex items-start justify-between">
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{resource.category}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <h3 className="mt-3 font-display text-sm text-foreground">{resource.title}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">{resource.url}</p>
              {role === "manager" && (
                <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(resource.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </a>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">เพิ่มแหล่งข้อมูล</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อ</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="border-border bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL</Label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="border-border bg-muted/50" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">หมวดหมู่</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">เพิ่ม</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Resources;
