// TODO(Phase 5): replace with real X (Twitter) API call via twitter-api-v2.
// Returns the X post id on success, or null if posting is disabled / not yet
// implemented. The orchestrator treats null as "did not post" — it will not
// set status='posted' unless this returns a real id.
export async function postToX(text: string): Promise<string | null> {
  void text;
  return null;
}
