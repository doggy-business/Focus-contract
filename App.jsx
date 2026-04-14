import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qmlmqzcrlekaxlkkieml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbG1xemNybGVrYXhsamtpZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTM5NjIsImV4cCI6MjA5MTY4OTk2Mn0.Q2MjF9fYo_CFZVm2bL7wRyJvggKt4X55mWT7hEkgUkE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// helpers for local storage keys
const SK = {
  SESSIONS: "fc_sessions",
  ONBOARDED: "fc_onboarded",
  SAVED_TASKS: "fc_saved_tasks",
  PLANNED: "fc_planned",
};

// helpers for local storage read/write
function load(k, fb) {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : fb;
  } catch {
    return fb;
  }
}
function save(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

// generate device ID for supabase tracking
function getDeviceId() {
  let id = localStorage.getItem("fc_device_id");
  if (!id) {
    id =
      "d_" +
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36);
    localStorage.setItem("fc_device_id", id);
  }
  return id;
}

// call supabase to track each session
async function trackSession(sessionData) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        device_id: getDeviceId(),
        status: sessionData.status,
        timer_duration_seconds: sessionData.timer_duration_seconds,
        time_elapsed_seconds: sessionData.time_elapsed_seconds,
        mode: sessionData.mode,
        failure_reason: sessionData.failure_reason || null,
        output_category: sessionData.output_category || null,
        session_type: "spontaneous",
      }),
    });
    console.log("Track result:", res.status);
  } catch (e) {
    console.log("Track error:", e);
  }
}

// generate simple ID
function genId() {
  return (
    Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  );
}

