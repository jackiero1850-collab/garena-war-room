import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  LayoutDashboard, FileInput, Users, UsersRound, Settings,
  ClipboardList, Palette, FolderOpen, Crosshair, LogOut, Cog, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "แดชบอร์ด", icon: LayoutDashboard, path: "/", enabled: true },
  { label: "ลงข้อมูลรายวัน", icon: FileInput, path: "/daily-input", enabled: true },
  { label: "งานที่มอบหมาย", icon: ClipboardList, path: "/assignments", enabled: true },
  { label: "บรีฟกราฟิก", icon: Palette, path: "/briefs", enabled: true },
  { label: "แหล่งข้อมูล", icon: FolderOpen, path: "/resources", enabled: true },
  { label: "ผลงานทีม", icon: BarChart3, path: "/team-performance", enabled: true },
  { label: "ตั้งค่าโปรไฟล์", icon: Settings, path: "/settings", enabled: true },
  { label: "จัดการผู้ใช้", icon: Users, path: "/users", enabled: true, managerOnly: true },
  { label: "รายชื่อพนักงาน", icon: UsersRound, path: "/roster", enabled: true, managerOnly: true },
  { label: "ตั้งค่าระบบ", icon: Cog, path: "/system-settings", enabled: true, managerOnly: true },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, signOut, profile } = useAuth();
  const { app_name, app_logo_url } = useAppSettings();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        {app_logo_url ? (
          <img src={app_logo_url} alt="Logo" className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded border border-primary/50 bg-primary/10">
            <Crosshair className="h-4 w-4 text-primary" />
          </div>
        )}
        <span className="font-display text-lg tracking-wider text-foreground">{app_name}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          if (item.managerOnly && role !== "manager") return null;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              disabled={!item.enabled}
              onClick={() => item.enabled && navigate(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : item.enabled
                  ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  : "cursor-not-allowed text-muted-foreground/40"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Separator />

      <div className="p-3">
        <div className="flex items-center gap-3 rounded bg-muted/30 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {(profile?.username || profile?.email || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{profile?.username || profile?.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{role || "user"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
