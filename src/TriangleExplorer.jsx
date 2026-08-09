import React, { useState, useRef, useEffect, useCallback } from "react";
import { Star, RotateCcw, Sparkles, HelpCircle, X, Volume2, VolumeX, Target, Check } from "lucide-react";

/* ---------------------------------------------------------------
   DATA
--------------------------------------------------------------- */
const PX_PER_CM = 25;
const SIDE_TYPES = ["equilateral", "isosceles", "scalene"];
const ANGLE_TYPES = ["right", "acute", "obtuse"];
const ALL_TYPES = [...SIDE_TYPES, ...ANGLE_TYPES];

const TYPE_COLORS = {
  equilateral: "#22A559",
  isosceles: "#2F80ED",
  scalene: "#F2994A",
  right: "#9B51E0",
  obtuse: "#EB5757",
  acute: "#F2C94C",
};

const TYPE_LABELS = {
  equilateral: "Equilateral",
  isosceles: "Isosceles",
  scalene: "Scalene",
  right: "Right",
  obtuse: "Obtuse",
  acute: "Acute",
};

const TYPE_EXPLANATIONS = {
  equilateral: ["All three sides are equal.", "All three angles are equal — each one is 60°.", "This triangle is perfectly balanced."],
  isosceles: ["Two sides have the same length.", "Two angles are equal too."],
  scalene: ["Every side has a different length.", "Every angle is different too."],
  right: ["One angle is exactly 90°.", "Used whenever something stands perfectly upright."],
  acute: ["Every angle is less than 90°.", "It looks sharp and balanced."],
  obtuse: ["One angle is bigger than 90°.", "It looks wider than other triangles."],
};

const TYPE_REAL_LIFE = {
  equilateral: { icons: ["⛺", "⚠️", "🔺"], items: ["Camping tent", "Yield road sign", "Decorative patterns"], note: "Engineers love equilateral triangles because they spread forces evenly." },
  isosceles: { icons: ["🏠", "✈️", "⛺"], items: ["House roof", "Airplane wings", "Tent"], note: "Equal sides help buildings stay balanced." },
  scalene: { icons: ["🌉", "🗼", "🛤️"], items: ["Bridges", "Towers", "Road structures"], note: "Different side lengths help engineers fit unusual spaces." },
  right: { icons: ["🪜", "📐", "🏗️"], items: ["Ladder", "Carpenter square", "Building frames"], note: "Builders use right triangles to make perfect corners." },
  acute: { icons: ["🎨", "📱", "🌟"], items: ["Art", "Logos", "Decorations"], note: "Acute triangles make designs look sharp and exciting." },
  obtuse: { icons: ["🛶", "🏟️", "🎭"], items: ["Boat sails", "Roof supports", "Modern architecture"], note: "Obtuse triangles create wider, sturdier structures." },
};

const FUN_FACTS = [
  "The strongest bridges often use hundreds of triangles!",
  "The Eiffel Tower is full of triangles.",
  "A triangle cannot change shape without changing its side lengths — that's why builders trust it.",
  "The angles inside any triangle always add up to 180°, no matter its shape.",
  "Ancient Egyptians used rope triangles to make perfect right angles for the pyramids.",
  "A triangle is the only shape that can't be pushed out of shape without bending a side.",
];

const QUIZ_QUESTIONS = [
  { q: "Which triangle has three equal sides?", options: ["Scalene", "Right", "Equilateral"], answer: 2 },
  { q: "A triangle with one 90° angle is called a...", options: ["Acute triangle", "Right triangle", "Obtuse triangle"], answer: 1 },
  { q: "If every angle is less than 90°, the triangle is...", options: ["Acute", "Obtuse", "Isosceles"], answer: 0 },
  { q: "A triangle with two equal sides is called...", options: ["Equilateral", "Isosceles", "Scalene"], answer: 1 },
  { q: "Which triangle looks the widest, with one angle bigger than 90°?", options: ["Right", "Obtuse", "Acute"], answer: 1 },
  { q: "A triangle where every side is a different length is called...", options: ["Equilateral", "Isosceles", "Scalene"], answer: 2 },
];

/* ---------------------------------------------------------------
   GEOMETRY HELPERS
--------------------------------------------------------------- */
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

