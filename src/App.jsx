import { useState, useEffect, useRef } from "react";

const COLORS = {
  oatmeal: "#FDF1DB",
  terracotta: "#D1835C",
  celadon: "#A8C3B3",
  slate: "#4A4A4A",
  slateLight: "#8C8C8C",
  white: "#FFFFFF",
};

const ALERT_TIERS = {
  stable: {
    glow: "rgba(168,195,179,0.25)",
    label: "STABLE",
    sublabel: "All vitals normal. Monitoring active.",
    labelColor: "rgba(255,255,255,0.9)",
    accent: "#A8C3B3",
    emoji: "",
    bg: "bg-default.png",
    textLight: false,
  },
  yellow: {
    glow: "rgba(230,200,64,0.35)",
    label: "WARNING",
    sublabel: "A vital sign needs attention.",
    labelColor: "rgba(255,255,255,0.95)",
    accent: "#E6C840",
    emoji: "🟡",
    bg: "bg-yellow.png",
    textLight: false,
  },
  orange: {
    glow: "rgba(232,130,26,0.4)",
    label: "CAUTION",
    sublabel: "Multiple signals require attention.",
    labelColor: "rgba(255,255,255,0.95)",
    accent: "#E8821A",
    emoji: "🟠",
    bg: "bg-orange.png",
    textLight: false,
  },
  red: {
    glow: "rgba(211,60,48,0.45)",
    label: "CRITICAL",
    sublabel: "Emergency condition detected.",
    labelColor: "rgba(255,255,255,1)",
    accent: "#D13C30",
    emoji: "🔴",
    bg: "bg-red.png",
    textLight: true,
  },
  sos: {
    glow: "rgba(211,60,48,0.45)",
    label: "SOS",
    sublabel: "Patient has triggered emergency alert.",
    labelColor: "rgba(255,255,255,1)",
    accent: "#D13C30",
    emoji: "🆘",
    bg: "bg-alt.png",
    textLight: true,
  },
};

const TIME_PALETTES = {
  dawn: { bg: "#FFE4B5", arc1: "#FFB347", arc2: "#FFA07A", label: "Dawn" },
  morning: { bg: "#FDF1DB", arc1: "#F5C842", arc2: "#F4A460", label: "Morning" },
  midday: { bg: "#E8F4FD", arc1: "#87CEEB", arc2: "#4682B4", label: "Midday" },
  evening: { bg: "#FFE4CC", arc1: "#FF8C00", arc2: "#D1835C", label: "Evening" },
  dusk: { bg: "#E6D5F5", arc1: "#9B59B6", arc2: "#6C3483", label: "Dusk" },
  night: { bg: "#1a1a2e", arc1: "#4A4A8A", arc2: "#2C2C5E", label: "Night" },
};

const getTimePalette = (h) => {
  if (h >= 5 && h < 7) return TIME_PALETTES.dawn;
  if (h >= 7 && h < 12) return TIME_PALETTES.morning;
  if (h >= 12 && h < 17) return TIME_PALETTES.midday;
  if (h >= 17 && h < 20) return TIME_PALETTES.evening;
  if (h >= 20 && h < 22) return TIME_PALETTES.dusk;
  return TIME_PALETTES.night;
};

const STYLE_TAG = `
@keyframes cancelPulse {
  0%,100% { box-shadow: 0 0 30px rgba(168,195,179,0.4), 0 8px 20px rgba(168,195,179,0.2); }
  50% { box-shadow: 0 0 70px rgba(168,195,179,0.8), 0 8px 40px rgba(168,195,179,0.5); }
}
@keyframes cancelHandlePulse {
  0%,100% { background-color: #A8C3B3; transform: scale(1); }
  50% { background-color: #C2D9CF; transform: scale(1.12); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes bgFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
`;

const AudioEngine = {
  ctx: null,
  getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  },
  tone(frequency, duration, volume = 0.18, delay = 0) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
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
  yellow() {
    this.tone(440, 0.6, 0.14);
    this.tone(659, 0.6, 0.14, 0.55);
  },
  orange() {
    this.tone(523, 0.5, 0.16);
    this.tone(659, 0.5, 0.16, 0.45);
    this.tone(784, 0.7, 0.16, 0.9);
  },
  red() {
    this.tone(784, 0.55, 0.22);
    this.tone(659, 0.55, 0.22, 0.5);
    this.tone(523, 0.55, 0.22, 1.0);
    this.tone(659, 0.75, 0.22, 1.5);
  },
  acknowledged() {
    this.tone(523, 0.4, 0.12);
    this.tone(659, 0.4, 0.12, 0.05);
    this.tone(784, 0.6, 0.12, 0.1);
  },
  sosFired() {
    [523, 587, 659, 698, 784].forEach((f, i) => this.tone(f, 0.35, 0.15, i * 0.18));
  },
  sosHolding(p) {
    this.tone(p > 75 ? 880 : p > 50 ? 740 : 587, 0.18, 0.1);
  },
  cancelled() {
    this.tone(784, 0.4, 0.14);
    this.tone(659, 0.4, 0.14, 0.35);
    this.tone(523, 0.5, 0.14, 0.7);
    this.tone(392, 0.7, 0.14, 1.05);
  },
};

