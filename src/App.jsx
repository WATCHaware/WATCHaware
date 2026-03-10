import { useState, useEffect, useRef } from "react";

const COLORS = {
  oatmeal:    "#FDF1DB",
  terracotta: "#D1835C",
  celadon:    "#A8C3B3",
  slate:      "#4A4A4A",
  slateLight: "#8C8C8C",
  white:      "#FFFFFF",
  ring:       "#C97A50",
};

const ALERT_TIERS = {
  stable: {
    orb:        "radial-gradient(circle at 38% 32%, #C2D9CF, #A8C3B3 60%, #8AADA0)",
    glow:       "rgba(168,195,179,0.25)",
    label:      "MONITORING",
    labelColor: "rgba(255,255,255,0.9)",
    accent:     "#A8C3B3",
    emoji:      "",
    shadowBase: "rgba(168,195,179,0.25)",
    shadowPeak: "rgba(168,195,179,0.5)",
  },
  yellow: {
    orb:        "radial-gradient(circle at 38% 32%, #FFE566, #E6C840 60%, #C9A800)",
    glow:       "rgba(230,200,64,0.35)",
    label:      "ADVISORY",
    labelColor: "rgba(255,255,255,0.95)",
    accent:     "#E6C840",
    emoji:      "🟡",
    shadowBase: "rgba(230,200,64,0.3)",
    shadowPeak: "rgba(230,200,64,0.6)",
  },
  orange: {
    orb:        "radial-gradient(circle at 38% 32%, #FFB347, #E8821A 60%, #C96500)",
    glow:       "rgba(232,130,26,0.4)",
    label:      "WARNING",
    labelColor: "rgba(255,255,255,0.95)",
    accent:     "#E8821A",
    emoji:      "🟠",
    shadowBase: "rgba(232,130,26,0.35)",
    shadowPeak: "rgba(232,130,26,0.65)",
  },
  red: {
    orb:        "radial-gradient(circle at 38% 32%, #FF6B6B, #D1835C 60%, #B03020)",
    glow:       "rgba(211,60,48,0.45)",
    label:      "EMERGENCY",
    labelColor: "rgba(255,255,255,1)",
    accent:     "#D13C30",
    emoji:      "🔴",
    shadowBase: "rgba(211,60,48,0.4)",
    shadowPeak: "rgba(211,60,48,0.8)",
  },
};

const TIME_PALETTES = {
  dawn:    { bg: "#FFE4B5", arc1: "#FFB347", arc2: "#FFA07A", label: "Dawn"    },
  morning: { bg: "#FDF1DB", arc1: "#F5C842", arc2: "#F4A460", label: "Morning" },
  midday:  { bg: "#E8F4FD", arc1: "#87CEEB", arc2: "#4682B4", label: "Midday"  },
  evening: { bg: "#FFE4CC", arc1: "#FF8C00", arc2: "#D1835C", label: "Evening" },
  dusk:    { bg: "#E6D5F5", arc1: "#9B59B6", arc2: "#6C3483", label: "Dusk"    },
  night:   { bg: "#1a1a2e", arc1: "#4A4A8A", arc2: "#2C2C5E", label: "Night"   },
};

const getTimePalette = h => {
  if (h >= 5  && h < 7)  return TIME_PALETTES.dawn;
  if (h >= 7  && h < 12) return TIME_PALETTES.morning;
  if (h >= 12 && h < 17) return TIME_PALETTES.midday;
  if (h >= 17 && h < 20) return TIME_PALETTES.evening;
  if (h >= 20 && h < 22) return TIME_PALETTES.dusk;
  return TIME_PALETTES.night;
};

const bpmToDuration = (bpm) => {
  if (!bpm || bpm <= 0) return 4000;
  const ms = (60 / bpm) * 1000;
  return Math.round(Math.min(Math.max(ms * 2, 600), 5000));
};

const injectBreathAnimation = (tierKey, shadowBase, shadowPeak, duration) => {
  const name = `breathe_${tierKey}_${duration}`;
  if (document.getElementById(`anim_${name}`)) return name;
  const style = document.createElement("style");
  style.id = `anim_${name}`;
  style.textContent = `
    @keyframes ${name} {
      0%,100% { box-shadow: 0 0 40px ${shadowBase}, 0 12px 30px ${shadowBase}; }
      50%      { box-shadow: 0 0 80px ${shadowPeak}, 0 12px 45px ${shadowPeak}; }
    }
  `;
  document.head.appendChild(style);
  return name;
};

const STYLE_TAG = `
@keyframes cancelPulse {
  0%,100% { box-shadow: 0 0 30px rgba(168,195,179,0.4), 0 8px 20px rgba(168,195,179,0.2); }
  50%      { box-shadow: 0 0 70px rgba(168,195,179,0.8), 0 8px 40px rgba(168,195,179,0.5); }
}
@keyframes cancelHandlePulse {
  0%,100% { background-color: #A8C3B3; transform: scale(1); }
  50%      { background-color: #C2D9CF; transform: scale(1.12); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
`;

