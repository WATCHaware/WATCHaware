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

const STYLE_TAG = `
@keyframes pulse {
  0%,100% { box-shadow: 0 0 40px rgba(211,131,92,0.3), 0 12px 30px rgba(211,131,92,0.2); }
  50%      { box-shadow: 0 0 80px rgba(211,131,92,0.6), 0 12px 40px rgba(211,131,92,0.4); }
}
@keyframes breathe {
  0%,100% { box-shadow: 0 0 40px rgba(168,195,179,0.25), 0 12px 30px rgba(168,195,179,0.15); }
  50%      { box-shadow: 0 0 70px rgba(168,195,179,0.5),  0 12px 40px rgba(168,195,179,0.3); }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
`;

const BASE = {
  app: {
    backgroundColor: COLORS.oatmeal,
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

function Logo({ subtitle }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 44, paddingBottom: 4 }}>
      <div style={{
        fontSize: 28, lineHeight: 1.1, display: "inline-block",
        textShadow: `
          0 0 20px rgba(255,255,255,0.9),
          0 0 40px rgba(255,255,255,0.6),
          0 0 60px rgba(255,255,255,0.3)
        `,
      }}>
        <span style={{ fontWeight: 800, letterSpacing: 1 }}>WATCH</span>
        <span style={{ fontWeight: 300, fontStyle: "italic" }}>aware</span>
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: COLORS.slateLight, marginTop: 4, letterSpacing: 0.5 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SlideAction({ label, onComplete, color = COLORS.slate }) {
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
    if (nx >= trackW() * 0.88) { onComplete(); setOffsetX(0); }
  };
  const onEnd = () => {
    setDragging(false);
    if (offsetX < trackW() * 0.88) setOffsetX(0);
  };

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
          backgroundColor: "rgba(255,255,255,0.55)",
          borderRadius: HANDLE, cursor: "grab", userSelect: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
          touchAction: "none",
        }}
      >
        <div style={{
          position: "absolute", left: offsetX, top: 0,
          width: HANDLE, height: HANDLE, borderRadius: "50%",
          backgroundColor: color,
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          transition: dragging ? "none" : "left 0.3s ease",
          zIndex: 2,
        }} />
        <div style={{
          position: "absolute", width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, letterSpacing: 1.8,
          color: COLORS.slateLight, paddingLeft: HANDLE + 8,
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
  const iRef = useRef(null);
  const HOLD = 3000;

  const start = () => {
    setHolding(true);
    const t0 = Date.now();
    iRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - t0) / HOLD) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { clearInterval(iRef.current); onFired && onFired(); }
    }, 30);
  };
  const end = () => {
    setHolding(false);
    setProgress(0);
    clearInterval(iRef.current);
  };

  const R = 140, C = 2 * Math.PI * R;

  return (
    <div style={{ position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={300} height={300} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={150} cy={150} r={R} fill="none" stroke="rgba(201,122,80,0.18)" strokeWidth={6} />
        {holding && (
          <circle cx={150} cy={150} r={R} fill="none" stroke={COLORS.ring} strokeWidth={6}
            strokeDasharray={C} strokeDashoffset={C - (progress / 100) * C} strokeLinecap="round" />
        )}
      </svg>
      <div
        onMouseDown={start} onMouseUp={end} onMouseLeave={end}
        onTouchStart={e => { e.preventDefault(); start(); }}
        onTouchEnd={end}
        style={{
          width: 258, height: 258, borderRadius: "50%",
          backgroundColor: COLORS.terracotta,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: holding
            ? "0 8px 50px rgba(211,131,92,0.55)"
            : "0 12px 40px rgba(211,131,92,0.28)",
          cursor: "pointer", userSelect: "none",
          transform: holding ? "scale(0.96)" : "scale(1)",
          transition: "transform 0.1s ease, box-shadow 0.2s ease",
          touchAction: "none",
        }}
      >
        <span style={{ fontSize: 50, fontWeight: 700, color: COLORS.white, letterSpacing: 3 }}>SOS</span>
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
        <path d={describeArc(startA, endA)} fill="none"
          stroke="url(#sleepGrad)" strokeWidth={20} strokeLinecap="round" />
        <text x={CX} y={CY - 18} textAnchor="middle" fontSize={9}
          fill={subColor} fontWeight={600} letterSpacing={1.2}>SLEEP WINDOW</text>
        <text x={CX} y={CY - 2}  textAnchor="middle" fontSize={14}
          fill={textColor} fontWeight={700}>{fmt(startHour)}</text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize={11}
          fill={subColor}>to {fmt(endHour)}</text>
        <text x={CX} y={CY + 30} textAnchor="middle" fontSize={8}
          fill={subColor} letterSpacing={0.5}>EST · {palette.label}</text>
        <circle cx={sunPos.x} cy={sunPos.y} r={20}
          fill="#F5C842" stroke={COLORS.white} strokeWidth={3}
          style={{ cursor: "grab", filter: "drop-shadow(0 3px 8px rgba(245,200,66,0.6))" }}
          onMouseDown={e => { e.preventDefault(); dragging.current = "start"; }}
          onTouchStart={e => { e.preventDefault(); dragging.current = "start"; }} />
        <text x={sunPos.x} y={sunPos.y + 6} textAnchor="middle"
          fontSize={15} style={{ pointerEvents: "none" }}>☀️</text>
        <circle cx={moonPos.x} cy={moonPos.y} r={20}
          fill="#89A4C7" stroke={COLORS.white} strokeWidth={3}
          style={{ cursor: "grab", filter: "drop-shadow(0 3px 8px rgba(137,164,199,0.6))" }}
          onMouseDown={e => { e.preventDefault(); dragging.current = "end"; }}
          onTouchStart={e => { e.preventDefault(); dragging.current = "end"; }} />
        <text x={moonPos.x} y={moonPos.y + 6} textAnchor="middle"
          fontSize={14} style={{ pointerEvents: "none" }}>🌙</text>
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
        backgroundColor: COLORS.white,
        boxShadow: "0 2px 5px rgba(0,0,0,0.14)",
        transition: "left 0.2s ease",
      }} />
    </div>
  );
}

