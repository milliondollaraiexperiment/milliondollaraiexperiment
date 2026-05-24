const JOBS = {
  hourly: "/api/cron/hourly",
  daily: "/api/cron/daily",
};

function baseUrl(env) {
  const url = env.PRODUCTION_URL || "https://themilliondollaraiexperiment.com";
  return url.replace(/\/+$/, "");
}

function jobForCron(cron) {
  if (cron === "0,15,30,45 0,1 * * *") return "daily";
  if (cron === "*/15 * * * *" || cron === "0 * * * *") return "hourly";
  throw new Error(`No matching scheduler job for cron: ${cron}`);
}

function jobUrl(job, env) {
  if (job === "hourly" && env.HOURLY_CRON_URL) return env.HOURLY_CRON_URL;
  if (job === "daily" && env.DAILY_CRON_URL) return env.DAILY_CRON_URL;
  return `${baseUrl(env)}${JOBS[job]}`;
}

async function callJob(job, env) {
  if (!env.CRON_SECRET) {
    throw new Error("CRON_SECRET is not configured");
  }

  const url = jobUrl(job, env);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "X-Scheduler-Source": "cloudflare-workers",
    },
  });
  const body = await response.text();
  console.log(
    JSON.stringify({
      job,
      status: response.status,
      ok: response.ok,
      body: body.slice(0, 2000),
    }),
  );
  if (!response.ok) {
    throw new Error(`${job} scheduler call failed with HTTP ${response.status}`);
  }
}

const worker = {
  async scheduled(event, env, ctx) {
    console.log(`Scheduled trigger: ${event.cron}`);
    const job = jobForCron(event.cron);
    ctx.waitUntil(callJob(job, env));
  },

  async fetch() {
    return new Response("Million Dollar AI scheduler is alive.");
  },
};

export default worker;