// ─── Audio engine ──────────────────────────────────────────────────────────────
const AudioEngine = {
  ctx: null,
  getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  },
  tone(frequency, duration, volume = 0.18, delay = 0) {
    try {
      const ctx  = this.getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.12);
      gain.gain.setValueAtTime(volume, start + duration - 0.18);
      gain.gain.linearRampToValueAtTime(0, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    } catch (e) {}
  },
  yellow()       { this.tone(440, 0.6, 0.14); this.tone(659, 0.6, 0.14, 0.55); },
  orange()       { this.tone(523, 0.5, 0.16); this.tone(659, 0.5, 0.16, 0.45); this.tone(784, 0.7, 0.16, 0.90); },
  red()          { this.tone(784, 0.55, 0.22); this.tone(659, 0.55, 0.22, 0.5); this.tone(523, 0.55, 0.22, 1.0); this.tone(659, 0.75, 0.22, 1.5); },
  acknowledged() { this.tone(523, 0.4, 0.12); this.tone(659, 0.4, 0.12, 0.05); this.tone(784, 0.6, 0.12, 0.1); },
  sosFired()     { [523,587,659,698,784].forEach((f,i) => this.tone(f, 0.35, 0.15, i * 0.18)); },
  sosHolding(p)  { this.tone(p > 75 ? 880 : p > 50 ? 740 : 587, 0.18, 0.1); },
  cancelled()    {
    this.tone(784, 0.4, 0.14);
    this.tone(659, 0.4, 0.14, 0.35);
    this.tone(523, 0.5, 0.14, 0.70);
    this.tone(392, 0.7, 0.14, 1.05);
  },
};

// ─── Haptics ───────────────────────────────────────────────────────────────────
const vibrate = p => { if (navigator.vibrate) navigator.vibrate(p); };
const HAPTICS = {
  stable:       () => vibrate(40),
  yellow:       () => vibrate([60, 80, 60]),
  orange:       () => vibrate([100, 60, 100, 60, 100]),
  red:          () => vibrate([200, 80, 100, 80, 200]),
  sosHolding:   (p) => { if (p > 75) vibrate(80); else if (p > 50) vibrate(50); else if (p > 25) vibrate(30); },
  sosFired:     () => vibrate([300, 80, 300]),
  acknowledged: () => vibrate([60, 30, 60, 30, 120]),
  cancelled:    () => vibrate([40, 60, 40, 60, 200]),
};

// ─── Flash engine ──────────────────────────────────────────────────────────────
const Flash = {
  torchStream: null, torchTrack: null, flashOverlay: null,
  async startTorch() {
    try {
      this.torchStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      this.torchTrack  = this.torchStream.getVideoTracks()[0];
      await this.torchTrack.applyConstraints({ advanced: [{ torch: true }] });
    } catch (e) {}
  },
  async stopTorch() {
    try {
      if (this.torchTrack) {
        await this.torchTrack.applyConstraints({ advanced: [{ torch: false }] });
        this.torchStream.getTracks().forEach(t => t.stop());
        this.torchTrack = null; this.torchStream = null;
      }
    } catch (e) {}
  },
  createOverlay() {
    if (this.flashOverlay) return this.flashOverlay;
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;z-index:99999;background:white;pointer-events:none;opacity:0;";
    document.body.appendChild(el);
    this.flashOverlay = el;
    return el;
  },
  removeOverlay() {
    if (this.flashOverlay) {
      this.flashOverlay.style.opacity = "0";
      setTimeout(() => {
        if (this.flashOverlay && document.body.contains(this.flashOverlay)) {
          document.body.removeChild(this.flashOverlay);
        }
        this.flashOverlay = null;
      }, 500);
    }
  },
  async redAlert() {
    const overlay = this.createOverlay();
    const pattern = [600, 800, 600, 1200];
    for (let i = 0; i < pattern.length; i++) {
      overlay.style.opacity    = i % 2 === 0 ? "0.85" : "0";
      overlay.style.transition = `opacity ${i % 2 === 0 ? "0.3s" : "0.5s"} ease`;
      await this.torchStep(i % 2 === 0);
      await new Promise(r => setTimeout(r, pattern[i]));
    }
    overlay.style.opacity = "0";
    await this.stopTorch();
  },
  async torchStep(on) {
    try { on ? await this.startTorch() : await this.stopTorch(); } catch (e) {}
  },
};

// ─── Location helper ───────────────────────────────────────────────────────────
const getLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve({ lat: null, lng: null });
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    ()    => resolve({ lat: null, lng: null }),
    { timeout: 5000, maximumAge: 30000 }
  );
});

const BASE = {
  app: {
    backgroundColor: "transparent",
    minHeight: "100vh",
    fontFamily: "'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
    color: COLORS.slate,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 430,
    margin: "0 auto",
  },
};

