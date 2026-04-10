import { useState, useEffect, useRef, useCallback } from "react";

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const SK = { SESSIONS:"fc_sessions", ONBOARDED:"fc_onboarded", SAVED_TASKS:"fc_saved_tasks", PLANNED:"fc_planned" };
function load(k,fb){try{const r=localStorage.getItem(k);return r?JSON.parse(r):fb;}catch{return fb;}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function genId(){return Math.random().toString(36).substr(2,9)+Date.now().toString(36);}
function formatTime(s){const m=Math.floor(s/60),sc=s%60;return `${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;}
function formatDate(iso){const d=new Date(iso);return d.toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}
function getDayKey(date=new Date()){return date.toISOString().split("T")[0];}

const SOFT_GRACE_MS = 10000;
const SUGGESTED_TASKS = ["Deep work","Work on laptop","Coding","Writing","Reading","Study","Admin","Planning","Design work","Research","Workout","Meditation","Time with partner","Family time","Prayer / reflection","Creative work","Business task","Revision","Housework sprint"];
const FAILURE_REASONS = [{id:"urge_to_check",label:"Urge to check something"},{id:"boredom",label:"Boredom"},{id:"overwhelm",label:"Overwhelm"},{id:"physical",label:"Physical distraction"},{id:"avoidance",label:"Avoidance / anxiety"},{id:"other",label:"Other"}];
const ENCOURAGEMENTS = ["Awareness is step one. Every session teaches you something.","You showed up. That already counts. Try a shorter session.","The contract broke — but you can write a new one right now.","ADHD is not a willpower problem. Try 15 minutes this time.","Noticing what pulls you away is the data you need to beat it."];
const SUCCESS_MSGS = ["That required real discipline. You made a commitment and followed through.","You said you would do it — and you did. That is the standard.","This is how consistency is built. One kept promise at a time."];
const FINAL5_MSGS = ["5 minutes left — how much can you get done?","Final 5 minutes — empty the tank","Clock's running — what's left?"];
const TIMER_PRESETS = [{label:"15 min",value:15*60},{label:"25 min",value:25*60},{label:"45 min",value:45*60},{label:"60 min",value:60*60}];
const OUTPUT_CATS = ["Work","Business","Health","Relationships","Learning","Personal"];

function computeStats(sessions){
  const total=sessions.length,completed=sessions.filter(s=>s.status==="completed").length,failed=sessions.filter(s=>s.status==="failed").length;
  const daySet=new Set(sessions.filter(s=>s.status==="completed").map(s=>getDayKey(new Date(s.created_at))));
  let streak=0;const today=new Date();
  for(let i=0;i<365;i++){const d=new Date(today);d.setDate(today.getDate()-i);if(daySet.has(getDayKey(d)))streak++;else break;}
  const reasonTally={};FAILURE_REASONS.forEach(r=>reasonTally[r.id]=0);
  sessions.filter(s=>s.failure_reason).forEach(s=>{if(reasonTally[s.failure_reason]!==undefined)reasonTally[s.failure_reason]++;});
  const byDuration={};
  sessions.forEach(s=>{const b=Math.round(s.timer_duration_seconds/60);if(!byDuration[b])byDuration[b]={completed:0,failed:0};if(s.status==="completed")byDuration[b].completed++;if(s.status==="failed")byDuration[b].failed++;});
  const catTally={};OUTPUT_CATS.forEach(c=>catTally[c]=0);
  sessions.filter(s=>s.output_category).forEach(s=>{if(catTally[s.output_category]!==undefined)catTally[s.output_category]++;});
  return{total,completed,failed,streak,reasonTally,byDuration,catTally};
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0A0A0B;--bg2:#111114;--bg3:#1A1A1F;--border:#2A2A32;--border2:#3A3A44;--text:#F0F0F5;--text2:#9090A0;--text3:#5A5A6A;--accent:#E8FF47;--accent2:#FFB347;--success:#47FFB3;--danger:#FF6B47;--blue:#47B3FF;--radius:16px;--radius-sm:10px}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh}
h1,h2,h3,h4{font-family:'Syne',sans-serif}
.mono{font-family:'DM Mono',monospace}
.app{max-width:480px;margin:0 auto;min-height:100vh;position:relative;padding-bottom:80px}
.screen{padding:24px 20px;animation:fadeUp 0.3s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--bg2);border-top:1px solid var(--border);display:flex;z-index:100}
.nav-btn{flex:1;padding:14px 0 10px;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;color:var(--text3);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;transition:color 0.2s}
.nav-btn.active{color:var(--accent)}
.nav-btn svg{width:20px;height:20px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;border-radius:var(--radius-sm);font-family:'Syne',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.15s;border:none;letter-spacing:0.02em}
.btn-primary{background:var(--accent);color:#000;width:100%}
.btn-primary:hover{background:#d4eb3a;transform:translateY(-1px)}
.btn-primary:active{transform:translateY(0)}
.btn-primary:disabled{opacity:0.4;cursor:not-allowed;transform:none}
.btn-secondary{background:var(--bg3);color:var(--text);border:1px solid var(--border);width:100%}
.btn-secondary:hover{border-color:var(--border2)}
.btn-ghost{background:none;color:var(--text2);border:1px solid var(--border)}
.btn-ghost:hover{border-color:var(--border2)}
.btn-sm{padding:8px 16px;font-size:13px}
.btn-danger-soft{background:rgba(255,107,71,0.1);color:var(--danger);border:1px solid rgba(255,107,71,0.3)}
.input{width:100%;padding:14px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:border-color 0.2s;resize:none}
.input:focus{border-color:var(--accent)}
.input::placeholder{color:var(--text3)}
.label{display:block;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text2);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card-accent{border-color:var(--accent);background:rgba(232,255,71,0.04)}
.card-plan{border-color:rgba(71,179,255,0.3);background:rgba(71,179,255,0.04)}
.step-dots{display:flex;gap:6px;justify-content:center;margin-bottom:28px}
.step-dot{width:6px;height:6px;border-radius:50%;background:var(--border2);transition:all 0.2s}
.step-dot.active{background:var(--accent);width:20px;border-radius:3px}
.step-dot.done{background:var(--accent);opacity:0.4}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:8px 16px;border-radius:20px;font-size:14px;background:var(--bg3);border:1px solid var(--border);color:var(--text2);cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;white-space:nowrap}
.chip:hover{border-color:var(--border2);color:var(--text)}
.chip.selected{background:rgba(232,255,71,0.12);border-color:var(--accent);color:var(--accent)}
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
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 10px;text-align:center}
.stat-num{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--text)}
.stat-label{font-size:11px;color:var(--text3);margin-top:4px}
.history-item{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:border-color 0.2s}
.history-item:hover{border-color:var(--border2)}
.hi-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.hi-task{font-weight:600;font-size:14px;flex:1}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-family:'Syne',sans-serif;font-weight:700;flex-shrink:0}
.badge-success{background:rgba(71,255,179,0.12);color:var(--success)}
.badge-fail{background:rgba(255,107,71,0.12);color:var(--danger)}
.badge-plan{background:rgba(71,179,255,0.12);color:var(--blue)}
.hi-meta{font-size:12px;color:var(--text3);margin-top:6px}
.impact-quote{border-left:3px solid var(--accent2);padding:12px 16px;background:rgba(255,179,71,0.06);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-style:italic;color:var(--text2);font-size:14px;line-height:1.6}
.mode-card{border:2px solid var(--border);border-radius:var(--radius);padding:20px;cursor:pointer;transition:all 0.2s;background:var(--bg2);margin-bottom:12px}
.mode-card:hover{border-color:var(--border2)}
.mode-card.selected{border-color:var(--accent);background:rgba(232,255,71,0.04)}
.mode-icon{font-size:24px;margin-bottom:8px}
.mode-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:4px}
.mode-desc{font-size:13px;color:var(--text2);line-height:1.5}
.mode-badge{display:inline-block;margin-top:6px;font-size:11px;color:var(--text3);font-family:'Syne',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.06em}
.success-screen{min-height:100vh;background:#F8FFF0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center}
.success-circle{width:100px;height:100px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;font-size:44px;margin:0 auto 24px;animation:pop 0.5s cubic-bezier(0.34,1.56,0.64,1)}
@keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.success-title{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:#0A0A0B;margin-bottom:8px}
.success-sub{color:#444;font-size:15px;margin-bottom:20px}
.success-stat{background:rgba(0,0,0,0.06);border-radius:var(--radius-sm);padding:10px 20px;display:inline-block;font-family:'DM Mono',monospace;font-size:14px;color:#222;margin-bottom:8px}
.success-msg{font-size:15px;color:#222;margin:16px 0 20px;line-height:1.6;max-width:320px;font-style:italic}
.fail-screen{padding:32px 20px;animation:fadeUp 0.3s ease}
.fail-icon{font-size:48px;text-align:center;margin-bottom:16px}
.fail-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;text-align:center;margin-bottom:8px}
.fail-time{text-align:center;color:var(--text2);margin-bottom:24px;font-family:'DM Mono',monospace;font-size:14px}
.insight-callout{background:rgba(232,255,71,0.06);border:1px solid rgba(232,255,71,0.2);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:12px}
.insight-callout p{font-size:13px;color:var(--text2);line-height:1.6}
.insight-callout strong{color:var(--accent)}
.bar-chart{display:flex;flex-direction:column;gap:10px}
.bar-row{display:flex;align-items:center;gap:10px}
.bar-label{font-size:12px;color:var(--text2);width:130px;flex-shrink:0}
.bar-track{flex:1;background:var(--bg3);border-radius:4px;height:8px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;background:var(--danger);transition:width 0.6s ease}
.bar-count{font-size:12px;color:var(--text3);font-family:'DM Mono',monospace;width:24px;text-align:right}
.onboard{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;background:var(--bg)}
.onboard-title{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;margin-bottom:16px;line-height:1.2}
.onboard-title span{color:var(--accent)}
.onboard-body{font-size:16px;color:var(--text2);line-height:1.7;max-width:300px;margin-bottom:48px}
.warn-banner{background:rgba(255,179,71,0.15);border:1px solid rgba(255,179,71,0.5);border-radius:var(--radius-sm);padding:12px 16px;text-align:center;font-size:14px;color:var(--accent2);width:100%;margin-bottom:16px;font-weight:600}
.milestone-banner{background:rgba(232,255,71,0.08);border:1px solid rgba(232,255,71,0.25);border-radius:var(--radius-sm);padding:10px 16px;text-align:center;font-size:13px;color:var(--accent);width:100%;margin-bottom:12px;font-family:'Syne',sans-serif;font-weight:700;letter-spacing:0.02em}
.progress-ring-wrap{position:relative;display:flex;align-items:center;justify-content:center;margin:8px auto}
.progress-ring-bg{fill:none;stroke:var(--bg3)}
.progress-ring-fill{fill:none;stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset 1s linear;transform:rotate(-90deg);transform-origin:50% 50%}
.end-early-link{background:none;border:none;color:var(--text3);font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-family:'DM Sans',sans-serif;padding:8px;margin-top:16px;display:block}
.end-early-link:hover{color:var(--danger)}
.session-mode-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-family:'Syne',sans-serif;font-weight:700;letter-spacing:0.06em;background:rgba(232,255,71,0.1);color:var(--accent);border:1px solid rgba(232,255,71,0.2);margin-bottom:10px}
.streak-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,179,71,0.12);border:1px solid rgba(255,179,71,0.3);border-radius:20px;padding:6px 14px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent2)}
.empty-state{text-align:center;padding:40px 20px}
.empty-icon{font-size:40px;margin-bottom:12px}
.empty-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:6px}
.empty-sub{font-size:13px;color:var(--text2)}
.pct-circle-wrap{position:relative;display:flex;align-items:center;justify-content:center}
.session-complete-wave{width:100%;height:4px;background:linear-gradient(90deg,var(--success),var(--accent),var(--blue));border-radius:2px;margin:12px 0}
.notes-box{width:100%;padding:12px 14px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:none;transition:border-color 0.2s;margin-top:12px}
.notes-box:focus{border-color:rgba(232,255,71,0.3)}
.notes-box::placeholder{color:var(--text3)}
.companion-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px}
.companion-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:28px 24px;width:100%;max-width:380px}
.flex-row{display:flex;align-items:center;gap:12px}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.mt-4{margin-top:4px}.mt-8{margin-top:8px}.mt-12{margin-top:12px}.mt-16{margin-top:16px}.mt-20{margin-top:20px}.mt-24{margin-top:24px}
.mb-4{margin-bottom:4px}.mb-8{margin-bottom:8px}.mb-12{margin-bottom:12px}.mb-16{margin-bottom:16px}.mb-20{margin-bottom:20px}.mb-24{margin-bottom:24px}
.text-sm{font-size:13px;color:var(--text2)}
.text-xs{font-size:11px;color:var(--text3)}
.plan-card{background:var(--bg2);border:1px solid rgba(71,179,255,0.25);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:10px}
.plan-time{font-family:'DM Mono',monospace;font-size:12px;color:var(--blue);margin-bottom:4px}
.plan-task{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:4px}
.plan-meta{font-size:12px;color:var(--text3)}
.plan-impact{font-size:12px;color:var(--text2);font-style:italic;margin-top:6px;padding-left:8px;border-left:2px solid var(--border2)}
.output-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px}
.output-text{font-size:13px;color:var(--text2);line-height:1.5}
.output-meta{font-size:11px;color:var(--text3);margin-top:4px}
.output-cat{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-family:'Syne',sans-serif;font-weight:700;background:rgba(232,255,71,0.1);color:var(--accent);margin-right:6px}
.date-input{width:100%;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:border-color 0.2s;-webkit-appearance:none}
.date-input:focus{border-color:var(--accent)}
.date-input::-webkit-calendar-picker-indicator{filter:invert(0.5)}
.plan-card-highlight{animation:planPulse 0.6s ease 2}
@keyframes planPulse{0%,100%{border-color:rgba(71,179,255,0.25)}50%{border-color:rgba(232,255,71,0.7);box-shadow:0 0 0 3px rgba(232,255,71,0.1)}}
`;

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti({active}){
  const canvasRef=useRef(null),animRef=useRef(null),particles=useRef([]);
  useEffect(()=>{
    if(!active)return;
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    const colors=["#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD"];
    particles.current=Array.from({length:120},()=>({x:Math.random()*canvas.width,y:-10,vx:(Math.random()-0.5)*4,vy:Math.random()*3+2,color:colors[Math.floor(Math.random()*colors.length)],size:Math.random()*8+4,rotation:Math.random()*360,rotationSpeed:(Math.random()-0.5)*10}));
    const animate=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);particles.current.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.rotation+=p.rotationSpeed;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();});particles.current=particles.current.filter(p=>p.y<canvas.height+20);if(particles.current.length>0)animRef.current=requestAnimationFrame(animate);};
    animRef.current=requestAnimationFrame(animate);
    return()=>{if(animRef.current)cancelAnimationFrame(animRef.current);};
  },[active]);
  if(!active)return null;
  return <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",pointerEvents:"none",zIndex:9999}}/>;
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({onStartNow,onPlanFirst}){
  const [step,setStep]=useState(0);
  const slides=[
    {title:<>Most apps help you <span>plan.</span><br/>This one holds you <span>accountable.</span></>,body:"Focus Contractor creates a commitment between you and your future self. Define the task, state what is at stake, and enter a protected focus zone."},
    {title:<>You define <span>what matters.</span><br/>We make you <span>own it.</span></>,body:"Before every session, you write what you will lose if you do not finish. That statement becomes your anchor — and you will see it again if you quit early."},
    {title:<>Leave the app.<br/>The <span>contract breaks.</span></>,body:"It is not a blocker. It is a mirror. Every session teaches you something about how your brain works under pressure."},
  ];
  const isLast=step===slides.length-1;
  const s=slides[step];
  return(
    <div className="onboard">
      <div style={{display:"flex",gap:8,marginBottom:40}}>
        {slides.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?"var(--accent)":"var(--border2)",transition:"all 0.3s"}}/>)}
      </div>
      <div style={{fontFamily:"DM Mono",fontSize:11,color:"var(--text3)",marginBottom:16,letterSpacing:"0.1em",textTransform:"uppercase"}}>{String(step+1).padStart(2,"0")} / 03</div>
      <h1 className="onboard-title">{s.title}</h1>
      <p className="onboard-body">{s.body}</p>
      {!isLast
        ?<button className="btn btn-primary" style={{maxWidth:280}} onClick={()=>setStep(p=>p+1)}>Continue</button>
        :<div style={{width:"100%",maxWidth:300,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontFamily:"Syne",fontSize:13,fontWeight:700,color:"var(--text3)",textAlign:"center",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>What do you want to do?</div>
          <button className="btn btn-primary" onClick={onStartNow}>
            Start a Session Now
          </button>
          <button className="btn btn-secondary" onClick={onPlanFirst}>
            Plan a Session for Later
          </button>
        </div>
      }
    </div>
  );
}

