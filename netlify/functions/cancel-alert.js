const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

async function sendPushover(token, userKey, message, title) {
  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token,
      user:      userKey,
      message,
      title,
      priority:  "0",
      sound:     "magic",
      url:       "https://watchaware.app/?view=caretaker",
      url_title: "Open WATCHaware",
    }),
  });
  return response.json();
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token    = process.env.PUSHOVER_APP_TOKEN;
  const userKeys = [
    process.env.PUSHOVER_USER_KEY,
    process.env.PUSHOVER_USER_KEY_2,
    process.env.PUSHOVER_USER_KEY_3,
  ].filter(Boolean);

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
  });

  const message = `✅ FALSE ALARM: Kathleen cancelled the SOS alert at ${now} EST. She is okay. No action required.`;
  const title   = "WATCHaware — Alert Cancelled";

  try {
    const results = await Promise.all(
      userKeys.map(key => sendPushover(token, key, message, title))
    );
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "cancellation_sent", recipients: results.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "failed", error: err.message }),
    };
  }
};