import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const WEBSITES = ["MGB-USA", "UNI-USA", "MGB-X"] as const;

const DailyInput = () => {
  const { user, profile } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [teamMemberId, setTeamMemberId] = useState("");
  const [salesMembers, setSalesMembers] = useState<{ id: string; name: string; nickname: string | null }[]>([]);
  const [signups, setSignups] = useState("");
  const [deposits, setDeposits] = useState("");
  const [firstDep, setFirstDep] = useState("");
  const [totalDep, setTotalDep] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [website, setWebsite] = useState<string>("MGB-USA");
  const [contentLink, setContentLink] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("team_members").select("id, name, nickname, role").eq("role", "Sales").order("name")
      .then(({ data }) => setSalesMembers((data as any[]) || []));
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_stats")
      .select("*, team_members(name, nickname)")
      .order("date", { ascending: false })
      .limit(50);
    setHistory(data || []);
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const validate = () => {
    const errs: Record<string, boolean> = {};
    if (!teamMemberId) errs.teamMemberId = true;
    if (!signups) errs.signups = true;
    if (!deposits) errs.deposits = true;
    if (!firstDep) errs.firstDep = true;
    if (!totalDep) errs.totalDep = true;
    if (!adSpend) errs.adSpend = true;
    if (!contentLink.trim()) errs.contentLink = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    // Get the team_id from the selected member
    const member = salesMembers.find(m => m.id === teamMemberId);

    setSubmitting(true);
    const { error } = await supabase.from("daily_stats").insert({
      user_id: user.id,
      team_member_id: teamMemberId,
      date: format(date, "yyyy-MM-dd"),
      team_id: profile?.team_id || null,
      signups_count: parseInt(signups),
      deposit_count: parseInt(deposits),
      first_deposit_amount: parseFloat(firstDep),
      total_deposit_amount: parseFloat(totalDep),
      ad_spend_usd: parseFloat(adSpend),
      website_name: website as any,
      content_link: contentLink.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Daily stats submitted" });
      setSignups(""); setDeposits(""); setFirstDep(""); setTotalDep(""); setAdSpend(""); setContentLink("");
      fetchHistory();
    }
  };

  const inputClass = (field: string) =>
    cn("border-border bg-muted/50 focus:border-primary", errors[field] && "border-destructive");

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl text-foreground">Daily Input</h1>

      <form onSubmit={handleSubmit} className="rounded border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Date */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start border-border bg-muted/50">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {format(date, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sales Member dropdown */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sales Person</Label>
            <Select value={teamMemberId} onValueChange={setTeamMemberId}>
              <SelectTrigger className={cn("border-border bg-muted/50", errors.teamMemberId && "border-destructive")}>
                <SelectValue placeholder="Select sales person" />
              </SelectTrigger>
              <SelectContent>
                {salesMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nickname || m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Signups</Label>
            <Input type="number" min="0" value={signups} onChange={(e) => setSignups(e.target.value)} className={inputClass("signups")} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Deposits</Label>
            <Input type="number" min="0" value={deposits} onChange={(e) => setDeposits(e.target.value)} className={inputClass("deposits")} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">First Dep. (THB)</Label>
            <Input type="number" min="0" step="0.01" value={firstDep} onChange={(e) => setFirstDep(e.target.value)} className={inputClass("firstDep")} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Total Dep. (THB)</Label>
            <Input type="number" min="0" step="0.01" value={totalDep} onChange={(e) => setTotalDep(e.target.value)} className={inputClass("totalDep")} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ad Spend (USD)</Label>
            <Input type="number" min="0" step="0.01" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} className={inputClass("adSpend")} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Website</Label>
            <Select value={website} onValueChange={setWebsite}>
              <SelectTrigger className="border-border bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEBSITES.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Content Link</Label>
            <Input value={contentLink} onChange={(e) => setContentLink(e.target.value)} className={inputClass("contentLink")} placeholder="https://..." />
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full bg-primary font-display uppercase tracking-wider hover:bg-primary/90 glow-red-sm">
              <Plus className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" /> All fields are required
          </div>
        )}
      </form>

      {/* History Table */}
      <div className="rounded border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">History</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground">Date</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Sales Person</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">Signups</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">Deposits</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">1st Dep</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">Total Dep</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">Ad Spend</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No entries yet</TableCell>
              </TableRow>
            ) : (
              history.map((row: any) => (
                <TableRow key={row.id} className="border-border">
                  <TableCell>{format(new Date(row.date), "MMM dd")}</TableCell>
                  <TableCell>{row.team_members?.nickname || row.team_members?.name || "—"}</TableCell>
                  <TableCell className="text-right">{row.signups_count}</TableCell>
                  <TableCell className="text-right">{row.deposit_count}</TableCell>
                  <TableCell className="text-right">฿{Number(row.first_deposit_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">฿{Number(row.total_deposit_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">${Number(row.ad_spend_usd).toLocaleString()}</TableCell>
                  <TableCell>{row.website_name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DailyInput;
