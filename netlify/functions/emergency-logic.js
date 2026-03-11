const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

// ─── Thresholds ────────────────────────────────────────────────────────────────
const FLATLINE_MS = 5 * 60 * 1000;  // 5 minutes
const OFFLINE_MS  = 5 * 60 * 1000;  // 5 minutes

const THRESHOLDS = {
  bpm: {
    redHigh: 150, orangeHigh: 120, yellowHigh: 100,
    redLow: 40,   orangeLow: 45,   yellowLow: 50,
  },
  spo2: {
    red: 90, orange: 93, yellow: 95,
  },
  rr: {
    redHigh: 30,   orangeHigh: 25, yellowHigh: 22,
    redLow: 6,     orangeLow: 8,   yellowLow: 10,
  },
  temp: {
    red: 39.4, orange: 38.5, yellow: 37.8,
  },
  hrv: {
    seizureRed: 20, seizureOrange: 30,
  },
  battery: {
    orange: 10, yellow: 20,
  },
  sleep: {
    orange: 2, yellow: 4,
  },
  walkingSteadiness: {
    orange: "Very Low", yellow: "Low",
  },
};

// ─── Alert tier logic ──────────────────────────────────────────────────────────
function determineTier(vitals, lastSeenMs) {
  const alerts = [];
  let tier = "stable";

  const escalate = (newTier) => {
    const rank = { stable: 0, yellow: 1, orange: 2, red: 3 };
    if (rank[newTier] > rank[tier]) tier = newTier;
  };

  const now = Date.now();

  // ── Offline / flatline ─────────────────────────────────────────────────────
  if (lastSeenMs && now - lastSeenMs > OFFLINE_MS) {
    escalate("red");
    alerts.push("🔴 WATCH OFFLINE: No data received in the last 5 minutes.");
  }

  if (!vitals.bpm || vitals.bpm === 0) {
    escalate("red");
    alerts.push("🔴 FLATLINE: No heart rate signal detected for 5+ minutes.");
  }

  // ── Heart rate ─────────────────────────────────────────────────────────────
  if (vitals.bpm) {
    const { bpm } = vitals;
    if (bpm > THRESHOLDS.bpm.redHigh || bpm < THRESHOLDS.bpm.redLow) {
      escalate("red");
      alerts.push(`🔴 HEART RATE: ${bpm} BPM — critical range.`);
    } else if (bpm > THRESHOLDS.bpm.orangeHigh || bpm < THRESHOLDS.bpm.orangeLow) {
      escalate("orange");
      alerts.push(`🟠 HEART RATE: ${bpm} BPM — warning range.`);
    } else if (bpm > THRESHOLDS.bpm.yellowHigh || bpm < THRESHOLDS.bpm.yellowLow) {
      escalate("yellow");
      alerts.push(`🟡 HEART RATE: ${bpm} BPM — advisory range.`);
    }
  }

  // ── SpO2 ───────────────────────────────────────────────────────────────────
  if (vitals.spo2) {
    const { spo2 } = vitals;
    if (spo2 < THRESHOLDS.spo2.red) {
      escalate("red");
      alerts.push(`🔴 BLOOD OXYGEN: ${spo2}% — critically low.`);
    } else if (spo2 < THRESHOLDS.spo2.orange) {
      escalate("orange");
      alerts.push(`🟠 BLOOD OXYGEN: ${spo2}% — warning level.`);
    } else if (spo2 < THRESHOLDS.spo2.yellow) {
      escalate("yellow");
      alerts.push(`🟡 BLOOD OXYGEN: ${spo2}% — slightly low.`);
    }
  }

  // ── Respiratory rate ───────────────────────────────────────────────────────
  if (vitals.rr) {
    const { rr } = vitals;
    if (rr > THRESHOLDS.rr.redHigh || rr < THRESHOLDS.rr.redLow) {
      escalate("red");
      alerts.push(`🔴 RESPIRATORY RATE: ${rr} breaths/min — critical.`);
    } else if (rr > THRESHOLDS.rr.orangeHigh || rr < THRESHOLDS.rr.orangeLow) {
      escalate("orange");
      alerts.push(`🟠 RESPIRATORY RATE: ${rr} breaths/min — warning.`);
    } else if (rr > THRESHOLDS.rr.yellowHigh || rr < THRESHOLDS.rr.yellowLow) {
      escalate("yellow");
      alerts.push(`🟡 RESPIRATORY RATE: ${rr} breaths/min — advisory.`);
    }
  }

  // ── Body temperature ───────────────────────────────────────────────────────
  if (vitals.temp) {
    const { temp } = vitals;
    if (temp > THRESHOLDS.temp.red) {
      escalate("red");
      alerts.push(`🔴 TEMPERATURE: ${temp}°C — critically high.`);
    } else if (temp > THRESHOLDS.temp.orange) {
      escalate("orange");
      alerts.push(`🟠 TEMPERATURE: ${temp}°C — warning level.`);
    } else if (temp > THRESHOLDS.temp.yellow) {
      escalate("yellow");
      alerts.push(`🟡 TEMPERATURE: ${temp}°C — slightly elevated.`);
    }
  }

  // ── HRV / seizure scoring ──────────────────────────────────────────────────
  if (vitals.hrv) {
    const { hrv } = vitals;
    if (hrv < THRESHOLDS.hrv.seizureRed) {
      escalate("red");
      alerts.push(`🔴 HRV: ${hrv}ms — critically low, possible seizure indicator.`);
    } else if (hrv < THRESHOLDS.hrv.seizureOrange) {
      escalate("orange");
      alerts.push(`🟠 HRV: ${hrv}ms — low, monitor closely.`);
    }
  }

  // ── Fall detected ──────────────────────────────────────────────────────────
  if (vitals.fallDetected) {
    escalate("red");
    alerts.push("🔴 FALL DETECTED: Apple Watch detected a fall event.");
  }

  // ── AFib / irregular rhythm ────────────────────────────────────────────────
  if (vitals.afibDetected) {
    escalate("red");
    alerts.push("🔴 IRREGULAR RHYTHM: AFib or irregular heart rhythm detected.");
  }

  // ── Watch battery ──────────────────────────────────────────────────────────
  if (vitals.battery !== undefined && vitals.battery !== null) {
    const { battery } = vitals;
    if (battery < THRESHOLDS.battery.orange) {
      escalate("orange");
      alerts.push(`🟠 WATCH BATTERY: ${battery}% — charge soon or monitoring will be lost.`);
    } else if (battery < THRESHOLDS.battery.yellow) {
      escalate("yellow");
      alerts.push(`🟡 WATCH BATTERY: ${battery}% — getting low.`);
    }
  }

  // ── Sleep ──────────────────────────────────────────────────────────────────
  if (vitals.sleepHours !== undefined && vitals.sleepHours !== null) {
    const { sleepHours } = vitals;
    if (sleepHours < THRESHOLDS.sleep.orange) {
      escalate("orange");
      alerts.push(`🟠 SLEEP: Only ${sleepHours} hours of sleep detected.`);
    } else if (sleepHours < THRESHOLDS.sleep.yellow) {
      escalate("yellow");
      alerts.push(`🟡 SLEEP: ${sleepHours} hours of sleep — below recommended.`);
    }
  }

  // ── Walking steadiness ─────────────────────────────────────────────────────
  if (vitals.walkingSteadiness) {
    if (vitals.walkingSteadiness === "Very Low") {
      escalate("orange");
      alerts.push("🟠 WALKING STEADINESS: Very Low — elevated fall risk.");
    } else if (vitals.walkingSteadiness === "Low") {
      escalate("yellow");
      alerts.push("🟡 WALKING STEADINESS: Low — monitor for fall risk.");
    }
  }

  return { tier, alerts };
}

