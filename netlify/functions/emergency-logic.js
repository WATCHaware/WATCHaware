const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { bpm, lastSync } = body;

  if (!lastSync) {
    return { statusCode: 400, body: "Missing lastSync timestamp" };
  }

  const lastSyncDate = new Date(lastSync);
  if (isNaN(lastSyncDate.getTime())) {
    return { statusCode: 400, body: "Invalid lastSync timestamp" };
  }

  const now = Date.now();
  const minSinceSync = (now - lastSyncDate.getTime()) / 1000 / 60;

  const estHour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  ).getHours();
  const inSleepWindow = estHour >= 22 || estHour < 6;

  if (inSleepWindow) {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "suppressed", reason: "sleep_window" }),
    };
  }

  const flatline = (!bpm || bpm === 0) && minSinceSync > 20;
  const offline  = minSinceSync > 35;

  if (flatline || offline) {
    const message = flatline
      ? "🚨 WATCHaware: No heart rate detected for 20+ minutes. Check on patient immediately."
      : "📡 WATCHaware: Watch offline for 35+ minutes. Check device and connection.";

    try {
      const pushResponse = await fetch("https://api.pushover.net/1/messages.json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token:    process.env.PUSHOVER_APP_TOKEN,
          user:     process.env.PUSHOVER_USER_KEY,
          message,
          title:    "WATCHaware Alert",
          priority: "2",
          retry:    "60",
          expire:   "3600",
          sound:    "siren",
        }),
      });
      const pushResult = await pushResponse.json();
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "alert_sent", pushover: pushResult }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "pushover_failed", error: err.message }),
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "stable",
      minSinceSync: Math.round(minSinceSync),
    }),
  };
};