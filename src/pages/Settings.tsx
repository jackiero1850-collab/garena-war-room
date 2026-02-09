import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Camera } from "lucide-react";

const Settings = () => {
  const { user, profile } = useAuth();
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      // Also save to profile immediately
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      toast({ title: "Avatar updated" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username, avatar_url: avatarUrl || null }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <h1 className="font-display text-2xl text-foreground">Settings</h1>

      <div className="rounded border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border border-primary/30" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
          <div>
            <p className="font-medium text-foreground">{profile?.email}</p>
            <p className="text-sm text-muted-foreground">ID: {user?.id?.slice(0, 8)}...</p>
            {uploading && <p className="text-xs text-primary">Uploading...</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} className="border-border bg-muted/50" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-primary font-display uppercase tracking-wider hover:bg-primary/90">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