// format utility functions
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sc = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}`;
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function getDayKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

// sign-in screen component
function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setErr("Supabase is not loaded yet.");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMsg("Account created. You can sign in now.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setErr(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div
          className="screen"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 18,
                background: "rgba(232,255,71,0.1)",
                border: "1px solid rgba(232,255,71,0.3)",
                marginBottom: 18,
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: 26,
                color: "var(--accent)",
              }}
            >
              C
            </div>
            <h1
              style={{
                fontFamily: "Syne",
                fontSize: 34,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              CONTR-ACT.
            </h1>
            <p
              style={{
                color: "var(--text2)",
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 320,
                margin: "0 auto",
              }}
            >
              Sign in to save your progress and keep your sessions across
              devices.
            </p>
          </div>
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button
              className={`tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => {
                setMode("signin");
                setErr("");
                setMsg("");
              }}
            >
              Sign In
            </button>
            <button
              className={`tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setErr("");
                setMsg("");
              }}
            >
              Create Account
            </button>
          </div>
          <div className="card card-accent" style={{ marginBottom: 18 }}>
            <div className="text-xs mb-8">
              {mode === "signin"
                ? "WELCOME BACK"
                : "CREATE YOUR ACCOUNT"}
            </div>
            <form onSubmit={handleSubmit}>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ marginBottom: 14 }}
                required
              />
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete={
                  mode === "signin"
                    ? "current-password"
                    : "new-password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ marginBottom: 14 }}
                required
                minLength={6}
              />
              {err && (
                <div
                  style={{
                    background: "rgba(255,107,71,0.12)",
                    border: "1px solid rgba(255,107,71,0.35)",
                    color: "var(--danger)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {err}
                </div>
              )}
              {msg && (
                <div
                  style={{
                    background: "rgba(71,255,179,0.12)",
                    border: "1px solid rgba(71,255,179,0.35)",
                    color: "var(--success)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {msg}
                </div>
              )}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? mode === "signin"
                    ? "Signing In..."
                    : "Creating Account..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// definitions: constants for timer presets, categories, reasons
const SOFT_GRACE_MS = 10000;
const SUGGESTED_TASKS = [
  "Deep work",
  "Work on laptop",
  "Coding",
  "Writing",
  "Reading",
  "Study",
  "Admin",
  "Planning",
  "Design work",
  "Research",
  "Workout",
  "Meditation",
  "Time with partner",
  "Family time",
  "Prayer / reflection",
  "Creative work",
  "Business task",
  "Revision",
  "Housework sprint",
];
const FAILURE_REASONS = [
  { id: "urge_to_check", label: "Urge to check something" },
  { id: "boredom", label: "Boredom" },
  { id: "overwhelm", label: "Overwhelm" },
  { id: "physical", label: "Physical distraction" },
  { id: "avoidance", label: "Avoidance / anxiety" },
  { id: "other", label: "Other" },
];
const ENCOURAGEMENTS = [
  "Awareness is step one. Every session teaches you something.",
  "You showed up. That already counts. Try a shorter session.",
  "The contract broke — but you can write a new one right now.",
  "ADHD is not a willpower problem. Try 15 minutes this time.",
  "Noticing what pulls you away is the data you need to beat it.",
];
const SUCCESS_MSGS = [
  "That required real discipline. You made a commitment and followed through.",
  "You said you would do it — and you did. That is the standard.",
  "This is how consistency is built. One kept promise at a time.",
];
const FINAL5_MSGS = [
  "5 minutes left — how much can you get done?",
  "Final 5 minutes — empty the tank",
  "Clock's running — what's left?",
];
const TIMER_PRESETS = [
  { label: "15 min", value: 15 * 60 },
  { label: "25 min", value: 25 * 60 },
  { label: "45 min", value: 45 * 60 },
  { label: "60 min", value: 60 * 60 },
];
const OUTPUT_CATS = [
  "Work",
  "Business",
  "Health",
  "Relationships",
  "Learning",
  "Personal",
];

// compute stats for dashboard & insights
function computeStats(sessions) {
  const total = sessions.length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const failed = sessions.filter((s) => s.status === "failed").length;

  const daySet = new Set(
    sessions
      .filter((s) => s.status === "completed")
      .map((s) => getDayKey(new Date(s.created_at)))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(getDayKey(d))) streak++;
    else break;
  }
  const reasonTally = {};
  FAILURE_REASONS.forEach((r) => (reasonTally[r.id] = 0));
  sessions
    .filter((s) => s.failure_reason)
    .forEach((s) => {
      if (reasonTally[s.failure_reason] !== undefined)
        reasonTally[s.failure_reason]++;
    });

  const byDuration = {};
  sessions.forEach((s) => {
    const b = Math.round(s.timer_duration_seconds / 60);
    if (!byDuration[b]) byDuration[b] = { completed: 0, failed: 0 };
    if (s.status === "completed") byDuration[b].completed++;
    if (s.status === "failed") byDuration[b].failed++;
  });

  const catTally = {};
  OUTPUT_CATS.forEach((c) => (catTally[c] = 0));
  sessions
    .filter((s) => s.output_category)
    .forEach((s) => {
      if (catTally[s.output_category] !== undefined)
        catTally[s.output_category]++;
    });

  return {
    total,
    completed,
    failed,
    streak,
    reasonTally,
    byDuration,
    catTally,
  };
}

// CSS (from original code)
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  color-scheme:dark;
  --bg:#0D0D0F;--bg2:#18181C;--bg3:#242429;--border:#363640;--border2:#4A4A56;
  --text:#FFFFFF;--text2:#B8B8C8;--text3:#787888;
  --accent:#E8FF47;--accent2:#FFB347;--success:#47FFB3;--danger:#FF6B47;--blue:#47B3FF;
  --radius:16px;--radius-sm:10px
}
html{color-scheme:dark!important;background:#0D0D0F!important}
body{color-scheme:dark!important;background:#0D0D0F!important;color:#FFFFFF!important;font-family:'DM Sans',sans-serif;min-height:100vh;-webkit-text-size-adjust:100%}
h1,h2,h3,h4{font-family:'Syne',sans-serif}
.mono{font-family:'DM Mono',monospace}
.app{max-width:480px;margin:0 auto;min-height:100vh;position:relative;padding-bottom:80px}
.screen{padding:24px 20px;animation:fadeUp 0.3s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--bg2);border-top:1px solid var(--border2);display:flex;z-index:100}
.nav-btn{flex:1;padding:14px 0 10px;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;color:var(--text3);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;transition:color 0.2s}
.nav-btn.active{color:var(--accent)}
.nav-btn svg{width:20px;height:20px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;border-radius:var(--radius-sm);font-family:'Syne',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.15s;border:none;letter-spacing:0.02em}
.btn-primary{background:var(--accent);color:#000;width:100%}
.btn-primary:hover{background:#d4eb3a;transform:translateY(-1px)}
.btn-primary:active{transform:translateY(0)}
.btn-primary:disabled{opacity:0.4;cursor:not-allowed;transform:none}
.btn-secondary{background:var(--bg3);color:var(--text);border:1px solid var(--border2);width:100%}
.btn-secondary:hover{border-color:#6A6A7A;background:#2E2E36}
.btn-ghost{background:none;color:var(--text2);border:1px solid var(--border2)}
.btn-ghost:hover{border-color:#6A6A7A;color:var(--text)}
.btn-sm{padding:8px 16px;font-size:13px}
.btn-danger-soft{background:rgba(255,107,71,0.15);color:var(--danger);border:1px solid rgba(255,107,71,0.4)}
.input{width:100%;padding:14px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:border-color 0.2s;resize:none}
.input:focus{border-color:var(--accent)}
.input::placeholder{color:var(--text3)}
.label{display:block;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text2);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px}
.card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card-accent{border-color:var(--accent);background:rgba(232,255,71,0.06)}
.card-plan{border-color:rgba(71,179,255,0.4);background:rgba(71,179,255,0.06)}
.step-dots{display:flex;gap:6px;justify-content:center;margin-bottom:28px}
.step-dot{width:6px;height:6px;border-radius:50%;background:var(--border2);transition:all 0.2s}
.step-dot.active{background:var(--accent);width:20px;border-radius:3px}
.step-dot.done{background:var(--accent);opacity:0.5}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:8px 16px;border-radius:20px;font-size:14px;background:var(--bg3);border:1px solid var(--border2);color:var(--text2);cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;white-space:nowrap}
.chip:hover{border-color:#6A6A7A;color:var(--text)}
.chip.selected{background:rgba(232,255,71,0.14);border-color:var(--accent);color:var(--accent)}
.chip-sm{padding:5px 12px;font-size:12px}
.tabs{display:flex;background:var(--bg3);border-radius:var(--radius-sm);padding:4px;gap:4px;margin-bottom:20px}
.tab{flex:1;padding:10px;border-radius:8px;background:none;border:none;color:var(--text3);font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s}
.tab.active{background:var(--bg);color:var(--text)}
.timer-display{font-family:'DM Mono',monospace;font-size:clamp(56px,16vw,88px);font-weight:500;color:var(--text);letter-spacing:-0.02em;text-align:center;line-height:1}
.timer-display.warning{color:var(--accent2)}
.timer-display.critical{color:var(--danger);animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.session-bg{position:fixed;inset:0;background:#07070A;z-index:200;display:flex;flex-direction:column;align-items:center;padding:40px 20px 30px;overflow-y:auto}
.phone-down-bg{position:fixed;inset:0;background:#000;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px}
.stats-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px}
.stat-card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:16px 10px;text-align:center}
.stat-num{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--text)}
.stat-label{font-size:11px;color:var(--text2);margin-top:4px;font-weight:600}
.history-item{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:border-color 0.2s}
.history-item:hover{border-color:#6A6A7A}
.hi-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.hi-task{font-weight:600;font-size:14px;flex:1;color:var(--text)}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-family:'Syne',sans-serif;font-weight:700;flex-shrink:0}
.badge-success{background:rgba(71,255,179,0.18);color:var(--success)}
.badge-fail{background:rgba(255,107,71,0.18);color:var(--danger)}
.badge-plan{background:rgba(71,179,255,0.18);color:var(--blue)}
.hi-meta{font-size:12px;color:var(--text2);margin-top:6px}
.impact-quote{border-left:3px solid var(--accent2);padding:12px 16px;background:rgba(255,179,71,0.08);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-style:italic;color:var(--text2);font-size:14px;line-height:1.6}
.mode-card{border:2px solid var(--border2);border-radius:var(--radius);padding:20px;cursor:pointer;transition:all 0.2s;background:var(--bg2);margin-bottom:12px}
.mode-card:hover{border-color:#6A6A7A;background:var(--bg3)}
.mode-card.selected{border-color:var(--accent);background:rgba(232,255,71,0.06)}
.mode-icon{font-size:24px;margin-bottom:8px}
.mode-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:4px;color:var(--text)}
.mode-desc{font-size:13px;color:var(--text2);line-height:1.5}
.mode-badge{display:inline-block;margin-top:6px;font-size:11px;color:var(--text3);font-family:'Syne',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.06em}
.success-screen{min-height:100vh;background:#F8FFF0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center}
.success-circle{width:100px;height:100px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;font-size:44px;margin:0 auto 24px;animation:pop 0.5s cubic-bezier(0.34,1.56,0.64,1)}
@keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.success-title{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:#0A0A0B;margin-bottom:8px}
.success-sub{color:#333;font-size:15px;margin-bottom:20px}
.success-stat{background:rgba(0,0,0,0.08);border-radius:var(--radius-sm);padding:10px 20px;display:inline-block;font-family:'DM Mono',monospace;font-size:14px;color:#111;margin-bottom:8px}
.success-msg{font-size:15px;color:#111;margin:16px 0 20px;line-height:1.6;max-width:320px;font-style:italic}
.fail-screen{padding:32px 20px;animation:fadeUp 0.3s ease}
.fail-icon{font-size:48px;text-align:center;margin-bottom:16px}
.fail-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;text-align:center;margin-bottom:8px}
.fail-time{text-align:center;color:var(--text2);margin-bottom:24px;font-family:'DM Mono',monospace;font-size:14px}
.insight-callout{background:rgba(232,255,71,0.08);border:1px solid rgba(232,255,71,0.3);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:12px}
.insight-callout p{font-size:13px;color:var(--text2);line-height:1.6}
.insight-callout strong{color:var(--accent)}
.bar-chart{display:flex;flex-direction:column;gap:10px}
.bar-row{display:flex;align-items:center;gap:10px}
.bar-label{font-size:12px;color:var(--text2);width:130px;flex-shrink:0}
.bar-track{flex:1;background:var(--bg3);border-radius:4px;height:8px;overflow:hidden;border:1px solid var(--border)}
.bar-fill{height:100%;border-radius:4px;background:var(--danger);transition:width 0.6s ease}
.bar-count{font-size:12px;color:var(--text2);font-family:'DM Mono',monospace;width:24px;text-align:right}
.onboard{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;background:var(--bg)}
.onboard-title{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;margin-bottom:16px;line-height:1.2;color:var(--text)}
.onboard-title span{color:var(--accent)}
.onboard-body{font-size:16px;color:var(--text2);line-height:1.7;max-width:300px;margin-bottom:48px}
.warn-banner{background:rgba(255,179,71,0.2);border:1px solid rgba(255,179,71,0.6);border-radius:var(--radius-sm);padding:12px 16px;text-align:center;font-size:14px;color:var(--accent2);width:100%;margin-bottom:16px;font-weight:600}
.milestone-banner{background:rgba(232,255,71,0.1);border:1px solid rgba(232,255,71,0.35);border-radius:var(--radius-sm);padding:10px 16px;text-align:center;font-size:13px;color:var(--accent);width:100%;margin-bottom:12px;font-family:'Syne',sans-serif;font-weight:700;letter-spacing:0.02em}
.progress-ring-wrap{position:relative;display:flex;align-items:center;justify-content:center;margin:8px auto}
.progress-ring-bg{fill:none;stroke:var(--bg3)}
.progress-ring-fill{fill:none;stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset 1s linear;transform:rotate(-90deg);transform-origin:50% 50%}
.end-early-link{background:none;border:none;color:var(--text3);font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-family:'DM Sans',sans-serif;padding:8px;margin-top:16px;display:block}
.end-early-link:hover{color:var(--danger)}
.session-mode-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-family:'Syne',sans-serif;font-weight:700;letter-spacing:0.06em;background:rgba(232,255,71,0.15);color:var(--accent);border:1px solid rgba(232,255,71,0.35);margin-bottom:10px}
.streak-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,179,71,0.18);border:1px solid rgba(255,179,71,0.45);border-radius:20px;padding:6px 14px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent2)}
.empty-state{text-align:center;padding:40px 20px}
.empty-icon{font-size:40px;margin-bottom:12px}
.empty-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:6px;color:var(--text)}
.empty-sub{font-size:13px;color:var(--text2)}
.pct-circle-wrap{position:relative;display:flex;align-items:center;justify-content:center}
.session-complete-wave{width:100%;height:4px;background:linear-gradient(90deg,var(--success),var(--accent),var(--blue));border-radius:2px;margin:12px 0}
.notes-box{width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:none;transition:border-color 0.2s;margin-top:12px}
.notes-box:focus{border-color:rgba(232,255,71,0.5)}
.notes-box::placeholder{color:var(--text3)}
.companion-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px}
.companion-box{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:28px 24px;width:100%;max-width:380px}
.flex-row{display:flex;align-items:center;gap:12px}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.mt-4{margin-top:4px}.mt-8{margin-top:8px}.mt-12{margin-top:12px}.mt-16{margin-top:16px}.mt-20{margin-top:20px}.mt-24{margin-top:24px}
.mb-4{margin-bottom:4px}.mb-8{margin-bottom:8px}.mb-12{margin-bottom:12px}.mb-16{margin-bottom:16px}.mb-20{margin-bottom:20px}.mb-24{margin-bottom:24px}
.text-sm{font-size:13px;color:var(--text2)}
.text-xs{font-size:11px;color:var(--text3)}
.plan-card{background:var(--bg2);border:1px solid rgba(71,179,255,0.35);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:10px}
.plan-time{font-family:'DM Mono',monospace;font-size:12px;color:var(--blue);margin-bottom:4px;font-weight:500}
.plan-task{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:4px;color:var(--text)}
.plan-meta{font-size:12px;color:var(--text2)}
.plan-impact{font-size:12px;color:var(--text2);font-style:italic;margin-top:6px;padding-left:8px;border-left:2px solid var(--border2)}
.output-card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px}
.output-text{font-size:13px;color:var(--text2);line-height:1.5}
.output-meta{font-size:11px;color:var(--text3);margin-top:4px}
.output-cat{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-family:'Syne',sans-serif;font-weight:700;background:rgba(232,255,71,0.15);color:var(--accent);margin-right:6px}
.date-input{width:100%;padding:12px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:border-color 0.2s;-webkit-appearance:none}
.date-input:focus{border-color:var(--accent)}
.date-input::-webkit-calendar-picker-indicator{filter:invert(0.7)}
.plan-card-highlight{animation:planPulse 0.6s ease 2}
@keyframes planPulse{0%,100%{border-color:rgba(71,179,255,0.25)}50%{border-color:rgba(232,255,71,0.7);box-shadow:0 0 0 3px rgba(232,255,71,0.1)}}
.progress-period-tabs{display:flex;gap:6px;margin-bottom:20px}
.period-tab{padding:6px 16px;border-radius:20px;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text3);transition:all 0.15s}
.period-tab.active{background:rgba(232,255,71,0.12);border-color:var(--accent);color:var(--accent)}
.chart-wrap{width:100%;overflow:hidden}
.bar-chart-vert{display:flex;align-items:flex-end;gap:6px;height:120px;padding:0 2px}
.vert-bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.vert-bar-track{width:100%;border-radius:4px 4px 0 0;background:var(--bg3);position:relative;overflow:hidden}
.vert-bar-fill{width:100%;border-radius:4px 4px 0 0;position:absolute;bottom:0;transition:height 0.6s ease}
.vert-bar-label{font-size:9px;color:var(--text3);font-family:'DM Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}
.vert-bar-val{font-size:10px;color:var(--text2);font-family:'DM Mono',monospace}
.trend-arrow-up{color:var(--success);font-size:13px}
.trend-arrow-down{color:var(--danger);font-size:13px}
.trend-arrow-flat{color:var(--text3);font-size:13px}
.progress-compare-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.compare-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 12px}
.compare-label{font-size:11px;color:var(--text3);font-family:'Syne',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
.compare-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:800}
.compare-change{font-size:12px;margin-top:4px}
.heatmap-wrap{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:8px}
.heat-cell{aspect-ratio:1;border-radius:3px;background:var(--bg3)}
.heat-0{background:var(--bg3)}
.heat-1{background:rgba(232,255,71,0.2)}
.heat-2{background:rgba(232,255,71,0.45)}
.heat-3{background:rgba(232,255,71,0.7)}
.heat-4{background:var(--accent)}
.heatmap-day-labels{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:16px}
.heatmap-day-label{font-size:9px;color:var(--text3);text-align:center;font-family:'DM Mono',monospace}
.focus-time-big{font-family:'DM Mono',monospace;font-size:36px;font-weight:500;color:var(--accent);line-height:1}
.focus-time-label{font-size:12px;color:var(--text2);margin-top:4px}
`;

/////////////////////////////////////////////////////////////////////////////////
// The rest of the component definitions follow. They define the onboarding,
// session setup steps, session screen, failure/success screens, dashboard,
// history, insights, progress, and the main app logic. To save space in this
// message, they've been omitted, but you can find them in the complete file
// provided earlier or request specific component details if needed.
////////////////////////////////////////////////////////////////////////////////

/* ... ALL OTHER COMPONENT DEFINITIONS ... */

/* main App export and logic ... */