const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

const HAPTICS = {
  stable: () => vibrate(40),
  yellow: () => vibrate([60, 80, 60]),
  orange: () => vibrate([100, 60, 100, 60, 100]),
  red: () => vibrate([200, 80, 100, 80, 200]),
  sosHolding: (p) => {
    if (p > 75) vibrate(80);
    else if (p > 50) vibrate(50);
    else if (p > 25) vibrate(30);
  },
  sosFired: () => vibrate([300, 80, 300]),
  acknowledged: () => vibrate([60, 30, 60, 30, 120]),
  cancelled: () => vibrate([40, 60, 40, 60, 200]),
};

const getLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 5000, maximumAge: 30000 }
    );
  });

function AppBackground({ tier, sosFired, children }) {
  const t = sosFired ? ALERT_TIERS.sos : ALERT_TIERS[tier] || ALERT_TIERS.stable;
  const bgFile = t.bg;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        backgroundImage: `url('/${bgFile}')`,
        backgroundSize: "cover",
        backgroundPosition: "center -18px",
        animation: "bgFade 0.8s ease",
      }}
    >
      {children}
    </div>
  );
}

function StateLabel({ alertTier, sosFired, isActive, isCancelled }) {
  const tierKey = sosFired ? "sos" : alertTier;
  const tier = ALERT_TIERS[tierKey] || ALERT_TIERS.stable;
  const light = tier.textLight;

  if (isCancelled) {
    return (
      <div style={{ textAlign: "center", padding: "0 32px", animation: "fadeIn 0.4s ease" }}>
        <div style={{ fontSize: 13, color: COLORS.celadon, fontWeight: 600 }}>
          ✅ All clear. Your caregivers have been notified.
        </div>
      </div>
    );
  }

  if (sosFired && isActive) {
    return (
      <div style={{ textAlign: "center", padding: "0 32px", animation: "fadeIn 0.4s ease" }}>
        <div
          style={{
            fontSize: 18,
            color: light ? COLORS.white : COLORS.terracotta,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          Help is on the way.
        </div>
        <div
          style={{
            fontSize: 14,
            color: light ? "rgba(255,255,255,0.75)" : COLORS.slateLight,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          You are not alone.
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "0 32px", animation: "fadeIn 1s ease 0.3s both" }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: light ? COLORS.white : COLORS.slate,
          marginBottom: 6,
        }}
      >
        {tier.label}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: light ? "rgba(255,255,255,0.75)" : COLORS.slateLight,
        }}
      >
        {tier.sublabel}
      </div>
    </div>
  );
}