function PatientSOS({ onAlertFired }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const upd = () => setTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
      }) + " EST"
    );
    upd();
    const t = setInterval(upd, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ ...BASE.app, justifyContent: "space-between", paddingBottom: 52, minHeight: "100vh" }}>
      <Logo subtitle={`Monitoring  ·  ${time}`} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, justifyContent: "center" }}>
        <HoldButton onFired={onAlertFired} />
        <div style={{ fontSize: 10, color: COLORS.slateLight, letterSpacing: 2, marginTop: -8 }}>
          HOLD 3 SECONDS TO ACTIVATE
        </div>
      </div>
      <div style={{ width: "82%", paddingBottom: 8 }}>
        <SlideAction label="SLIDE LEFT TO RIGHT TO CANCEL" onComplete={() => {}} />
      </div>
    </div>
  );
}

function CaretakerDashboard({ onSettings, alertActive, onAcknowledge }) {
  return (
    <div style={{ ...BASE.app, justifyContent: "space-between", paddingBottom: 52, minHeight: "100vh" }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 24px" }}>
        <Logo />
        <button onClick={onSettings} style={{
          background: "none", border: "none", cursor: "pointer",
          marginTop: 44, fontSize: 20, color: COLORS.terracotta,
        }}>⚙️</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", gap: 28 }}>
        <div style={{ position: "relative", width: 280, height: 280 }}>
          <div style={{
            position: "absolute", top: 12, left: 12,
            width: 280, height: 280, borderRadius: "50%",
            backgroundColor: alertActive
              ? "rgba(211,131,92,0.25)"
              : "rgba(168,195,179,0.25)",
            filter: "blur(20px)",
            transition: "background-color 0.5s ease",
            zIndex: 0,
          }} />
          <div style={{
            position: "relative", width: 280, height: 280, borderRadius: "50%",
            background: alertActive
              ? "radial-gradient(circle at 38% 32%, #E8906A, #D1835C 60%, #B8693E)"
              : "radial-gradient(circle at 38% 32%, #C2D9CF, #A8C3B3 60%, #8AADA0)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            animation: alertActive
              ? "pulse 1.4s ease-in-out infinite"
              : "breathe 4s ease-in-out infinite",
            transition: "background 0.5s ease",
            zIndex: 1,
            boxShadow: "inset 0 -8px 20px rgba(0,0,0,0.12), inset 0 2px 6px rgba(255,255,255,0.25)",
          }}>
            <div style={{
              position: "absolute", top: 18, left: 32,
              width: 90, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              filter: "blur(6px)", transform: "rotate(-20deg)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.18)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", width: "55%", height: 1,
              backgroundColor: "rgba(255,255,255,0.3)", top: "46%",
            }} />
            <div style={{
              fontSize: 18, marginBottom: 18,
              textShadow: "0 0 12px rgba(255,255,255,0.4)", lineHeight: 1,
            }}>
              <span style={{ fontWeight: 800, color: COLORS.slate, letterSpacing: 1 }}>WATCH</span>
              <span style={{ fontWeight: 300, color: COLORS.slate, fontStyle: "italic" }}>aware</span>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 3,
              color: "rgba(255,255,255,0.9)", marginTop: 16,
            }}>
              {alertActive ? "⚠️ ALERT" : "MONITORING"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "78%" }}>
          {[
            { icon: "〜", label: "Vital Signal",  value: alertActive ? "MISSING" : "Stable", alert: alertActive },
            { icon: "🔋", label: "Watch Battery", value: "88%",    alert: false },
            { icon: "🔄", label: "Last Sync",     value: "2m ago", alert: false },
          ].map(({ icon, label, value, alert }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700 }}>
              <span>{icon}</span>
              <span style={{ color: COLORS.slate }}>{label}: </span>
              <span style={{ color: alert ? COLORS.terracotta : COLORS.slate }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {alertActive && (
        <div style={{ width: "82%", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
          <div style={{ fontSize: 10, color: COLORS.terracotta, letterSpacing: 1.5, textAlign: "center", fontWeight: 700 }}>
            ALERT ACTIVE — ACKNOWLEDGE TO SILENCE
          </div>
          <SlideAction
            label="SLIDE TO ACKNOWLEDGE"
            onComplete={onAcknowledge}
            color={COLORS.terracotta}
          />
        </div>
      )}
    </div>
  );
}

function SettingsScreen({ onBack, sleepStart, sleepEnd, onSleepChange }) {
  const [flatline,  setFlatline]  = useState(true);
  const [offline,   setOffline]   = useState(true);
  const [patient,   setPatient]   = useState("John Smith");
  const [caretaker, setCaretaker] = useState("Ben");
  const [editing,   setEditing]   = useState(null);

  return (
    <div style={{ ...BASE.app, paddingBottom: 52, minHeight: "100vh", overflowY: "auto" }}>
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
        marginTop: 8, marginBottom: 12,
        border: `2px solid ${COLORS.terracotta}22`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: COLORS.terracotta,
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
            paddingBottom: 12, marginBottom: 12,
            borderBottom: "1px solid rgba(0,0,0,0.05)",
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
            paddingBottom: 10, marginBottom: 10,
            borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: 13, color: COLORS.slateLight }}>{label}</span>
            {editing === key
              ? <input autoFocus value={value}
                  onChange={e => key === "patient"
                    ? setPatient(e.target.value)
                    : setCaretaker(e.target.value)}
                  onBlur={() => setEditing(null)}
                  style={{
                    border: "none",
                    borderBottom: `1px solid ${COLORS.terracotta}`,
                    background: "none", fontSize: 13, fontWeight: 600,
                    color: COLORS.slate, outline: "none",
                    textAlign: "right", width: 140,
                  }}
                />
              : <span onClick={() => setEditing(key)}
                  style={{ fontSize: 13, fontWeight: 600, cursor: "text" }}>
                  {value}{" "}
                  <span style={{ color: COLORS.slateLight, fontSize: 11 }}>✎</span>
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
          cursor: "pointer", boxShadow: "0 4px 14px rgba(211,131,92,0.28)",
          letterSpacing: 0.5,
        }}>
          + Add Caretaker
        </button>
      </div>
    </div>
  );
}

