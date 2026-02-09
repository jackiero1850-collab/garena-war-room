import { useState, useEffect, useCallback } from "react";
import { subDays, format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, DollarSign, BarChart3, Percent, Target, CreditCard, CalendarDays, Wallet,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import StatsChart from "@/components/dashboard/StatsChart";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";

const Dashboard = () => {
  const [date, setDate] = useState(subDays(new Date(), 1));
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [stats, setStats] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const selectedDate = format(date, "yyyy-MM-dd");

    let query = supabase.from("daily_stats").select("*, team_members(name, nickname)").eq("date", selectedDate);
    if (teamId !== "all") query = query.eq("team_id", teamId);
    if (userId !== "all") query = query.eq("team_member_id", userId);
    const { data: dayData } = await query;
    setStats(dayData || []);

    const monthStart = format(startOfMonth(date), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(date), "yyyy-MM-dd");
    let mQuery = supabase.from("daily_stats").select("*").gte("date", monthStart).lte("date", monthEnd);
    if (teamId !== "all") mQuery = mQuery.eq("team_id", teamId);
    if (userId !== "all") mQuery = mQuery.eq("team_member_id", userId);
    const { data: mData } = await mQuery;
    setMonthlyStats(mData || []);

    const chartStart = format(subDays(date, 29), "yyyy-MM-dd");
    let cQuery = supabase.from("daily_stats").select("date, signups_count, total_deposit_amount").gte("date", chartStart).lte("date", selectedDate);
    if (teamId !== "all") cQuery = cQuery.eq("team_id", teamId);
    if (userId !== "all") cQuery = cQuery.eq("team_member_id", userId);
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
        .map(([d, v]) => ({ date: format(new Date(d), "MMM dd"), ...v }))
    );

    let lQuery = supabase.from("daily_stats").select("team_member_id, signups_count, deposit_count, ad_spend_usd, team_members(name, nickname)").eq("date", selectedDate);
    if (teamId !== "all") lQuery = lQuery.eq("team_id", teamId);
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
          costPerHead: u.signups > 0 ? Math.round(u.adSpend / u.signups) : 0,
          conversion: u.signups > 0 ? (u.deposits / u.signups) * 100 : 0,
        }))
    );
  }, [date, teamId, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_stats" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const sum = (key: string) => stats.reduce((a, r) => a + Number(r[key] || 0), 0);
  const mSum = (key: string) => monthlyStats.reduce((a, r) => a + Number(r[key] || 0), 0);

  const totalSignups = sum("signups_count");
  const totalDepositors = sum("deposit_count");
  const conversion = totalSignups > 0 ? (totalDepositors / totalSignups) * 100 : 0;
  const firstDeposit = sum("first_deposit_amount");
  const totalDeposit = sum("total_deposit_amount");
  const adSpend = sum("ad_spend_usd");
  const costPerHead = totalSignups > 0 ? Math.round(adSpend / totalSignups) : 0;
  const mSignups = mSum("signups_count");
  const mDepositors = mSum("deposit_count");
  const mConversion = mSignups > 0 ? (mDepositors / mSignups) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">แดชบอร์ด</h1>
        <DashboardFilters
          date={date} onDateChange={setDate}
          teamId={teamId} onTeamChange={setTeamId}
          userId={userId} onUserChange={setUserId}
        />
      </div>

      {/* KPI Cards - 2 rows, relaxed spacing */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="ยอดสมัคร" value={totalSignups} icon={Users} highlight />
        <KpiCard title="ยอดฝาก" value={totalDepositors} icon={TrendingUp} />
        <KpiCard title="% คอนเวอร์ชั่น" value={`${conversion.toFixed(1)}%`} icon={Percent} />
        <KpiCard title="ฝากครั้งแรก" value={`฿${firstDeposit.toLocaleString()}`} icon={DollarSign} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="ยอดฝากรวม" value={`฿${totalDeposit.toLocaleString()}`} icon={DollarSign} highlight />
        <KpiCard title="ค่าโฆษณา" value={`$${adSpend.toLocaleString()}`} icon={CreditCard} />
        <KpiCard title="ต้นทุน/หัว" value={`$${costPerHead}`} icon={Target} />
        <KpiCard title="สมัครเดือนนี้" value={mSignups} icon={CalendarDays} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="ฝากเดือนนี้" value={mDepositors} icon={BarChart3} />
        <KpiCard title="คอนเวอร์ชั่น/เดือน" value={`${mConversion.toFixed(1)}%`} icon={Percent} />
        <KpiCard title="ค่าใช้จ่าย" value="—" icon={Wallet} subtitle="เร็วๆ นี้" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><StatsChart data={chartData} /></div>
        <div className="lg:col-span-2"><LeaderboardTable data={leaderboard} /></div>
      </div>
    </div>
  );
};

export default Dashboard;