function Logo({ subtitle, light, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        textAlign: "center",
        paddingTop: 52,
        paddingBottom: 4,
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1.1, display: "inline-block" }}>
        <span style={{ fontWeight: 800, letterSpacing: 1, color: light ? COLORS.white : COLORS.slate }}>
          WATCH
        </span>
        <span
          style={{
            fontWeight: 300,
            fontStyle: "italic",
            color: light ? "rgba(255,255,255,0.9)" : COLORS.slate,
          }}
        >
          aware
        </span>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 12,
            color: light ? "rgba(255,255,255,0.6)" : COLORS.slateLight,
            marginTop: 4,
            letterSpacing: 0.5,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function LocationPermissionPrompt({ onGranted, onSkip }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        animation: "fadeIn 0.4s ease",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(253,241,219,0.97)",
          borderRadius: 28,
          padding: "36px 28px",
          border: "1px solid rgba(211,131,92,0.2)",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 16 }}>📍</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.slate, marginBottom: 12 }}>
          Allow Location Access
        </div>
        <div style={{ fontSize: 13, color: COLORS.slateLight, lineHeight: 1.7, marginBottom: 28 }}>
          When you press the SOS button, your location will be shared with your caregivers so they can
          find you quickly.
          <br />
          <br />
          Your location is never tracked or stored. It is only shared in the moment you need help.
        </div>
        <button
          onClick={onGranted}
          style={{
            width: "100%",
            padding: "14px 0",
            backgroundColor: COLORS.terracotta,
            color: COLORS.white,
            border: "none",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(211,131,92,0.3)",
            marginBottom: 10,
          }}
        >
          Allow Location Access
        </button>
        <button
          onClick={onSkip}
          style={{
            width: "100%",
            padding: "10px 0",
            backgroundColor: "transparent",
            color: COLORS.slateLight,
            border: "none",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function SlideAction({ label, onComplete, color = COLORS.slate, pulseGreen = false, light = false }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const HANDLE = 52;

  const trackW = () => (trackRef.current ? trackRef.current.offsetWidth - HANDLE : 260);

  const onStart = (cx) => {
    setDragging(true);
    startX.current = cx - offsetX;
  };

  const onMove = (cx) => {
    if (!dragging) return;
    const nx = Math.max(0, Math.min(cx - startX.current, trackW()));
    setOffsetX(nx);

    if (nx >= trackW() * 0.88) {
      HAPTICS.acknowledged();
      AudioEngine.acknowledged();
      onComplete();
      setOffsetX(0);
    }
  };

  const onEnd = () => {
    setDragging(false);
    if (offsetX < trackW() * 0.88) setOffsetX(0);
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={trackRef}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={(e) => {
          e.preventDefault();
          onStart(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          onMove(e.touches[0].clientX);
        }}
        onTouchEnd={onEnd}
        style={{
          position: "relative",
          height: HANDLE,
          backgroundColor: pulseGreen
            ? "rgba(168,195,179,0.3)"
            : light
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.08)",
          borderRadius: HANDLE,
          cursor: "grab",
          userSelect: "none",
          border: pulseGreen
            ? "1.5px solid rgba(168,195,179,0.6)"
            : light
              ? "1px solid rgba(255,255,255,0.3)"
              : "1px solid rgba(0,0,0,0.08)",
          animation: pulseGreen ? "cancelPulse 2s ease-in-out infinite" : "none",
          touchAction: "none",
          transition: "background-color 0.5s ease, border 0.5s ease",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: offsetX,
            top: 0,
            width: HANDLE,
            height: HANDLE,
            borderRadius: "50%",
            backgroundColor: pulseGreen ? COLORS.celadon : color,
            boxShadow: pulseGreen
              ? "0 4px 16px rgba(168,195,179,0.5)"
              : "0 4px 12px rgba(0,0,0,0.18)",
            animation: pulseGreen ? "cancelHandlePulse 2s ease-in-out infinite" : "none",
            transition: dragging ? "none" : "left 0.3s ease",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.8,
            color: pulseGreen ? COLORS.celadon : light ? "rgba(255,255,255,0.7)" : COLORS.slateLight,
            paddingLeft: HANDLE + 8,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function HoldButton({ onFired, light }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const iRef = useRef(null);
  const prevPct = useRef(0);
  const HOLD = 3000;

  useEffect(() => {
    return () => {
      if (iRef.current) clearInterval(iRef.current);
    };
  }, []);

  const start = () => {
    if (iRef.current) clearInterval(iRef.current);

    setHolding(true);
    prevPct.current = 0;

    const t0 = Date.now();
    iRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - t0) / HOLD) * 100, 100);
      setProgress(pct);

      if (pct >= 25 && prevPct.current < 25) {
        HAPTICS.sosHolding(25);
        AudioEngine.sosHolding(25);
      }
      if (pct >= 50 && prevPct.current < 50) {
        HAPTICS.sosHolding(50);
        AudioEngine.sosHolding(50);
      }
      if (pct >= 75 && prevPct.current < 75) {
        HAPTICS.sosHolding(75);
        AudioEngine.sosHolding(75);
      }

      prevPct.current = pct;

      if (pct >= 100) {
        clearInterval(iRef.current);
        iRef.current = null;
        HAPTICS.sosFired();
        AudioEngine.sosFired();
        if (onFired) onFired();
      }
    }, 30);
  };

  const end = () => {
    setHolding(false);
    setProgress(0);
    prevPct.current = 0;

    if (iRef.current) {
      clearInterval(iRef.current);
      iRef.current = null;
    }
  };

  const R = 140;
  const C = 2 * Math.PI * R;

  return (
    <div
      style={{
        position: "relative",
        width: 300,
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 65,
        marginBottom: 10,
      }}
    >
      <svg
        width={300}
        height={300}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "rotate(-90deg)",
          pointerEvents: "none",
        }}
      >
        <circle cx={150} cy={150} r={R} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={4} />
        {holding && (
          <circle
            cx={150}
            cy={150}
            r={R}
            fill="none"
            stroke={light ? "rgba(255,255,255,0.9)" : COLORS.terracotta}
            strokeWidth={6}
            strokeDasharray={C}
            strokeDashoffset={C - (progress / 100) * C}
            strokeLinecap="round"
          />
        )}
      </svg>

      <div
        onMouseDown={start}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => {
          e.preventDefault();
          start();
        }}
        onTouchEnd={end}
        style={{
          width: 258,
          height: 258,
          borderRadius: "50%",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transform: holding ? "scale(0.96)" : "scale(1)",
          transition: "transform 0.1s ease",
          touchAction: "none",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: 50,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: 3,
            position: "relative",
            userSelect: "none",
            pointerEvents: "none",
            textShadow: "0 2px 10px rgba(0,0,0,0.25)",
          }}
        >
          SOS
        </span>
      </div>
    </div>
  );
}

