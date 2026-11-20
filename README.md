# DDNet Archive

Zero-build web archive for DDNet maps, leaderboards, live server stats, and player profiles, powered by Cloudflare Pages and Pages Functions.

## Architecture

- **Frontend:** Vanilla HTML/CSS/ES Modules (`index.html`, `assets/*`) with no bundler required.
- **Auto-Synced Map Catalog (`/api/maps`):** Fetches `https://ddnet.org/releases/maps.json`, normalizes fields, and caches at the Cloudflare Edge (`s-maxage=1800`, `stale-while-revalidate=86400`), so newly released maps appear automatically without repository commits.
- **Map Details (`/api/map?name=...`):** Edge-cached proxy for `ddnet.org/maps/?json=...` with proper 404 normalization.
- **Player Search & Profiles (`/api/player?query=...` / `?name=...`):** Edge-cached proxy for player autocomplete and full stats (`ddnet.org/players/`).
- **Live Network Status (`/api/online`):** Edge-cached aggregator over `master1.ddnet.org/ddnet/15/servers.json` for active player/server counts and currently popular maps.

## Local Development

```bash
npx wrangler pages dev .
```

Open `http://localhost:8788` in your browser.
