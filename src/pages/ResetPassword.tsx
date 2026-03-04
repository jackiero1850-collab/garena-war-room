import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Listen for PASSWORD_RECOVERY event (fired when user clicks email link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setIsValidSession(true);
        setChecking(false);
      }
    });

    // Also check current session + URL hash as fallback
    const checkSession = async () => {
      // Give onAuthStateChange a moment to fire first
      await new Promise((r) => setTimeout(r, 1500));
      if (!mounted) return;

      // Check if there's an active session (recovery link auto-signs in)
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        // Check URL hash for recovery type
        const hash = window.location.hash;
        if (hash.includes("type=recovery") || hash.includes("type=magiclink")) {
          setIsValidSession(true);
        } else {
          // Session exists (possibly from recovery link that already processed)
          setIsValidSession(true);
        }
      }
      setChecking(false);
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      if (error.message.includes("Auth session missing")) {
        setError("เซสชันหมดอายุ กรุณากดลิงก์จากอีเมลใหม่อีกครั้ง");
      } else {
        setError(error.message);
      }
    } else {
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ! กำลังกลับไปหน้าเข้าสู่ระบบ...");
      // Sign out so they can log in fresh
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-foreground">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
          <p className="text-sm text-muted-foreground">
            กรุณากดลิงก์จากอีเมลใหม่อีกครั้ง หรือขอลิงก์รีเซ็ตรหัสผ่านใหม่
          </p>
          <Button onClick={() => navigate("/forgot-password")} className="h-12 w-full rounded-full text-base font-medium">
            ขอลิงก์รีเซ็ตรหัสผ่านใหม่
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">ตั้งรหัสผ่านใหม่</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">
              รหัสผ่านใหม่ <span className="text-primary">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
              ยืนยันรหัสผ่านใหม่ <span className="text-primary">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <Button type="submit" disabled={loading} className="h-12 w-full rounded-full text-base font-medium">
            {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
