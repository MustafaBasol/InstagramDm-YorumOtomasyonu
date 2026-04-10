import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/server";
import type { AutomationSettings } from "@/lib/types";

type AutomationSettingsRow =
  Database["public"]["Tables"]["automation_settings"]["Row"];

function getAdmin() {
  return createAdminClient();
}

function mapAutomationSettings(row: AutomationSettingsRow): AutomationSettings {
  return row;
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("automation_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw error;
  }

  return mapAutomationSettings(data);
}

export async function updateAutomationEnabled(
  automationEnabled: boolean,
): Promise<AutomationSettings> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("automation_settings")
    .update({
      automation_enabled: automationEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapAutomationSettings(data);
}
