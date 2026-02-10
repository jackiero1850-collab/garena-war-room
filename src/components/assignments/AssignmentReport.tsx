import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Assignment {
  id: string; title: string; due_date: string; assigned_to: string | null;
  action_type_id: string | null; type: string;
}
interface Submission {
  id: string; assignment_id: string; submitted_at: string;
  image_proof_urls: string[]; submitted_by_member_id: string | null; user_id: string;
}
interface ActionType { id: string; name: string; color_hex: string; }

type SubmissionStatus = "ontime" | "late" | "missing" | "pending";

const statusConfig: Record<SubmissionStatus, { label: string; className: string }> = {
  ontime: { label: "ส่งตรงเวลา", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  late: { label: "ส่งช้า", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  missing: { label: "ไม่ส่ง", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  pending: { label: "รอส่ง", className: "bg-muted text-muted-foreground border-border" },
};

interface Props {
  onBack: () => void;
}

const AssignmentReport = ({ onBack }: Props) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; nickname: string | null }[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const fetchData = async () => {
    const [{ data: aData }, { data: sData }, { data: mData }, { data: atData }] = await Promise.all([
      supabase.from("assignments").select("*").gte("due_date", dateFrom).lte("due_date", dateTo).order("due_date", { ascending: false }),
      supabase.from("assignment_submissions").select("*"),
      supabase.from("team_members").select("id, name, nickname").order("name"),
      supabase.from("task_action_types").select("*"),
    ]);
    setAssignments((aData as Assignment[]) || []);
    setSubmissions((sData as Submission[]) || []);
    setMembers((mData as any[]) || []);
    setActionTypes((atData as ActionType[]) || []);
  };

  useEffect(() => { fetchData(); }, [dateFrom, dateTo]);

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((mem) => { m[mem.id] = mem.nickname || mem.name; });
    return m;
  }, [members]);

  const actionTypeMap = useMemo(() => {
    const m: Record<string, ActionType> = {};
    actionTypes.forEach((at) => { m[at.id] = at; });
    return m;
  }, [actionTypes]);

  const getStatus = (assignment: Assignment): { status: SubmissionStatus; submission: Submission | null } => {
    const subs = submissions.filter((s) => s.assignment_id === assignment.id);
    const today = new Date();
    const dueDate = new Date(assignment.due_date + "T23:59:59");

    if (subs.length > 0) {
      const earliest = subs.reduce((a, b) => new Date(a.submitted_at) < new Date(b.submitted_at) ? a : b);
      const submittedDate = new Date(earliest.submitted_at);
      return {
        status: submittedDate <= dueDate ? "ontime" : "late",
        submission: earliest,
      };
    }
    return {
      status: today > dueDate ? "missing" : "pending",
      submission: null,
    };
  };

  const rows = useMemo(() => {
    return assignments.map((a) => {
      const { status, submission } = getStatus(a);
      return { assignment: a, status, submission };
    }).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (assigneeFilter !== "all" && r.assignment.assigned_to !== assigneeFilter) return false;
      return true;
    });
  }, [assignments, submissions, statusFilter, assigneeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="font-display text-xl text-foreground">รายงานการส่งงาน</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">จาก</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-border bg-muted/50 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">ถึง</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-border bg-muted/50 w-40" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] border-border bg-card"><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="ontime">ส่งตรงเวลา</SelectItem>
            <SelectItem value="late">ส่งช้า</SelectItem>
            <SelectItem value="missing">ไม่ส่ง</SelectItem>
            <SelectItem value="pending">รอส่ง</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[160px] border-border bg-card"><SelectValue placeholder="ทุกคน" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคน</SelectItem>
            {members.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nickname || m.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase text-muted-foreground">ชื่องาน</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Action</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">ผู้รับผิดชอบ</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">กำหนดส่ง</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">วันที่ส่ง</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">สถานะ</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">หลักฐาน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</TableCell></TableRow>
            ) : rows.map((r) => {
              const at = r.assignment.action_type_id ? actionTypeMap[r.assignment.action_type_id] : null;
              const proofUrls = r.submission?.image_proof_urls || [];
              return (
                <TableRow key={r.assignment.id} className="border-border">
                  <TableCell className="font-medium text-sm">{r.assignment.title}</TableCell>
                  <TableCell>
                    {at ? (
                      <Badge variant="outline" className="border-current text-xs" style={{ color: at.color_hex }}>
                        <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: at.color_hex }} />
                        {at.name}
                      </Badge>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.assignment.assigned_to ? memberMap[r.assignment.assigned_to] || "—" : "ทุกคน"}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(r.assignment.due_date), "dd-MM-yyyy")}</TableCell>
                  <TableCell className="text-sm">
                    {r.submission ? format(new Date(r.submission.submitted_at), "dd-MM-yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig[r.status].className + " text-xs"}>
                      {statusConfig[r.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {proofUrls.length > 0 ? (
                      <a href={proofUrls[0]} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">
                        ดูหลักฐาน ({proofUrls.length})
                      </a>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AssignmentReport;
