import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CalendarIcon, Search, Trophy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const TeamPerformance = () => {
  const { user, role, profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [websiteOptions, setWebsiteOptions] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("teams").select("id, name").order("name").then(({ data }) => {
      setTeams((data as any[]) || []);
    });
    supabase.from("daily_stats").select("website_name").then(({ data }) => {
      const unique = [...new Set((data || []).map((r: any) => r.website_name).filter(Boolean))].sort();
      setWebsiteOptions(unique as string[]);
    });
  }, []);

  const fetchData = async () => {
    if (!user) return;

    let query = supabase
      .from("daily_stats")
      .select("*, team_members(name, nickname, team_id)")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if ((role === "leader" || role === "sales") && profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    } else if (role === "manager" && selectedTeamId !== "all") {
      query = query.eq("team_id", selectedTeamId);
    }

    if (websiteFilter !== "all") {
      query = query.eq("website_name", websiteFilter);
    }

    const { data } = await query;
    setRows(data || []);
  };

  useEffect(() => { fetchData(); }, [user, role, dateFrom, dateTo, selectedTeamId, websiteFilter]);

  if (role !== "manager" && role !== "leader" && role !== "sales") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">ไม่มีสิทธิ์เข้าถึง</p>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: string, rowTeamId: string | null) => {
    if (!confirm("ต้องการลบข้อมูลนี้?")) return;
    const { error } = await supabase.from("daily_stats").delete().eq("id", id);
    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบแล้ว" });
      fetchData();
    }
  };

  const canDelete = (rowTeamId: string | null) => {
    if (role === "manager") return true;
    if (role === "leader" && profile?.team_id && rowTeamId === profile.team_id) return true;
    return false;
  };

  const filtered = rows.filter((r) => {
    const name = r.team_members?.nickname || r.team_members?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // Compute ranking by total_deposit_amount per member
  const depositByMember: Record<string, { name: string; total: number }> = {};
  filtered.forEach((r) => {
    const mid = r.team_member_id || "unknown";
    const name = r.team_members?.nickname || r.team_members?.name || "—";
    if (!depositByMember[mid]) depositByMember[mid] = { name, total: 0 };
    depositByMember[mid].total += Number(r.total_deposit_amount);
  });
  const ranked = Object.entries(depositByMember)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([id], i) => ({ id, rank: i + 1 }));
  const rankMap: Record<string, number> = {};
  ranked.forEach((r) => { rankMap[r.id] = r.rank; });

  const getRankBadge = (mid: string) => {
    const rank = rankMap[mid];
    if (!rank) return null;
    if (rank === 1) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">🥇</span>;
    if (rank === 2) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-400/20 text-gray-300 text-xs font-bold">🥈</span>;
    if (rank === 3) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">🥉</span>;
    return <span className="text-xs text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="font-display text-2xl text-foreground">ผลงานทีม</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">จาก</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-border bg-muted/50 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">ถึง</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-border bg-muted/50 w-40" />
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2"><CalendarIcon className="h-4 w-4" /> ค้นหา</Button>

        {role === "manager" && (
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[160px] border-border bg-card"><SelectValue placeholder="ทุกทีม" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกทีม</SelectItem>
              {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}

        <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
          <SelectTrigger className="w-[160px] border-border bg-card"><SelectValue placeholder="ทุกเว็บ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกเว็บไซต์</SelectItem>
            {websiteOptions.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
          </SelectContent>
        </Select>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อ..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-border bg-card pl-10 w-48" />
        </div>
      </div>

      <div className="rounded border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground w-12">#</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground sticky left-0 bg-card z-10">วันที่</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground sticky left-[80px] bg-card z-10">ชื่อ</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">สมัคร</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">ยอดฝาก</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">ฝากแรก (฿)</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">ฝากรวม (฿)</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">โฆษณา (฿)</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">เว็บไซต์</TableHead>
              {(role === "manager" || role === "leader") && (
                <TableHead className="text-xs uppercase text-muted-foreground w-12"></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</TableCell></TableRow>
            ) : filtered.map((r: any) => {
              const mid = r.team_member_id || "unknown";
              const rank = rankMap[mid];
              return (
                <TableRow key={r.id} className={cn("border-border", rank && rank <= 3 && "bg-primary/5")}>
                  <TableCell>{getRankBadge(mid)}</TableCell>
                  <TableCell className="sticky left-0 bg-card text-sm">{format(new Date(r.date), "dd-MM-yyyy")}</TableCell>
                  <TableCell className="sticky left-[80px] bg-card font-medium text-sm">{r.team_members?.nickname || r.team_members?.name || "—"}</TableCell>
                  <TableCell className="text-right">{r.signups_count}</TableCell>
                  <TableCell className="text-right">{r.deposit_count}</TableCell>
                  <TableCell className="text-right">฿{Number(r.first_deposit_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">฿{Number(r.total_deposit_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">฿{Math.round(Number(r.ad_spend_usd) * 34).toLocaleString()}</TableCell>
                  <TableCell>{r.website_name}</TableCell>
                  {(role === "manager" || role === "leader") && (
                    <TableCell>
                      {canDelete(r.team_id) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id, r.team_id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TeamPerformance;
