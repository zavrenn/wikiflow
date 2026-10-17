"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, AudioLines, Box, Check, Cpu, FileText, FlaskConical, Maximize2, Minimize2, Pause, Play, RotateCw, Shapes } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { TOPIC_QUESTION } from "@/lib/decision-config";
import { categories } from "@/lib/types";
import { useWikiFlow, type Flight, type FlowTiming } from "@/lib/use-wiki-flow";
import "./wiki-presentation.css";

const PRESENTATION_TIMING: FlowTiming = { sampleInterval: 4500, inputTravel: 1100, answerHold: 0, outputTravel: 1500 };
const TOPICS = {
  technology: { label: "Technology", color: "#008b42", Icon: Cpu },
  science: { label: "Science", color: "#0674f9", Icon: FlaskConical },
  culture: { label: "Culture", color: "#8b31ef", Icon: Shapes },
  other: { label: "Other", color: "#e9940c", Icon: Box },
};

type Point = { x: number; y: number };
type Route = { path: string; x: number[]; y: number[]; start: Point; end: Point };
type Geometry = { width: number; height: number; input: Route; outputs: Route[] };

function makeRoute(start: Point, end: Point, vertical: boolean): Route {
  const bend = vertical ? Math.max(35, Math.abs(end.y - start.y) * .55) : Math.max(35, Math.abs(end.x - start.x) * .55);
  const a = vertical ? { x: start.x, y: start.y + bend } : { x: start.x + bend, y: start.y };
  const b = vertical ? { x: end.x, y: end.y - bend } : { x: end.x - bend, y: end.y };
  return makeCurve(start, a, b, end);
}

function makeCurve(start: Point, a: Point, b: Point, end: Point): Route {
  const x: number[] = [], y: number[] = [];
  for (let step = 0; step <= 40; step++) {
    const t = step / 40, u = 1 - t;
    x.push(u ** 3 * start.x + 3 * u ** 2 * t * a.x + 3 * u * t ** 2 * b.x + t ** 3 * end.x);
    y.push(u ** 3 * start.y + 3 * u ** 2 * t * a.y + 3 * u * t ** 2 * b.y + t ** 3 * end.y);
  }
  return { path: `M ${start.x} ${start.y} C ${a.x} ${a.y}, ${b.x} ${b.y}, ${end.x} ${end.y}`, x, y, start, end };
}

