# WikiFlow

**The world edits. AI decides.**

Watch real Wikipedia edits flow through [OpenAI's Decisions API](https://developers.openai.com/api/docs/guides/decisions). A miniature 3D sorting machine sends each article to Technology, Science, Culture, or Other, using the actual API response.

![WikiFlow showing a live Wikipedia article classified by the Decisions API](docs/images/wikiflow.png)

## The idea

```text
Live Wikipedia edit → “Which topic?” → Decisions API answer → animated route
```

An article arrives from the Wikipedia globe on a conveyor. When it enters the OpenAI chamber, the app requests its topic. The response immediately colors the machine, lights the chosen track, and sends the same article into its category container. The label above the machine shows the actual choice and measured API round-trip time.

The detailed **[console](http://localhost:3000/console)** is also available, with confidence, latency, category probabilities, and an inspectable decision trail.

Built with **Next.js, React, TypeScript, Three.js, and React Three Fiber**. The detailed console uses SVG and Motion.

## Run locally

You need **Node.js 22+**, **npm 10+**, and your own OpenAI API key with access to the Decisions API. The app uses `gpt-6-luna`.

1. Clone or download this repository, open its directory, and install the locked dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env.local`:

   ```sh
   cp .env.example .env.local
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env.local`.

3. Open `.env.local` and set your key:

   ```dotenv
   OPENAI_API_KEY=your-openai-api-key
   ```

4. Start the app:

   ```sh
   npm run dev
   ```

Open **[localhost:3000](http://localhost:3000)**. The live pipeline starts automatically. Restart the server after changing the environment file.

The 3D presentation requires WebGL2. The detailed console is available at `/console`.

The key stays on the server. `.env.local` is excluded from Git, and visitors running a clone supply their own key.

## Watch the decision happen

- **An edit arrives:** one real article travels along the conveyor into the decision chamber.
- **OpenAI picks a topic:** the machine pulses while the actual request is pending.
- **The answer sets its path:** the chosen track lights immediately and carries the same article into its container.
- **See the speed:** the machine's label shows the measured server-to-OpenAI round trip in milliseconds.

The 3D scene samples about one edit every 4.5 seconds, with one request at a time. It adds no hold after the API responds. The conveyor and routing animations are separate from measured API latency. The console samples about every five seconds and holds responses briefly for inspection.

Use **Pause / Resume** or **Space** to control the pipeline. Pause disconnects the feed and stops new API calls; a request already received by OpenAI may still finish. Use the fullscreen button for recording.

## How it works

| File | Responsibility |
| --- | --- |
| `src/app/api/stream/route.ts` | Proxies Wikimedia EventStreams, filters article edits, and falls back to polling actual recent changes. |
| `src/app/api/decide/route.ts` | Calls `POST /v1/decisions` from the server with one `choice` question. |
| `src/lib/decision-config.ts` | Shares the visible question with the real API instructions and defines presentation timing. |
| `src/lib/use-wiki-flow.ts` | Samples the feed and coordinates the input, request, response, and routing phases. |
| `src/components/wiki-presentation.tsx` | Coordinates the 3D presentation, readable labels, controls, and live API answer. |
| `src/components/sorting-world.tsx` | Renders and animates the globe, conveyor, decision chamber, category tracks, and containers. |
| `src/components/wiki-flow.tsx` | Renders the detailed console at `/console`. |

The initial buffer contains actual recent edits. History stays in browser memory and resets on refresh. Topic distribution follows what people are editing, so some lanes may remain empty for a while.

The API classifies from the **article title and edit summary**, rather than fetching the full article. Latency measures the server-to-OpenAI round trip. Confidence and category probabilities are separate API fields.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run typecheck` | Generate route types and check TypeScript. |
| `npm run build` | Create a production build. |
| `npm start` | Serve the production build locally. |

GitHub Actions runs the type check and production build on pull requests and pushes to `main`. These checks require no API key and make no live OpenAI calls.

## Scope

This is a local demo using your own OpenAI account. It has in-memory state and no sign-in or database. Add access controls and request limits before hosting the key-backed API routes for other people.

## Sources and license

- Live events: [Wikimedia EventStreams](https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams_HTTP_Service).
- Classification: [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions).
- Application source: [MIT](LICENSE). Wikipedia content and dependencies retain their respective licenses.
