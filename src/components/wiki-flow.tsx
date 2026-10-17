"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, AudioLines, Check, ChevronRight, CircleHelp, Cpu, ExternalLink, FlaskConical, Globe2, Maximize2, Minimize2, Pause, Play, Radio, RotateCw, Shapes, Sparkles, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { categories, type RoutedEdit } from "@/lib/types";
import { useWikiFlow, type DecisionExchange, type Flight } from "@/lib/use-wiki-flow";
import { INPUT_TRAVEL_MS, OUTPUT_TRAVEL_MS, SAMPLE_INTERVAL_MS, TOPIC_QUESTION } from "@/lib/decision-config";

const CATEGORY_ICONS = { technology: Cpu, science: FlaskConical, culture: Shapes, other: Globe2 };
const ROW_Y = [104, 214, 324, 434];
const IN_Y = [138, 228, 318, 408];

function routePath(index: number) {
  return `M 716 260 C 825 260, 842 ${ROW_Y[index]}, 979 ${ROW_Y[index]}`;
}
function inputPath(index: number) {
  return `M 355 ${IN_Y[index]} C 453 ${IN_Y[index]}, 469 260, 562 260`;
}
function bezier(a: number, b: number, c: number, d: number, t: number) {
  return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
}

function Packet({ flight, onComplete, reduced }: { flight: Flight; onComplete: (id: string) => void; reduced: boolean | null }) {
  const index = categories.findIndex((category) => category.id === flight.category);
  const outbound = flight.direction === "out";
  const color = outbound ? categories[index].color : "#c2e2af";
  const label = outbound ? `${categories[index].label}${flight.confidence === undefined ? "" : ` · ${Math.round(flight.confidence * 100)}%`}` : flight.title.length > 25 ? `${flight.title.slice(0, 23)}…` : flight.title;
  const xs: number[] = [], ys: number[] = [];
  for (let step = 0; step <= 40; step++) {
    const t = step / 40;
    xs.push(outbound ? bezier(716, 825, 842, 979, t) : bezier(355, 453, 469, 562, t));
    ys.push(outbound ? bezier(260, 260, ROW_Y[index], ROW_Y[index], t) : bezier(IN_Y[flight.row], IN_Y[flight.row], 260, 260, t));
  }
  return <motion.g
    initial={{ x: xs[0], y: ys[0], opacity: 0 }}
    animate={{ x: xs, y: ys, opacity: reduced ? [0, 0, 0] : [0, 1, 1, 0] }}
    transition={{ duration: reduced ? 0.1 : (outbound ? OUTPUT_TRAVEL_MS : INPUT_TRAVEL_MS) / 1000, ease: "linear", opacity: { times: [0, 0.1, 0.85, 1] } }}
    onAnimationComplete={() => onComplete(flight.id)}
  >
    <circle r="15" fill={color} opacity=".12" filter="url(#packetGlow)" />
    <circle r="4" fill={color} />
    <rect x="-80" y="-39" width="160" height="27" rx="8" fill="#161c20" stroke={color} strokeOpacity=".5" />
    <text y="-21" textAnchor="middle" fill={outbound ? color : "#e6ede8"} fontSize="10.5" fontFamily="Arial, sans-serif">{label}</text>
  </motion.g>;
}

function CoreGlyph() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {[0, 60, 120, 180, 240, 300].map((angle) => <g key={angle} transform={`rotate(${angle} 32 32)`}>
      <path d="M32 12 L44 19 L44 33 L32 40 L20 33 L20 19 Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" transform="translate(0 -3) scale(.81) translate(7.5 7.5)" />
    </g>)}
    <path d="M32 22 41 27v10l-9 5-9-5V27z" fill="#182219" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}

