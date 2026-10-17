"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, AudioLines, Check, Cpu, FlaskConical, Globe2, Maximize2, Minimize2, Pause, Play, RotateCw, Shapes } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { categories } from "@/lib/types";
import { TOPIC_QUESTION } from "@/lib/decision-config";
import { useWikiFlow, type Flight, type FlowTiming } from "@/lib/use-wiki-flow";
import "./wiki-presentation.css";

const TIMING: FlowTiming = { sampleInterval: 12000, inputTravel: 2400, answerHold: 2800, outputTravel: 1900 };
const ICONS = { technology: Cpu, science: FlaskConical, culture: Shapes, other: Globe2 };
const DESTINATIONS = [100, 200, 300, 400];

function DecisionGlyph() {
  return <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
    {[0, 60, 120, 180, 240, 300].map((angle) => <path key={angle} transform={`rotate(${angle} 40 40)`} d="M40 13C57 8 67 24 59 37L40 48 27 40V25L40 18 53 25V40" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}

function World() {
  return <div className="p-world" aria-hidden="true">
    <div className="p-world-aura" />
    <svg viewBox="0 0 440 440" fill="none">
      <defs>
        <radialGradient id="world-fill" cx="35%" cy="27%" r="75%"><stop stopColor="#344d47" /><stop offset=".5" stopColor="#122c29" /><stop offset="1" stopColor="#071615" /></radialGradient>
        <radialGradient id="world-shade" cx="30%" cy="30%" r="80%"><stop offset=".4" stopColor="#030e0c" stopOpacity="0" /><stop offset="1" stopColor="#030e0c" stopOpacity=".9" /></radialGradient>
        <clipPath id="world-clip"><circle cx="220" cy="220" r="160" /></clipPath>
      </defs>
      <g transform="rotate(-18 220 220)">
        <ellipse cx="220" cy="220" rx="205" ry="63" stroke="#87d5b4" strokeOpacity=".17" transform="rotate(-22 220 220)" />
        <circle cx="220" cy="220" r="174" stroke="#91e3c2" strokeOpacity=".13" strokeDasharray="2 9" />
        <circle cx="220" cy="220" r="160" fill="url(#world-fill)" stroke="#8fe4c2" strokeOpacity=".45" />
        <g clipPath="url(#world-clip)" stroke="#98e5c4" strokeOpacity=".17" strokeWidth=".8">
          {[-120, -80, -40, 0, 40, 80, 120].map((offset) => <ellipse key={offset} cx="220" cy={220 + offset} rx={Math.sqrt(160 ** 2 - offset ** 2)} ry="23" />)}
          {[40, 85, 125, 159].map((rx) => <ellipse className="p-meridian" key={rx} cx="220" cy="220" rx={rx} ry="160" />)}
          <path d="M85 145 104 120 140 105 161 121 167 147 195 159 185 179 159 179 146 205 129 192 123 168 102 169Z M156 216 182 209 201 230 199 250 213 271 193 312 174 328 167 292 154 267 144 242Z M238 102 258 92 290 112 281 134 299 140 321 160 340 153 357 182 345 205 319 204 311 229 282 220 264 191 244 186 224 160 234 146 219 128Z M239 192 269 190 287 220 281 250 262 285 245 276 238 248 223 226Z M310 278 338 266 361 287 347 310 320 309 303 293Z" fill="#99e0ba" fillOpacity=".13" strokeOpacity=".5" strokeLinejoin="round" />
        </g>
        <circle cx="220" cy="220" r="160" fill="url(#world-shade)" />
        {[[142, 153], [256, 139], [273, 206], [174, 246], [327, 289], [308, 174]].map(([x, y], i) => <g key={i} className="p-world-signal" style={{ animationDelay: `${i * -.7}s` }}><circle cx={x} cy={y} r="13" fill="#c4ffd5" fillOpacity=".08" /><circle cx={x} cy={y} r="3" fill="#d2ffb4" /></g>)}
        <circle cx="55" cy="239" r="4" fill="#d3ffb5" />
      </g>
    </svg>
    <span className="p-world-w">W</span>
  </div>;
}

function TravelingEdit({ flight, reduced, onComplete }: { flight: Flight; reduced: boolean | null; onComplete: (id: string) => void }) {
  const out = flight.direction === "out";
  const index = categories.findIndex((category) => category.id === flight.category);
  const color = out ? categories[index].color : "#d7ffb7";
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, u = 1 - t;
    xs.push(out ? u ** 3 * 760 + 3 * u * u * t * 900 + 3 * u * t * t * 930 + t ** 3 * 1080 : 385 + t * 270);
    ys.push(out ? u ** 3 * 250 + 3 * u * u * t * 250 + 3 * u * t * t * DESTINATIONS[index] + t ** 3 * DESTINATIONS[index] : 250);
  }
  return <motion.g initial={{ x: xs[0], y: ys[0], opacity: 0 }} animate={{ x: xs, y: ys, opacity: reduced ? 0 : [0, 1, 1, 0] }} transition={{ duration: reduced ? .1 : (out ? TIMING.outputTravel : TIMING.inputTravel) / 1000, ease: "easeInOut", opacity: { times: [0, .1, .85, 1] } }} onAnimationComplete={() => onComplete(flight.id)}>
    <circle r="25" fill={color} opacity=".12" /><circle r="8" fill={color} /><circle r="3" fill="#fff" />
    <rect x="-112" y="-65" width="224" height="44" rx="10" fill={out ? "#17231f" : "#edf1df"} stroke={color} strokeOpacity=".7" />
    <text y="-36" textAnchor="middle" fill={out ? color : "#233123"} fontSize="19" fontFamily="Arial,sans-serif">{flight.title.length > 22 ? `${flight.title.slice(0, 21)}…` : flight.title}</text>
  </motion.g>;
}

export function WikiPresentation() {
  const [running, setRunning] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const flow = useWikiFlow(running, TIMING);
  const reduced = useReducedMotion();
  const exchange = flow.exchange;
  const result = exchange?.result;
  const chosen = categories.find((category) => category.id === result?.category);
  const phase = exchange?.phase;
  const sending = phase === "sending";
  const requesting = phase === "requesting";
  const routing = phase === "routing" || phase === "routed";
  const step = !exchange ? 0 : !result ? sending ? 0 : 1 : routing ? 2 : 1;
  const color = chosen?.color ?? "#d3ffab";
  const title = exchange?.edit.title;
  const active = running && !!exchange && !["error", "refused"].includes(phase ?? "");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || (event.target instanceof Element && event.target.closest("button, a, input, textarea, [contenteditable]"))) return;
      event.preventDefault();
      setRunning((value) => !value);
    };
    const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch { /* Fullscreen availability depends on the browser; the stage remains usable. */ }
  }

  const caption = !running ? "A world of edits. Ready when you are." : flow.error ? "The next decision is on hold." : phase === "refused" ? "OpenAI declined this one. Another edit is up next." : !exchange ? "Somewhere in the world, someone is editing Wikipedia." : sending ? "One real edit. A new piece of the world’s knowledge." : requesting ? "OpenAI reads the title and chooses its topic." : phase === "answered" ? `OpenAI’s decision: ${chosen?.label}.` : `OpenAI chose ${chosen?.label}. We route the article there.`;

  return <div ref={shell} className={`p-shell ${running ? "is-playing" : "is-paused"} ${reduced ? "p-reduced" : ""}`} style={{ "--p-accent": color } as CSSProperties}>
    <div className="p-atmosphere" aria-hidden="true" /><div className="p-grain" aria-hidden="true" />
    <header className="p-topbar">
      <Link href="/" className="p-brand" aria-label="WikiFlow home"><AudioLines size={28} strokeWidth={1.7} />wiki<span>flow</span></Link>
      <span className="p-top-note">A live experiment with <b>OpenAI</b></span>
      <div className="p-controls"><span className={`p-live ${running ? "on" : ""}`}><i />{!running ? "PAUSED" : flow.connection === "connected" ? "LIVE" : "CONNECTING"}</span><button onClick={() => setRunning((value) => !value)} className="p-control" aria-label={running ? "Pause presentation and API calls" : "Resume presentation"}>{running ? <Pause size={17} /> : <Play size={17} />}<span>{running ? "Pause" : "Resume"}</span></button><button onClick={toggleFullscreen} className="p-control p-fullscreen" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button></div>
    </header>

    <div className="p-content">
      <div className="p-intro">
        <div className="p-kicker"><span />WIKIPEDIA, MEET OPENAI DECISIONS API</div>
        <h1>The world edits.<span> AI decides.</span></h1>
        <p>A live article. A simple question. <strong>A decision you can see.</strong></p>
      </div>

      <div className="p-story-steps" aria-label="How this works">{["Wikipedia gets an edit", "OpenAI picks a topic", "The answer sets its path"].map((label, index) => <div key={label} className={step === index && active ? "current" : ""}><span>0{index + 1}</span><b>{label}</b></div>)}</div>

      <section className="p-scene" aria-label="Live Wikipedia edit classified and routed by the OpenAI Decisions API" data-phase={phase ?? "waiting"}>
        <div className="p-stage-grid" aria-hidden="true" />
        <svg className="p-connections" viewBox="0 0 1440 500" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <defs><linearGradient id="input-wire"><stop stopColor="#b0d4b7" stopOpacity=".1" /><stop offset="1" stopColor="#c7ffb0" stopOpacity=".55" /></linearGradient></defs>
          <path d="M340 250H665" stroke="url(#input-wire)" strokeWidth="1.5" />
          <path className="p-wire-dashes" d="M340 250H665" stroke="#bce890" strokeOpacity=".24" strokeDasharray="3 10" strokeWidth="1.5" />
          {categories.map((category, index) => <g key={category.id}><path d={`M760 250C900 250 930 ${DESTINATIONS[index]} 1080 ${DESTINATIONS[index]}`} stroke={category.color} strokeOpacity={result?.category === category.id ? .7 : .13} strokeWidth={result?.category === category.id ? 2 : 1} style={{ transition: "stroke-opacity .6s" }} />{result?.category === category.id && <motion.path key={exchange?.edit.id} d={`M760 250C900 250 930 ${DESTINATIONS[index]} 1080 ${DESTINATIONS[index]}`} stroke={category.color} strokeWidth="7" strokeOpacity=".1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .7 }} />}</g>)}
          {flow.flights.map((flight) => <TravelingEdit key={flight.id} flight={flight} reduced={reduced} onComplete={flow.removeFlight} />)}
        </svg>

        <div className="p-source">
          <World />
          <div className="p-orbit-label p-orbit-label-one" aria-hidden="true">{flow.incoming[1]?.title ?? "A world of knowledge"}</div>
          <div className="p-orbit-label p-orbit-label-two" aria-hidden="true">{flow.incoming[2]?.title ?? "Always being written"}</div>
          <div className="p-source-name"><span>W</span>Wikipedia<span className="p-source-dot" /></div>
          <AnimatePresence mode="wait" initial={false}><motion.a key={exchange?.edit.id ?? "waiting"} href={exchange?.edit.url ?? "https://en.wikipedia.org/wiki/Special:RecentChanges"} target="_blank" rel="noreferrer" className="p-article" initial={{ opacity: 0, y: 18, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -3 }} exit={{ opacity: 0, y: -14, rotate: 0 }} transition={{ duration: reduced ? 0 : .45 }}>
            <span className="p-article-meta"><i />{title ? "JUST EDITED" : "LISTENING TO THE WORLD"}<ArrowUpRight size={17} /></span>
            <span title={title} className={`p-article-title ${(title?.length ?? 0) > 48 ? "long" : ""}`}>{title ?? "The next story starts here."}</span>
            <span className="p-article-footer">English Wikipedia <ArrowRight size={18} /></span>
          </motion.a></AnimatePresence>
          <div className="p-source-caption"><span className="p-equalizer"><i /><i /><i /><i /></span>{flow.received.toLocaleString()} real edits received</div>
        </div>

        <div className={`p-decision ${requesting || sending ? "is-thinking" : ""} ${chosen ? "has-answer" : ""}`}>
          <div className="p-question">“{TOPIC_QUESTION}”<span /></div>
          <div className="p-core-halo" /><div className="p-core-orbit p-core-orbit-one" /><div className="p-core-orbit p-core-orbit-two" />
          <div className="p-core"><span className="p-core-glyph"><DecisionGlyph /></span><span className="p-core-provider">OpenAI</span><h2>Decisions API</h2><span className="p-core-status"><i />{!running ? "Paused" : requesting ? "Choosing a topic…" : chosen ? "Decision received" : sending ? "Article incoming…" : "Ready to decide"}</span></div>
          <div className="p-answer-space" aria-live="polite"><AnimatePresence mode="wait">{chosen && result ? <motion.div className="p-answer" key={`${exchange?.edit.id}-answer`} initial={{ opacity: 0, y: 15, scale: .85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .9 }} transition={{ duration: reduced ? 0 : .4, type: "spring", bounce: .25 }}><span className="p-answer-check"><Check size={23} strokeWidth={2.5} /></span><span><small>OPENAI CHOSE</small><b>{chosen.label}</b></span></motion.div> : <motion.div className="p-answer-waiting" key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span /><span /><span /><b>{requesting ? "Waiting for the API’s answer" : "One question. Four possible topics."}</b></motion.div>}</AnimatePresence></div>
        </div>

        <div className="p-destinations" aria-label="Topics">{categories.map((category, index) => {
          const selected = chosen?.id === category.id;
          const Icon = ICONS[category.id];
          const arrived = selected && routing;
          return <div key={category.id} className={`p-destination ${selected ? "selected" : ""} ${arrived ? "arrived" : ""}`} style={{ "--topic-color": category.color, "--topic-index": index } as CSSProperties}>
            <div className="p-topic-art" aria-hidden="true"><span className="p-topic-back" /><Icon size={36} strokeWidth={1.3} /><span className="p-topic-spark" /></div>
            <div className="p-topic-copy"><b>{category.label}</b><span title={selected && arrived ? title : undefined}>{selected ? arrived ? title : "Chosen by OpenAI" : ["Code. Machines. The future.", "Discoveries. Nature. Space.", "Art. Music. Human stories.", "The rest of our world."][index]}</span></div>
            <span className="p-destination-check">{arrived ? <Check size={23} /> : <ArrowRight size={21} />}</span>
            {arrived && <motion.div className="p-arrival-ring" key={exchange?.edit.id} initial={{ opacity: .75, scale: 1 }} animate={{ opacity: 0, scale: 1.2 }} transition={{ duration: reduced ? 0 : 1.5 }} />}
          </div>;
        })}</div>
      </section>

      <div className="p-narration" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.div key={caption} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }} transition={{ duration: reduced ? 0 : .25 }}><span className="p-narration-mark">{routing && chosen ? <Check size={22} /> : <AudioLines size={22} />}</span><p>{caption}</p></motion.div></AnimatePresence></div>
      {flow.error && <div className="p-error" role="alert"><span>{flow.error}</span><button onClick={flow.reconnect}><RotateCw size={16} />Try again</button></div>}

      <div className="p-bottom"><span><i />Real Wikipedia edits <span className="p-bottom-plus">+</span> Real OpenAI decisions</span><span className="p-bottom-proof">{flow.stats.count > 0 ? `${flow.stats.count} ${flow.stats.count === 1 ? "decision" : "decisions"}, made live` : "The internet never stops. Neither does the story."}</span><Link href="/console">Explore the console<ArrowUpRight size={16} /></Link></div>
    </div>
  </div>;
}
