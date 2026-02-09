import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  app_name: string;
  app_logo_url: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({ app_name: "WAR ROOM", app_logo_url: "" });

  useEffect(() => {
    supabase.from("app_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setSettings({
          app_name: map["app_name"] || "WAR ROOM",
          app_logo_url: map["app_logo_url"] || "",
        });
      }
    });
  }, []);

  return settings;
};