function StepDots({total,current}){
  return(<div className="step-dots">{Array.from({length:total},(_,i)=><div key={i} className={`step-dot ${i===current?"active":i<current?"done":""}`}/>)}</div>);
}

// ─── STEP 1: TASK ─────────────────────────────────────────────────────────────
function Step1_Task({onNext,prefill}){
  const [selected,setSelected]=useState(prefill||"");
  const [custom,setCustom]=useState(prefill&&!SUGGESTED_TASKS.includes(prefill)?prefill:"");
  const [savedTasks,setSavedTasks]=useState(()=>load(SK.SAVED_TASKS,[]));
  const [saveMode,setSaveMode]=useState(false);

  const taskName=SUGGESTED_TASKS.includes(selected)?selected:custom.trim();

  const handleSave=()=>{
    if(!taskName)return;
    const updated=[...new Set([taskName,...savedTasks])].slice(0,10);
    setSavedTasks(updated);save(SK.SAVED_TASKS,updated);setSaveMode(false);
  };
  const removeTask=(t)=>{const updated=savedTasks.filter(x=>x!==t);setSavedTasks(updated);save(SK.SAVED_TASKS,updated);};

  return(
    <div className="screen">
      <StepDots total={4} current={0}/>
      <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:6}}>What are you working on?</h2>
      <p className="text-sm mb-20">Choose a task or write your own.</p>

      {savedTasks.length>0&&(
        <div className="mb-16">
          <div className="label mb-8">SAVED TASKS</div>
          <div className="chips">
            {savedTasks.map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:0}}>
                <div className={`chip ${selected===t&&!SUGGESTED_TASKS.includes(selected)?"selected":""}`} onClick={()=>{setSelected(t);setCustom("");}}>
                  {t}
                </div>
                <button onClick={()=>removeTask(t)} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",padding:"0 4px",fontSize:14,marginLeft:2}}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="label mb-8">SUGGESTED</div>
      <div className="chips mb-20">
        {SUGGESTED_TASKS.map(t=>(
          <div key={t} className={`chip ${selected===t?"selected":""}`} onClick={()=>{setSelected(t);setCustom("");}}>
            {t}
          </div>
        ))}
      </div>

      <div className="label mb-8">CUSTOM TASK</div>
      <input className="input" placeholder="e.g. Write proposal for client" value={custom} onChange={e=>{setCustom(e.target.value);setSelected(e.target.value);}} style={{marginBottom:8}}/>

      {taskName&&(
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {!saveMode
            ?<button className="btn btn-ghost btn-sm" style={{width:"auto"}} onClick={()=>setSaveMode(true)}>+ Save task</button>
            :<><span style={{fontSize:13,color:"var(--text2)",alignSelf:"center"}}>Save "{taskName}"?</span>
              <button className="btn btn-secondary btn-sm" style={{width:"auto"}} onClick={handleSave}>Yes</button>
              <button className="btn btn-ghost btn-sm" style={{width:"auto"}} onClick={()=>setSaveMode(false)}>No</button>
            </>
          }
        </div>
      )}

      <button className="btn btn-primary mt-8" onClick={()=>onNext(taskName)} disabled={!taskName}>Continue</button>
    </div>
  );
}

