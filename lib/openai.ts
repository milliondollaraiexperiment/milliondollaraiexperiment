import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const WRITER_MODEL = process.env.WRITER_MODEL ?? "gpt-5.4-mini";
export const WRITER_FALLBACK_MODEL =
  process.env.WRITER_FALLBACK_MODEL ?? "gpt-5.5";
export const WRITER_SECOND_FALLBACK_MODEL =
  process.env.WRITER_SECOND_FALLBACK_MODEL ?? "gpt-4o-mini";
export const SAFETY_MODEL = "gpt-4o-mini";
export const SUMMARY_MODEL = process.env.SUMMARY_MODEL ?? "gpt-5.5";
export const MONTHLY_SUMMARY_MODEL = process.env.MONTHLY_SUMMARY_MODEL ?? "gpt-5.5-pro";
export const STRATEGY_MODEL = process.env.STRATEGY_MODEL ?? "gpt-5.5-pro";
export const STRATEGY_FALLBACK_MODEL =
  process.env.STRATEGY_FALLBACK_MODEL ?? "gpt-5.5";
export const STRATEGY_SECOND_FALLBACK_MODEL =
  process.env.STRATEGY_SECOND_FALLBACK_MODEL ?? "gpt-5.4";

export async function createJsonResponse<T>(args: {
  model: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const response = await openai.responses.create({
    model: args.model,
    instructions: args.instructions,
    input: args.input,
    text: {
      format: {
        type: "json_schema",
        name: args.schemaName,
        strict: true,
        schema: args.schema,
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI Responses API returned empty output_text");
  }

  return JSON.parse(response.output_text) as T;
}
