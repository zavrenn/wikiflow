"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, DecisionResult, RoutedEdit, WikiEdit } from "./types";
import { ANSWER_HOLD_MS, INPUT_TRAVEL_MS, OUTPUT_TRAVEL_MS, SAMPLE_INTERVAL_MS } from "./decision-config";

export interface Flight {
  id: string;
  title: string;
  direction: "in" | "out";
  row: number;
  category?: Category;
  confidence?: number;
}

export interface DecisionExchange {
  edit: WikiEdit;
  phase: "sending" | "requesting" | "answered" | "routing" | "routed" | "paused" | "refused" | "error";
  result?: DecisionResult;
}

export interface FlowTiming {
  sampleInterval: number;
  inputTravel: number;
  answerHold: number;
  outputTravel: number;
}

const DEFAULT_TIMING: FlowTiming = {
  sampleInterval: SAMPLE_INTERVAL_MS, inputTravel: INPUT_TRAVEL_MS,
  answerHold: ANSWER_HOLD_MS, outputTravel: OUTPUT_TRAVEL_MS,
};

export function useWikiFlow(running: boolean, timing: FlowTiming = DEFAULT_TIMING) {
  const [connection, setConnection] = useState("connecting");
  const [sourceMode, setSourceMode] = useState("stream");
  const [incoming, setIncoming] = useState<WikiEdit[]>([]);
  const [history, setHistory] = useState<RoutedEdit[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [processing, setProcessing] = useState<WikiEdit | null>(null);
  const [exchange, setExchange] = useState<DecisionExchange | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const [received, setReceived] = useState(0);
  const [traffic, setTraffic] = useState<number[]>(Array(24).fill(0));
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [stats, setStats] = useState({ count: 0, latency: 0, confidence: 0, tokens: 0 });
  const [counts, setCounts] = useState<Record<Category, number>>({ technology: 0, science: 0, culture: 0, other: 0 });
  const recent = useRef<WikiEdit[]>([]);
  const seen = useRef(new Set<string>());

  const removeFlight = useCallback((id: string) => setFlights((current) => current.filter((flight) => flight.id !== id)), []);

  useEffect(() => {
    if (!running) return;
    let active = true;
    let blocked = false;
    let busy = 0;
    let pending: WikiEdit[] = [];
    let observedThisSecond = 0;
    let started = false;
    let first: ReturnType<typeof setTimeout> | undefined;
    const controllers = new Set<AbortController>();
    setError(null);
    setConnection("connecting");
    const source = new EventSource("/api/stream");

    const onEdit = (event: MessageEvent) => {
      try {
        const edit = JSON.parse(event.data) as WikiEdit;
        if (seen.current.has(edit.id)) return;
        seen.current.add(edit.id);
        if (seen.current.size > 1000) seen.current.delete(seen.current.values().next().value!);
        recent.current = [edit, ...recent.current].slice(0, 4);
        pending = [...pending, edit].slice(-12);
        setIncoming(recent.current);
        setReceived((value) => value + 1);
        observedThisSecond++;
        if (!started && !first) first = setTimeout(() => { first = undefined; void decide(); }, 250);
      } catch { /* Invalid stream events cannot enter the decision queue. */ }
    };
    source.addEventListener("edit", onEdit);
    source.addEventListener("status", (event) => {
      if (!active) return;
      const status = JSON.parse(event.data);
      setConnection(status.state);
      setSourceMode(status.mode);
    });
    source.onerror = () => { if (active) setConnection("retrying"); };

    async function decide() {
      if (!active || blocked || busy || !pending.length) return;
      // Sample the freshest edit; never build a delayed backlog behind the live feed.
      const edit = pending.pop()!;
      pending = [];
      started = true;
      const abort = new AbortController();
      controllers.add(abort);
      busy++;
      setInFlight(busy);
      setProcessing(edit);
      setExchange({ edit, phase: "sending" });
      setFlights((current) => [...current.slice(-5), { id: `${edit.id}-in`, title: edit.title, direction: "in", row: 0 }]);
      const wait = (ms: number) => new Promise<void>((resolve) => {
        const done = () => { clearTimeout(timer); abort.signal.removeEventListener("abort", done); resolve(); };
        const timer = setTimeout(done, ms);
        abort.signal.addEventListener("abort", done, { once: true });
      });
      try {
        await wait(timing.inputTravel);
        if (!active || abort.signal.aborted) return;
        setExchange({ edit, phase: "requesting" });
        const response = await fetch("/api/decide", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: edit.title, comment: edit.comment }), signal: abort.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          if (result.refused) { setExchange({ edit, phase: "refused" }); return; }
          throw new Error(result.error || "Could not classify the article.");
        }
        if (!active) return;
        const decision = result as DecisionResult;
        setExchange({ edit, phase: "answered", result: decision });
        const routed: RoutedEdit = { ...edit, ...decision, decidedAt: Date.now() };
        setHistory((current) => [routed, ...current].slice(0, 30));
        setCounts((current) => ({ ...current, [decision.category]: current[decision.category] + 1 }));
        setStats((current) => ({
          count: current.count + 1, latency: current.latency + decision.latencyMs,
          confidence: current.confidence + decision.confidence, tokens: current.tokens + decision.inputTokens,
        }));
        // The console can hold an answer for inspection. The 3D scene routes immediately.
        // Presentation time never enters the measured API latency.
        if (timing.answerHold > 0) await wait(timing.answerHold);
        if (!active || abort.signal.aborted) return;
        setExchange({ edit, phase: "routing", result: decision });
        setFlights((current) => [...current.slice(-5), { id: `${edit.id}-out`, title: edit.title, direction: "out", row: 0, category: decision.category, confidence: decision.confidence }]);
        await wait(timing.outputTravel);
        if (active && !abort.signal.aborted) setExchange({ edit, phase: "routed", result: decision });
      } catch (caught) {
        if (active && !abort.signal.aborted) {
          blocked = true;
          setExchange({ edit, phase: "error" });
          setError(caught instanceof Error ? caught.message : "The decision service is unavailable.");
        }
      } finally {
        controllers.delete(abort);
        busy--;
        if (active) { setInFlight(busy); if (!busy) setProcessing(null); }
      }
    }
    const interval = setInterval(() => void decide(), timing.sampleInterval);
    const trafficTimer = setInterval(() => {
      setTraffic((current) => [...current.slice(1), observedThisSecond]);
      observedThisSecond = 0;
    }, 1000);
    return () => {
      active = false;
      source.close();
      clearInterval(interval);
      clearInterval(trafficTimer);
      clearTimeout(first);
      controllers.forEach((controller) => controller.abort());
      setFlights([]);
      setProcessing(null);
      setExchange((current) => current ? { ...current, phase: "paused" } : null);
      setInFlight(0);
    };
  }, [running, retry, timing]);

  return {
    connection: running ? connection : "paused", sourceMode, incoming, history, flights, processing, exchange, inFlight,
    received, traffic, error, counts, stats, removeFlight, reconnect: () => setRetry((value) => value + 1),
  };
}