// ─── STEP 2: TIMER ────────────────────────────────────────────────────────────
function Step2_Timer({onNext,onBack,prefill}){
  const [selected,setSelected]=useState(prefill||25*60);
  const [custom,setCustom]=useState(false);
  const [customMins,setCustomMins]=useState(30);
  return(
    <div className="screen">
      <StepDots total={4} current={1}/>
      <button className="btn btn-ghost btn-sm mb-16" onClick={onBack} style={{width:"auto"}}>Back</button>
      <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:6}}>Set your timer</h2>
      <p className="text-sm mb-20">Shorter sessions have higher completion rates.</p>
      <div className="chips mb-20">
        {TIMER_PRESETS.map(p=>(
          <div key={p.value} className={`chip ${!custom&&selected===p.value?"selected":""}`} onClick={()=>{setSelected(p.value);setCustom(false);}}>{p.label}</div>
        ))}
        <div className={`chip ${custom?"selected":""}`} onClick={()=>setCustom(true)}>Custom</div>
      </div>
      {custom&&(
        <div className="card mb-16">
          <label className="label mb-8">Custom duration (minutes)</label>
          <div className="flex-row">
            <button className="btn btn-ghost btn-sm" style={{width:40,padding:"8px"}} onClick={()=>setCustomMins(m=>Math.max(5,m-5))}>−</button>
            <span style={{fontFamily:"DM Mono",fontSize:24,flex:1,textAlign:"center"}}>{customMins}</span>
            <button className="btn btn-ghost btn-sm" style={{width:40,padding:"8px"}} onClick={()=>setCustomMins(m=>Math.min(180,m+5))}>+</button>
          </div>
        </div>
      )}
      <div className="card" style={{textAlign:"center",padding:"24px 20px"}}>
        <div style={{fontFamily:"DM Mono",fontSize:48,color:"var(--accent)"}}>{formatTime(custom?customMins*60:selected)}</div>
        <div className="text-sm mt-8">Session length</div>
      </div>
      <div className="mt-20"><button className="btn btn-primary" onClick={()=>onNext(custom?customMins*60:selected)}>Continue</button></div>
    </div>
  );
}

