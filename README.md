# WikiFlow

**A world of edits. A stream of decisions.**

Watch real Wikipedia edits flow through [OpenAI's Decisions API](https://developers.openai.com/api/docs/guides/decisions). For each selected article, WikiFlow shows the question, the returned topic and confidence, and an animated route into Technology, Science, Culture, or Everything else.

![WikiFlow showing a live Wikipedia article classified by the Decisions API](docs/images/wikiflow.png)

## The idea

```text
Live Wikipedia edit → “Which topic?” → Decisions API answer → animated route
```

The center of the scene shows a real API exchange. The returned choice determines the route. Article titles, classifications, probabilities, confidence, and latency come from live data and actual requests.

Built with **Next.js, React, TypeScript, SVG, and Motion**.

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

The key stays on the server. `.env.local` is excluded from Git, and visitors running a clone supply their own key.

## Watch the decision happen

- **Incoming edits:** real, non-bot edits to English Wikipedia articles.
- **OpenAI Decisions API:** the selected article stays pinned while the panel shows the question, allowed choices, and actual response.
- **The route:** the returned category highlights, then the article flows into its matching lane.
- **Decision trail:** click a row to inspect the per-category probabilities and the separate confidence value.

One edit is selected about every five seconds. A short hold after each answer makes the sequence readable in a recording. That presentation time is separate from the measured API latency.

Use **Pause / Resume** or **Space** to control the pipeline. Pause disconnects the feed and stops new API calls; a request already received by OpenAI may still finish. Use the fullscreen button for recording.

## How it works

| File | Responsibility |
| --- | --- |
| `src/app/api/stream/route.ts` | Proxies Wikimedia EventStreams, filters article edits, and falls back to polling actual recent changes. |
| `src/app/api/decide/route.ts` | Calls `POST /v1/decisions` from the server with one `choice` question. |
| `src/lib/decision-config.ts` | Shares the visible question with the real API instructions and defines presentation timing. |
| `src/lib/use-wiki-flow.ts` | Samples the feed and coordinates the input, request, response, and routing phases. |
| `src/components/wiki-flow.tsx` | Renders the SVG paths, animated cards, live API panel, metrics, and decision trail. |

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