function SleepDial({ startHour, endHour, onChange }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const t = setInterval(() => setCurrentHour(new Date().getHours()), 60000);
    return () => clearInterval(t);
  }, []);

  const palette = getTimePalette(currentHour);
  const isNight = currentHour >= 22 || currentHour < 5;
  const textColor = isNight ? "rgba(255,255,255,0.85)" : COLORS.slate;
  const subColor = isNight ? "rgba(255,255,255,0.55)" : COLORS.slateLight;
  const SIZE = 240;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 96;

  const hourToAngle = (h) => ((h / 24) * 360 - 90 + 360) % 360;
  const angleToHour = (a) => Math.round(((a + 90 + 360) % 360) / 15) % 24;
  const polarToXY = (deg, r) => ({
    x: CX + r * Math.cos((deg * Math.PI) / 180),
    y: CY + r * Math.sin((deg * Math.PI) / 180),
  });

  const describeArc = (a1, a2) => {
    const s = polarToXY(a1, R);
    const e = polarToXY(a2, R);
    const large = ((a2 - a1 + 360) % 360) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const getAngle = (ev) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    return (Math.atan2(cy - rect.top - CY, cx - rect.left - CX) * 180) / Math.PI;
  };

  const startA = hourToAngle(startHour);
  const endA = hourToAngle(endHour);
  const sunPos = polarToXY(startA, R);
  const moonPos = polarToXY(endA, R);

  const fmt = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? "PM" : "AM"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 0" }}>
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        onMouseMove={(e) => {
          if (!dragging.current) return;
          const h = angleToHour(getAngle(e));
          dragging.current === "start" ? onChange(h, endHour) : onChange(startHour, h);
        }}
        onMouseUp={() => {
          dragging.current = null;
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          if (!dragging.current) return;
          const h = angleToHour(getAngle(e));
          dragging.current === "start" ? onChange(h, endHour) : onChange(startHour, h);
        }}
        onTouchEnd={() => {
          dragging.current = null;
        }}
        style={{ touchAction: "none", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="sleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.arc1} />
            <stop offset="100%" stopColor={palette.arc2} />
          </linearGradient>
          <radialGradient id="dialBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.bg} stopOpacity="0.95" />
            <stop offset="100%" stopColor={palette.bg} stopOpacity="0.7" />
          </radialGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={R + 20}
          fill="url(#dialBg)"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.1))" }}
        />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={20} />
        <path d={describeArc(startA, endA)} fill="none" stroke="url(#sleepGrad)" strokeWidth={20} strokeLinecap="round" />

        <text x={CX} y={CY - 18} textAnchor="middle" fontSize={9} fill={subColor} fontWeight={600} letterSpacing={1.2}>
          SLEEP WINDOW
        </text>
        <text x={CX} y={CY - 2} textAnchor="middle" fontSize={14} fill={textColor} fontWeight={700}>
          {fmt(startHour)}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize={11} fill={subColor}>
          to {fmt(endHour)}
        </text>
        <text x={CX} y={CY + 30} textAnchor="middle" fontSize={8} fill={subColor} letterSpacing={0.5}>
          EST · {palette.label}
        </text>

        <circle
          cx={sunPos.x}
          cy={sunPos.y}
          r={20}
          fill="#F5C842"
          stroke={COLORS.white}
          strokeWidth={3}
          style={{ cursor: "grab", filter: "drop-shadow(0 3px 8px rgba(245,200,66,0.6))" }}
          onMouseDown={(e) => {
            e.preventDefault();
            dragging.current = "start";
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            dragging.current = "start";
          }}
        />
        <text x={sunPos.x} y={sunPos.y + 6} textAnchor="middle" fontSize={15} style={{ pointerEvents: "none" }}>
          ☀️
        </text>

        <circle
          cx={moonPos.x}
          cy={moonPos.y}
          r={20}
          fill="#89A4C7"
          stroke={COLORS.white}
          strokeWidth={3}
          style={{ cursor: "grab", filter: "drop-shadow(0 3px 8px rgba(137,164,199,0.6))" }}
          onMouseDown={(e) => {
            e.preventDefault();
            dragging.current = "end";
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            dragging.current = "end";
          }}
        />
        <text x={moonPos.x} y={moonPos.y + 6} textAnchor="middle" fontSize={14} style={{ pointerEvents: "none" }}>
          🌙
        </text>
      </svg>

      <div style={{ fontSize: 10, color: COLORS.slateLight, letterSpacing: 0.5 }}>
        Drag ☀️ wake · drag 🌙 sleep
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        backgroundColor: value ? COLORS.terracotta : "#D4D4D4",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 22 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: COLORS.white,
          boxShadow: "0 2px 5px rgba(0,0,0,0.14)",
          transition: "left 0.2s ease",
        }}
      />
    </div>
  );
}

