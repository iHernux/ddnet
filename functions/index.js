import {
  CATEGORY_ORDER,
  DEFAULT_OG_IMAGE,
  SITE_ORIGIN,
  encodeUriSegment,
  escapeHtml,
  fetchCatalogMaps,
  fetchShellHtml,
  injectSeoIntoHtml,
  parseReleaseMs,
  toIsoDate,
  truncateMeta,
} from './_shared/seo.js';

const CACHE_OK = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400';
const CACHE_FALLBACK = 'public, max-age=60, s-maxage=120';

export function buildHomeSsrHtml(maps) {
  const catCounts = new Map();
  for (const m of maps) {
    catCounts.set(m.type, (catCounts.get(m.type) || 0) + 1);
  }

  const orderedCats = CATEGORY_ORDER.map((name) => ({
    name,
    count: catCounts.get(name) || 0,
  }));

  const newestMaps = [...maps]
    .sort((a, b) => {
      const diff = parseReleaseMs(b.release) - parseReleaseMs(a.release);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    })
    .slice(0, 24);

  return `<section id="ssrContent" class="ssr-block" data-ssr-type="home">
    <h1>DDNet Archive – Official DDNet Map Catalog &amp; Player Stats</h1>
    <p class="ssr-lead">
      Explore <strong>${maps.length.toLocaleString('en-US')}</strong> official DDraceNetwork (DDNet) maps across <strong>${orderedCats.length}</strong> difficulty categories. Track live DDNet, KoG, and community servers, check player rankings and duo statistics, and browse custom Tee skins.
    </p>
    <nav class="ssr-cat-nav" aria-label="DDNet Map Categories">
      ${orderedCats
        .map(
          ({ name, count }) =>
            `<a class="ssr-chip" href="/category/${encodeUriSegment(name)}">${escapeHtml(name)} (${count})</a>`
        )
        .join(' ')}
    </nav>
    <nav class="ssr-actions" aria-label="DDNet Archive Sections" style="margin-bottom: 14px;">
      <a class="btn btn-sm" href="/?tab=servers">Live Servers</a>
      <a class="btn btn-sm" href="/?tab=players">Player Stats &amp; Duo</a>
      <a class="btn btn-sm" href="/?tab=skins">Skins Archive</a>
    </nav>
    <h2>Newest Official DDNet Maps</h2>
    <ul class="ssr-map-grid">
      ${newestMaps
        .map((m) => {
          const dateStr = toIsoDate(m.release);
          return `<li>
            <a href="/map/${encodeUriSegment(m.name)}"><strong>${escapeHtml(m.name)}</strong></a>
            <span>${escapeHtml(m.type)} · ${m.difficulty}★ · ${m.points} pts${m.mapper ? ` · ${escapeHtml(m.mapper)}` : ''}${dateStr ? ` · ${escapeHtml(dateStr)}` : ''}</span>
          </li>`;
        })
        .join('')}
    </ul>
  </section>`;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (url.pathname !== '/') {
    return context.next();
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const [baseHtml, maps] = await Promise.all([
    fetchShellHtml(context),
    fetchCatalogMaps(context, url.origin).catch(() => null),
  ]);

  if (!maps) {
    return new Response(request.method === 'HEAD' ? null : baseHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE_FALLBACK,
      },
    });
  }

  const description = truncateMeta(
    `Explore ${maps.length.toLocaleString('en-US')} official DDNet (DDraceNetwork) maps, live servers, player rankings, duo stats, and skins. Fast searchable catalog auto-synced with ddnet.org.`,
    158
  );

  const finalHtml = injectSeoIntoHtml(baseHtml, {
    title: 'DDNet Archive – Player Stats, Map Search & DDNet Data',
    description,
    canonical: `${SITE_ORIGIN}/`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'DDNet Archive — Official DDNet Map Catalog, Live Servers and Player Stats',
    ssrHtml: buildHomeSsrHtml(maps),
    replaceHomeH1: true,
  });

  return new Response(request.method === 'HEAD' ? null : finalHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': CACHE_OK,
    },
  });
}
