import { supabaseAdmin } from "./supabase";
import type { AttemptRecord, AttemptStatus } from "./types";

type SaveOptions = {
  status: AttemptStatus;
  xPostId?: string | null;
  errorMessage?: string | null;
};

export async function saveAttempt(
  record: AttemptRecord,
  options: SaveOptions,
): Promise<{ id: string }> {
  const { context, post, safety, hard } = record;
  const writerModelNote = post.writer_model ? `Writer model: ${post.writer_model}.` : null;
  const publicStrategyNote = [post.public_strategy_note, writerModelNote]
    .filter(Boolean)
    .join(" ");

  const { data, error } = await supabaseAdmin
    .from("attempts")
    .insert({
      hour_number: context.hourNumber,
      post_type: post.post_type,
      text: post.text,
      status: options.status,
      safety_score: safety.risk_score,
      safety_reasons: safety.reasons,
      hard_block_reason: hard.ok ? null : hard.reason,
      x_post_id: options.xPostId ?? null,
      public_strategy_note: publicStrategyNote,
      error_message: options.errorMessage ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`saveAttempt insert failed: ${error.message}`);
  }

  return { id: data.id };
}