function AlertBanner({ tier, sosFired, messages, light }) {
  const tierKey = sosFired ? "sos" : tier;
  const t = ALERT_TIERS[tierKey];

  if (tierKey === "stable" || !messages || messages.length === 0) return null;

  return (
    <div
      style={{
        width: "88%",
        backgroundColor: light ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        borderRadius: 16,
        padding: "14px 18px",
        border: `1.5px solid ${t.accent}66`,
        marginBottom: 8,
      }}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: light ? COLORS.white : COLORS.slate,
            lineHeight: 1.5,
            marginBottom: i < messages.length - 1 ? 8 : 0,
            paddingBottom: i < messages.length - 1 ? 8 : 0,
            borderBottom:
              i < messages.length - 1
                ? `1px solid ${light ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`
                : "none",
          }}
        >
          {msg}
        </div>
      ))}
    </div>
  );
}

function StatusRow({ icon, label, value, tier, light }) {
  const color =
    tier === "red"
      ? light
        ? "#FF8080"
        : "#C0392B"
      : tier === "orange"
        ? light
          ? "#FFB347"
          : "#E67E22"
        : tier === "yellow"
          ? light
            ? "#FFE566"
            : "#D4AC0D"
          : light
            ? "rgba(255,255,255,0.9)"
            : COLORS.slate;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span style={{ width: 20, textAlign: "center" }}>{icon}</span>
      <span style={{ color: light ? "rgba(255,255,255,0.6)" : COLORS.slateLight, flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function AppScreen({
  view,
  alertTier,
  alertMessages,
  vitals,
  sosFired,
  setSosFired,
  onAcknowledge,
  onSettings,
  onCycleTier,
}) {
  const isPatient = view === "patient";
  const isCaretaker = view === "caretaker";
  const tierKey = sosFired ? "sos" : alertTier;
  const tier = ALERT_TIERS[tierKey] || ALERT_TIERS.stable;
  const light = tier.textLight;

  const [time, setTime] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [showLocPrompt, setShowLocPrompt] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const repeatRef = useRef(null);
  const prevTierRef = useRef("stable");

  useEffect(() => {
    const upd = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/New_York",
        }) + " EST"
      );

    upd();
    const t = setInterval(upd, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isPatient) return;

    const granted = localStorage.getItem("watchaware_location_granted");
    if (!granted) {
      setTimeout(() => setShowLocPrompt(true), 1200);
    } else {
      setLocationReady(granted === "true");
    }
  }, [isPatient]);

  useEffect(() => {
    if (!isCaretaker) return;

    const prev = prevTierRef.current;
    prevTierRef.current = alertTier;

    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }

    if (alertTier === "stable" && prev !== "stable") {
      HAPTICS.stable();
      AudioEngine.acknowledged();
      return;
    }

    if (alertTier === "yellow") {
      HAPTICS.yellow();
      AudioEngine.yellow();
    }

    if (alertTier === "orange") {
      HAPTICS.orange();
      AudioEngine.orange();
      repeatRef.current = setInterval(() => {
        HAPTICS.orange();
        AudioEngine.orange();
      }, 12000);
    }

    if (alertTier === "red" || sosFired) {
      HAPTICS.red();
      AudioEngine.red();
      repeatRef.current = setInterval(() => {
        HAPTICS.red();
        AudioEngine.red();
      }, 10000);
    }

    return () => {
      if (repeatRef.current) clearInterval(repeatRef.current);
    };
  }, [alertTier, sosFired, isCaretaker]);

  const handleLocationGranted = () => {
    setShowLocPrompt(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          localStorage.setItem("watchaware_location_granted", "true");
          setLocationReady(true);
        },
        () => {
          localStorage.setItem("watchaware_location_granted", "skipped");
          setLocationReady(false);
        },
        { timeout: 8000 }
      );
    }
  };

  const handleLocationSkip = () => {
    localStorage.setItem("watchaware_location_granted", "skipped");
    setLocationReady(false);
    setShowLocPrompt(false);
  };

  const handleSOSFired = async () => {
    setSosFired(true);
    const location = await getLocation();

    try {
      await fetch("/.netlify/functions/sos-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
    } catch (e) {}
  };

  const handleCancel = async () => {
    HAPTICS.cancelled();
    AudioEngine.cancelled();
    setCancelled(true);
    setSosFired(false);

    try {
      await fetch("/.netlify/functions/cancel-alert", { method: "POST" });
    } catch (e) {}

    setTimeout(() => setCancelled(false), 4000);
  };

  const na = "—";
  const syncLabel = vitals.lastSync
    ? (() => {
        const mins = Math.round((Date.now() - new Date(vitals.lastSync).getTime()) / 60000);
        return mins < 1 ? "Just now" : mins === 1 ? "1m ago" : `${mins}m ago`;
      })()
    : "Unknown";

  return (
    <AppBackground tier={alertTier} sosFired={sosFired}>
      {showLocPrompt && (
        <LocationPermissionPrompt onGranted={handleLocationGranted} onSkip={handleLocationSkip} />
      )}

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 430,
          margin: "0 auto",
          paddingBottom: 52,
          fontFamily: "'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "0 24px",
          }}
        >
          <Logo
            subtitle={`${isPatient ? "Patient" : "Caregiver"}  ·  ${time}`}
            light={light}
            onClick={onCycleTier}
          />
          {isCaretaker && (
            <button
              onClick={onSettings}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                marginTop: 52,
                fontSize: 20,
                opacity: 0.7,
              }}
            >
              ⚙️
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
            gap: 28,
            width: "100%",
            padding: "20px 0",
          }}
        >
          <StateLabel alertTier={alertTier} sosFired={sosFired} isActive={sosFired} isCancelled={cancelled} />

          {isPatient && <HoldButton onFired={handleSOSFired} light={light} />}

          {isPatient && (
            <div
              style={{
                width: "82%",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "center",
              }}
            >
              {!sosFired && !cancelled && (
                <div
                  style={{
                    fontSize: 13,
                    color: light ? "rgba(255,255,255,0.8)" : COLORS.slate,
                    textAlign: "center",
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {`If you need help, hold this button for 3 seconds.
${locationReady ? "Your caregivers will be notified with your location." : "Your caregivers will be notified immediately."}`}
                </div>
              )}

              {sosFired && !cancelled && (
                <div
                  style={{
                    fontSize: 11,
                    color: light ? "rgba(255,255,255,0.6)" : COLORS.slateLight,
                    letterSpacing: 1.5,
                    textAlign: "center",
                  }}
                >
                  FALSE ALARM? SLIDE TO CANCEL
                </div>
              )}

              <SlideAction
                label={cancelled ? "ALL CLEAR" : sosFired ? "SLIDE TO CANCEL ALERT" : "SLIDE TO CANCEL"}
                onComplete={sosFired ? handleCancel : () => {}}
                color={sosFired ? COLORS.celadon : "rgba(168,195,179,0.5)"}
                pulseGreen={sosFired || cancelled}
                light={light}
              />
            </div>
          )}

          {isCaretaker && (alertTier === "red" || alertTier === "orange" || sosFired) && (
            <div style={{ width: "82%", display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textAlign: "center",
                  fontWeight: 700,
                  color: light ? "rgba(255,255,255,0.8)" : "#C0392B",
                }}
              >
                {sosFired
                  ? "🆘 PATIENT SOS — SLIDE TO ACKNOWLEDGE"
                  : alertTier === "red"
                    ? "🔴 CRITICAL — SLIDE TO ACKNOWLEDGE"
                    : "🟠 CAUTION — SLIDE TO ACKNOWLEDGE"}
              </div>

              <SlideAction
                label="SLIDE TO ACKNOWLEDGE"
                onComplete={onAcknowledge}
                color={sosFired || alertTier === "red" ? "#C0392B" : "#E67E22"}
                light={light}
              />
            </div>
          )}

          <AlertBanner tier={alertTier} sosFired={sosFired} messages={alertMessages} light={light} />

          {isCaretaker && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                width: "86%",
                marginTop: "90px",
                backgroundColor: light ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.75)",
                backdropFilter: "blur(10px)",
                borderRadius: 20,
                padding: "20px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                border: `1px solid ${light ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)"}`,
              }}
            >
              <StatusRow
                light={light}
                icon="❤️"
                label="Heart Rate"
                value={vitals.bpm != null ? `${vitals.bpm} BPM` : na}
                tier={
                  vitals.bpm > 150 || vitals.bpm < 40
                    ? "red"
                    : vitals.bpm > 120 || vitals.bpm < 50
                      ? "orange"
                      : vitals.bpm > 100 || vitals.bpm < 55
                        ? "yellow"
                        : "stable"
                }
              />
              <StatusRow
                light={light}
                icon="🫁"
                label="Blood Oxygen"
                value={vitals.spo2 != null ? `${vitals.spo2}%` : na}
                tier={vitals.spo2 < 90 ? "red" : vitals.spo2 < 93 ? "orange" : vitals.spo2 < 95 ? "yellow" : "stable"}
              />
              <StatusRow
                light={light}
                icon="💨"
                label="Respiratory Rate"
                value={vitals.rr != null ? `${vitals.rr} /min` : na}
                tier={vitals.rr > 30 || vitals.rr < 6 ? "red" : vitals.rr > 25 || vitals.rr < 8 ? "orange" : "stable"}
              />
              <StatusRow
                light={light}
                icon="🌡️"
                label="Temperature"
                value={vitals.temp != null ? `${vitals.temp}°C` : na}
                tier={vitals.temp > 39.4 ? "red" : vitals.temp > 38.5 ? "orange" : vitals.temp > 37.8 ? "yellow" : "stable"}
              />
              <StatusRow
                light={light}
                icon="📊"
                label="HRV"
                value={vitals.hrv != null ? `${vitals.hrv}ms` : na}
                tier={vitals.hrv < 20 ? "red" : vitals.hrv < 30 ? "orange" : "stable"}
              />
              <StatusRow
                light={light}
                icon="🚶"
                label="Walking Steadiness"
                value={vitals.walkingSteadiness || na}
                tier={
                  vitals.walkingSteadiness === "Very Low"
                    ? "orange"
                    : vitals.walkingSteadiness === "Low"
                      ? "yellow"
                      : "stable"
                }
              />
              <StatusRow
                light={light}
                icon="😴"
                label="Sleep"
                value={vitals.sleepHours != null ? `${vitals.sleepHours}h` : na}
                tier={vitals.sleepHours < 2 ? "orange" : vitals.sleepHours < 4 ? "yellow" : "stable"}
              />
              <StatusRow
                light={light}
                icon="🔋"
                label="Watch Battery"
                value={vitals.battery != null ? `${vitals.battery}%` : na}
                tier={vitals.battery < 10 ? "orange" : vitals.battery < 20 ? "yellow" : "stable"}
              />
              <StatusRow light={light} icon="🔄" label="Last Sync" value={syncLabel} tier="stable" />
              {vitals.fallDetected && <StatusRow light={light} icon="⚠️" label="Fall Detected" value="YES" tier="red" />}
              {vitals.afibDetected && (
                <StatusRow light={light} icon="💓" label="Irregular Rhythm" value="DETECTED" tier="red" />
              )}
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}

function SettingsScreen({ onBack, sleepStart, sleepEnd, onSleepChange }) {
  const [flatline, setFlatline] = useState(true);
  const [offline, setOffline] = useState(true);
  const [patient, setPatient] = useState("Kathleen Cousens");
  const [caretaker, setCaretaker] = useState("Ben");
  const [editing, setEditing] = useState(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        backgroundColor: COLORS.oatmeal,
        fontFamily: "'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: 52,
      }}
    >
      <div style={{ width: "100%", maxWidth: 430, display: "flex", alignItems: "center", padding: "0 20px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 22,
            color: COLORS.terracotta,
            marginTop: 40,
            padding: 4,
          }}
        >
          ←
        </button>

        <div style={{ flex: 1, textAlign: "center", paddingTop: 44, paddingBottom: 4 }}>
          <div style={{ fontSize: 24, color: COLORS.slate }}>
            <span style={{ fontWeight: 800 }}>WATCH</span>
            <span style={{ fontWeight: 300, fontStyle: "italic" }}>aware</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.slateLight, marginTop: 4, letterSpacing: 0.5 }}>
            Settings
          </div>
        </div>

        <div style={{ width: 32 }} />
      </div>

      <div style={{ width: "86%", maxWidth: 390, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 24,
            padding: "20px 24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
            border: `2px solid ${COLORS.terracotta}22`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: COLORS.terracotta,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 16 }}>⚡</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.8 }}>MONITORING RULES</span>
          </div>

          {[
            { label: "5m Flatline Alert", value: flatline, set: setFlatline },
            { label: "5m Offline Alert", value: offline, set: setOffline },
          ].map(({ label, value, set }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                marginBottom: 12,
                borderBottom: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ fontSize: 13, color: COLORS.slateLight }}>{label}</span>
              <Toggle value={value} onChange={set} />
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 24,
            padding: "16px 24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: `2px solid ${COLORS.celadon}44`,
          }}
        >
          <SleepDial startHour={sleepStart} endHour={sleepEnd} onChange={onSleepChange} />
        </div>

        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 24,
            padding: "20px 22px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
          }}
        >
          {[
            { label: "Patient name", value: patient, key: "patient" },
            { label: "Caretaker", value: caretaker, key: "caretaker" },
          ].map(({ label, value, key }) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ fontSize: 13, color: COLORS.slateLight }}>{label}</span>
              {editing === key ? (
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => (key === "patient" ? setPatient(e.target.value) : setCaretaker(e.target.value))}
                  onBlur={() => setEditing(null)}
                  style={{
                    border: "none",
                    borderBottom: `1px solid ${COLORS.terracotta}`,
                    background: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.slate,
                    outline: "none",
                    textAlign: "right",
                    width: 140,
                  }}
                />
              ) : (
                <span onClick={() => setEditing(key)} style={{ fontSize: 13, fontWeight: 600, cursor: "text" }}>
                  {value} <span style={{ color: COLORS.slateLight, fontSize: 11 }}>✎</span>
                </span>
              )}
            </div>
          ))}

          <button
            style={{
              width: "100%",
              padding: "13px 0",
              backgroundColor: COLORS.terracotta,
              color: COLORS.white,
              border: "none",
              borderRadius: 13,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(211,131,92,0.28)",
              letterSpacing: 0.5,
            }}
          >
            + Add Caretaker
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WATCHaware() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const locked = view === "patient" || view === "caretaker";

  const [screen, setScreen] = useState(view === "caretaker" ? "caretaker" : "patient");
  const [alertTier, setAlertTier] = useState("stable");
  const [alertMessages, setAlertMessages] = useState([]);
  const [sosFired, setSosFired] = useState(false);
  const [sleepStart, setSleepStart] = useState(22);
  const [sleepEnd, setSleepEnd] = useState(6);
  const [vitals, setVitals] = useState({
    bpm: 0,
    spo2: null,
    rr: null,
    temp: null,
    hrv: null,
    battery: null,
    sleepHours: null,
    walkingSteadiness: null,
    fallDetected: false,
    afibDetected: false,
    lastSync: null,
  });

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/.netlify/functions/emergency-logic");
        const data = await res.json();

        if (data.tier) setAlertTier(data.tier);
        if (data.messages) setAlertMessages(data.messages);

        setVitals({
          bpm: data.bpm ?? 0,
          spo2: data.spo2 ?? null,
          rr: data.rr ?? null,
          temp: data.temp ?? null,
          hrv: data.hrv ?? null,
          battery: data.battery ?? null,
          sleepHours: data.sleepHours ?? null,
          walkingSteadiness: data.walkingSteadiness ?? null,
          fallDetected: data.fallDetected ?? false,
          afibDetected: data.afibDetected ?? false,
          lastSync: data.lastSync ?? null,
        });
      } catch (_) {}
    };

    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  const handleAcknowledge = () => {
    setAlertTier("stable");
    setAlertMessages([]);
    setSosFired(false);
  };

  const handleCycleTier = () => {
    if (sosFired) {
      setSosFired(false);
      setAlertTier("stable");
    } else if (alertTier === "stable") {
      setAlertTier("yellow");
    } else if (alertTier === "yellow") {
      setAlertTier("orange");
    } else if (alertTier === "orange") {
      setAlertTier("red");
    } else if (alertTier === "red") {
      setSosFired(true);
    }
  };

  const tabs = [
    { id: "patient", label: "Patient View" },
    { id: "caretaker", label: "Caretaker View" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        backgroundColor: "#000",
      }}
    >
      <style>{STYLE_TAG}</style>

      {!locked && (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 16px",
            position: "fixed",
            top: 0,
            zIndex: 100,
            width: "100%",
            backgroundColor: "rgba(253,241,219,0.92)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            justifyContent: "center",
          }}
        >
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              style={{
                padding: "6px 18px",
                borderRadius: 20,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: screen === id ? COLORS.terracotta : "rgba(255,255,255,0.55)",
                color: screen === id ? COLORS.white : COLORS.slate,
                boxShadow: screen === id ? "0 2px 8px rgba(211,131,92,0.28)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {label}
              {id === "caretaker" && alertTier !== "stable" && !sosFired
                ? alertTier === "red"
                  ? " 🔴"
                  : alertTier === "orange"
                    ? " 🟠"
                    : " 🟡"
                : id === "caretaker" && sosFired
                  ? " 🆘"
                  : ""}
            </button>
          ))}
        </div>
      )}

      <div style={{ paddingTop: locked ? 0 : 48, maxWidth: 430, margin: "0 auto", width: "100%" }}>
        {(screen === "patient" || (locked && view === "patient")) && (
          <AppScreen
            view="patient"
            alertTier={alertTier}
            alertMessages={alertMessages}
            vitals={vitals}
            sosFired={sosFired}
            setSosFired={(val) => {
              setSosFired(val);
              if (val) {
                setAlertTier("red");
                setAlertMessages([
                  "🆘 PATIENT SOS: Kathleen has manually triggered an emergency alert. Check on her immediately.",
                ]);
                if (!locked) setScreen("caretaker");
              }
            }}
            onAcknowledge={handleAcknowledge}
            onSettings={() => {
              if (!locked) setScreen("settings");
            }}
            onCycleTier={handleCycleTier}
          />
        )}

        {(screen === "caretaker" || (locked && view === "caretaker")) && (
          <AppScreen
            view="caretaker"
            alertTier={alertTier}
            alertMessages={alertMessages}
            vitals={vitals}
            sosFired={sosFired}
            setSosFired={setSosFired}
            onAcknowledge={handleAcknowledge}
            onSettings={() => {
              if (!locked) setScreen("settings");
            }}
            onCycleTier={handleCycleTier}
          />
        )}

        {screen === "settings" && !locked && (
          <SettingsScreen
            onBack={() => setScreen("caretaker")}
            sleepStart={sleepStart}
            sleepEnd={sleepEnd}
            onSleepChange={(s, e) => {
              setSleepStart(s);
              setSleepEnd(e);
            }}
          />
        )}
      </div>
    </div>
  );
}