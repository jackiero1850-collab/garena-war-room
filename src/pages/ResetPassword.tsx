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
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user arrived via recovery link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setIsValidSession(true);
    }

    // Also listen for auth state change with recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
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
      setError(error.message);
    } else {
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ! กำลังกลับไปหน้าเข้าสู่ระบบ...");
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-foreground">ลิงก์ไม่ถูกต้อง</h1>
          <p className="text-sm text-muted-foreground">
            กรุณาใช้ลิงก์รีเซ็ตรหัสผ่านจากอีเมลของคุณ
          </p>
          <Button onClick={() => navigate("/login")} className="h-12 w-full rounded-full text-base font-medium">
            กลับไปหน้าเข้าสู่ระบบ
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