export default function WATCHaware() {
  const [screen,      setScreen]      = useState("patient");
  const [alertActive, setAlertActive] = useState(false);
  const [sleepStart,  setSleepStart]  = useState(22);
  const [sleepEnd,    setSleepEnd]    = useState(6);

  const tabs = [
    { id: "patient",   label: "Patient"   },
    { id: "caretaker", label: "Caretaker" },
    { id: "settings",  label: "Settings"  },
  ];

  return (
    <div style={{ backgroundColor: "#EDE8DC", minHeight: "100vh" }}>
      <style>{STYLE_TAG}</style>
      <div style={{
        display: "flex", gap: 6, padding: "10px 16px",
        position: "fixed", top: 0, zIndex: 100, width: "100%",
        backgroundColor: "rgba(237,232,220,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        justifyContent: "center",
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
            {label}{id === "caretaker" && alertActive ? " 🔴" : ""}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: 48, maxWidth: 430, margin: "0 auto" }}>
        {screen === "patient" && (
          <PatientSOS onAlertFired={() => { setAlertActive(true); setScreen("caretaker"); }} />
        )}
        {screen === "caretaker" && (
          <CaretakerDashboard
            onSettings={() => setScreen("settings")}
            alertActive={alertActive}
            onAcknowledge={() => setAlertActive(false)}
          />
        )}
        {screen === "settings" && (
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