const angleAt = (v, b, c) => {
  const vb = dist(v, b), vc = dist(v, c), bc = dist(b, c);
  let cosV = (vb * vb + vc * vc - bc * bc) / (2 * vb * vc);
  cosV = Math.max(-1, Math.min(1, cosV));
  return (Math.acos(cosV) * 180) / Math.PI;
};

const classifySides = (ab, bc, ca) => {
  const tol = 10;
  const arr = [ab, bc, ca];
  if (Math.max(...arr) - Math.min(...arr) < tol) return "equilateral";
  if (Math.abs(ab - bc) < tol || Math.abs(bc - ca) < tol || Math.abs(ca - ab) < tol) return "isosceles";
  return "scalene";
};

const classifyAngles = (a, b, c) => {
  const tol = 4;
  const arr = [a, b, c];
  if (arr.some((x) => Math.abs(x - 90) < tol)) return "right";
  if (arr.some((x) => x > 90 + tol)) return "obtuse";
  return "acute";
};

const offset = (pt, centroid, amt) => {
  const dx = pt.x - centroid.x, dy = pt.y - centroid.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: pt.x + (dx / len) * amt, y: pt.y + (dy / len) * amt };
};

const inward = (pt, centroid, amt) => {
  const dx = centroid.x - pt.x, dy = centroid.y - pt.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: pt.x + (dx / len) * amt, y: pt.y + (dy / len) * amt };
};

const INITIAL_POINTS = { A: { x: 150, y: 110 }, B: { x: 460, y: 150 }, C: { x: 270, y: 350 } };

const withArticle = (label) => (["A", "E", "I", "O", "U"].includes(label[0]) ? "an " : "a ") + label;

const WHY_IMPORTANT = {
  equilateral: "Spreads force evenly, so it's used wherever builders need extra strength.",
  isosceles: "Balances weight on both sides, great for roofs and wings.",
  scalene: "Fits into odd, uneven spaces where nothing is symmetric.",
  right: "Makes a perfect square corner — the basis of almost every building.",
  acute: "Sharp and pointy — great for eye-catching designs and logos.",
  obtuse: "Wide and open — used where a shape needs to spread out.",
};