// ─── STEP 3: IMPACT ───────────────────────────────────────────────────────────
function Step3_Impact({onNext,onBack,prefill}){
  const [impact,setImpact]=useState(prefill||"");
  const EXAMPLES=["I will fall behind on my business and delay getting customers.","I will miss my deadline and let my team down.","I will keep procrastinating and feel worse about myself tonight."];
  return(
    <div className="screen">
      <StepDots total={4} current={2}/>
      <button className="btn btn-ghost btn-sm mb-16" onClick={onBack} style={{width:"auto"}}>Back</button>
      <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:6}}>What is at stake?</h2>
      <p className="text-sm mb-20">If you do not complete this session, what is the real impact?</p>
      <textarea className="input" rows={4} placeholder="e.g. I will fall behind on my business and delay getting my first customers." value={impact} onChange={e=>setImpact(e.target.value)} style={{marginBottom:12}}/>
      <div className="text-xs mb-12">QUICK OPTIONS — tap to fill:</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {EXAMPLES.map((ex,i)=>(
          <div key={i} className="card" style={{padding:"10px 14px",cursor:"pointer",marginBottom:0}} onClick={()=>setImpact(ex)}>
            <p style={{fontSize:13,color:"var(--text2)",fontStyle:"italic"}}>{ex}</p>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={()=>onNext(impact)} disabled={impact.trim().length<20}>Continue</button>
      {impact.trim().length>0&&impact.trim().length<20&&<p className="text-xs mt-8" style={{textAlign:"center",color:"var(--text3)"}}>Be more specific ({20-impact.trim().length} more chars needed)</p>}
    </div>
  );
}

// ─── STEP 4: MODE ─────────────────────────────────────────────────────────────
function Step4_Mode({onNext,onBack,prefill}){
  const [mode,setMode]=useState(prefill||"lockin");
  return(
    <div className="screen">
      <StepDots total={4} current={3}/>
      <button className="btn btn-ghost btn-sm mb-16" onClick={onBack} style={{width:"auto"}}>Back</button>
      <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:6}}>Choose your mode</h2>
      <p className="text-sm mb-20">How strict should the contract be?</p>
      <div className={`mode-card ${mode==="lockin"?"selected":""}`} onClick={()=>setMode("lockin")}>
        <div className="mode-icon">🔒</div>
        <div className="mode-title">Lock-In Mode</div>
        <div className="mode-desc">Leave the app for any reason and the session fails immediately. No exceptions.</div>
        <div className="mode-badge">Best for: serious deadlines</div>
      </div>
      <div className={`mode-card ${mode==="companion"?"selected":""}`} onClick={()=>setMode("companion")}>
        <div className="mode-icon">👥</div>
        <div className="mode-title">Companion Mode</div>
        <div className="mode-desc">If you try to leave, you are asked why. Task-related or quick interruption is allowed. Distraction fails the session.</div>
        <div className="mode-badge">Best for: flexible work</div>
      </div>
      <div className={`mode-card ${mode==="phonedown"?"selected":""}`} onClick={()=>setMode("phonedown")}>
        <div className="mode-icon">📵</div>
        <div className="mode-title">Phone-Down Mode</div>
        <div className="mode-desc">Minimal UI, maximum focus. Just the timer. Leave and it fails immediately.</div>
        <div className="mode-badge">Best for: deep focus</div>
      </div>
      <button className="btn btn-primary mt-4" onClick={()=>onNext(mode)}>Review Contract</button>
    </div>
  );
}

// ─── CONTRACT REVIEW ──────────────────────────────────────────────────────────
function ContractReview({session,onStart,onBack}){
  const modeLabel={lockin:"Lock-In — Instant fail on exit",companion:"Companion — Asked before failing",phonedown:"Phone-Down — Minimal UI, instant fail"};
  return(
    <div className="screen">
      <h2 style={{fontFamily:"Syne",fontSize:28,fontWeight:800,marginBottom:4}}>Your Focus Contract</h2>
      <p className="text-sm mb-24">Review what you are committing to.</p>
      <div className="card" style={{marginBottom:12}}>
        <div className="text-xs mb-8">TASK</div>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:17}}>{session.taskName}</div>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div className="text-xs mb-8">DURATION</div>
        <div style={{fontFamily:"DM Mono",fontSize:24,color:"var(--accent)"}}>{formatTime(session.timerDuration)}</div>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div className="text-xs mb-8">WHAT IS AT STAKE</div>
        <div className="impact-quote">{session.impact}</div>
      </div>
      <div className="card" style={{marginBottom:28}}>
        <div className="text-xs mb-8">MODE</div>
        <div style={{fontFamily:"Syne",fontWeight:700}}>{modeLabel[session.mode]}</div>
      </div>
      <button className="btn btn-primary" style={{fontSize:17,padding:"18px"}} onClick={onStart}>I Commit — Start Session</button>
      <button className="btn btn-ghost mt-12" onClick={onBack}>Edit</button>
    </div>
  );
}

