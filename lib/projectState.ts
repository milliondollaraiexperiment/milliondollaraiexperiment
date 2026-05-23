import { supabaseAdmin } from "./supabase";
import type { ProjectSettings } from "./types";

export const FALLBACK_PROJECT_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 8,
  mode: "normal",
  posting_paused: false,
  started_at: null,
  completed_at: null,
  final_post_sent: false,
};

function normalizeMode(value: Partial<ProjectSettings> | null | undefined): ProjectSettings["mode"] {
  if (value?.mode === "completed") return "completed";
  if (value?.mode === "paused") return "paused";
  return "normal";
}

export function normalizeProjectSettings(value: Partial<ProjectSettings> | null | undefined): ProjectSettings {
  return {
    ...FALLBACK_PROJECT_SETTINGS,
    ...value,
    mode: normalizeMode(value),
    posting_paused: Boolean(value?.posting_paused),
    final_post_sent: Boolean(value?.final_post_sent),
  };
}

export function isPostingPaused(settings: ProjectSettings): boolean {
  return settings.mode === "paused" || Boolean(settings.posting_paused);
}

export async function getProjectSettings(): Promise<ProjectSettings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "project")
    .maybeSingle();

  if (error) {
    throw new Error(`getProjectSettings failed: ${error.message}`);
  }

  return normalizeProjectSettings(data?.value as Partial<ProjectSettings> | undefined);
}

export async function getCurrentAmountCents(): Promise<number> {
  const { data, error } = await supabaseAdmin.from("donations").select("amount_cents");
  if (error) {
    throw new Error(`getCurrentAmountCents failed: ${error.message}`);
  }
  return (data ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
}

export async function markProjectCompleted(
  settings: ProjectSettings,
  patch: Partial<ProjectSettings> = {},
): Promise<ProjectSettings> {
  const completedAt = settings.completed_at ?? new Date().toISOString();
  const next: ProjectSettings = normalizeProjectSettings({
    ...settings,
    ...patch,
    mode: "completed",
    completed_at: completedAt,
  });

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert({ key: "project", value: next }, { onConflict: "key" });

  if (error) {
    throw new Error(`markProjectCompleted failed: ${error.message}`);
  }
  return next;
}

export async function getCompletionState(): Promise<{
  settings: ProjectSettings;
  currentAmountCents: number;
  completed: boolean;
}> {
  const [settings, currentAmountCents] = await Promise.all([
    getProjectSettings(),
    getCurrentAmountCents(),
  ]);
  const completed = settings.mode === "completed" || currentAmountCents >= settings.goal * 100;
  return { settings, currentAmountCents, completed };
}