function Logo({ subtitle, light }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 44, paddingBottom: 4 }}>
      <div style={{
        fontSize: 28, lineHeight: 1.1, display: "inline-block",
        textShadow: "0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(255,255,255,0.6), 0 0 60px rgba(255,255,255,0.3)",
      }}>
        <span style={{ fontWeight: 800, letterSpacing: 1, color: light ? COLORS.white : COLORS.slate }}>WATCH</span>
        <span style={{ fontWeight: 300, fontStyle: "italic", color: light ? "rgba(255,255,255,0.9)" : COLORS.slate }}>aware</span>
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: light ? "rgba(255,255,255,0.7)" : COLORS.slateLight, marginTop: 4, letterSpacing: 0.5 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ─── Location permission prompt ────────────────────────────────────────────────
function LocationPermissionPrompt({ onGranted }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      backgroundColor: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 32px",
      animation: "fadeIn 0.4s ease",
    }}>
      <div style={{
        backgroundColor: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        borderRadius: 28,
        padding: "36px 28px",
        border: "1px solid rgba(255,255,255,0.2)",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>📍</div>
        <div style={{
          fontSize: 18, fontWeight: 700, color: COLORS.white,
          marginBottom: 12, letterSpacing: 0.3,
        }}>
          Allow Location Access
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.75)",
          lineHeight: 1.6, marginBottom: 28,
        }}>
          When you press the SOS button, your location will be shared with your caregivers so they can find you quickly. Your location is never tracked or stored — it is only shared in the moment you need help.
        </div>
        <button
          onClick={onGranted}
          style={{
            width: "100%", padding: "14px 0",
            backgroundColor: COLORS.celadon, color: COLORS.slate,
            border: "none", borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            letterSpacing: 0.5,
            boxShadow: "0 4px 20px rgba(168,195,179,0.4)",
          }}
        >
          Allow Location Access
        </button>
        <button
          onClick={onGranted}
          style={{
            width: "100%", padding: "12px 0", marginTop: 10,
            backgroundColor: "transparent", color: "rgba(255,255,255,0.55)",
            border: "none", fontSize: 12, cursor: "pointer",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function SlideAction({ label, onComplete, color = COLORS.slate, pulseGreen = false }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [offsetX,  setOffsetX]  = useState(0);
  const startX = useRef(0);
  const HANDLE = 52;
  const trackW = () => trackRef.current ? trackRef.current.offsetWidth - HANDLE : 260;

  const onStart = cx => { setDragging(true); startX.current = cx - offsetX; };
  const onMove  = cx => {
    if (!dragging) return;
    const nx = Math.max(0, Math.min(cx - startX.current, trackW()));
    setOffsetX(nx);
    if (nx >= trackW() * 0.88) {
      HAPTICS.acknowledged(); AudioEngine.acknowledged(); onComplete(); setOffsetX(0);
    }
  };
  const onEnd = () => { setDragging(false); if (offsetX < trackW() * 0.88) setOffsetX(0); };

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={trackRef}
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => onMove(e.clientX)}
        onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={e => { e.preventDefault(); onStart(e.touches[0].clientX); }}
        onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX); }}
        onTouchEnd={onEnd}
        style={{
          position: "relative", height: HANDLE,
          backgroundColor: pulseGreen ? "rgba(168,195,179,0.3)" : "rgba(255,255,255,0.25)",
          backdropFilter: "blur(10px)",
          borderRadius: HANDLE, cursor: "grab", userSelect: "none",
          border: pulseGreen ? "1.5px solid rgba(168,195,179,0.6)" : "1px solid rgba(255,255,255,0.3)",
          animation: pulseGreen ? "cancelPulse 2s ease-in-out infinite" : "none",
          touchAction: "none",
          transition: "background-color 0.5s ease, border 0.5s ease",
        }}
      >
        <div style={{
          position: "absolute", left: offsetX, top: 0,
          width: HANDLE, height: HANDLE, borderRadius: "50%",
          backgroundColor: pulseGreen ? COLORS.celadon : color,
          boxShadow: pulseGreen ? "0 4px 16px rgba(168,195,179,0.5)" : "0 4px 12px rgba(0,0,0,0.18)",
          animation: pulseGreen ? "cancelHandlePulse 2s ease-in-out infinite" : "none",
          transition: dragging ? "none" : "left 0.3s ease",
          zIndex: 2,
        }} />
        <div style={{
          position: "absolute", width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, letterSpacing: 1.8,
          color: pulseGreen ? "rgba(168,195,179,0.9)" : "rgba(255,255,255,0.8)",
          paddingLeft: HANDLE + 8,
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function HoldButton({ onFired }) {
  const [holding,  setHolding]  = useState(false);
  const [progress, setProgress] = useState(0);
  const iRef    = useRef(null);
  const prevPct = useRef(0);
  const HOLD    = 3000;

  const start = () => {
    setHolding(true); prevPct.current = 0;
    const t0 = Date.now();
    iRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - t0) / HOLD) * 100, 100);
      setProgress(pct);
      if (pct >= 25 && prevPct.current < 25) { HAPTICS.sosHolding(25); AudioEngine.sosHolding(25); }
      if (pct >= 50 && prevPct.current < 50) { HAPTICS.sosHolding(50); AudioEngine.sosHolding(50); }
      if (pct >= 75 && prevPct.current < 75) { HAPTICS.sosHolding(75); AudioEngine.sosHolding(75); }
      prevPct.current = pct;
      if (pct >= 100) { clearInterval(iRef.current); HAPTICS.sosFired(); AudioEngine.sosFired(); onFired && onFired(); }
    }, 30);
  };
  const end = () => { setHolding(false); setProgress(0); prevPct.current = 0; clearInterval(iRef.current); };
  const R = 140, C = 2 * Math.PI * R;

  return (
    <div style={{ position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={300} height={300} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={150} cy={150} r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={6} />
        {holding && (
          <circle cx={150} cy={150} r={R} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={6}
            strokeDasharray={C} strokeDashoffset={C - (progress / 100) * C} strokeLinecap="round" />
        )}
      </svg>
      <div
        onMouseDown={start} onMouseUp={end} onMouseLeave={end}
        onTouchStart={e => { e.preventDefault(); start(); }}
        onTouchEnd={end}
        style={{
          width: 258, height: 258, borderRadius: "50%",
          background: holding
            ? "radial-gradient(circle at 38% 28%, #E8956A, #D1835C 55%, #A8622E)"
            : "radial-gradient(circle at 38% 28%, #E8956A, #D1835C 55%, #B06030)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: holding
            ? "0 8px 50px rgba(211,131,92,0.55), inset 0 -8px 20px rgba(0,0,0,0.2), inset 0 3px 8px rgba(255,255,255,0.15)"
            : "0 12px 40px rgba(211,131,92,0.28), inset 0 -8px 20px rgba(0,0,0,0.15), inset 0 3px 8px rgba(255,255,255,0.2)",
          cursor: "pointer", userSelect: "none",
          transform: holding ? "scale(0.96)" : "scale(1)",
          transition: "transform 0.1s ease, box-shadow 0.2s ease",
          touchAction: "none", position: "relative", overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: 14, left: 38, width: 100, height: 48, borderRadius: "50%",
          background: "rgba(255,255,255,0.18)", filter: "blur(6px)", transform: "rotate(-20deg)", pointerEvents: "none",
        }} />
        <span style={{ fontSize: 50, fontWeight: 700, color: COLORS.white, letterSpacing: 3, position: "relative" }}>SOS</span>
      </div>
    </div>
  );
}

function SleepDial({ startHour, endHour, onChange }) {
  const svgRef   = useRef(null);
  const dragging = useRef(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const t = setInterval(() => setCurrentHour(new Date().getHours()), 60000);
    return () => clearInterval(t);
  }, []);

  const palette   = getTimePalette(currentHour);
  const isNight   = currentHour >= 22 || currentHour < 5;
  const textColor = isNight ? "rgba(255,255,255,0.85)" : COLORS.slate;
  const subColor  = isNight ? "rgba(255,255,255,0.55)" : COLORS.slateLight;
  const SIZE = 240, CX = SIZE / 2, CY = SIZE / 2, R = 96;

  const hourToAngle = h => ((h / 24) * 360 - 90 + 360) % 360;
  const angleToHour = a => Math.round(((a + 90 + 360) % 360) / 15) % 24;
  const polarToXY   = (deg, r) => ({
    x: CX + r * Math.cos((deg * Math.PI) / 180),
    y: CY + r * Math.sin((deg * Math.PI) / 180),
  });
  const describeArc = (a1, a2) => {
    const s = polarToXY(a1, R), e = polarToXY(a2, R);
    const large = ((a2 - a1 + 360) % 360) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const getAngle = ev => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    return (Math.atan2(cy - rect.top - CY, cx - rect.left - CX) * 180) / Math.PI;
  };

  const startA  = hourToAngle(startHour);
  const endA    = hourToAngle(endHour);
  const sunPos  = polarToXY(startA, R);
  const moonPos = polarToXY(endA, R);
  const fmt = h => `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? "PM" : "AM"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 0" }}>
      <svg
        ref={svgRef} width={SIZE} height={SIZE}
        onMouseMove={e => {
          if (!dragging.current) return;
          const h = angleToHour(getAngle(e));
          dragging.current === "start" ? onChange(h, endHour) : onChange(startHour, h);
        }}
        onMouseUp={() => dragging.current = null}
        onTouchMove={e => {
          e.preventDefault();
          if (!dragging.current) return;
          const h = angleToHour(getAngle(e));
          dragging.current === "start" ? onChange(h, endHour) : onChange(startHour, h);
        }}
        onTouchEnd={() => dragging.current = null}
        style={{ touchAction: "none", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="sleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={palette.arc1} />
            <stop offset="100%" stopColor={palette.arc2} />
          </linearGradient>
          <radialGradient id="dialBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={palette.bg} stopOpacity="0.95" />
            <stop offset="100%" stopColor={palette.bg} stopOpacity="0.7"  />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={R + 20} fill="url(#dialBg)"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.1))", transition: "fill 2s ease" }} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={20} />
        <path d={describeArc(startA, endA)} fill="none" stroke="url(#sleepGrad)" strokeWidth={20} strokeLinecap="round" />
        <text x={CX} y={CY - 18} textAnchor="middle" fontSize={9} fill={subColor} fontWeight={600} letterSpacing={1.2}>SLEEP WINDOW</text>
        <text x={CX} y={CY - 2}  textAnchor="middle" fontSize={14} fill={textColor} fontWeight={700}>{fmt(startHour)}</text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize={11} fill={subColor}>to {fmt(endHour)}</text>
        <text x={CX} y={CY + 30} textAnchor="middle" fontSize={8}  fill={subColor} letterSpacing={0.5}>EST · {palette.label}</text>
        <circle cx={sunPos.x} cy={sunPos.y} r={20} fill="#F5C842" stroke={COLORS.white} strokeWidth={3}
          style={{ cursor: "grab", filter: "drop-shadow(0 3px 8px rgba(245,200,66,0.6))" }}
          onMouseDown={e => { e.preventDefault(); dragging.current = "start"; }}
          onTouchStart={e => { e.preventDefault(); dragging.current = "start"; }} />
        <text x={sunPos.x} y={sunPos.y + 6} textAnchor="middle" fontSize={15} style={{ pointerEvents: "none" }}>☀️</text>
        <circle cx={moonPos.x} cy={moonPos.y} r={20} fill="#89A4C7" stroke={COLORS.white} strokeWidth={3}
          style={{ cursor: "grab", filter: "drop-shadow(0 3px 8px rgba(137,164,199,0.6))" }}
          onMouseDown={e => { e.preventDefault(); dragging.current = "end"; }}
          onTouchStart={e => { e.preventDefault(); dragging.current = "end"; }} />
        <text x={moonPos.x} y={moonPos.y + 6} textAnchor="middle" fontSize={14} style={{ pointerEvents: "none" }}>🌙</text>
      </svg>
      <div style={{ fontSize: 10, color: COLORS.slateLight, letterSpacing: 0.5 }}>
        Drag ☀️ wake · drag 🌙 sleep
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 46, height: 26, borderRadius: 13,
      backgroundColor: value ? COLORS.terracotta : "#D4D4D4",
      position: "relative", cursor: "pointer",
      transition: "background-color 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: value ? 22 : 3,
        width: 20, height: 20, borderRadius: "50%",
        backgroundColor: COLORS.white, boxShadow: "0 2px 5px rgba(0,0,0,0.14)",
        transition: "left 0.2s ease",
      }} />
    </div>
  );
}

function AlertBanner({ tier, messages }) {
  const t = ALERT_TIERS[tier];
  if (tier === "stable" || !messages || messages.length === 0) return null;
  return (
    <div style={{
      width: "88%", backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)",
      borderRadius: 16, padding: "14px 18px", border: `1.5px solid ${t.accent}88`, marginBottom: 8,
    }}>
      {messages.map((msg, i) => (
        <div key={i} style={{
          fontSize: 12, color: COLORS.white, lineHeight: 1.5,
          marginBottom: i < messages.length - 1 ? 8 : 0,
          paddingBottom: i < messages.length - 1 ? 8 : 0,
          borderBottom: i < messages.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}>
          {msg}
        </div>
      ))}
    </div>
  );
}

function StatusRow({ icon, label, value, tier }) {
  const color = tier === "red" ? "#FF8080" : tier === "orange" ? "#FFB347" : tier === "yellow" ? "#FFE566" : "rgba(255,255,255,0.9)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700 }}>
      <span>{icon}</span>
      <span style={{ color: COLORS.white }}>{label}: </span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Patient SOS screen ────────────────────────────────────────────────────────
function PatientSOS({ onAlertFired }) {
  const [time,           setTime]           = useState("");
  const [alertActive,    setAlertActive]    = useState(false);
  const [cancelled,      setCancelled]      = useState(false);
  const [showLocPrompt,  setShowLocPrompt]  = useState(false);
  const [locationReady,  setLocationReady]  = useState(false);

  // Clock
  useEffect(() => {
    const upd = () => setTime(
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " EST"
    );
    upd();
    const t = setInterval(upd, 10000);
    return () => clearInterval(t);
  }, []);

  // Show location prompt on first open if not yet granted
  useEffect(() => {
    const granted = localStorage.getItem("watchaware_location_granted");
    if (!granted) {
      setTimeout(() => setShowLocPrompt(true), 1200);
    } else {
      setLocationReady(true);
    }
  }, []);

  const handleLocationGranted = () => {
    setShowLocPrompt(false);
    // Trigger the actual browser permission request
    navigator.geolocation && navigator.geolocation.getCurrentPosition(
      () => {
        localStorage.setItem("watchaware_location_granted", "true");
        setLocationReady(true);
      },
      () => {
        localStorage.setItem("watchaware_location_granted", "skipped");
        setLocationReady(true);
      },
      { timeout: 8000 }
    );
  };

  const handleFired = async () => {
    setAlertActive(true);
    setCancelled(false);
    const location = await getLocation();
    onAlertFired(location);

    // Also fire the dedicated SOS alert function with location
    try {
      await fetch("/.netlify/functions/sos-alert", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(location),
      });
    } catch (e) {}
  };

  const handleCancel = async () => {
    HAPTICS.cancelled();
    AudioEngine.cancelled();
    setCancelled(true);
    setAlertActive(false);
    try {
      await fetch("/.netlify/functions/cancel-alert", { method: "POST" });
    } catch (e) {}
    setTimeout(() => setCancelled(false), 4000);
  };

  return (
    <div style={{
      ...BASE.app, justifyContent: "space-between", paddingBottom: 52, minHeight: "100vh",
      backgroundImage: "url('/sos-bg.png')", backgroundSize: "cover", backgroundPosition: "center",
    }}>

      {/* Location permission prompt */}
      {showLocPrompt && <LocationPermissionPrompt onGranted={handleLocationGranted} />}

      <Logo subtitle={`Monitoring  ·  ${time}`} light />

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 20, flex: 1, justifyContent: "center",
      }}>

        <HoldButton onFired={handleFired} />

        {/* Kind message beneath the button */}
        <div style={{
          textAlign: "center", padding: "0 32px",
          animation: "fadeIn 1s ease 0.5s both",
        }}>
          {!alertActive && !cancelled && (
            <>
              <div style={{
                fontSize: 13, color: "rgba(255,255,255,0.85)",
                fontWeight: 500, lineHeight: 1.6, letterSpacing: 0.2,
              }}>
                If you need help, hold this button for 3 seconds.
              </div>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.55)",
                marginTop: 6, lineHeight: 1.5, letterSpacing: 0.3,
              }}>
                Your caregivers will be notified immediately
                {locationReady ? " with your location." : "."}
              </div>
            </>
          )}
          {alertActive && !cancelled && (
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.9)",
              fontWeight: 600, letterSpacing: 0.3,
              animation: "fadeIn 0.4s ease",
            }}>
              Help is on the way. You are not alone.
            </div>
          )}
          {cancelled && (
            <div style={{
              fontSize: 13, color: COLORS.celadon,
              fontWeight: 600, letterSpacing: 0.3,
              animation: "fadeIn 0.4s ease",
            }}>
              ✅ All clear. Your caregivers have been notified.
            </div>
          )}
        </div>

        {/* Cancel slider */}
        <div style={{ width: "82%", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          {alertActive && !cancelled && (
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.65)",
              letterSpacing: 1.5, textAlign: "center",
            }}>
              FALSE ALARM? SLIDE TO CANCEL
            </div>
          )}
          <SlideAction
            label={cancelled ? "ALL CLEAR" : alertActive ? "SLIDE TO CANCEL ALERT" : "SLIDE TO CANCEL"}
            onComplete={alertActive ? handleCancel : () => {}}
            color={alertActive ? COLORS.celadon : "rgba(255,255,255,0.3)"}
            pulseGreen={alertActive || cancelled}
          />
        </div>

      </div>
    </div>
  );
}

// ─── Caretaker dashboard ───────────────────────────────────────────────────────
function CaretakerDashboard({ onSettings, alertTier, alertMessages, onAcknowledge, patientBpm, lastSync, watchBattery }) {
  const tier        = ALERT_TIERS[alertTier] || ALERT_TIERS.stable;
  const repeatRef   = useRef(null);
  const prevTierRef = useRef("stable");

  const orbDuration = bpmToDuration(patientBpm);
  const animName    = injectBreathAnimation(alertTier, tier.shadowBase, tier.shadowPeak, orbDuration);

  useEffect(() => {
    const prev = prevTierRef.current;
    prevTierRef.current = alertTier;
    if (repeatRef.current) { clearInterval(repeatRef.current); repeatRef.current = null; }

    if (alertTier === "stable" && prev !== "stable") {
      Flash.removeOverlay(); Flash.stopTorch(); HAPTICS.stable(); AudioEngine.acknowledged(); return;
    }
    if (alertTier === "yellow") { HAPTICS.yellow(); AudioEngine.yellow(); }
    if (alertTier === "orange") {
      HAPTICS.orange(); AudioEngine.orange();
      repeatRef.current = setInterval(() => { HAPTICS.orange(); AudioEngine.orange(); }, 12000);
    }
    if (alertTier === "red") {
      HAPTICS.red(); AudioEngine.red(); Flash.redAlert();
      repeatRef.current = setInterval(() => { HAPTICS.red(); AudioEngine.red(); Flash.redAlert(); }, 10000);
    }
    return () => { if (repeatRef.current) clearInterval(repeatRef.current); };
  }, [alertTier]);

  const vitalValue = alertTier === "red" ? "CRITICAL" : alertTier === "orange" ? "WARNING" : alertTier === "yellow" ? "ADVISORY" : "Stable";
  const vitalTier  = alertTier !== "stable" ? alertTier : "stable";

  const syncLabel = lastSync
    ? (() => {
        const mins = Math.round((Date.now() - new Date(lastSync).getTime()) / 60000);
        return mins < 1 ? "Just now" : mins === 1 ? "1m ago" : `${mins}m ago`;
      })()
    : "Unknown";

  const bpmLabel = patientBpm && patientBpm > 0 ? `${patientBpm} BPM` : "No signal";

  return (
    <div style={{
      ...BASE.app, justifyContent: "space-between", paddingBottom: 52, minHeight: "100vh",
      backgroundImage: "url('/caretaker-bg.png')", backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 24px" }}>
        <Logo light />
        <button onClick={onSettings} style={{ background: "none", border: "none", cursor: "pointer", marginTop: 44, fontSize: 20 }}>⚙️</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", gap: 16 }}>

        <div style={{ position: "relative", width: 280, height: 280 }}>
          <div style={{
            position: "absolute", top: 12, left: 12,
            width: 280, height: 280, borderRadius: "50%",
            backgroundColor: tier.glow, filter: "blur(24px)",
            transition: "background-color 0.8s ease", zIndex: 0,
          }} />
          <div style={{
            position: "relative", width: 280, height: 280, borderRadius: "50%",
            background: tier.orb,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            animation: `${animName} ${orbDuration}ms ease-in-out infinite`,
            transition: "background 0.8s ease", zIndex: 1,
            boxShadow: "inset 0 -8px 20px rgba(0,0,0,0.12), inset 0 2px 6px rgba(255,255,255,0.25)",
          }}>
            <div style={{
              position: "absolute", top: 18, left: 32, width: 90, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.22)", filter: "blur(6px)", transform: "rotate(-20deg)", pointerEvents: "none",
            }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.18)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: "55%", height: 1, backgroundColor: "rgba(255,255,255,0.3)", top: "46%" }} />
            <div style={{ fontSize: 18, marginBottom: 14, textShadow: "0 0 12px rgba(255,255,255,0.4)", lineHeight: 1 }}>
              <span style={{ fontWeight: 800, color: COLORS.slate, letterSpacing: 1 }}>WATCH</span>
              <span style={{ fontWeight: 300, color: COLORS.slate, fontStyle: "italic" }}>aware</span>
            </div>
            {patientBpm > 0 && (
              <div style={{
                fontSize: 22, fontWeight: 700, color: COLORS.white,
                textShadow: "0 2px 8px rgba(0,0,0,0.3)", letterSpacing: 1, marginBottom: 6,
              }}>
                {patientBpm}
                <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: 2, marginLeft: 4, opacity: 0.8 }}>BPM</span>
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: tier.labelColor, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
              {tier.emoji ? `${tier.emoji} ${tier.label}` : tier.label}
            </div>
          </div>
        </div>

        {(alertTier === "red" || alertTier === "orange") && (
          <div style={{ width: "82%", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.5, textAlign: "center", fontWeight: 700,
              color: alertTier === "red" ? "#FF8080" : "#FFB347",
            }}>
              {alertTier === "red" ? "🔴 EMERGENCY — SLIDE TO ACKNOWLEDGE" : "🟠 WARNING — SLIDE TO ACKNOWLEDGE"}
            </div>
            <SlideAction
              label="SLIDE TO ACKNOWLEDGE"
              onComplete={onAcknowledge}
              color={alertTier === "red" ? "#D13C30" : "#E8821A"}
            />
          </div>
        )}

        <AlertBanner tier={alertTier} messages={alertMessages} />

        <div style={{
          display: "flex", flexDirection: "column", gap: 12, width: "78%",
          backgroundColor: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)",
          borderRadius: 16, padding: "14px 18px",
          border: `1px solid ${tier.accent}44`, transition: "border-color 0.8s ease",
        }}>
          <StatusRow icon="❤️" label="Heart Rate"    value={bpmLabel}                                        tier={vitalTier} />
          <StatusRow icon="🔋" label="Watch Battery" value={watchBattery ? `${watchBattery}%` : "Unknown"}  tier={watchBattery < 20 ? "yellow" : "stable"} />
          <StatusRow icon="🔄" label="Last Sync"     value={syncLabel}                                       tier="stable" />
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ onBack, sleepStart, sleepEnd, onSleepChange }) {
  const [flatline,  setFlatline]  = useState(true);
  const [offline,   setOffline]   = useState(true);
  const [patient,   setPatient]   = useState("Kathleen Cousens");
  const [caretaker, setCaretaker] = useState("Ben");
  const [editing,   setEditing]   = useState(null);

  return (
    <div style={{ ...BASE.app, paddingBottom: 52, minHeight: "100vh", overflowY: "auto", backgroundColor: COLORS.oatmeal }}>
      <div style={{ width: "100%", display: "flex", alignItems: "center", padding: "0 20px" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 22, color: COLORS.terracotta, marginTop: 40, padding: 4,
        }}>←</button>
        <div style={{ flex: 1 }}><Logo subtitle="Patient Profile" /></div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{
        width: "86%", backgroundColor: COLORS.white, borderRadius: 24,
        padding: "20px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
        marginTop: 8, marginBottom: 12, border: `2px solid ${COLORS.terracotta}22`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", backgroundColor: COLORS.terracotta,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>⚡</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.8 }}>MONITORING RULES</span>
        </div>
        {[
          { label: "20m Flatline Alert", value: flatline, set: setFlatline },
          { label: "35m Offline Alert",  value: offline,  set: setOffline  },
        ].map(({ label, value, set }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: 13, color: COLORS.slateLight }}>{label}</span>
            <Toggle value={value} onChange={set} />
          </div>
        ))}
      </div>

      <div style={{
        width: "86%", backgroundColor: COLORS.white, borderRadius: 24,
        padding: "16px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
        marginBottom: 12, display: "flex", flexDirection: "column", alignItems: "center",
        border: `2px solid ${COLORS.celadon}44`,
      }}>
        <SleepDial startHour={sleepStart} endHour={sleepEnd} onChange={onSleepChange} />
      </div>

      <div style={{
        width: "86%", backgroundColor: COLORS.white, borderRadius: 24,
        padding: "20px 22px", boxShadow: "0 20px 50px rgba(0,0,0,0.08)", marginBottom: 12,
      }}>
        {[
          { label: "Patient name", value: patient,   key: "patient"   },
          { label: "Caretaker",    value: caretaker, key: "caretaker" },
        ].map(({ label, value, key }) => (
          <div key={key} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: 13, color: COLORS.slateLight }}>{label}</span>
            {editing === key
              ? <input autoFocus value={value}
                  onChange={e => key === "patient" ? setPatient(e.target.value) : setCaretaker(e.target.value)}
                  onBlur={() => setEditing(null)}
                  style={{
                    border: "none", borderBottom: `1px solid ${COLORS.terracotta}`,
                    background: "none", fontSize: 13, fontWeight: 600,
                    color: COLORS.slate, outline: "none", textAlign: "right", width: 140,
                  }}
                />
              : <span onClick={() => setEditing(key)} style={{ fontSize: 13, fontWeight: 600, cursor: "text" }}>
                  {value}{" "}<span style={{ color: COLORS.slateLight, fontSize: 11 }}>✎</span>
                </span>
            }
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: COLORS.slateLight }}>Status</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.celadon }}>Stable</span>
        </div>
        <button style={{
          width: "100%", padding: "13px 0",
          backgroundColor: COLORS.terracotta, color: COLORS.white,
          border: "none", borderRadius: 13, fontSize: 14, fontWeight: 600,
          cursor: "pointer", boxShadow: "0 4px 14px rgba(211,131,92,0.28)", letterSpacing: 0.5,
        }}>
          + Add Caretaker
        </button>
      </div>
    </div>
  );
}

export default function WATCHaware() {
  const params = new URLSearchParams(window.location.search);
  const view   = params.get("view");
  const locked = view === "patient" || view === "caretaker";

  const [screen,        setScreen]        = useState(view === "caretaker" ? "caretaker" : "patient");
  const [alertTier,     setAlertTier]     = useState("stable");
  const [alertMessages, setAlertMessages] = useState([]);
  const [patientBpm,    setPatientBpm]    = useState(0);
  const [lastSync,      setLastSync]      = useState(null);
  const [watchBattery,  setWatchBattery]  = useState(null);
  const [sleepStart,    setSleepStart]    = useState(22);
  const [sleepEnd,      setSleepEnd]      = useState(6);

  useEffect(() => {
    if (view !== "caretaker" && screen !== "caretaker") return;
    const poll = async () => {
      try {
        const res  = await fetch("/.netlify/functions/alert-state");
        const data = await res.json();
        if (data.tier)         setAlertTier(data.tier);
        if (data.messages)     setAlertMessages(data.messages);
        if (data.bpm)          setPatientBpm(data.bpm);
        if (data.lastSync)     setLastSync(data.lastSync);
        if (data.watchBattery) setWatchBattery(data.watchBattery);
      } catch (_) {}
    };
    poll();
    const t = setInterval(poll, 60000);
    return () => clearInterval(t);
  }, [view, screen]);

  const handleAcknowledge = () => {
    Flash.removeOverlay(); Flash.stopTorch();
    setAlertTier("stable"); setAlertMessages([]);
  };

  const tabs = [
    { id: "patient",   label: "Patient"   },
    { id: "caretaker", label: "Caretaker" },
    { id: "settings",  label: "Settings"  },
  ];

  return (
    <div style={{ minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <style>{STYLE_TAG}</style>

      {!locked && (
        <div style={{
          display: "flex", gap: 6, padding: "10px 16px",
          position: "fixed", top: 0, zIndex: 100, width: "100%",
          backgroundColor: "rgba(237,232,220,0.92)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)", justifyContent: "center",
        }}>
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => setScreen(id)} style={{
              padding: "6px 18px", borderRadius: 20, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              backgroundColor: screen === id ? COLORS.terracotta : "rgba(255,255,255,0.55)",
              color: screen === id ? COLORS.white : COLORS.slate,
              boxShadow: screen === id ? "0 2px 8px rgba(211,131,92,0.28)" : "none",
              transition: "all 0.2s ease",
            }}>
              {label}
              {id === "caretaker" && alertTier !== "stable"
                ? alertTier === "red" ? " 🔴" : alertTier === "orange" ? " 🟠" : " 🟡" : ""}
            </button>
          ))}
        </div>
      )}

      <div style={{ paddingTop: locked ? 0 : 48, maxWidth: 430, margin: "0 auto", width: "100%" }}>
        {(screen === "patient" || (locked && view === "patient")) && (
          <PatientSOS onAlertFired={(location) => {
            setAlertTier("red");
            setAlertMessages(["🔴 PATIENT SOS: Kathleen has manually triggered an emergency alert. Check on her immediately."]);
            if (!locked) setScreen("caretaker");
          }} />
        )}
        {(screen === "caretaker" || (locked && view === "caretaker")) && (
          <CaretakerDashboard
            onSettings={() => { if (!locked) setScreen("settings"); }}
            alertTier={alertTier}
            alertMessages={alertMessages}
            onAcknowledge={handleAcknowledge}
            patientBpm={patientBpm}
            lastSync={lastSync}
            watchBattery={watchBattery}
          />
        )}
        {screen === "settings" && !locked && (
          <SettingsScreen
            onBack={() => setScreen("caretaker")}
            sleepStart={sleepStart}
            sleepEnd={sleepEnd}
            onSleepChange={(s, e) => { setSleepStart(s); setSleepEnd(e); }}
          />
        )}
      </div>
    </div>
  );
}