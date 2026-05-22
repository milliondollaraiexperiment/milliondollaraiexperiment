import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const WRITER_MODEL = "gpt-4o-mini";
export const SAFETY_MODEL = "gpt-4o-mini";
export const STRATEGY_MODEL = process.env.STRATEGY_MODEL ?? "gpt-5.5-pro";
export const STRATEGY_FALLBACK_MODEL =
  process.env.STRATEGY_FALLBACK_MODEL ?? "gpt-5.5";
