import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DashboardFiltersProps {
  date: Date;
  onDateChange: (date: Date) => void;
  teamId: string;
  onTeamChange: (teamId: string) => void;
  userId: string;
  onUserChange: (userId: string) => void;
}

const DashboardFilters = ({
  date, onDateChange, teamId, onTeamChange, userId, onUserChange,
}: DashboardFiltersProps) => {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; nickname: string | null; team_id: string | null }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("teams").select("id, name"),
      supabase.from("team_members").select("id, name, nickname, team_id, role").eq("role", "Sales").order("name"),
    ]).then(([{ data: tData }, { data: mData }]) => {
      setTeams((tData as any[]) || []);
      setMembers((mData as any[]) || []);
    });
  }, []);

  const filteredMembers = teamId === "all" ? members : members.filter((m) => m.team_id === teamId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-start border-border bg-card text-foreground">
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {format(date, "dd-MM-yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={(d) => d && onDateChange(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>

      <Select value={teamId} onValueChange={onTeamChange}>
        <SelectTrigger className="w-[160px] border-border bg-card"><SelectValue placeholder="ทุกทีม" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกทีม</SelectItem>
          {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
        </SelectContent>
      </Select>

      <Select value={userId} onValueChange={onUserChange}>
        <SelectTrigger className="w-[180px] border-border bg-card"><SelectValue placeholder="ทุกคน" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกคน</SelectItem>
          {filteredMembers.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nickname || m.name}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardFilters;