// ─── Pushover sender ───────────────────────────────────────────────────────────
async function sendPushover(token, userKey, message, title, priority = 0, sound = "magic") {
  const params = {
    token,
    user:      userKey,
    message,
    title,
    priority:  String(priority),
    sound,
    url:       "https://watchaware.app/?view=caretaker",
    url_title: "Open WATCHaware",
  };
  if (priority === 2) {
    params.retry  = "60";
    params.expire = "3600";
  }
  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(params),
  });
  return response.json();
}

// ─── In-memory state ───────────────────────────────────────────────────────────
// Note: Use Supabase in Round 2 for persistence across function cold starts
let lastState = {
  tier:      "stable",
  messages:  [],
  vitals:    {},
  lastSeen:  null,
};

// ─── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async function (event) {

  // Alert state polling from caretaker dashboard
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        tier:         lastState.tier,
        messages:     lastState.messages,
        bpm:          lastState.vitals.bpm          || 0,
        spo2:         lastState.vitals.spo2         || null,
        rr:           lastState.vitals.rr           || null,
        temp:         lastState.vitals.temp         || null,
        hrv:          lastState.vitals.hrv          || null,
        battery:      lastState.vitals.battery      || null,
        sleepHours:   lastState.vitals.sleepHours   || null,
        walkingSteadiness: lastState.vitals.walkingSteadiness || null,
        fallDetected: lastState.vitals.fallDetected || false,
        afibDetected: lastState.vitals.afibDetected || false,
        lastSync:     lastState.lastSeen,
      }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const now = Date.now();
  lastState.lastSeen = new Date().toISOString();

  // Store incoming vitals
  lastState.vitals = {
    bpm:               body.bpm               || body.heartRate        || null,
    spo2:              body.spo2              || body.bloodOxygen      || null,
    rr:                body.rr                || body.respiratoryRate  || null,
    temp:              body.temp              || body.bodyTemperature  || null,
    hrv:               body.hrv               || body.heartRateVariability || null,
    fallDetected:      body.fallDetected      || false,
    afibDetected:      body.afibDetected      || false,
    battery:           body.battery           || body.watchBattery     || null,
    sleepHours:        body.sleepHours        || null,
    walkingSteadiness: body.walkingSteadiness || null,
  };

  const { tier, alerts } = determineTier(lastState.vitals, lastState.lastSeen ? new Date(lastState.lastSeen).getTime() : null);
  const prevTier = lastState.tier;
  lastState.tier     = tier;
  lastState.messages = alerts;

  // Only send Pushover if tier has escalated
  if (tier !== "stable" && tier !== prevTier) {
    const token    = process.env.PUSHOVER_APP_TOKEN;
    const userKeys = [
      process.env.PUSHOVER_USER_KEY,
      process.env.PUSHOVER_USER_KEY_2,
      process.env.PUSHOVER_USER_KEY_3,
    ].filter(Boolean);

    const priority = tier === "red" ? 2 : tier === "orange" ? 1 : 0;
    const sound    = tier === "red" ? "persistent" : tier === "orange" ? "echo" : "magic";
    const title    = tier === "red"
      ? "🔴 WATCHaware — EMERGENCY"
      : tier === "orange"
      ? "🟠 WATCHaware — WARNING"
      : "🟡 WATCHaware — ADVISORY";

    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
    });

    const message = `${title}\n${now} EST\n\n${alerts.join("\n")}`;

    await Promise.all(
      userKeys.map(key => sendPushover(token, key, message, title, priority, sound))
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "ok", tier, alerts }),
  };
};