function Packet({ flight, route, reduced, onComplete }: { flight: Flight; route: Route; reduced: boolean; onComplete: (id: string) => void }) {
  const color = flight.category ? TOPICS[flight.category].color : "#0b9668";
  return <motion.g className="v-packet" initial={{ x: route.start.x, y: route.start.y, opacity: 0, scale: .75 }}
    animate={{ x: route.x, y: route.y, opacity: [0, 1, 1, 0], scale: [.75, 1, 1, .75] }}
    transition={{ duration: reduced ? .01 : (flight.direction === "in" ? PRESENTATION_TIMING.inputTravel : PRESENTATION_TIMING.outputTravel) / 1000, ease: "linear" }}
    onAnimationComplete={() => onComplete(flight.id)}>
    <rect x="-22" y="-27" width="44" height="54" rx="9" fill="white" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 12px ${color}85)` }} />
    <FileText x="-13" y="-17" width="26" height="34" color={color} strokeWidth="1.4" />
  </motion.g>;
}

export function WikiPresentation() {
  const [running, setRunning] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLAnchorElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const destinations = useRef<(HTMLDivElement | null)[]>([]);
  const flow = useWikiFlow(running, PRESENTATION_TIMING);
  const reduced = !!useReducedMotion();
  const exchange = flow.exchange;
  const result = exchange?.result;
  const chosen = result ? TOPICS[result.category] : null;
  const deciding = exchange?.phase === "requesting";
  const editSummary = exchange?.edit.comment.replace(/\/\*\s*(.*?)\s*\*\//g, "$1 ·").replace(/\s·\s*$/, "").trim();

  useLayoutEffect(() => {
    function measure() {
      if (!stage.current || !article.current || !hub.current || destinations.current.some((element) => !element)) return;
      const frame = stage.current.getBoundingClientRect();
      const source = article.current.getBoundingClientRect();
      const center = hub.current.getBoundingClientRect();
      const vertical = window.matchMedia("(max-width: 759px)").matches;
      const cx = center.left - frame.left + center.width / 2;
      const cy = center.top - frame.top + center.height / 2;
      const radius = center.width * .47;
      const input = makeRoute(
        vertical ? { x: source.left - frame.left + source.width / 2, y: source.bottom - frame.top - 5 } : { x: source.right - frame.left - 6, y: source.top - frame.top + source.height * .55 },
        vertical ? { x: cx, y: cy - radius } : { x: cx - radius, y: cy }, vertical,
      );
      const outputs = destinations.current.map((element, index) => {
        const box = element!.getBoundingClientRect();
        const angle = (vertical ? [-.6, .6, -1.05, 1.05] : [-.66, -.23, .23, .66])[index];
        const start = vertical ? { x: cx + Math.sin(angle) * radius, y: cy + Math.cos(angle) * radius } : { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
        // Lower mobile lanes go around the outside, so no path passes through another topic.
        if (vertical && index > 1) {
          const left = index === 2;
          const edge = left ? 5 : frame.width - 5;
          const end = { x: (left ? box.left : box.right) - frame.left, y: box.top - frame.top + box.height / 2 };
          return makeCurve(start, { x: edge, y: start.y + 45 }, { x: edge, y: end.y }, end);
        }
        const end = vertical ? { x: box.left - frame.left + box.width / 2, y: box.top - frame.top } : { x: box.left - frame.left - 10, y: box.top - frame.top + box.height / 2 };
        return makeRoute(start, end, vertical);
      });
      const next = { width: frame.width, height: frame.height, input, outputs };
      setGeometry((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    }
    const observer = new ResizeObserver(measure);
    [stage.current, article.current, hub.current, ...destinations.current].forEach((element) => { if (element) observer.observe(element); });
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || (event.target instanceof Element && event.target.closest("button, a, input, textarea, [contenteditable]"))) return;
      event.preventDefault();
      setRunning((current) => !current);
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
    } catch { /* Controls stay available if the browser does not allow fullscreen. */ }
  }

  return <div ref={shell} className={`v-shell ${running ? "v-playing" : "v-paused"}`} data-phase={exchange?.phase ?? "waiting"} style={{ "--v-accent": chosen?.color ?? "#0a9854" } as CSSProperties}>
    <header className="v-topbar">
      <Link href="/" className="v-brand" aria-label="WikiFlow home"><AudioLines size={26} strokeWidth={1.6} />wiki<span>flow</span><b>.</b></Link>
      <div className="v-controls">
        <span className={`v-live ${running && flow.connection === "connected" ? "connected" : ""}`}><i />{!running ? "PAUSED" : flow.connection === "connected" ? "LIVE" : "CONNECTING"}</span>
        <button className="v-control" onClick={() => setRunning((current) => !current)} aria-label={running ? "Pause presentation and API calls" : "Resume presentation"}>{running ? <Pause size={16} /> : <Play size={16} />}<span>{running ? "Pause" : "Resume"}</span></button>
        <button className="v-control v-expand" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
      </div>
    </header>

    <div ref={stage} className="v-stage" aria-label="Live Wikipedia articles flow through OpenAI's Decisions API into the topic it chooses.">
      <h1 className="v-question">{TOPIC_QUESTION}</h1>

      {geometry && <svg className="v-connections" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
        <defs><filter id="v-route-glow" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="7" /></filter></defs>
        <path className="v-wire-shadow" d={geometry.input.path} />
        <path className="v-wire" d={geometry.input.path} stroke="#53b998" />
        <path className={`v-input-flow ${exchange?.phase === "sending" ? "active" : ""}`} d={geometry.input.path} />
        {geometry.outputs.map((route, index) => {
          const category = categories[index].id;
          const selected = result?.category === category;
          const color = TOPICS[category].color;
          return <g key={category} className={`v-route ${selected ? "selected" : ""}`} style={{ "--route": color } as CSSProperties}>
            <path className="v-wire-shadow" d={route.path} />
            <path className="v-wire-aura" d={route.path} filter="url(#v-route-glow)" />
            <path className="v-wire" d={route.path} stroke={color} />
            <path className="v-wire-highlight" d={route.path} />
            <path className="v-wire-signal" d={route.path} />
            <circle className="v-port-halo" cx={route.end.x} cy={route.end.y} r="11" />
            <circle className="v-port" cx={route.end.x} cy={route.end.y} r="6.5" />
          </g>;
        })}
      </svg>}

      <div className="v-source">
        <div className="v-globe-aura" />
        <div className="v-orbit v-orbit-one"><i /><i /></div>
        <div className="v-orbit v-orbit-two"><i /><i /></div>
        <div className="v-globe"><Image src="/images/wikipedia-globe.png" alt="A dimensional Wikipedia puzzle globe" width={1280} height={1280} priority sizes="(max-width: 759px) 90vw, 40vw" /></div>
        <div className="v-source-badge"><span className="v-wikipedia-w">W</span><span>Wikipedia</span><i /></div>
        <a ref={article} className="v-article" href={exchange?.edit.url ?? "https://en.wikipedia.org/wiki/Special:RecentChanges"} target="_blank" rel="noreferrer" aria-label={exchange ? `Wikipedia article: ${exchange.edit.title}` : "Wikipedia recent changes"}>
          <span className="v-article-eyebrow"><i />{exchange ? "JUST EDITED" : "LIVE WIKIPEDIA"}<ArrowUpRight size={18} /></span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={exchange?.edit.id ?? "waiting"} className="v-article-content" initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .22 }}>
              <h2 title={exchange?.edit.title}>{exchange?.edit.title ?? "The world is editing."}</h2>
              <div className="v-article-rule" />
              <p>{editSummary || (exchange ? "A new edit to the free encyclopedia." : "Waiting for the next real article…")}</p>
            </motion.div>
          </AnimatePresence>
          <span className="v-article-foot">From Wikipedia, the free encyclopedia</span>
        </a>
      </div>

      <div ref={hub} className={`v-hub ${deciding ? "deciding" : ""} ${result ? "answered" : ""}`}>
        <div className="v-hub-orbit"><i /><i /><i /></div>
        <div className="v-hub-ring" />
        <div className="v-hub-face">
          <Image className="v-openai-logo" src="/images/openai-blossom.svg" alt="" width={76} height={76} unoptimized />
          <span className="v-openai-name">OpenAI</span>
          <h2>Decisions API</h2>
          <div className={`v-answer ${result ? "has-answer" : ""}`} aria-live="polite">
            {result && chosen ? <><Check size={17} /><span>{chosen.label}</span><span className="v-answer-dot">·</span><b title="Measured server-to-OpenAI request round trip">{result.latencyMs}<small> ms</small></b></> : <><i />{deciding ? "Deciding…" : flow.error ? "Connection error" : !running ? "Paused" : exchange?.phase === "refused" ? "Edit declined" : "Ready to decide"}</>}
          </div>
        </div>
      </div>

      <div className="v-destinations">
        {categories.map(({ id }, index) => {
          const { label, color, Icon } = TOPICS[id];
          const selected = result?.category === id;
          return <div ref={(element) => { destinations.current[index] = element; }} key={id} className={`v-topic ${selected ? "selected" : ""}`} data-category={id} data-selected={selected} style={{ "--topic": color } as CSSProperties}>
            <span className="v-topic-medallion"><Icon size={36} strokeWidth={1.5} /></span>
            <div className="v-topic-copy"><h2>{label}</h2>{selected && <div className="v-topic-result"><motion.span key={exchange?.edit.id} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}><Check size={14} /><span>{exchange!.edit.title}</span></motion.span></div>}</div>
            <ArrowRight className="v-topic-arrow" size={24} strokeWidth={1.7} />
          </div>;
        })}
      </div>

      {geometry && <svg className="v-packets" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
        {flow.flights.map((flight) => {
          const route = flight.direction === "in" ? geometry.input : geometry.outputs[categories.findIndex((category) => category.id === flight.category)];
          return route ? <Packet key={flight.id} flight={flight} route={route} reduced={reduced} onComplete={flow.removeFlight} /> : null;
        })}
      </svg>}

      <div className="v-step v-step-source"><b>01</b> A live edit</div>
      <div className="v-step v-step-decision"><b>02</b> One decision</div>
      <div className="v-step v-step-topic"><b>03</b> The right topic</div>
    </div>

    {flow.error && <div className="v-error" role="alert"><span>{flow.error}</span><button onClick={flow.reconnect}><RotateCw size={15} />Retry</button></div>}
    {exchange?.phase === "refused" && <div className="v-error" role="status">OpenAI declined this edit. Waiting for the next one.</div>}
    <div className="v-footer"><span><i />Real Wikipedia. Real decisions.</span><Link href="/console">Console<ArrowUpRight size={15} /></Link></div>
    <p className="v-sr-only" aria-live="polite">{exchange ? `${exchange.edit.title}. ${chosen && result ? `OpenAI chose ${chosen.label} in ${result.latencyMs} milliseconds.` : deciding ? "Waiting for OpenAI's decision." : "Arriving from Wikipedia."}` : "Waiting for a live Wikipedia edit."}</p>
  </div>;
}
