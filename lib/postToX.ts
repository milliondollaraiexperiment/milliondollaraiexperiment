import { TwitterApi } from "twitter-api-v2";

// OAuth 1.0a user context — required to POST /2/tweets as a specific account.
// Bearer Token is read-only; OAuth 2.0 client credentials would need a refresh
// flow. For a single-account bot, OAuth 1.0a is by far the simplest.
//
// All four secrets MUST be set or postToX returns null and the orchestrator
// records the attempt as logged_only (never as `posted`).

function getClient(): TwitterApi | null {
  const appKey = process.env.X_APP_KEY;
  const appSecret = process.env.X_APP_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null;
  }

  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
}

export async function postToX(text: string): Promise<string | null> {
  const client = getClient();
  if (!client) {
    // X creds not configured — caller will treat this as "did not post"
    // and record status='logged_only'.
    return null;
  }

  const res = await client.v2.tweet({ text });
  // res.data is { id: string; text: string; edit_history_tweet_ids: string[] }
  return res.data?.id ?? null;
}

export async function postThreadToX(posts: string[]): Promise<string[] | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  const ids: string[] = [];
  for (const [index, text] of posts.entries()) {
    const res =
      index === 0
        ? await client.v2.tweet({ text })
        : await client.v2.reply(text, ids[index - 1]);
    const id = res.data?.id;
    if (!id) {
      throw new Error(`X returned no id for thread post ${index + 1}`);
    }
    ids.push(id);
  }

  return ids;
}
