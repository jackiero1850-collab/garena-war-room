import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

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
  const [teams, setTeams] = useState<Tables<"teams">[]>([]);
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);

  useEffect(() => {
    supabase.from("teams").select("*").then(({ data }) => data && setTeams(data));
    supabase.from("profiles").select("*").then(({ data }) => data && setUsers(data));
  }, []);

  const filteredUsers = teamId === "all" ? users : users.filter((u) => u.team_id === teamId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-start border-border bg-card text-foreground">
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {format(date, "MMM dd, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Team Dropdown */}
      <Select value={teamId} onValueChange={onTeamChange}>
        <SelectTrigger className="w-[160px] border-border bg-card">
          <SelectValue placeholder="All Teams" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teams</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User Dropdown */}
      <Select value={userId} onValueChange={onUserChange}>
        <SelectTrigger className="w-[180px] border-border bg-card">
          <SelectValue placeholder="All Sales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sales</SelectItem>
          {filteredUsers.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.username || u.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardFilters;
