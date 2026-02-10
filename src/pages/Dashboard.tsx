import { useState, useEffect, useCallback } from "react";
import { startOfMonth, format, endOfMonth, subDays, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, DollarSign, BarChart3, Percent, Target, CreditCard, CalendarDays, Wallet, Download,
} from "lucide-react";
import { getConvColor, getCostHeadColor } from "@/lib/metricColors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KpiCard from "@/components/dashboard/KpiCard";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import StatsChart from "@/components/dashboard/StatsChart";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const THB_RATE = 34;

const Dashboard = () => {
  const { role, user } = useAuth();
  const today = new Date();
  const [date, setDate] = useState(today);
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [websiteOptions, setWebsiteOptions] = useState<string[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>({ signups_count: 0, deposit_count: 0, first_deposit_amount: 0, total_deposit_amount: 0, ad_spend_usd: 0 });

  // Event popup state
  const [eventPopup, setEventPopup] = useState<{ id: string; title: string; cover_image_url: string | null } | null>(null);
  const [eventDismissed, setEventDismissed] = useState(false);

  // Check for today's event assignments (with session memory)
  useEffect(() => {
    const checkTodayEvents = async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("assignments")
        .select("id, title, cover_image_url")
        .eq("due_date", todayStr)
        .eq("type", "event")
        .limit(1);
      if (data && data.length > 0) {
        const evt = data[0];
        const seenKey = `seen_event_${evt.id}`;
        if (!localStorage.getItem(seenKey)) {
          setEventPopup(evt);
        }
      }
    };
    checkTodayEvents();
  }, []);

  // Fetch unique website names for filter
  useEffect(() => {
    supabase.from("daily_stats").select("website_name").then(({ data }) => {
      const unique = [...new Set((data || []).map((r: any) => r.website_name).filter(Boolean))].sort();
      setWebsiteOptions(unique as string[]);
    });
  }, []);

  const fetchData = useCallback(async () => {
    const monthStart = format(startOfMonth(date), "yyyy-MM-dd");
    const selectedDate = format(date, "yyyy-MM-dd");

    // Global KPI stats visible to ALL roles via security definer function
    const { data: globalData } = await supabase.rpc("get_global_dashboard_stats", {
      _start_date: monthStart,
      _end_date: selectedDate,
      _website: websiteFilter !== "all" ? websiteFilter : null,
    });
    setGlobalStats(globalData || { signups_count: 0, deposit_count: 0, first_deposit_amount: 0, total_deposit_amount: 0, ad_spend_usd: 0 });

    // Filtered stats for CSV export (RLS-scoped)
    let mQuery = teamId !== "all"
      ? supabase.from("daily_stats").select("*, team_members!inner(name, nickname, team_id)").gte("date", monthStart).lte("date", selectedDate).eq("team_members.team_id", teamId)
      : supabase.from("daily_stats").select("*, team_members(name, nickname)").gte("date", monthStart).lte("date", selectedDate);
    if (userId !== "all") mQuery = mQuery.eq("team_member_id", userId);
    if (websiteFilter !== "all") mQuery = mQuery.eq("website_name", websiteFilter);
    const { data: mData } = await mQuery;
    setStats(mData || []);

    // Chart data: last 30 days
    const chartStart = format(subDays(date, 29), "yyyy-MM-dd");
    let cQuery = teamId !== "all"
      ? supabase.from("daily_stats").select("date, signups_count, total_deposit_amount, team_members!inner(team_id)").gte("date", chartStart).lte("date", selectedDate).eq("team_members.team_id", teamId)
      : supabase.from("daily_stats").select("date, signups_count, total_deposit_amount").gte("date", chartStart).lte("date", selectedDate);
    if (userId !== "all") cQuery = cQuery.eq("team_member_id", userId);
    if (websiteFilter !== "all") cQuery = cQuery.eq("website_name", websiteFilter);
    const { data: cData } = await cQuery;

    const byDate: Record<string, { signups: number; deposit: number }> = {};
    (cData || []).forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { signups: 0, deposit: 0 };
      byDate[r.date].signups += r.signups_count;
      byDate[r.date].deposit += Number(r.total_deposit_amount);
    });
    setChartData(
      Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, v]) => ({ date: format(new Date(d), "dd-MM"), ...v }))
    );

    // Leaderboard
    let lQuery = teamId !== "all"
      ? supabase.from("daily_stats").select("team_member_id, signups_count, deposit_count, ad_spend_usd, team_members!inner(name, nickname, team_id)").gte("date", monthStart).lte("date", selectedDate).eq("team_members.team_id", teamId)
      : supabase.from("daily_stats").select("team_member_id, signups_count, deposit_count, ad_spend_usd, team_members(name, nickname)").gte("date", monthStart).lte("date", selectedDate);
    if (websiteFilter !== "all") lQuery = lQuery.eq("website_name", websiteFilter);
    const { data: lData } = await lQuery;

    const userMap: Record<string, { name: string; signups: number; deposits: number; adSpend: number }> = {};
    (lData || []).forEach((r: any) => {
      const mid = r.team_member_id || "unknown";
      if (!userMap[mid]) {
        userMap[mid] = { name: r.team_members?.nickname || r.team_members?.name || "ไม่ทราบ", signups: 0, deposits: 0, adSpend: 0 };
      }
      userMap[mid].signups += r.signups_count;
      userMap[mid].deposits += r.deposit_count;
      userMap[mid].adSpend += Number(r.ad_spend_usd);
    });

    setLeaderboard(
      Object.values(userMap)
        .sort((a, b) => b.signups - a.signups)
        .map((u) => ({
          name: u.name,
          signups: u.signups,
          costPerHead: u.signups > 0 ? Math.round((u.adSpend * THB_RATE) / u.signups) : 0,
          conversion: u.signups > 0 ? (u.deposits / u.signups) * 100 : 0,
        }))
    );
  }, [date, teamId, userId, websiteFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_stats" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const sum = (key: string) => stats.reduce((a, r) => a + Number(r[key] || 0), 0);

  // Global KPIs from security definer function — visible to ALL roles
  const totalSignups = Number(globalStats.signups_count || 0);
  const totalDepositors = Number(globalStats.deposit_count || 0);
  const conversion = totalSignups > 0 ? (totalDepositors / totalSignups) * 100 : 0;
  const firstDeposit = Number(globalStats.first_deposit_amount || 0);
  const totalDeposit = Number(globalStats.total_deposit_amount || 0);
  const adSpendUsd = Number(globalStats.ad_spend_usd || 0);
  const adSpendThb = Math.round(adSpendUsd * THB_RATE);
  const costPerHead = totalSignups > 0 ? Math.round((adSpendUsd * THB_RATE) / totalSignups) : 0;

  const exportCSV = () => {
    if (stats.length === 0) return;
    const headers = ["date", "sales", "signups_count", "deposit_count", "first_deposit_amount", "total_deposit_amount", "ad_spend_usd", "ad_spend_thb", "website_name"];
    const rows = stats.map((r: any) => [
      r.date,
      r.team_members?.nickname || r.team_members?.name || "",
      r.signups_count,
      r.deposit_count,
      r.first_deposit_amount,
      r.total_deposit_amount,
      r.ad_spend_usd,
      Math.round(Number(r.ad_spend_usd) * THB_RATE),
      r.website_name,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_${format(startOfMonth(date), "yyyyMM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Event Popup */}
      <Dialog open={!!eventPopup && !eventDismissed} onOpenChange={() => { if (eventPopup) localStorage.setItem(`seen_event_${eventPopup.id}`, 'true'); setEventDismissed(true); setEventPopup(null); }}>
        <DialogContent className="border-border bg-card max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-xl uppercase tracking-wider text-primary">📢 อีเว้นท์วันนี้!</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {eventPopup?.cover_image_url && (
              <img src={eventPopup.cover_image_url} alt="Event" className="w-full rounded border border-border object-cover max-h-64" />
            )}
            <h2 className="text-lg font-bold text-foreground">{eventPopup?.title}</h2>
            <Button onClick={() => { if (eventPopup) localStorage.setItem(`seen_event_${eventPopup.id}`, 'true'); setEventDismissed(true); setEventPopup(null); }} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
              รับทราบ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">แดชบอร์ด</h1>
        <div className="flex items-center gap-3">
          <DashboardFilters
            date={date} onDateChange={setDate}
            teamId={teamId} onTeamChange={setTeamId}
            userId={userId} onUserChange={setUserId}
          />
          <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
            <SelectTrigger className="w-[160px] border-border bg-card"><SelectValue placeholder="ทุกเว็บ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกเว็บไซต์</SelectItem>
              {websiteOptions.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
            </SelectContent>
          </Select>
          {role === "manager" && (
            <Button variant="outline" onClick={exportCSV} className="border-border bg-card gap-2">
              <Download className="h-4 w-4 text-primary" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="ยอดสมัคร" value={totalSignups} icon={Users} highlight />
        <KpiCard title="ยอดฝาก" value={totalDepositors} icon={TrendingUp} />
        <KpiCard title="% คอนเวอร์ชั่น" value={`${conversion.toFixed(1)}%`} icon={Percent} valueClassName={getConvColor(conversion)} />
        <KpiCard title="ฝากครั้งแรก" value={`฿${firstDeposit.toLocaleString()}`} icon={DollarSign} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="ยอดฝากรวม" value={`฿${totalDeposit.toLocaleString()}`} icon={DollarSign} highlight />
        <KpiCard title="ค่าโฆษณา (THB)" value={`฿${adSpendThb.toLocaleString()}`} icon={CreditCard} />
        <KpiCard title="ต้นทุน/หัว (THB)" value={`฿${costPerHead.toLocaleString()}`} icon={Target} valueClassName={getCostHeadColor(costPerHead)} />
        <KpiCard title="สมัครเดือนนี้" value={totalSignups} icon={CalendarDays} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><StatsChart data={chartData} /></div>
        <div className="lg:col-span-2"><LeaderboardTable data={leaderboard} /></div>
      </div>
    </div>
  );
};

export default Dashboard;
