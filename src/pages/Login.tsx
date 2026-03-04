import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState("ลงชื่อเข้าใช้");
  const [appLogoUrl, setAppLogoUrl] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("app_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        if (map["app_name"]) setAppName(map["app_name"]);
        if (map["app_logo_url"]) setAppLogoUrl(map["app_logo_url"]);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วลงชื่อเข้าใช้");
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        {/* Header */}
        <div>
          {appLogoUrl && (
            <img src={appLogoUrl} alt={appName} className="mx-auto mb-4 h-16 w-16 rounded-lg object-cover" />
          )}
          <h1 className="text-3xl font-semibold text-foreground">
            {isSignUp ? "สร้างบัญชี" : "ลงชื่อเข้าใช้"}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              อีเมล <span className="text-primary">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">
              รหัสผ่าน <span className="text-primary">*</span>
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

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-warroom-success/30 bg-warroom-success/5 p-3 text-sm text-warroom-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full text-base font-medium"
          >
            {loading
              ? isSignUp ? "กำลังสร้างบัญชี..." : "กำลังเข้าสู่ระบบ..."
              : isSignUp ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        {/* Links */}
        <div className="space-y-2 text-center text-sm text-muted-foreground">
          {!isSignUp && (
            <p>
              ลืม <button type="button" className="font-medium text-primary hover:underline">รหัสผ่าน</button>?
            </p>
          )}
          <p>
            {isSignUp ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชีใช่หรือไม่?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
              className="font-medium text-primary hover:underline"
            >
              {isSignUp ? "ลงชื่อเข้าใช้" : "สร้างบัญชี"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
