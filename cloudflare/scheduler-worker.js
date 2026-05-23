const JOBS = {
  hourly: "/api/cron/hourly",
  daily: "/api/cron/daily",
};

function baseUrl(env) {
  const url = env.PRODUCTION_URL || "https://themilliondollaraiexperiment.com";
  return url.replace(/\/+$/, "");
}

function jobForCron(cron) {
  return cron === "0,15,30,45 4,5 * * *" ? "daily" : "hourly";
}

async function callJob(job, env) {
  if (!env.CRON_SECRET) {
    throw new Error("CRON_SECRET is not configured");
  }

  const url = `${baseUrl(env)}${JOBS[job]}`;
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
    const job = jobForCron(event.cron);
    ctx.waitUntil(callJob(job, env));
  },
};

export default worker;
