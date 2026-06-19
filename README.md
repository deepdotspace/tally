# Tally

Live audience polls. A creator asks a question, shares a link or QR code, and the room watches the results fill in live. No sign-up for voters. Built for classrooms and events.

**Live: [tally.app.space](https://tally.app.space)** · MIT · Built on the [DeepSpace SDK](https://docs.deep.space)

## Quick start

Deploy your own copy in three commands:

```sh
npm install
npx deepspace login     # one-time, opens a browser tab
npx deepspace deploy    # → <name>.app.space
```

Auth, the database, real-time sync, and hosting all come from DeepSpace, so there's nothing else to configure. Your subdomain is the `name` field in `wrangler.toml`; change it for your own deployment.

Run it locally instead:

```sh
npm install
npx deepspace login
npx deepspace dev       # http://localhost:5173
```

## Commands

| Command | What it does |
|---|---|
| `npx deepspace dev` | Local dev server (Vite + Worker, HMR on `:5173`) |
| `npx deepspace deploy` | Deploy to `<name>.app.space` |
| `npx deepspace test` | Playwright smoke + API specs |
| `npm run test:unit` | Unit tests (vitest) |
| `npm run type-check` | `tsc --noEmit` |

## Features

- **Nine question types:** multiple choice, multi-select, word cloud, rating scale, NPS, ranking, numeric, quiz (with right answers and scoring), and audience Q&A.
- **Decks:** group questions into a deck and run them in sequence during a session.
- **Live results:** answers stream in over a WebSocket; the presenter view is built for a projector or shared screen.
- **Join anywhere:** the audience joins by link, room code, or QR. Voters are anonymous, with no account or email.
- **Q&A moderation:** collect audience questions, then approve, dismiss, or feature them from the moderation panel.
- **Export:** download results as CSV, free.
- **Results permalink:** every session keeps a shareable results page after it ends.
- **Optional AI assist:** any AI usage is billed to the creator, never to the audience.
- **Light and dark:** light is the primary theme; dark is used for projection and the voter view.

## How it works

A DeepSpace app on Cloudflare Workers. Each live session is a real-time room (a Durable Object): voters connect over a WebSocket, inputs are aggregated server-side, and every connected screen, the presenter and the phones, sees the tally update in the same tick. Voters are anonymous; only the creator signs in. The poll builder, decks, and saved sessions are stored in DeepSpace record collections with per-collection access rules.

## Tests

- **Unit tests** (vitest): aggregators, scoring, export, and poll/deck data helpers.
- **E2E** (Playwright): public landing, join page, gated library, and API/WebSocket smoke specs.

## License

MIT, see [LICENSE](LICENSE). Built with the [DeepSpace SDK](https://docs.deep.space).
