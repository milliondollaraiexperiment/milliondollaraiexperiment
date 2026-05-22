import { supabaseAdmin } from "./supabase";

export type AiComponent = "writer" | "safety" | "summary" | "strategy";
export type AiHealthStatus = "healthy" | "degraded" | "shutdown";

export type AiHealthRecord = {
  component: AiComponent;
  status: AiHealthStatus;
  consecutive_failures: number;
  consecutive_successes: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
};

const SHUTDOWN_COMPONENTS = new Set<AiComponent>(["writer", "safety"]);

function statusFor(component: AiComponent, failures: number): AiHealthStatus {
  if (SHUTDOWN_COMPONENTS.has(component) && failures >= 3) return "shutdown";
  if (failures >= 1) return "degraded";
  return "healthy";
}

function missingHealthTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42703" ||
        error.code === "PGRST204" ||
        error.code === "PGRST205" ||
        error.message?.toLowerCase().includes("ai_health")),
  );
}

export async function getAiHealth(component: AiComponent): Promise<AiHealthRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_health")
    .select(
      "component,status,consecutive_failures,consecutive_successes,last_success_at,last_failure_at,last_failure_reason",
    )
    .eq("component", component)
    .maybeSingle();

  if (missingHealthTable(error)) return null;
  if (error) throw new Error(`getAiHealth ${component} failed: ${error.message}`);
  return (data as AiHealthRecord | null) ?? null;
}

export async function getAiHealthMap(): Promise<Record<AiComponent, AiHealthRecord | null>> {
  const { data, error } = await supabaseAdmin
    .from("ai_health")
    .select(
      "component,status,consecutive_failures,consecutive_successes,last_success_at,last_failure_at,last_failure_reason",
    );

  if (missingHealthTable(error)) {
    return { writer: null, safety: null, summary: null, strategy: null };
  }
  if (error) throw new Error(`getAiHealthMap failed: ${error.message}`);

  const out: Record<AiComponent, AiHealthRecord | null> = {
    writer: null,
    safety: null,
    summary: null,
    strategy: null,
  };
  for (const row of (data ?? []) as AiHealthRecord[]) {
    out[row.component] = row;
  }
  return out;
}

export async function recordAiSuccess(component: AiComponent) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("ai_health").upsert(
    {
      component,
      status: "healthy",
      consecutive_failures: 0,
      consecutive_successes: 1,
      last_success_at: now,
      updated_at: now,
    },
    { onConflict: "component" },
  );
  if (missingHealthTable(error)) return;
  if (error) throw new Error(`recordAiSuccess ${component} failed: ${error.message}`);
}

export async function recordAiFailure(component: AiComponent, reason: string) {
  const current = await getAiHealth(component);
  const failures = (current?.consecutive_failures ?? 0) + 1;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("ai_health").upsert(
    {
      component,
      status: statusFor(component, failures),
      consecutive_failures: failures,
      consecutive_successes: 0,
      last_failure_at: now,
      last_failure_reason: reason.slice(0, 500),
      updated_at: now,
    },
    { onConflict: "component" },
  );
  if (missingHealthTable(error)) return;
  if (error) throw new Error(`recordAiFailure ${component} failed: ${error.message}`);
}

export async function autonomousPostingShutdownReason(): Promise<string | null> {
  const [writer, safety] = await Promise.all([getAiHealth("writer"), getAiHealth("safety")]);
  if (writer?.status === "shutdown") {
    return `Writer AI shutdown after ${writer.consecutive_failures} consecutive failures`;
  }
  if (safety?.status === "shutdown") {
    return `Safety AI shutdown after ${safety.consecutive_failures} consecutive failures`;
  }
  return null;
}
