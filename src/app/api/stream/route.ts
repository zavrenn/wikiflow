import type { WikiEdit } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recentChangesUrl = "https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcnamespace=0&rctype=edit%7Cnew&rcshow=!bot&rclimit=20&rcprop=title%7Ctimestamp%7Ccomment%7Csizes%7Cids&format=json";
const headers = { "User-Agent": "WikiFlow/0.1 (live Wikipedia topic visualization; personal demo)" };

export async function GET(request: Request) {
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;
  const seen = new Set<string>();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        if (closed || abort.signal.aborted) return;
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { closed = true; abort.abort(); }
      }
      function emit(edit: WikiEdit) {
        if (seen.has(edit.id)) return;
        seen.add(edit.id);
        if (seen.size > 500) seen.delete(seen.values().next().value!);
        send("edit", edit);
      }
      async function pollRecent() {
        const response = await fetch(recentChangesUrl, { headers, cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]) });
        if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
        const data = await response.json();
        if (!data.query?.recentchanges) throw new Error("Wikipedia did not return recent changes");
        for (const change of [...data.query.recentchanges].reverse()) {
          emit({
            id: String(change.revid || change.rcid), title: change.title,
            comment: change.comment || "", timestamp: Date.parse(change.timestamp),
            delta: (change.newlen ?? 0) - (change.oldlen ?? 0),
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(change.title.replaceAll(" ", "_"))}`,
          });
        }
      }
      send("status", { state: "connecting", mode: "stream" });
      heartbeat = setInterval(() => send("heartbeat", { time: Date.now() }), 15000);

      void (async () => {
        // A small real recent-edit buffer makes the first frame useful while SSE connects.
        try { await pollRecent(); } catch { /* The live SSE stream can still connect. */ }
        let failures = 0;
        while (!abort.signal.aborted) {
          try {
            const upstream = await fetch("https://stream.wikimedia.org/v2/stream/recentchange", {
              headers: { ...headers, Accept: "text/event-stream" }, cache: "no-store",
              signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90000)]),
            });
            if (!upstream.ok || !upstream.body) throw new Error("Stream connection unavailable");
            send("status", { state: "connected", mode: "stream" });
            failures = 0;
            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            try {
              while (!abort.signal.aborted) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
                let boundary: number;
                while ((boundary = buffer.indexOf("\n\n")) !== -1) {
                  const block = buffer.slice(0, boundary);
                  buffer = buffer.slice(boundary + 2);
                  const json = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
                  if (!json) continue;
                  try {
                    const event = JSON.parse(json);
                    if (event.server_name !== "en.wikipedia.org" || event.namespace !== 0 || event.bot || !["edit", "new"].includes(event.type) || event.meta?.domain === "canary") continue;
                    emit({
                      id: String(event.revision?.new || event.id), title: event.title,
                      comment: event.comment || "", timestamp: event.timestamp * 1000,
                      delta: (event.length?.new ?? 0) - (event.length?.old ?? 0),
                      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(event.title.replaceAll(" ", "_"))}`,
                    });
                  } catch { /* Ignore malformed stream frames. */ }
                }
              }
            } finally { await reader.cancel().catch(() => undefined); }
          } catch {
            if (abort.signal.aborted) break;
            failures++;
            // Wikimedia SSE is blocked on some networks. Continue with genuine recent edits.
            try {
              await pollRecent();
              send("status", { state: "connected", mode: "poll" });
            } catch {
              send("status", { state: "retrying", mode: "stream", message: "Reconnecting to Wikipedia…" });
            }
            await new Promise<void>((resolve) => {
              const done = () => { clearTimeout(timer); abort.signal.removeEventListener("abort", done); resolve(); };
              const timer = setTimeout(done, Math.min(failures * 2000, 8000));
              abort.signal.addEventListener("abort", done, { once: true });
            });
          }
        }
        closed = true;
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* Client already disconnected. */ }
      })();
    },
    cancel() { closed = true; clearInterval(heartbeat); abort.abort(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