function DecisionMachine({ exchange, running }: { exchange: DecisionExchange | null; running: boolean }) {
  const result = exchange?.result;
  const category = categories.find((item) => item.id === result?.category);
  const Icon = category ? CATEGORY_ICONS[category.id] : Sparkles;
  const requesting = running && ["sending", "requesting"].includes(exchange?.phase ?? "");
  const status = !running ? "PAUSED" : exchange?.phase === "sending" ? "SENDING INPUT" : exchange?.phase === "requesting" ? "CALLING OPENAI" : result ? "ANSWER RECEIVED" : exchange?.phase === "error" ? "CALL FAILED" : exchange?.phase === "refused" ? "DECLINED" : "LISTENING";
  const waiting = !running ? "Resume to evaluate the next article" : exchange?.phase === "sending" ? "Article arriving at OpenAI…" : exchange?.phase === "requesting" ? "OpenAI is choosing a topic…" : exchange?.phase === "error" ? "Request failed. Use Retry above." : exchange?.phase === "refused" ? "OpenAI declined this classification" : "Waiting for a live Wikipedia edit";

  return <div className={`engine engine-explained ${requesting ? "thinking" : ""}`} style={{ "--decision-color": category?.color ?? "#baef69" } as CSSProperties}>
    <div className="orbit orbit-outer" /><div className="orbit orbit-middle" />
    <section className="decision-machine" aria-label="Live OpenAI Decisions API request and response" data-phase={exchange?.phase ?? "idle"}>
      <div className="call-header"><span className="call-logo"><CoreGlyph /></span><div><span className="call-provider">OPENAI</span><h2>Decisions API</h2></div><span className={`call-status ${requesting ? "requesting" : ""}`}><i />{status}</span></div>
      <div className="call-endpoint"><span>POST</span> /v1/decisions<span className="call-model">{result?.model ?? "gpt-6-luna"}</span></div>
      <div className="call-body">
        <div className="call-field-label"><span className="call-field-number">IN</span>WIKIPEDIA ARTICLE</div>
        <AnimatePresence mode="wait" initial={false}><motion.div className="call-article" key={exchange?.edit.id ?? "empty"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }} title={exchange?.edit.title}>{exchange?.edit.title ?? "The next live edit goes here."}</motion.div></AnimatePresence>
        <div className="call-question-label">WE ASK OPENAI <span>type: choice</span></div>
        <p className="call-question">“{TOPIC_QUESTION}”</p>
        <div className="call-choices">{categories.map((option) => <span key={option.id} className={result?.category === option.id ? "chosen" : ""} style={{ "--option-color": option.color } as CSSProperties}>{result?.category === option.id && <Check size={9} />}{option.id === "other" ? "Other" : option.label}</span>)}</div>
      </div>
      <div className={`call-answer ${result ? "has-answer" : ""}`} aria-live="polite">
        <span className="call-answer-label">{result ? "OPENAI’S ANSWER" : "AWAITING THE API’S ANSWER"}</span>
        <AnimatePresence mode="wait" initial={false}>{result && category ? <motion.div key={`${exchange!.edit.id}-answer`} className="call-result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>
          <div className="call-result-row"><span className="call-choice"><Icon size={19} />{category.label}</span><span className="call-result-confidence"><b>{Math.round(result.confidence * 100)}<small>%</small></b><span>confidence</span></span></div>
          <div className="call-result-footer"><span><Check size={10} />{result.latencyMs} ms API round trip</span><span>{exchange?.phase === "routing" ? "Routing" : exchange?.phase === "routed" ? "Routed" : !running ? "Last response" : "Route using this choice"}<ArrowRight size={11} /></span></div>
        </motion.div> : <motion.div key={`${exchange?.edit.id ?? "empty"}-waiting`} className="call-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>{requesting ? <span className="processing-spinner" /> : <Radio size={12} />}<span>{waiting}</span></motion.div>}</AnimatePresence>
      </div>
    </section>
  </div>;
}

function Clock({ running }: { running: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return <span className="session-time">{String(Math.floor(seconds / 60)).padStart(2, "0")}<span>:</span>{String(seconds % 60).padStart(2, "0")}</span>;
}

function Confidence({ value, color }: { value: number; color: string }) {
  return <span className="confidence" style={{ "--lane-color": color } as CSSProperties}>
    <span className="confidence-bars">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ opacity: index < Math.round(value * 9) ? 1 : 0.14 }} />)}</span>
    {Math.round(value * 100)}<span className="percent">%</span>
  </span>;
}

