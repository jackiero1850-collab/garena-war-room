import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, CalendarIcon, Search } from "lucide-react";

const TeamPerformance = () => {
  const { user, role, profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const fetchData = async () => {
    if (!user) return;

    let query = supabase
      .from("daily_stats")
      .select("*, team_members(name, nickname, team_id)")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    // Leader: filter by own team
    if (role === "leader" && profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    }

    const { data } = await query;
    setRows(data || []);
  };

  useEffect(() => { fetchData(); }, [user, role, dateFrom, dateTo]);

  if (role !== "manager" && role !== "leader") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">เฉพาะผู้จัดการและหัวหน้าทีมเท่านั้น</p>
        </div>
      </div>
    );
  }

  const filtered = rows.filter((r) => {
    const name = r.team_members?.nickname || r.team_members?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

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
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อ..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-border bg-card pl-10 w-48" />
        </div>
      </div>

      <div className="rounded border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground sticky left-0 bg-card z-10">วันที่</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground sticky left-[80px] bg-card z-10">ชื่อ</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">สมัคร</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">ยอดฝาก</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">ฝากแรก (฿)</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">ฝากรวม (฿)</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">โฆษณา (฿)</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">เว็บไซต์</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className="border-border">
                <TableCell className="sticky left-0 bg-card text-sm">{format(new Date(r.date), "dd MMM")}</TableCell>
                <TableCell className="sticky left-[80px] bg-card font-medium text-sm">{r.team_members?.nickname || r.team_members?.name || "—"}</TableCell>
                <TableCell className="text-right">{r.signups_count}</TableCell>
                <TableCell className="text-right">{r.deposit_count}</TableCell>
                <TableCell className="text-right">฿{Number(r.first_deposit_amount).toLocaleString()}</TableCell>
                <TableCell className="text-right">฿{Number(r.total_deposit_amount).toLocaleString()}</TableCell>
                <TableCell className="text-right">฿{Math.round(Number(r.ad_spend_usd) * 34).toLocaleString()}</TableCell>
                <TableCell>{r.website_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TeamPerformance;
