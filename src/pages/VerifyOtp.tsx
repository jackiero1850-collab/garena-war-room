import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle, ArrowLeft } from "lucide-react";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-foreground">ไม่พบอีเมล</h1>
          <p className="text-sm text-muted-foreground">กรุณาเริ่มต้นใหม่จากหน้าลืมรหัสผ่าน</p>
          <Button onClick={() => navigate("/forgot-password")} className="h-12 w-full rounded-full text-base font-medium">
            ไปหน้าลืมรหัสผ่าน
          </Button>
        </div>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("กรุณากรอกรหัส OTP 6 หลัก");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });
    setLoading(false);

    if (error) {
      setError("รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่");
    } else {
      navigate("/reset-password");
    }
  };

  const handleResend = async () => {
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setError("");
      setOtp("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">ยืนยันรหัส OTP</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            กรอกรหัส 6 หลักที่ส่งไปยัง <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || otp.length !== 6} className="h-12 w-full rounded-full text-base font-medium">
            {loading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <button onClick={handleResend} type="button" className="text-sm font-medium text-primary hover:underline">
            ส่งรหัส OTP อีกครั้ง
          </button>
          <div>
            <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
