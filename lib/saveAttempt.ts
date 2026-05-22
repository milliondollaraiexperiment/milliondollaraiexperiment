import type { AttemptRecord } from "./types";

// TODO(Phase 3): insert into Supabase `attempts` table.
export async function saveAttempt(record: AttemptRecord): Promise<void> {
  console.log("[saveAttempt — STUB]", JSON.stringify(record, null, 2));
}