// ─── COMPANION OVERLAY ────────────────────────────────────────────────────────
function CompanionOverlay({onContinue,onFail}){
  return(
    <div className="companion-overlay">
      <div className="companion-box">
        <div style={{fontFamily:"Syne",fontWeight:800,fontSize:20,marginBottom:8}}>Wait — why are you leaving?</div>
        <p style={{fontSize:14,color:"var(--text2)",lineHeight:1.6,marginBottom:24}}>Be honest. This is your contract.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="btn btn-secondary" onClick={onContinue}>
            Task-related — I need something for this work
          </button>
          <button className="btn btn-secondary" onClick={onContinue}>
            Quick interruption — back in seconds
          </button>
          <button className="btn btn-danger-soft" onClick={onFail}>
            Distracted — I want to check something else
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FOCUS SESSION ────────────────────────────────────────────────────────────
function FocusSession({session,onComplete,onFail}){
  const totalDuration=session.timerDuration;
  const [timeLeft,setTimeLeft]=useState(totalDuration);
  const [notes,setNotes]=useState("");
  const [warnMessage,setWarnMessage]=useState("");
  const [milestoneMsg,setMilestoneMsg]=useState("");
  const [showCompanion,setShowCompanion]=useState(false);

  const timeLeftRef=useRef(totalDuration);
  const elapsedRef=useRef(0);
  const hiddenAtRef=useRef(null);
  const failedRef=useRef(false);
  const notesRef=useRef("");
  const timerRef=useRef(null);
  const final5Fired=useRef(false);
  const milestoneFired=useRef({half:false,eighty:false});

  useEffect(()=>{notesRef.current=notes;},[notes]);

  const triggerFail=useCallback(()=>{
    if(failedRef.current)return;failedRef.current=true;clearInterval(timerRef.current);
    onFail(elapsedRef.current,notesRef.current);
  },[onFail]);

  const triggerComplete=useCallback(()=>{
    if(failedRef.current)return;failedRef.current=true;clearInterval(timerRef.current);
    onComplete(elapsedRef.current,notesRef.current);
  },[onComplete]);

  useEffect(()=>{
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        const next=t-1;timeLeftRef.current=next;elapsedRef.current=totalDuration-next;
        if(next<=0){triggerComplete();return 0;}
        return next;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[triggerComplete,totalDuration]);

  useEffect(()=>{
    if(totalDuration===0)return;
    const pct=(totalDuration-timeLeft)/totalDuration;
    if(pct>=0.5&&!milestoneFired.current.half){milestoneFired.current.half=true;setMilestoneMsg("Halfway there. Keep going.");setTimeout(()=>setMilestoneMsg(""),4000);}
    if(pct>=0.8&&!milestoneFired.current.eighty){milestoneFired.current.eighty=true;setMilestoneMsg("Almost done. Do not stop now.");setTimeout(()=>setMilestoneMsg(""),4000);}
    if(timeLeft<=300&&timeLeft>294&&!final5Fired.current){
      final5Fired.current=true;
      const msg=FINAL5_MSGS[Math.floor(Math.random()*FINAL5_MSGS.length)];
      setMilestoneMsg(msg);setTimeout(()=>setMilestoneMsg(""),6000);
    }
  },[timeLeft,totalDuration]);

  useEffect(()=>{
    const handleHide=()=>{
      if(failedRef.current)return;
      hiddenAtRef.current=Date.now();
      if(session.mode==="lockin"||session.mode==="phonedown"){triggerFail();}
      else if(session.mode==="companion"){setShowCompanion(true);}
    };
    const handleShow=()=>{
      if(failedRef.current)return;
      if(hiddenAtRef.current===null)return;
      const awayMs=Date.now()-hiddenAtRef.current;hiddenAtRef.current=null;
      if(session.mode==="companion")return;
      if(awayMs>SOFT_GRACE_MS){triggerFail();}
      else{setWarnMessage(`You left for ${Math.ceil(awayMs/1000)}s. Stay focused.`);setTimeout(()=>setWarnMessage(""),4000);}
    };
    const handleVC=()=>{if(document.visibilityState==="hidden")handleHide();else handleShow();};
    const handlePH=()=>{if(!failedRef.current){if(session.mode==="companion")setShowCompanion(true);else triggerFail();}};
    document.addEventListener("visibilitychange",handleVC);
    window.addEventListener("pagehide",handlePH);
    return()=>{document.removeEventListener("visibilitychange",handleVC);window.removeEventListener("pagehide",handlePH);};
  },[session.mode,triggerFail]);

  const pct=(totalDuration-timeLeft)/totalDuration;
  const R=80,circumference=2*Math.PI*R,offset=circumference*(1-pct);
  const timerClass=timeLeft<60?"critical":timeLeft<totalDuration*0.2?"warning":"";
  const modeLabel={lockin:"🔒 LOCK-IN",companion:"👥 COMPANION",phonedown:"📵 PHONE-DOWN"};

  if(session.mode==="phonedown"){
    return(
      <div className="phone-down-bg">
        {showCompanion&&<CompanionOverlay onContinue={()=>{setShowCompanion(false);hiddenAtRef.current=null;}} onFail={triggerFail}/>}
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"DM Mono",fontSize:"clamp(72px,20vw,110px)",color:"#fff",letterSpacing:"-0.03em",lineHeight:1}}>{formatTime(timeLeft)}</div>
          <div style={{fontSize:14,color:"#444",marginTop:12,fontFamily:"Syne",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase"}}>{session.taskName}</div>
          <button className="end-early-link" style={{color:"#333",marginTop:40}} onClick={()=>triggerFail()}>End session early</button>
        </div>
      </div>
    );
  }

  return(
    <div className="session-bg">
      {showCompanion&&<CompanionOverlay onContinue={()=>{setShowCompanion(false);hiddenAtRef.current=null;}} onFail={triggerFail}/>}
      <div style={{width:"100%",maxWidth:440,display:"flex",flexDirection:"column",alignItems:"center",flex:1}}>
        <div className="session-mode-badge">{modeLabel[session.mode]||"SESSION"}</div>
        {warnMessage&&<div className="warn-banner">{warnMessage}</div>}
        {milestoneMsg&&<div className="milestone-banner">{milestoneMsg}</div>}
        <div className="progress-ring-wrap" style={{marginBottom:8}}>
          <svg width={200} height={200} viewBox="0 0 200 200">
            <circle className="progress-ring-bg" cx={100} cy={100} r={R} strokeWidth={6}/>
            <circle className="progress-ring-fill" cx={100} cy={100} r={R} strokeWidth={6} strokeDasharray={circumference} strokeDashoffset={offset}/>
          </svg>
          <div style={{position:"absolute",textAlign:"center"}}>
            <div className={`timer-display ${timerClass}`}>{formatTime(timeLeft)}</div>
            <div style={{fontSize:11,color:"var(--text3)",fontFamily:"DM Mono",marginTop:4}}>{Math.round(pct*100)}% done</div>
          </div>
        </div>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,textAlign:"center",marginBottom:4}}>{session.taskName}</div>
        <div style={{fontSize:12,color:"var(--text3)",marginBottom:16,textAlign:"center"}}>Stay in the app to keep your contract</div>
        <div style={{width:"100%",maxWidth:440}}>
          <div className="text-xs mb-4">GET TO IT LATER</div>
          <textarea className="notes-box" rows={3} placeholder="Jot down anything that can wait — ideas, tasks, distractions to handle after..." value={notes} onChange={e=>setNotes(e.target.value)}/>
          <div className="text-xs mt-4" style={{color:"var(--text3)"}}>Notes are saved when the session ends</div>
        </div>
        <button className="end-early-link" onClick={()=>triggerFail()}>End session early</button>
      </div>
    </div>
  );
}

// ─── FAILURE SCREEN ───────────────────────────────────────────────────────────
function FailureScreen({session,onRestart,onDashboard}){
  const [reason,setReason]=useState("");
  const [otherText,setOtherText]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const encouragement=ENCOURAGEMENTS[Math.floor(Math.random()*ENCOURAGEMENTS.length)];
  const pct=Math.round((session.elapsed/session.timerDuration)*100);

  const handleSubmit=()=>{
    const sessions=load(SK.SESSIONS,[]);
    sessions.unshift({id:genId(),created_at:new Date().toISOString(),task_name:session.taskName,timer_duration_seconds:session.timerDuration,mode:session.mode,impact_statement:session.impact,status:"failed",time_elapsed_seconds:session.elapsed,failure_reason:reason,failure_reason_text:reason==="other"?otherText:"",notes:session.notes||"",output_text:"",output_category:""});
    save(SK.SESSIONS,sessions);setSubmitted(true);
  };

  return(
    <div className="fail-screen">
      <div className="fail-icon">💔</div>
      <div className="fail-title">Session Ended Early</div>
      <div className="fail-time mono">Focused {formatTime(session.elapsed)} of {formatTime(session.timerDuration)} — {pct}% complete</div>
      <div className="card mb-20">
        <div className="text-xs mb-8">YOU SAID THIS WAS AT STAKE:</div>
        <div className="impact-quote">{session.impact}</div>
      </div>
      {!submitted?(
        <>
          <label className="label mb-12">What pulled you away?</label>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {FAILURE_REASONS.map(r=>(
              <div key={r.id} className={`chip ${reason===r.id?"selected":""}`} style={{width:"100%"}} onClick={()=>setReason(r.id)}>{r.label}</div>
            ))}
          </div>
          {reason==="other"&&<textarea className="input mb-16" rows={2} placeholder="Tell me more..." value={otherText} onChange={e=>setOtherText(e.target.value)}/>}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!reason}>Save and Continue</button>
        </>
      ):(
        <>
          <div className="card mb-20" style={{background:"rgba(71,179,255,0.06)",borderColor:"rgba(71,179,255,0.2)",textAlign:"center"}}>
            <p style={{fontSize:15,lineHeight:1.7,color:"var(--text2)"}}>{encouragement}</p>
          </div>
          <button className="btn btn-primary mb-12" onClick={onRestart}>Start New Session</button>
          <button className="btn btn-ghost" onClick={onDashboard}>Back to Dashboard</button>
        </>
      )}
    </div>
  );
}

