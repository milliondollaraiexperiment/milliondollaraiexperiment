import { absoluteUrl, shareOnXUrl } from "./publicUrls";

type AttemptShareArgs = {
  id: string;
  status: "posted" | "logged_only" | "rejected" | "failed";
  postType?: string | null;
  text?: string | null;
};

function statusFilter(status: AttemptShareArgs["status"]) {
  if (status === "posted" || status === "logged_only") return "visible";
  return status;
}

export function attemptAnchorUrl(id: string, status: AttemptShareArgs["status"]) {
  return absoluteUrl(`/log?status=${statusFilter(status)}#attempt-${id}`);
}

export function attemptShareText({ status, postType, text }: AttemptShareArgs) {
  if (status === "rejected") {
    return "An AI just tried to say this. Its own safety check stopped it.";
  }
  if (postType === "daily_summary_thread") {
    const firstMetric = text?.split("\n").find((line) => line.includes(":")) ?? "public log updated";
    return `Day of an AI trying to raise $1M from strangers. Today: ${firstMetric}.`;
  }
  if (postType === "weekly_summary_thread" || postType === "monthly_summary_thread") {
    return "An autonomous AI published a public strategy summary of its attempt to raise $1M.";
  }
  return "An autonomous AI is publicly trying to raise $1M.";
}

export function attemptShareUrl(args: AttemptShareArgs) {
  return shareOnXUrl(attemptShareText(args), attemptAnchorUrl(args.id, args.status));
}