export function WikiFlow() {
  const [running, setRunning] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selected, setSelected] = useState<RoutedEdit | null>(null);
  const reduced = useReducedMotion();
  const app = useRef<HTMLDivElement>(null);
  const flow = useWikiFlow(running);
  const latest = flow.history[0];
  const focusedEdit = flow.processing ? flow.exchange?.edit : null;
  const incoming = focusedEdit ? [focusedEdit, ...flow.incoming.filter((edit) => edit.id !== focusedEdit.id).slice(0, 3)] : flow.incoming;
  const currentChoice = categories.find((category) => category.id === flow.exchange?.result?.category);
  const averageLatency = flow.stats.count ? Math.round(flow.stats.latency / flow.stats.count) : null;
  const averageConfidence = flow.stats.count ? Math.round(flow.stats.confidence / flow.stats.count * 100) : null;
  const connected = flow.connection === "connected";
  const sourceStatus = !running ? "PAUSED" : connected ? "LIVE" : flow.connection === "retrying" ? "RECONNECTING" : "CONNECTING";

  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLButtonElement) && !(event.target instanceof HTMLAnchorElement)) { event.preventDefault(); setRunning((value) => !value); }
      if (event.key === "Escape") { setSelected(null); setShowInfo(false); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await app.current?.requestFullscreen();
    } catch { /* Browser chrome can still provide fullscreen when this API is unavailable. */ }
  }

  return <div className={`app-shell ${running ? "is-running" : "is-paused"}`} ref={app}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <a className="wordmark" href="/" aria-label="WikiFlow home"><span className="brand-symbol"><AudioLines size={23} strokeWidth={2.4} /></span>wiki<span>flow</span><span className="brand-divider" /><span className="brand-tag">A LIVE EXPERIMENT</span></a>
      <div className="topbar-right"><a className="powered-by" href="https://developers.openai.com/api/docs/guides/decisions" target="_blank" rel="noreferrer"><span className="openai-mini"><Sparkles size={15} /></span>Powered by OpenAI Decisions<ArrowUpRight size={13} /></a><span className={`live-badge ${connected && running ? "connected" : ""}`}><i />{sourceStatus}</span></div>
    </header>

    <main>
      <section className="intro">
        <div><div className="eyebrow"><span />LIVE WIKIPEDIA × OPENAI DECISIONS</div><h1>A world of edits.<br className="mobile-break" /> <span>A stream of decisions.</span></h1><p>Live Wikipedia edits go to OpenAI. The Decisions API picks a topic. Its answer sets the route.</p></div>
        <div className="session"><span className="micro-label">SESSION UPTIME</span><Clock running={running} /><span className="session-caption"><span className="tiny-dot" />Real data. Real decisions.</span></div>
      </section>

      {flow.error && <div className="error-banner" role="alert"><TriangleAlert size={18} /><span><strong>Decisions paused.</strong> {flow.error}</span><button onClick={flow.reconnect}><RotateCw size={14} />Retry</button></div>}

      <section className="visualizer" aria-label="Live Wikipedia decision flow">
        <div className="scene-toolbar">
          <div className="scene-title"><span className="scene-icon"><Activity size={15} /></span>THE LIVE PIPELINE<span className="toolbar-separator" /><span className="pipeline-caption">Live article → API question → returned choice</span></div>
          <div className="scene-controls"><span className="sample-indicator"><i />1 EDIT / {SAMPLE_INTERVAL_MS / 1000} SEC</span><button className="icon-button" onClick={() => setShowInfo(true)} aria-label="About this live pipeline" title="How it works"><CircleHelp size={16} /></button><button className="icon-button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button><button className={`play-button ${!running ? "paused" : ""}`} onClick={() => setRunning((value) => !value)}>{running ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}{running ? "Pause" : "Resume"}</button></div>
        </div>

        <div className="step-labels"><span><b>01</b> LIVE WIKIPEDIA EDITS</span><span><b>02</b> OPENAI DECISIONS API</span><span><b>03</b> ROUTED BY THE ANSWER</span></div>
        <div className="flow-stage">
          <div className="stage-grid" />
          <div className="engine-aura" />
          <svg className="flow-wires" viewBox="0 0 1280 520" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="packetGlow"><feGaussianBlur stdDeviation="7" /></filter>
              <linearGradient id="inputGradient" x1="355" y1="260" x2="562" y2="260" gradientUnits="userSpaceOnUse"><stop stopColor="#64766c" stopOpacity=".15" /><stop offset="1" stopColor="#baef69" stopOpacity=".5" /></linearGradient>
              {categories.map((category) => <linearGradient key={category.id} id={`gradient-${category.id}`} x1="716" y1="260" x2="979" y2="260" gradientUnits="userSpaceOnUse"><stop stopColor="#baef69" stopOpacity=".32" /><stop offset="1" stopColor={category.color} stopOpacity=".55" /></linearGradient>)}
            </defs>
            {[0, 1, 2, 3].map((index) => <g key={`in-${index}`}><path d={inputPath(index)} fill="none" stroke="url(#inputGradient)" strokeWidth="1.2" /><circle cx="355" cy={IN_Y[index]} r="3" fill="#425148" /></g>)}
            {categories.map((category, index) => <g key={category.id}><path className={`decision-route ${currentChoice?.id === category.id ? "is-chosen" : ""}`} d={routePath(index)} fill="none" stroke={`url(#gradient-${category.id})`} strokeWidth="1.2" /><path className="wire-dashes" d={routePath(index)} fill="none" stroke={category.color} strokeOpacity=".13" strokeWidth="1" strokeDasharray="2 10" /><circle cx="979" cy={ROW_Y[index]} r="3.5" fill={category.color} opacity=".8" /></g>)}
            <path d="M 639 361 V 449" stroke="#baef69" strokeOpacity=".12" strokeDasharray="3 7" />
            <circle cx="639" cy="449" r="2" fill="#66764c" />
          </svg>

          <div className="incoming-stack">
            <AnimatePresence initial={false} mode="popLayout">
              {incoming.map((edit) => <motion.a className={`incoming-card ${focusedEdit?.id === edit.id ? "is-api-input" : ""}`} href={edit.url} target="_blank" rel="noreferrer" key={edit.id} layout initial={{ opacity: 0, x: -26, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 18, scale: 0.96, transition: { duration: 0.16, ease: "easeOut" } }} transition={{ type: "spring", stiffness: 210, damping: 29 }}>
                <div className="edit-meta"><span className="wiki-letter">W</span><span>en.wikipedia.org</span><span className="edit-type">{focusedEdit?.id === edit.id ? "API INPUT" : "EDIT"}</span></div>
                <div className="edit-title">{edit.title}<ArrowUpRight size={12} /></div>
                <div className="edit-bottom"><span className="edit-summary">{edit.comment.replace(/\/\*.*?\*\//g, "").trim() || "A new contribution to the world’s knowledge"}</span><span className={edit.delta >= 0 ? "delta-positive" : "delta-negative"}>{edit.delta >= 0 ? "+" : ""}{edit.delta.toLocaleString()}<small> B</small></span></div>
              </motion.a>)}
            </AnimatePresence>
            {!flow.incoming.length && Array.from({ length: 4 }, (_, index) => <div className="incoming-card skeleton-card" key={index}><div className="edit-meta"><span className="wiki-letter">W</span><span>Listening to Wikipedia</span></div><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}
          </div>

          <DecisionMachine exchange={flow.exchange} running={running} />

          <svg className="flow-packets" viewBox="0 0 1280 520" preserveAspectRatio="none" aria-hidden="true">{flow.flights.map((flight) => <Packet key={flight.id} flight={flight} onComplete={flow.removeFlight} reduced={reduced} />)}</svg>

          <div className="category-lanes">{categories.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.id];
            const last = flow.history.find((item) => item.category === category.id);
            return <div className={`category-lane ${currentChoice?.id === category.id ? "last-active" : ""}`} key={category.id} style={{ "--lane-color": category.color } as CSSProperties}>
              <AnimatePresence>{latest?.category === category.id && flow.exchange?.phase === "routed" && <motion.div className="lane-flash" key={latest.id} initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />}</AnimatePresence>
              <div className="lane-top"><span className="lane-icon"><Icon size={17} strokeWidth={1.65} /></span><span className="lane-label">{category.label}</span><motion.span className="lane-count" key={flow.counts[category.id]} initial={{ opacity: 0.3, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>{String(flow.counts[category.id]).padStart(2, "0")}</motion.span></div>
              <div className="lane-detail">{last ? <motion.span key={last.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="lane-last-title">{last.title}</motion.span> : <span>{category.subtitle}</span>}<span className="lane-number">0{index + 1}</span></div>
              <div className="lane-progress"><motion.span animate={{ width: `${flow.stats.count ? flow.counts[category.id] / flow.stats.count * 100 : 0}%` }} transition={{ duration: 0.8, ease: "easeOut" }} /></div>
            </div>;
          })}</div>
          <div className="source-caption"><Radio size={12} /><span>{!running ? "Feed paused" : flow.sourceMode === "poll" ? "Live recent edits · polling" : "Wikimedia EventStreams"}</span><span className="source-caption-dot" />ENGLISH WIKIPEDIA</div>
          <div className="engine-caption">THE API CHOOSES THE TOPIC. ITS ANSWER CHOOSES THE PATH.</div>
        </div>

        <div className="scene-statusbar"><span><i className={connected && running ? "status-dot connected" : "status-dot"} />{!running ? "Pipeline paused" : connected ? "Connected to Wikipedia" : "Connecting to Wikipedia"}<span className="statusbar-divider">/</span><span className="desktop-only">{flow.sourceMode === "poll" ? "Recent changes API" : "Server-sent events"}</span></span><span className="processing-status">{currentChoice ? <><Check size={12} />OpenAI chose <strong>{currentChoice.label}</strong><ArrowRight size={11} />{flow.exchange?.phase === "routed" ? "Route applied" : "This answer sets the route"}</> : flow.processing ? <><span className="processing-spinner" />{flow.exchange?.phase === "sending" ? "Sending article to OpenAI" : "Waiting for OpenAI’s answer"}</> : <><Check size={12} />Listening for the next article…</>}</span><span className="statusbar-end"><span className="tiny-dot" />ACTUAL API RESPONSES</span></div>
      </section>

      <section className="metrics" aria-label="Live session metrics"><div className="metric"><span className="metric-label"><Radio size={13} />EDITS OBSERVED</span><div className="metric-value">{flow.received.toLocaleString()}<span className="metric-note">from the world</span></div><div className="metric-spark spark-observed" aria-label="Edits received per second, last 24 seconds">{flow.traffic.map((value, i) => <i key={i} style={{ height: `${Math.max(3, value / Math.max(1, ...flow.traffic) * 90)}%`, opacity: value ? .6 : .12 }} />)}</div></div>
        <div className="metric"><span className="metric-label"><Sparkles size={13} />DECISIONS MADE</span><div className="metric-value lime">{flow.stats.count.toLocaleString()}<span className="metric-note">signals, sorted</span></div><span className="metric-decor"><ArrowDownLeft size={34} /></span></div>
        <div className="metric"><span className="metric-label"><Activity size={13} />AVG. API LATENCY</span><div className="metric-value">{averageLatency ?? "—"}<span className="metric-unit">ms</span></div><span className="metric-footnote">Measured request round trip</span></div>
        <div className="metric"><span className="metric-label"><Check size={13} />AVG. CONFIDENCE</span><div className="metric-value">{averageConfidence ?? "—"}<span className="metric-unit">%</span></div><div className="metric-confidence"><span style={{ width: `${averageConfidence ?? 0}%` }} /></div></div>
      </section>

      <section className="decision-log"><div className="log-heading"><h2><span className="log-dot" />The decision trail<span>Every route has a reason.</span></h2><span className="log-count">{String(flow.stats.count).padStart(2, "0")} PROCESSED<ChevronRight size={12} /></span></div>
        <div className="log-table"><div className="log-table-head"><span>THE ARTICLE</span><span>ROUTED TO</span><span>CONFIDENCE</span><span>API LATENCY</span><span /></div>
          <AnimatePresence initial={false} mode="popLayout">{flow.history.slice(0, 5).map((edit) => {
            const category = categories.find((item) => item.id === edit.category)!;
            const Icon = CATEGORY_ICONS[category.id];
            return <motion.button className="log-row" key={edit.id} layout initial={{ opacity: 0, y: -12, backgroundColor: "rgba(186,239,105,.08)" }} animate={{ opacity: 1, y: 0, backgroundColor: "rgba(186,239,105,0)" }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} onClick={() => setSelected(edit)} aria-label={`Inspect decision for ${edit.title}`}><span className="log-article"><span className="log-wiki">W</span><span>{edit.title}</span></span><span className="category-tag" style={{ "--lane-color": category.color } as CSSProperties}><Icon size={12} />{category.label}</span><Confidence value={edit.confidence} color={category.color} /><span className="log-latency">{edit.latencyMs}<small> ms</small></span><ArrowUpRight size={14} className="log-arrow" /></motion.button>;
          })}</AnimatePresence>
          {!flow.history.length && <div className="empty-log"><span className="processing-spinner" />The first decision is on its way. This is the real thing.</div>}
        </div>
      </section>
    </main>

    <footer><span>Made of curiosity. Powered by decisions.</span><span><span className="footer-wordmark">WIKIPEDIA</span><span className="footer-plus">×</span>OpenAI<span className="footer-line" /><a href="https://developers.openai.com/api/docs/guides/decisions" target="_blank" rel="noreferrer">Explore the Decisions API<ArrowUpRight size={12} /></a></span></footer>

    <AnimatePresence>{(showInfo || selected) && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowInfo(false); setSelected(null); }}><motion.section className="detail-modal" role="dialog" aria-modal="true" aria-label={selected ? "Decision details" : "About WikiFlow"} initial={{ opacity: 0, y: 15, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15 }} onClick={(event) => event.stopPropagation()}><button className="modal-close icon-button" onClick={() => { setShowInfo(false); setSelected(null); }} aria-label="Close details" autoFocus><X size={18} /></button>
      {selected ? <><div className="eyebrow">THE ACTUAL DECISION</div><h2>{selected.title}</h2><p className="detail-summary">{selected.comment || "No edit summary supplied."}</p><div className="detail-probabilities">{categories.map((category) => { const probability = selected.probabilities.find((item) => item.value === category.id)?.probability ?? 0; return <div key={category.id}><span>{category.label}</span><div><motion.i initial={{ width: 0 }} animate={{ width: `${probability * 100}%` }} style={{ background: category.color }} /></div><b>{Math.round(probability * 100)}%</b></div>; })}</div><div className="detail-meta"><span>Model<b>{selected.model}</b></span><span>Round trip<b>{selected.latencyMs} ms</b></span><span>Input tokens<b>{selected.inputTokens}</b></span></div><p className="detail-note">Bars show option probabilities. The API’s separate confidence value is {Math.round(selected.confidence * 100)}%.</p><a className="article-link" href={selected.url} target="_blank" rel="noreferrer">Read the Wikipedia article<ExternalLink size={14} /></a></> : <><div className="eyebrow">A SMALL EXPERIMENT IN UNDERSTANDING</div><h2>The world edits.<br />AI connects the dots.</h2><p>Real English Wikipedia article edits arrive from Wikimedia. Every five seconds, a recent edit’s title and summary go to OpenAI’s Decisions API.</p><p>One <code>choice</code> question routes it to Technology, Science, Culture, or Everything else. Every displayed category, confidence, and probability comes from the API. Latency is the measured server-to-OpenAI round trip.</p><p>The feed is sampled to keep it readable. Only non-bot edits to articles are shown. If streaming is unavailable, the feed switches to polling real recent edits.</p><div className="info-shortcut"><span>SPACE</span>Pause or resume the live pipeline</div></>}
    </motion.section></motion.div>}</AnimatePresence>
  </div>;
}
