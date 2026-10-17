"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AudioLines, ArrowUpRight, Check, Cpu, FlaskConical, Globe2, Maximize2, Minimize2, Pause, Play, RotateCw, Shapes } from "lucide-react";
import { Component, createRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { categories } from "@/lib/types";
import { useWikiFlow, type FlowTiming } from "@/lib/use-wiki-flow";
import type { SortingLabelRefs } from "./sorting-world";
import "./wiki-presentation.css";

export const SORTING_TIMING: FlowTiming = { sampleInterval: 4500, inputTravel: 1100, answerHold: 0, outputTravel: 1500 };
const ICONS = { technology: Cpu, science: FlaskConical, culture: Shapes, other: Globe2 };
const SortingWorld = dynamic(() => import("./sorting-world"), { ssr: false, loading: () => <div className="s-loading"><span />Preparing the scene…</div> });

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() {
    if (this.state.failed) return <div className="s-loading s-scene-error"><p>Couldn’t open the 3D scene.</p><button onClick={() => this.setState({ failed: false })}>Try again</button><Link href="/console">Open the live console <ArrowUpRight size={16} /></Link></div>;
    return this.props.children;
  }
}

export function WikiPresentation() {
  const [running, setRunning] = useState(true);
  const [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [arrivals, setArrivals] = useState({ technology: 0, science: 0, culture: 0, other: 0 });
  const shell = useRef<HTMLDivElement>(null);
  const delivered = useRef(new Set<string>());
  const flow = useWikiFlow(running && ready, SORTING_TIMING);
  const reduced = useReducedMotion();
  const exchange = flow.exchange;
  const result = exchange?.result;
  const chosen = categories.find((item) => item.id === result?.category);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => setReady(false), []);
  const labels = useMemo<SortingLabelRefs>(() => ({
    source: createRef<HTMLDivElement>(), machine: createRef<HTMLDivElement>(), article: createRef<HTMLAnchorElement>(),
    destinations: categories.map(() => createRef<HTMLDivElement>()),
  }), []);

  useEffect(() => {
    if (exchange?.phase !== "routed" || !exchange.result || delivered.current.has(exchange.edit.id)) return;
    delivered.current.add(exchange.edit.id);
    const category = exchange.result.category;
    setArrivals((current) => ({ ...current, [category]: current[category] + 1 }));
  }, [exchange]);

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
    } catch { /* The scene remains usable when fullscreen is unavailable. */ }
  }

  return <div ref={shell} className={`s-shell ${running ? "s-playing" : "s-paused"}`} data-phase={exchange?.phase ?? "waiting"} style={{ "--s-accent": chosen?.color ?? "#badb87" } as CSSProperties}>
    <header className="s-topbar">
      <Link href="/" className="s-brand" aria-label="WikiFlow home"><AudioLines size={27} strokeWidth={1.7} />wiki<span>flow</span><span className="s-brand-period">.</span></Link>
      <div className="s-controls"><span className={`s-live ${running && ready && flow.connection === "connected" ? "connected" : ""}`}><i />{!running ? "PAUSED" : !ready ? "LOADING" : flow.connection === "connected" ? "LIVE" : "CONNECTING"}</span><button className="s-control" onClick={() => setRunning((current) => !current)} aria-label={running ? "Pause presentation and API calls" : "Resume presentation"}>{running ? <Pause size={16} /> : <Play size={16} />}<span>{running ? "Pause" : "Resume"}</span></button><button className="s-control s-expand" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
    </header>

    <div className="s-canvas" role="img" aria-label="A 3D sorting machine: live Wikipedia articles enter the OpenAI Decisions API and travel to the category it returns.">
      <SceneBoundary onFailure={onFailure}><SortingWorld exchange={exchange} running={running} reduced={!!reduced} arrivals={arrivals} labels={labels} inputTravel={SORTING_TIMING.inputTravel} outputTravel={SORTING_TIMING.outputTravel} onReady={onReady} /></SceneBoundary>
    </div>

    <div className="s-labels" aria-hidden={!ready}>
      <div className="s-world-label s-source-label" ref={labels.source}><span className="s-wiki-mark">W</span><span>Wikipedia</span><i /></div>
      <div className={`s-world-label s-machine-label ${result ? "has-result" : ""}`} ref={labels.machine}><span className="s-openai">OpenAI</span><h1>Decisions API</h1><div className="s-api-answer" aria-live="polite">{chosen && result ? <><Check size={19} /><b>{chosen.id === "other" ? "Other" : chosen.label}</b><span className="s-latency" title="Measured server-to-OpenAI request round trip">{result.latencyMs}<small>ms</small></span></> : <span className={`s-api-wait ${exchange?.phase === "requesting" ? "requesting" : ""}`}><i />{exchange?.phase === "requesting" ? "Deciding…" : !running ? "Paused" : "Which topic?"}</span>}</div></div>
      <a className={`s-world-label s-article ${exchange ? "has-article" : ""}`} ref={labels.article} href={exchange?.edit.url ?? "https://en.wikipedia.org/wiki/Special:RecentChanges"} target="_blank" rel="noreferrer" aria-label={exchange ? `Wikipedia article: ${exchange.edit.title}` : "Wikipedia recent changes"}><span className="s-article-mark">W</span><span className="s-article-title">{exchange?.edit.title ?? ""}</span></a>
      {categories.map((category, index) => {
        const Icon = ICONS[category.id];
        const selected = chosen?.id === category.id;
        return <div className={`s-world-label s-topic ${selected ? "selected" : ""}`} ref={labels.destinations[index]} key={category.id} style={{ "--topic": category.color } as CSSProperties}><span className="s-topic-icon"><Icon size={27} strokeWidth={1.6} /></span><span>{category.id === "other" ? "Other" : category.label}</span>{selected && <Check className="s-topic-check" size={19} />}</div>;
      })}
    </div>

    {flow.error && <div className="s-error" role="alert"><span>{flow.error}</span><button onClick={flow.reconnect}><RotateCw size={15} />Retry</button></div>}
    {exchange?.phase === "refused" && <div className="s-error" role="status">OpenAI declined this edit. Waiting for the next one.</div>}
    <div className="s-footer"><span><i />Live Wikipedia. Real decisions.</span><Link href="/console">Console<ArrowUpRight size={15} /></Link></div>
    <p className="s-sr-only" aria-live="polite">{exchange ? `${exchange.edit.title}. ${chosen && result ? `OpenAI chose ${chosen.label} in ${result.latencyMs} milliseconds.` : exchange.phase === "requesting" ? "Waiting for OpenAI's decision." : "Arriving from Wikipedia."}` : "Waiting for a live Wikipedia edit."}</p>
  </div>;
}