// ─── COMPLETION SCREEN ────────────────────────────────────────────────────────
function CompletionScreen({session,onDone}){
  const [output,setOutput]=useState("");
  const [category,setCategory]=useState("");
  const [step,setStep]=useState("input"); // input | success
  const savedRef=useRef(false);
  const successMsg=SUCCESS_MSGS[Math.floor(Math.random()*SUCCESS_MSGS.length)];

  const handleSubmit=()=>{
    if(!output.trim())return;
    if(savedRef.current)return;
    savedRef.current=true;
    const sessions=load(SK.SESSIONS,[]);
    sessions.unshift({id:genId(),created_at:new Date().toISOString(),task_name:session.taskName,timer_duration_seconds:session.timerDuration,mode:session.mode,impact_statement:session.impact,status:"completed",time_elapsed_seconds:session.timerDuration,failure_reason:null,notes:session.notes||"",output_text:output.trim(),output_category:category});
    save(SK.SESSIONS,sessions);
    setStep("success");
  };

  const allSessions=load(SK.SESSIONS,[]);
  const stats=computeStats(allSessions);

  if(step==="input"){
    return(
      <div className="screen" style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:12}}>✓</div>
          <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:8}}>Session Complete</h2>
          <p style={{fontSize:14,color:"var(--text2)"}}>You focused for <strong style={{color:"var(--text)"}}>{formatTime(session.timerDuration)}</strong> on <strong style={{color:"var(--text)"}}>{session.taskName}</strong></p>
        </div>
        <div className="card card-accent">
          <div className="text-xs mb-8">WHAT DID YOU ACHIEVE? <span style={{color:"var(--danger)"}}>*</span></div>
          <textarea className="input" rows={4} placeholder="Describe what you actually accomplished in this session..." value={output} onChange={e=>setOutput(e.target.value)} style={{marginBottom:12}}/>
          <div className="text-xs mb-8">CATEGORY (optional)</div>
          <div className="chips mb-4">
            {OUTPUT_CATS.map(c=>(
              <div key={c} className={`chip chip-sm ${category===c?"selected":""}`} onClick={()=>setCategory(category===c?"":c)}>{c}</div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary mt-8" onClick={handleSubmit} disabled={!output.trim()}>
          {!output.trim()?"Fill in your achievement to continue":"Save and Continue"}
        </button>
        {!output.trim()&&<p className="text-xs mt-8" style={{textAlign:"center",color:"var(--text3)"}}>This field is required</p>}
      </div>
    );
  }

  return(
    <div className="success-screen">
      <Confetti active={true}/>
      <div className="success-circle">✓</div>
      <div className="success-title">Well Done.</div>
      <div className="success-sub">You focused for <strong>{formatTime(session.timerDuration)}</strong> on:</div>
      <div className="success-stat" style={{marginBottom:16}}>{session.taskName}</div>
      <div className="session-complete-wave" style={{maxWidth:280,margin:"12px auto"}}/>
      <p className="success-msg">"{successMsg}"</p>
      {stats.streak>0&&<div style={{marginBottom:20}}><div className="streak-badge">{stats.streak}-day streak</div></div>}
      <div className="card" style={{maxWidth:340,width:"100%",background:"rgba(0,0,0,0.06)",border:"1px solid #ddd",marginBottom:20}}>
        <div style={{fontFamily:"Syne",fontSize:12,fontWeight:700,color:"#666",marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"}}>Your Output</div>
        {category&&<span className="output-cat" style={{marginBottom:8,display:"inline-block"}}>{category}</span>}
        <p style={{fontSize:14,color:"#333",lineHeight:1.6}}>{output}</p>
      </div>
      <button className="btn" style={{background:"#0A0A0B",color:"#fff",width:"100%",maxWidth:320,fontFamily:"Syne",fontWeight:700,fontSize:15}} onClick={onDone}>Back to Dashboard</button>
    </div>
  );
}

// ─── PLAN SESSION ─────────────────────────────────────────────────────────────
function PlanSession({onSave,onCancel}){
  const [taskName,setTaskName]=useState("");
  const [customTask,setCustomTask]=useState("");
  const [duration,setDuration]=useState(25*60);
  const [impact,setImpact]=useState("");
  const [date,setDate]=useState(()=>{const d=new Date();return d.toISOString().split("T")[0];});
  const [time,setTime]=useState("09:00");
  const [mode,setMode]=useState("lockin");
  const task=SUGGESTED_TASKS.includes(taskName)?taskName:customTask.trim();

  const handleSave=()=>{
    if(!task||!impact.trim()||impact.trim().length<10)return;
    const plans=load(SK.PLANNED,[]);
    plans.push({id:genId(),task_name:task,timer_duration_seconds:duration,impact:impact.trim(),date,time,mode,created_at:new Date().toISOString()});
    save(SK.PLANNED,plans);onSave();
  };

  return(
    <div className="screen">
      <button className="btn btn-ghost btn-sm mb-16" onClick={onCancel} style={{width:"auto"}}>← Back</button>
      <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:6}}>Plan a Session</h2>
      <p className="text-sm mb-20">Schedule it now. Start it later with one tap.</p>

      <label className="label mb-8">TASK</label>
      <div className="chips mb-8" style={{maxHeight:120,overflowY:"auto"}}>
        {SUGGESTED_TASKS.map(t=>(
          <div key={t} className={`chip chip-sm ${taskName===t?"selected":""}`} onClick={()=>{setTaskName(t);setCustomTask("");}}>{t}</div>
        ))}
      </div>
      <input className="input mb-16" placeholder="Or type a custom task..." value={customTask} onChange={e=>{setCustomTask(e.target.value);setTaskName(e.target.value);}} style={{marginBottom:16}}/>

      <label className="label mb-8">DURATION</label>
      <div className="chips mb-16">
        {TIMER_PRESETS.map(p=><div key={p.value} className={`chip ${duration===p.value?"selected":""}`} onClick={()=>setDuration(p.value)}>{p.label}</div>)}
      </div>

      <label className="label mb-8">WHAT IS AT STAKE</label>
      <textarea className="input mb-16" rows={3} placeholder="What actually happens if I don't do this?" value={impact} onChange={e=>setImpact(e.target.value)}/>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label className="label mb-8">DATE</label>
          <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)}/>
        </div>
        <div>
          <label className="label mb-8">TIME</label>
          <input type="time" className="date-input" value={time} onChange={e=>setTime(e.target.value)}/>
        </div>
      </div>

      <label className="label mb-8">MODE</label>
      <div className="chips mb-24">
        {[["lockin","🔒 Lock-In"],["companion","👥 Companion"],["phonedown","📵 Phone-Down"]].map(([v,l])=>(
          <div key={v} className={`chip ${mode===v?"selected":""}`} onClick={()=>setMode(v)}>{l}</div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={!task||impact.trim().length<10}>Save Planned Session</button>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({onNewSession,onPlanSession,onStartPlanned,highlightPlanned}){
  const [sessions]=useState(()=>load(SK.SESSIONS,[]));
  const [planned,setPlanned]=useState(()=>load(SK.PLANNED,[]));
  const stats=computeStats(sessions);
  const completionPct=stats.total>0?Math.round((stats.completed/stats.total)*100):0;
  const todaySessions=sessions.filter(s=>getDayKey(new Date(s.created_at))===getDayKey());
  const recentOutputs=sessions.filter(s=>s.status==="completed"&&s.output_text).slice(0,3);
  const plannedRef=useRef(null);

  useEffect(()=>{
    if(highlightPlanned&&plannedRef.current){
      plannedRef.current.scrollIntoView({behavior:"smooth",block:"start"});
    }
  },[highlightPlanned]);

  const removePlan=(id)=>{const updated=planned.filter(p=>p.id!==id);setPlanned(updated);save(SK.PLANNED,updated);};

  return(
    <div className="screen">
      <div className="flex-between mb-20">
        <div>
          <h1 style={{fontFamily:"Syne",fontSize:28,fontWeight:800}}>Focus Contractor</h1>
          <p className="text-sm">Your commitment dashboard</p>
        </div>
        {stats.streak>0&&<div className="streak-badge">{stats.streak}-day streak</div>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <button className="btn btn-primary" style={{fontSize:15,padding:"16px"}} onClick={onNewSession}>+ New Session</button>
        <button className="btn btn-secondary" style={{fontSize:15,padding:"16px"}} onClick={onPlanSession}>Plan Session</button>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-num">{stats.total}</div><div className="stat-label">Total</div></div>
        <div className="stat-card" style={{borderColor:"rgba(71,255,179,0.3)"}}><div className="stat-num" style={{color:"var(--success)"}}>{stats.completed}</div><div className="stat-label">Completed</div></div>
        <div className="stat-card" style={{borderColor:"rgba(255,107,71,0.3)"}}><div className="stat-num" style={{color:"var(--danger)"}}>{stats.failed}</div><div className="stat-label">Failed</div></div>
      </div>

      {stats.total>0&&(
        <div className="card mb-20" style={{display:"flex",alignItems:"center",gap:20}}>
          <div className="pct-circle-wrap">
            <svg width={80} height={80}>
              <circle cx={40} cy={40} r={32} fill="none" stroke="var(--bg3)" strokeWidth={6}/>
              <circle cx={40} cy={40} r={32} fill="none" stroke={completionPct>=70?"var(--success)":completionPct>=40?"var(--accent)":"var(--danger)"} strokeWidth={6} strokeLinecap="round" strokeDasharray={2*Math.PI*32} strokeDashoffset={2*Math.PI*32*(1-completionPct/100)} transform="rotate(-90 40 40)"/>
            </svg>
            <div style={{position:"absolute",textAlign:"center"}}><div style={{fontFamily:"Syne",fontWeight:800,fontSize:18}}>{completionPct}%</div></div>
          </div>
          <div>
            <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,marginBottom:4}}>Completion Rate</div>
            <div className="text-sm">{completionPct>=70?"You are on a strong run. Keep it up.":completionPct>=40?"Building consistency. Try shorter sessions.":"Every session teaches you something."}</div>
          </div>
        </div>
      )}

      {planned.length>0&&(
        <>
          <div
            ref={plannedRef}
            className="label mb-12"
            style={{
              color: highlightPlanned?"var(--accent)":"var(--text2)",
              transition:"color 0.4s"
            }}
          >
            PLANNED SESSIONS {highlightPlanned&&<span style={{fontSize:10,background:"var(--accent)",color:"#000",borderRadius:20,padding:"1px 8px",marginLeft:6,fontFamily:"Syne",fontWeight:700}}>JUST ADDED</span>}
          </div>
          {planned.map((p,idx)=>(
            <div key={p.id} className={`plan-card ${highlightPlanned&&idx===planned.length-1?"plan-card-highlight":""}`}>
              <div className="plan-time">{p.date} at {p.time}</div>
              <div className="flex-between">
                <div>
                  <div className="plan-task">{p.task_name}</div>
                  <div className="plan-meta">{formatTime(p.timer_duration_seconds)} · {p.mode==="lockin"?"Lock-In":p.mode==="companion"?"Companion":"Phone-Down"}</div>
                  <div className="plan-impact">{p.impact.slice(0,60)}{p.impact.length>60?"...":""}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",marginLeft:12}}>
                  <button className="btn btn-primary btn-sm" style={{width:"auto",whiteSpace:"nowrap"}} onClick={()=>onStartPlanned(p)}>Start</button>
                  <button className="btn btn-ghost btn-sm" style={{width:"auto",padding:"4px 10px",fontSize:11}} onClick={()=>removePlan(p.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginBottom:8}}/>
        </>
      )}

      {todaySessions.length>0&&(
        <>
          <div className="label mb-12">TODAY</div>
          {todaySessions.slice(0,3).map(s=>(
            <div key={s.id} className="history-item">
              <div className="hi-top">
                <div className="hi-task">{s.task_name}</div>
                <div className={`badge ${s.status==="completed"?"badge-success":"badge-fail"}`}>{s.status==="completed"?"Done":"Failed"}</div>
              </div>
              <div className="hi-meta">{formatTime(s.time_elapsed_seconds)} focused — {s.mode} mode</div>
            </div>
          ))}
        </>
      )}

      {recentOutputs.length>0&&(
        <>
          <div className="label mt-16 mb-12">RECENT OUTPUTS</div>
          {recentOutputs.map(s=>(
            <div key={s.id} className="output-card">
              {s.output_category&&<span className="output-cat">{s.output_category}</span>}
              <div className="output-text">{s.output_text}</div>
              <div className="output-meta">{s.task_name} · {formatDate(s.created_at)}</div>
            </div>
          ))}
        </>
      )}

      {sessions.length===0&&planned.length===0&&(
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No sessions yet</div>
          <div className="empty-sub">Start or plan your first focus contract above.</div>
        </div>
      )}
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function HistoryScreen(){
  const [sessions]=useState(()=>load(SK.SESSIONS,[]));
  const [filter,setFilter]=useState("all");
  const [expanded,setExpanded]=useState(null);
  const filtered=sessions.filter(s=>filter==="all"?true:filter==="completed"?s.status==="completed":s.status==="failed");
  return(
    <div className="screen">
      <h2 style={{fontFamily:"Syne",fontSize:24,fontWeight:800,marginBottom:20}}>Session History</h2>
      <div className="chips mb-20">
        {["all","completed","failed"].map(f=>(
          <div key={f} className={`chip ${filter===f?"selected":""}`} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</div>
        ))}
      </div>
      {filtered.length===0
        ?<div className="empty-state"><div className="empty-icon">📂</div><div className="empty-title">No sessions here</div><div className="empty-sub">Your session history will appear once you start.</div></div>
        :filtered.map(s=>(
          <div key={s.id}>
            <div className="history-item" onClick={()=>setExpanded(expanded===s.id?null:s.id)}>
              <div className="hi-top">
                <div className="hi-task">{s.task_name}</div>
                <div className={`badge ${s.status==="completed"?"badge-success":"badge-fail"}`}>{s.status==="completed"?"Done":"Failed"}</div>
              </div>
              <div className="hi-meta">{formatDate(s.created_at)} — {formatTime(s.time_elapsed_seconds)} focused — {s.mode} mode{s.failure_reason?` — ${FAILURE_REASONS.find(r=>r.id===s.failure_reason)?.label}`:""}</div>
            </div>
            {expanded===s.id&&(
              <div className="card" style={{marginTop:-6,marginBottom:10,borderTopLeftRadius:0,borderTopRightRadius:0,borderTop:"none"}}>
                <div className="text-xs mb-8">AT STAKE:</div>
                <div className="impact-quote mb-12">{s.impact_statement}</div>
                {s.output_text&&<><div className="text-xs mb-4">OUTPUT:</div>{s.output_category&&<span className="output-cat mb-8">{s.output_category}</span>}<p style={{fontSize:13,color:"var(--text2)",marginTop:4}}>{s.output_text}</p></>}
                {s.notes&&<><div className="text-xs mt-12 mb-4">SESSION NOTES:</div><p style={{fontSize:12,color:"var(--text3)"}}>{s.notes}</p></>}
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────
function InsightsScreen(){
  const [sessions]=useState(()=>load(SK.SESSIONS,[]));
  const stats=computeStats(sessions);
  const completionPct=stats.total>0?Math.round((stats.completed/stats.total)*100):0;
  const topReason=Object.entries(stats.reasonTally).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];
  const maxReason=Math.max(...Object.values(stats.reasonTally),1);
  const durationInsights=Object.entries(stats.byDuration).map(([mins,data])=>{const total=data.completed+data.failed;return{mins:Number(mins),...data,total,pct:total>0?Math.round((data.completed/total)*100):0};}).sort((a,b)=>a.mins-b.mins);
  const insightMap={urge_to_check:"Try enabling Do Not Disturb before starting.",boredom:"Try breaking your task into smaller steps.",overwhelm:"Consider shorter 15-minute sessions.",physical:"Try finding a quieter space before your next session.",avoidance:"Start with just 10 minutes — momentum helps."};
  const maxCat=Math.max(...Object.values(stats.catTally),1);
  const topDuration=durationInsights.sort((a,b)=>b.pct-a.pct)[0];

  if(sessions.length===0)return(
    <div className="screen">
      <h2 style={{fontFamily:"Syne",fontSize:24,fontWeight:800,marginBottom:20}}>Insights</h2>
      <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div><div className="empty-sub">Complete a few sessions and your behavioral patterns will appear here.</div></div>
    </div>
  );

  return(
    <div className="screen">
      <h2 style={{fontFamily:"Syne",fontSize:24,fontWeight:800,marginBottom:20}}>Insights</h2>
      <div className="stats-row mb-20">
        <div className="stat-card"><div className="stat-num">{stats.total}</div><div className="stat-label">Sessions</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--accent)"}}>{completionPct}%</div><div className="stat-label">Completion</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--accent2)"}}>{stats.streak}</div><div className="stat-label">Streak</div></div>
      </div>

      {topReason&&(
        <div className="insight-callout mb-16">
          <p><strong>Pattern detected:</strong> You most often fail due to "{FAILURE_REASONS.find(r=>r.id===topReason[0])?.label}". {insightMap[topReason[0]]||""}</p>
        </div>
      )}
      {topDuration&&topDuration.total>=2&&(
        <div className="insight-callout mb-20">
          <p><strong>Best session length:</strong> Your {topDuration.mins}-minute sessions have a <strong>{topDuration.pct}% completion rate</strong>. Stick with what works.</p>
        </div>
      )}

      {stats.failed>0&&(
        <>
          <div className="label mb-12">FAILURE REASONS</div>
          <div className="card mb-20">
            <div className="bar-chart">
              {FAILURE_REASONS.map(r=>(
                <div key={r.id} className="bar-row">
                  <div className="bar-label">{r.label}</div>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${(stats.reasonTally[r.id]/maxReason)*100}%`}}/></div>
                  <div className="bar-count">{stats.reasonTally[r.id]}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {durationInsights.length>0&&(
        <>
          <div className="label mb-12">SESSION LENGTH</div>
          <div className="card mb-20">
            {durationInsights.map(d=>(
              <div key={d.mins} style={{marginBottom:14}}>
                <div className="flex-between mb-4">
                  <span style={{fontFamily:"Syne",fontWeight:700,fontSize:14}}>{d.mins} min</span>
                  <span style={{fontFamily:"DM Mono",fontSize:13,color:d.pct>=70?"var(--success)":d.pct>=40?"var(--accent)":"var(--danger)"}}>{d.pct}%</span>
                </div>
                <div className="bar-track" style={{height:6}}>
                  <div style={{height:"100%",borderRadius:4,background:d.pct>=70?"var(--success)":d.pct>=40?"var(--accent)":"var(--danger)",width:`${d.pct}%`,transition:"width 0.6s ease"}}/>
                </div>
                <div className="text-xs mt-4">{d.completed} completed, {d.failed} failed</div>
              </div>
            ))}
          </div>
        </>
      )}

      {Object.values(stats.catTally).some(v=>v>0)&&(
        <>
          <div className="label mb-12">OUTPUT CATEGORIES</div>
          <div className="card mb-20">
            <div className="bar-chart">
              {OUTPUT_CATS.map(c=>(
                <div key={c} className="bar-row">
                  <div className="bar-label">{c}</div>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${(stats.catTally[c]/maxCat)*100}%`,background:"var(--accent)"}}/></div>
                  <div className="bar-count">{stats.catTally[c]}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="card" style={{textAlign:"center"}}>
        <div style={{fontFamily:"Syne",fontWeight:800,fontSize:36,color:"var(--accent2)"}}>{stats.streak}</div>
        <div style={{fontFamily:"Syne",fontWeight:700,marginBottom:4}}>Day Streak</div>
        <div className="text-sm">Consecutive days with at least 1 completed session</div>
      </div>
    </div>
  );
}

// ─── NAV ICONS ────────────────────────────────────────────────────────────────
const HomeIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const HistoryIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const InsightIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [onboarded,setOnboarded]=useState(()=>load(SK.ONBOARDED,false));
  const [tab,setTab]=useState("home");
  const [setupStep,setSetupStep]=useState(null);
  const [sessionDraft,setSessionDraft]=useState({});
  const [activeSession,setActiveSession]=useState(null);
  const [sessionOutcome,setSessionOutcome]=useState(null);
  const [showPlan,setShowPlan]=useState(false);
  const [highlightPlanned,setHighlightPlanned]=useState(false);

  const finishOnboard=()=>save(SK.ONBOARDED,true);

  const handleOnboardStartNow=()=>{finishOnboard();setOnboarded(true);setSetupStep("task");};
  const handleOnboardPlanFirst=()=>{finishOnboard();setOnboarded(true);setShowPlan(true);};

  const handleNewSession=()=>{setSessionDraft({});setSetupStep("task");};
  const handleStartPlanned=(plan)=>{
    setSessionDraft({taskName:plan.task_name,timerDuration:plan.timer_duration_seconds,impact:plan.impact,mode:plan.mode});
    setSetupStep("review");
    const updated=load(SK.PLANNED,[]).filter(p=>p.id!==plan.id);
    save(SK.PLANNED,updated);
  };
  const handleSessionStart=()=>{setSetupStep(null);setActiveSession({...sessionDraft});};
  const handleSessionComplete=useCallback((elapsed,notes)=>{setActiveSession(null);setSessionOutcome({type:"success",elapsed,notes});},[]);
  const handleSessionFail=useCallback((elapsed,notes)=>{setActiveSession(null);setSessionOutcome({type:"fail",elapsed,notes});},[]);
  const handleOutcomeDone=()=>{setSessionOutcome(null);setTab("home");};

  const handlePlanSaved=()=>{
    setShowPlan(false);
    setHighlightPlanned(true);
    setTimeout(()=>setHighlightPlanned(false),3000);
  };

  if(!onboarded)return(<><style>{CSS}</style><Onboarding onStartNow={handleOnboardStartNow} onPlanFirst={handleOnboardPlanFirst}/></>);
  if(activeSession)return(<><style>{CSS}</style><FocusSession session={activeSession} onComplete={handleSessionComplete} onFail={handleSessionFail}/></>);

  if(sessionOutcome)return(
    <><style>{CSS}</style>
    {sessionOutcome.type==="success"
      ?<CompletionScreen session={{...sessionDraft,notes:sessionOutcome.notes}} onDone={handleOutcomeDone}/>
      :<div className="app"><FailureScreen session={{...sessionDraft,elapsed:sessionOutcome.elapsed,notes:sessionOutcome.notes}} onRestart={()=>{setSessionOutcome(null);handleNewSession();}} onDashboard={handleOutcomeDone}/></div>
    }</>
  );

  if(showPlan)return(<><style>{CSS}</style><div className="app"><PlanSession onSave={handlePlanSaved} onCancel={()=>setShowPlan(false)}/></div></>);

  if(setupStep)return(
    <><style>{CSS}</style>
    <div className="app">
      {setupStep==="task"&&<Step1_Task prefill={sessionDraft.taskName} onNext={t=>{setSessionDraft(d=>({...d,taskName:t}));setSetupStep("timer");}}/>}
      {setupStep==="timer"&&<Step2_Timer prefill={sessionDraft.timerDuration} onNext={d=>{setSessionDraft(s=>({...s,timerDuration:d}));setSetupStep("impact");}} onBack={()=>setSetupStep("task")}/>}
      {setupStep==="impact"&&<Step3_Impact prefill={sessionDraft.impact} onNext={i=>{setSessionDraft(d=>({...d,impact:i}));setSetupStep("mode");}} onBack={()=>setSetupStep("timer")}/>}
      {setupStep==="mode"&&<Step4_Mode prefill={sessionDraft.mode} onNext={m=>{setSessionDraft(d=>({...d,mode:m}));setSetupStep("review");}} onBack={()=>setSetupStep("impact")}/>}
      {setupStep==="review"&&<ContractReview session={sessionDraft} onStart={handleSessionStart} onBack={()=>setSetupStep("mode")}/>}
    </div></>
  );

  return(
    <><style>{CSS}</style>
    <div className="app">
      {tab==="home"&&<Dashboard onNewSession={handleNewSession} onPlanSession={()=>setShowPlan(true)} onStartPlanned={handleStartPlanned} highlightPlanned={highlightPlanned}/>}
      {tab==="history"&&<HistoryScreen/>}
      {tab==="insights"&&<InsightsScreen/>}
      <nav className="bottom-nav">
        <button className={`nav-btn ${tab==="home"?"active":""}`} onClick={()=>setTab("home")}><HomeIcon/>Home</button>
        <button className={`nav-btn ${tab==="history"?"active":""}`} onClick={()=>setTab("history")}><HistoryIcon/>History</button>
        <button className={`nav-btn ${tab==="insights"?"active":""}`} onClick={()=>setTab("insights")}><InsightIcon/>Insights</button>
      </nav>
    </div></>
  );
}