/* ---------------------------------------------------------------
   COMPONENT
--------------------------------------------------------------- */
export default function TriangleExplorer() {
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [dragging, setDragging] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [achieved, setAchieved] = useState(new Set());
  const [stars, setStars] = useState(0);
  const [challenge, setChallenge] = useState(null);
  const [celebrating, setCelebrating] = useState(null);
  const [factIndex, setFactIndex] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState(null);
  const [introOpen, setIntroOpen] = useState(true);

  const svgRef = useRef(null);
  const audioCtxRef = useRef(null);
  const prevTypeRef = useRef("");

  const { A, B, C } = points;
  const AB = dist(A, B), BC = dist(B, C), CA = dist(C, A);
  const angA = angleAt(A, B, C), angB = angleAt(B, A, C), angC = angleAt(C, A, B);
  const sideType = classifySides(AB, BC, CA);
  const angleType = classifyAngles(angA, angB, angC);
  const centroid = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };

  /* ---------- sound ---------- */
  const getCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };
  const playTone = useCallback((freq, dur, type, vol, delay = 0) => {
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) {}
  }, [soundOn]);
  const playPop = useCallback(() => playTone(520, 0.1, "sine", 0.12), [playTone]);
  const playSparkle = useCallback(() => {
    playTone(880, 0.12, "triangle", 0.13, 0);
    playTone(1180, 0.14, "triangle", 0.13, 0.1);
    playTone(1560, 0.18, "triangle", 0.13, 0.2);
  }, [playTone]);
  const playClick = useCallback(() => playTone(320, 0.05, "square", 0.06), [playTone]);

  /* ---------- track discovered types + pop sound ---------- */
  useEffect(() => {
    setAchieved((prev) => {
      if (prev.has(sideType) && prev.has(angleType)) return prev;
      const next = new Set(prev);
      next.add(sideType);
      next.add(angleType);
      return next;
    });
    const cur = sideType + "-" + angleType;
    if (prevTypeRef.current && prevTypeRef.current !== cur) playPop();
    prevTypeRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideType, angleType]);

  /* ---------- challenge check ---------- */
  useEffect(() => {
    if (!challenge) return;
    const matched = SIDE_TYPES.includes(challenge) ? sideType === challenge : angleType === challenge;
    if (matched) {
      setStars((s) => s + 10);
      setCelebrating(challenge);
      setChallenge(null);
      playSparkle();
      const t = setTimeout(() => setCelebrating(null), 2600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideType, angleType, challenge]);

  /* ---------- dragging ---------- */
  const toSvgPoint = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const handlePointerDown = (key) => (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setDragging(key);
  };

  const handlePointerMove = (key) => (e) => {
    if (dragging !== key) return;
    e.preventDefault();
    const svgP = toSvgPoint(e);
    const x = Math.max(28, Math.min(572, svgP.x));
    const y = Math.max(28, Math.min(392, svgP.y));
    setPoints((prev) => {
      const candidate = { x, y };
      const others = Object.keys(prev).filter((k) => k !== key).map((k) => prev[k]);
      if (others.some((o) => dist(candidate, o) < 26)) return prev;
      return { ...prev, [key]: candidate };
    });
  };

  const handlePointerUp = (key) => (e) => {
    if (dragging === key) setDragging(null);
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  /* ---------- actions ---------- */
  const resetTriangle = () => { setPoints(INITIAL_POINTS); playClick(); };

  const newChallenge = () => {
    playClick();
    let pick;
    do { pick = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)]; } while (pick === challenge);
    setChallenge(pick);
    setCelebrating(null);
  };

  const newFact = () => {
    playClick();
    let idx;
    do { idx = Math.floor(Math.random() * FUN_FACTS.length); } while (idx === factIndex && FUN_FACTS.length > 1);
    setFactIndex(idx);
  };

  const openQuiz = () => {
    playClick();
    setQuizIndex(Math.floor(Math.random() * QUIZ_QUESTIONS.length));
    setQuizSelected(null);
    setQuizOpen(true);
  };
  const nextQuizQuestion = () => {
    let idx;
    do { idx = Math.floor(Math.random() * QUIZ_QUESTIONS.length); } while (idx === quizIndex && QUIZ_QUESTIONS.length > 1);
    setQuizIndex(idx);
    setQuizSelected(null);
  };
  const answerQuiz = (i) => {
    const correct = i === QUIZ_QUESTIONS[quizIndex].answer;
    setQuizSelected(i);
    if (correct) playSparkle(); else playTone(180, 0.15, "sawtooth", 0.08);
  };

  /* ---------- derived visuals ---------- */
  const sideColor = TYPE_COLORS[sideType];
  const angleColor = TYPE_COLORS[angleType];
  const midAB = offset({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, centroid, 20);
  const midBC = offset({ x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }, centroid, 20);
  const midCA = offset({ x: (C.x + A.x) / 2, y: (C.y + A.y) / 2 }, centroid, 20);
  const labA = inward(A, centroid, 30);
  const labB = inward(B, centroid, 30);
  const labC = inward(C, centroid, 30);
  const missionCount = ALL_TYPES.filter((t) => achieved.has(t)).length;

  const vertexHandle = (key, p, color) => (
    <g
      key={key}
      style={{ cursor: "grab", touchAction: "none" }}
      onPointerDown={handlePointerDown(key)}
      onPointerMove={handlePointerMove(key)}
      onPointerUp={handlePointerUp(key)}
    >
      <circle cx={p.x} cy={p.y} r={dragging === key ? 20 : 16} fill={color} stroke="#16324F" strokeWidth="3" className={dragging === key ? "tex-vertex tex-vertex-active" : "tex-vertex"} />
      <circle cx={p.x} cy={p.y} r="5" fill="#16324F" opacity="0.6" />
    </g>
  );

  return (
    <div className="tex-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&display=swap');
        .tex-root {
          --ink:#16324F; --ink-soft:#4A6485; --bg:#EAF6FF; --paper:#FFFFFF; --grid:#D6EBFB;
          --equilateral:#22A559; --isosceles:#2F80ED; --scalene:#F2994A; --right:#9B51E0; --obtuse:#EB5757; --acute:#F2C94C;
          font-family:'Nunito',ui-sans-serif,system-ui,sans-serif; color:var(--ink);
          background: radial-gradient(circle at 15% 0%, #F6FCFF 0%, var(--bg) 55%);
          border-radius: 28px; padding: 22px; max-width: 1180px; margin: 0 auto; box-sizing:border-box;
        }
        .tex-root * { box-sizing: border-box; }
        .tex-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
        .tex-title { font-family:'Fredoka',ui-rounded,sans-serif; font-size:30px; font-weight:700; margin:0; letter-spacing:0.2px; }
        .tex-subtitle { margin:2px 0 0; color:var(--ink-soft); font-weight:700; font-size:14px; }
        .tex-sound-btn { background:var(--paper); border:2.5px solid var(--ink); border-radius:14px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
        .tex-sound-btn:hover { transform: translateY(-1px); }
        .tex-grid { display:grid; grid-template-columns: 240px 1fr 280px; gap:18px; align-items:start; }
        @media (max-width: 980px) { .tex-grid { grid-template-columns: 1fr; } .tex-order-canvas{order:-1;} }
        .tex-panel { background:var(--paper); border:2.5px solid var(--ink); border-radius:20px; padding:16px; }
        .tex-panel h2 { font-family:'Fredoka',ui-rounded,sans-serif; font-size:16px; margin:0 0 10px; }
        .tex-panel h2:not(:first-child) { margin-top:18px; }
        .tex-chip-list { display:flex; flex-direction:column; gap:8px; }
        .tex-chip { display:flex; align-items:center; gap:8px; border-radius:12px; padding:7px 10px; font-weight:800; font-size:13px; border:2px solid var(--ink); opacity:0.45; transition: all .25s; }
        .tex-chip.on { opacity:1; box-shadow: 2px 2px 0 var(--ink); }
        .tex-chip-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
        .tex-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'Fredoka',sans-serif; font-weight:600; font-size:14px; padding:11px; border-radius:14px; border:2.5px solid var(--ink); background:#FFF; cursor:pointer; margin-top:9px; transition: transform .15s; }
        .tex-btn:hover { transform: translateY(-2px); }
        .tex-btn:active { transform: translateY(0); }
        .tex-btn-primary { background: var(--ink); color:#fff; }
        .tex-canvas-card { border:2.5px solid var(--ink); border-radius:22px; padding:14px; position:relative; overflow:hidden; transition: background-color .6s ease; }
        .tex-tolerance-note { font-size:11.5px; font-weight:700; color:var(--ink-soft); margin:0 0 8px; }
        .tex-intro { background:var(--paper); border:2.5px solid var(--ink); border-radius:20px; padding:16px 18px; margin-bottom:18px; }
        .tex-intro-head { display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
        .tex-intro-head h2 { font-family:'Fredoka',sans-serif; font-size:18px; margin:0; }
        .tex-intro-toggle { background:#fff; border:2px solid var(--ink); border-radius:10px; padding:4px 10px; font-weight:800; font-size:12px; cursor:pointer; }
        .tex-intro-sub { font-size:12.5px; color:var(--ink-soft); font-weight:700; margin:2px 0 12px; }
        .tex-intro-groups { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
        @media (max-width: 700px) { .tex-intro-groups { grid-template-columns: 1fr; } }
        .tex-intro-group-title { font-family:'Fredoka',sans-serif; font-size:14px; margin:0 0 8px; color:var(--ink-soft); }
        .tex-intro-cards { display:flex; flex-direction:column; gap:8px; }
        .tex-intro-card { border:2.5px solid var(--ink); border-radius:14px; padding:9px 12px; display:flex; gap:10px; align-items:flex-start; }
        .tex-intro-dot { width:14px; height:14px; border-radius:50%; margin-top:3px; flex-shrink:0; }
        .tex-intro-card-title { font-family:'Fredoka',sans-serif; font-weight:600; font-size:13.5px; margin:0 0 2px; }
        .tex-intro-card-def { font-size:12px; font-weight:700; color:var(--ink); margin:0 0 2px; }
        .tex-intro-card-why { font-size:11.5px; font-weight:700; color:var(--ink-soft); margin:0; }
        .tex-badge-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; position:relative; z-index:2; }
        .tex-badge { font-family:'Fredoka',sans-serif; font-weight:600; color:#fff; padding:6px 14px; border-radius:999px; font-size:14px; border:2px solid rgba(0,0,0,0.15); }
        .tex-vertex { transition: r .15s ease; filter: drop-shadow(0 3px 3px rgba(0,0,0,0.25)); }
        .tex-vertex-active { filter: drop-shadow(0 0 10px rgba(255,255,255,0.9)); }
        .tex-side-label, .tex-angle-label { font-family:'Nunito',sans-serif; font-weight:800; font-size:14px; fill:var(--ink); }
        .tex-angle-label { font-size:12px; }
        .tex-tri { transition: fill .4s ease, stroke .4s ease; }
        .tex-banner { position:absolute; left:14px; right:14px; bottom:14px; border-radius:16px; padding:10px 14px; font-weight:800; font-family:'Fredoka',sans-serif; display:flex; align-items:center; gap:8px; z-index:3; border:2.5px solid var(--ink); animation: tex-pop .35s ease; }
        .tex-banner-challenge { background:#FFF7DA; }
        .tex-banner-celebrate { background:#DFF7E4; }
        @keyframes tex-pop { from { transform: scale(0.85) translateY(8px); opacity:0; } to { transform: scale(1) translateY(0); opacity:1; } }
        .tex-fact-box { background:#FFF7DA; border:2px solid var(--ink); border-radius:14px; padding:10px 12px; font-size:13px; font-weight:700; line-height:1.4; }
        .tex-explain-list { margin:0; padding-left:18px; font-size:13.5px; line-height:1.55; font-weight:700; color:var(--ink-soft); }
        .tex-real-life { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
        .tex-real-life-icons { font-size:22px; letter-spacing:4px; }
        .tex-real-life-note { font-size:12.5px; color:var(--ink-soft); font-weight:700; line-height:1.4; }
        .tex-real-life-items { font-size:12.5px; font-weight:800; }
        .tex-footer { margin-top:18px; background:var(--paper); border:2.5px solid var(--ink); border-radius:20px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .tex-stars { display:flex; align-items:center; gap:4px; }
        .tex-progress-row { display:flex; gap:6px; flex-wrap:wrap; }
        .tex-progress-chip { font-size:12px; font-weight:800; padding:5px 9px; border-radius:999px; border:2px solid var(--ink); display:flex; align-items:center; gap:4px; }
        .tex-progress-chip.done { color:#fff; }
        .tex-modal-overlay { position:fixed; inset:0; background:rgba(22,50,79,0.55); display:flex; align-items:center; justify-content:center; z-index:50; padding:16px; }
        .tex-modal { background:#fff; border:3px solid var(--ink); border-radius:22px; padding:22px; max-width:420px; width:100%; position:relative; }
        .tex-modal-close { position:absolute; top:12px; right:12px; background:none; border:none; cursor:pointer; }
        .tex-quiz-q { font-family:'Fredoka',sans-serif; font-weight:600; font-size:17px; margin:4px 0 14px; }
        .tex-quiz-opt { width:100%; text-align:left; padding:10px 14px; border-radius:12px; border:2.5px solid var(--ink); background:#fff; font-weight:800; font-size:14px; margin-bottom:8px; cursor:pointer; }
        .tex-quiz-opt.correct { background:#DFF7E4; }
        .tex-quiz-opt.wrong { background:#FBE1E1; }
      `}</style>

      <div className="tex-header">
        <div>
          <p className="tex-title">🔺 Triangle Explorer</p>
          <p className="tex-subtitle">Build, Discover &amp; Learn</p>
        </div>
        <button className="tex-sound-btn" onClick={() => setSoundOn((s) => !s)} title="Toggle sound">
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <div className="tex-intro">
        <div className="tex-intro-head" onClick={() => setIntroOpen((o) => !o)}>
          <h2>📘 Learn the Triangle Types First</h2>
          <span className="tex-intro-toggle">{introOpen ? "Hide" : "Show"}</span>
        </div>
        <p className="tex-intro-sub">Every triangle has TWO names at once — one for its sides, one for its angles. Try dragging below to see both change together!</p>
        {introOpen && (
          <div className="tex-intro-groups">
            <div>
              <p className="tex-intro-group-title">By SIDES — how long each side is</p>
              <div className="tex-intro-cards">
                {SIDE_TYPES.map((t) => (
                  <div key={t} className="tex-intro-card" style={{ borderColor: TYPE_COLORS[t] }}>
                    <span className="tex-intro-dot" style={{ background: TYPE_COLORS[t] }} />
                    <div>
                      <p className="tex-intro-card-title">{TYPE_LABELS[t]}</p>
                      <p className="tex-intro-card-def">{TYPE_EXPLANATIONS[t][0]}</p>
                      <p className="tex-intro-card-why">Why it matters: {WHY_IMPORTANT[t]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="tex-intro-group-title">By ANGLES — how sharp or wide the corners are</p>
              <div className="tex-intro-cards">
                {ANGLE_TYPES.map((t) => (
                  <div key={t} className="tex-intro-card" style={{ borderColor: TYPE_COLORS[t] }}>
                    <span className="tex-intro-dot" style={{ background: TYPE_COLORS[t] }} />
                    <div>
                      <p className="tex-intro-card-title">{TYPE_LABELS[t]}</p>
                      <p className="tex-intro-card-def">{TYPE_EXPLANATIONS[t][0]}</p>
                      <p className="tex-intro-card-why">Why it matters: {WHY_IMPORTANT[t]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="tex-grid">
        {/* LEFT PANEL */}
        <div className="tex-panel">
          <h2>Triangle Types</h2>
          <div className="tex-chip-list">
            {ALL_TYPES.map((t) => (
              <div key={t} className={"tex-chip" + ((sideType === t || angleType === t) ? " on" : "")} style={{ borderColor: TYPE_COLORS[t] }}>
                <span className="tex-chip-dot" style={{ background: TYPE_COLORS[t] }} />
                {TYPE_LABELS[t]}
              </div>
            ))}
          </div>
          <h2>Controls</h2>
          <button className="tex-btn" onClick={resetTriangle}><RotateCcw size={16} /> Reset Triangle</button>
          <button className="tex-btn" onClick={newChallenge}><Target size={16} /> New Challenge</button>
          <button className="tex-btn tex-btn-primary" onClick={openQuiz}><HelpCircle size={16} /> Quiz Me!</button>
        </div>

        {/* CENTER CANVAS */}
        <div className="tex-order-canvas tex-canvas-card" style={{ backgroundColor: angleColor + "18" }}>
          <div className="tex-badge-row">
            <span className="tex-badge" style={{ background: sideColor }}>{TYPE_LABELS[sideType]}</span>
            <span className="tex-badge" style={{ background: angleColor }}>{TYPE_LABELS[angleType]}</span>
          </div>
          <p className="tex-tolerance-note">📏 Just like a real ruler, tiny differences still count — sides within ~0.4 cm or angles within ~4° are treated as equal.</p>
          <svg ref={svgRef} viewBox="0 0 600 420" style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}>
            <defs>
              <pattern id="texGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M30 0 H0 V30" fill="none" stroke="#D6EBFB" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="600" height="420" fill="url(#texGrid)" rx="16" />

            <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} className="tex-tri" fill={angleColor + "33"} stroke={sideColor} strokeWidth="4" strokeLinejoin="round" />

            <text x={midAB.x} y={midAB.y} textAnchor="middle" className="tex-side-label">{(AB / PX_PER_CM).toFixed(1)} cm</text>
            <text x={midBC.x} y={midBC.y} textAnchor="middle" className="tex-side-label">{(BC / PX_PER_CM).toFixed(1)} cm</text>
            <text x={midCA.x} y={midCA.y} textAnchor="middle" className="tex-side-label">{(CA / PX_PER_CM).toFixed(1)} cm</text>

            <text x={labA.x} y={labA.y} textAnchor="middle" className="tex-angle-label">{angA.toFixed(0)}°</text>
            <text x={labB.x} y={labB.y} textAnchor="middle" className="tex-angle-label">{angB.toFixed(0)}°</text>
            <text x={labC.x} y={labC.y} textAnchor="middle" className="tex-angle-label">{angC.toFixed(0)}°</text>

            {vertexHandle("A", A, "#EB5757")}
            {vertexHandle("B", B, "#2F80ED")}
            {vertexHandle("C", C, "#22A559")}
          </svg>

          {challenge && !celebrating && (
            <div className="tex-banner tex-banner-challenge">
              <Target size={18} /> Can you make {withArticle(TYPE_LABELS[challenge])} triangle?
            </div>
          )}
          {celebrating && (
            <div className="tex-banner tex-banner-celebrate">
              <Sparkles size={18} /> Challenge complete — {withArticle(TYPE_LABELS[celebrating])}! You actually built {withArticle(TYPE_LABELS[sideType])} + <b>{TYPE_LABELS[angleType]}</b> triangle (that's both a side-type and an angle-type at once). +10 ⭐
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="tex-panel">
          <h2>What's happening?</h2>
          <ul className="tex-explain-list">
            {[...TYPE_EXPLANATIONS[sideType], ...TYPE_EXPLANATIONS[angleType]].map((line, i) => <li key={i}>{line}</li>)}
          </ul>

          <h2>Real Life</h2>
          <div className="tex-real-life">
            <div className="tex-real-life-icons">{TYPE_REAL_LIFE[sideType].icons.join("  ")}</div>
            <div className="tex-real-life-items">{TYPE_REAL_LIFE[sideType].items.join(" · ")}</div>
            <div className="tex-real-life-note">{TYPE_REAL_LIFE[sideType].note}</div>
          </div>
          <div className="tex-real-life">
            <div className="tex-real-life-icons">{TYPE_REAL_LIFE[angleType].icons.join("  ")}</div>
            <div className="tex-real-life-items">{TYPE_REAL_LIFE[angleType].items.join(" · ")}</div>
            <div className="tex-real-life-note">{TYPE_REAL_LIFE[angleType].note}</div>
          </div>

          <h2>💡 Fun Fact</h2>
          <div className="tex-fact-box">{FUN_FACTS[factIndex]}</div>
          <button className="tex-btn" onClick={newFact}><Sparkles size={16} /> New Fact</button>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="tex-footer">
        <div className="tex-stars">
          {Array.from({ length: 6 }).map((_, i) => (
            <Star key={i} size={22} fill={i < missionCount ? "#F2C94C" : "none"} color={i < missionCount ? "#F2C94C" : "#B9CBDB"} strokeWidth={2} />
          ))}
          <span style={{ fontWeight: 800, marginLeft: 8, fontSize: 13 }}>Mission {missionCount}/6 &nbsp;•&nbsp; {stars} pts</span>
        </div>
        <div className="tex-progress-row">
          {ALL_TYPES.map((t) => (
            <span key={t} className={"tex-progress-chip" + (achieved.has(t) ? " done" : "")} style={achieved.has(t) ? { background: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] } : {}}>
              {achieved.has(t) ? <Check size={12} /> : null} {TYPE_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      {/* QUIZ MODAL */}
      {quizOpen && (
        <div className="tex-modal-overlay" onClick={() => setQuizOpen(false)}>
          <div className="tex-modal" onClick={(e) => e.stopPropagation()}>
            <button className="tex-modal-close" onClick={() => setQuizOpen(false)}><X size={20} /></button>
            <p style={{ fontFamily: "Fredoka,sans-serif", fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 4px", fontSize: 13 }}>QUIZ</p>
            <p className="tex-quiz-q">{QUIZ_QUESTIONS[quizIndex].q}</p>
            {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => {
              let cls = "tex-quiz-opt";
              if (quizSelected !== null) {
                if (i === QUIZ_QUESTIONS[quizIndex].answer) cls += " correct";
                else if (i === quizSelected) cls += " wrong";
              }
              return <button key={i} className={cls} onClick={() => answerQuiz(i)} disabled={quizSelected !== null}>{opt}</button>;
            })}
            {quizSelected !== null && (
              <button className="tex-btn tex-btn-primary" onClick={nextQuizQuestion}>Next Question →</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

