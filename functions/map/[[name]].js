import {
  DEFAULT_OG_IMAGE,
  SITE_ORIGIN,
  encodeUriSegment,
  escapeAttr,
  escapeHtml,
  fetchCatalogMaps,
  fetchShellHtml,
  injectSeoIntoHtml,
  parseReleaseMs,
  toIsoDate,
  truncateMeta,
} from '../_shared/seo.js';
import {
  fetchMasterSnapshot,
  fetchStatusTwJson,
  inferLiveCategory,
} from '../_shared/live.js';

const CACHE_OK = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400';
const CACHE_COMMUNITY = 'public, max-age=60, s-maxage=180, stale-while-revalidate=600';
const CACHE_404 = 'public, max-age=60, s-maxage=300';

export function buildMapTitle(map) {
  const full = `${map.name} (${map.type}, ${map.difficulty}★) – DDNet Archive`;
  if (full.length <= 60) return full;
  const medium = `${map.name} – ${map.type} DDNet Map | DDNet Archive`;
  if (medium.length <= 60) return medium;
  const compact = `${map.name} – DDNet Archive`;
  if (compact.length <= 60) return compact;
  return truncateMeta(compact, 60);
}

function parseRawMapParam(pathname) {
  const prefix = '/map/';
  if (!pathname.startsWith(prefix)) return { rawEncoded: '', trimmed: '', hasTrailingSlash: false };
  let rest = pathname.slice(prefix.length);
  let hasTrailingSlash = false;
  while (rest.endsWith('/')) {
    rest = rest.slice(0, -1);
    hasTrailingSlash = true;
  }
  if (!rest) return { rawEncoded: '', trimmed: '', hasTrailingSlash };
  try {
    return {
      rawEncoded: rest,
      trimmed: decodeURIComponent(rest).trim(),
      hasTrailingSlash,
    };
  } catch {
    return { rawEncoded: rest, trimmed: null, hasTrailingSlash };
  }
}

function buildMapSsrHtml(map, relatedMaps) {
  const catUrl = `/category/${encodeUriSegment(map.type)}`;
  const releaseIso = toIsoDate(map.release);
  const sizeText = map.width && map.height ? `${map.width} × ${map.height}` : '—';
  const webPreview =
    map.webPreview || `https://ddnet.org/mappreview/?map=${encodeURIComponent(map.name)}`;
  const website = map.website || `https://ddnet.org/maps/${encodeUriSegment(map.name)}`;

  const tilesHtml =
    Array.isArray(map.tiles) && map.tiles.length > 0
      ? `<div class="ssr-tiles"><strong>Map Tiles:</strong> ${map.tiles
          .map((tile) => `<span class="ssr-chip">${escapeHtml(tile)}</span>`)
          .join(' ')}</div>`
      : '';

  const relatedHtml =
    relatedMaps.length > 0
      ? `<div class="ssr-related">
          <h2>More ${escapeHtml(map.type)} DDNet Maps</h2>
          <ul class="ssr-link-list">
            ${relatedMaps
              .map(
                (rm) =>
                  `<li><a href="/map/${encodeUriSegment(rm.name)}">${escapeHtml(rm.name)}</a> <span>(${rm.difficulty}★ · ${rm.points} pts)</span></li>`
              )
              .join('')}
          </ul>
        </div>`
      : '';

  return `<article id="ssrContent" class="ssr-block" data-ssr-type="map">
    <nav class="ssr-breadcrumb" aria-label="Breadcrumb">
      <a href="/">DDNet Archive</a>
      <span aria-hidden="true">/</span>
      <a href="${escapeAttr(catUrl)}">${escapeHtml(map.type)}</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(map.name)}</span>
    </nav>
    <div class="ssr-map-header">
      ${
        map.thumbnail
          ? `<img class="ssr-map-thumb" src="${escapeAttr(map.thumbnail)}" alt="${escapeAttr(`${map.name} DDNet map thumbnail`)}" width="360" height="225" />`
          : ''
      }
      <div class="ssr-map-info">
        <h1>${escapeHtml(map.name)}</h1>
        <p class="ssr-lead">
          <strong>${escapeHtml(map.name)}</strong> is a ${map.difficulty}-star
          <a href="${escapeAttr(catUrl)}">${escapeHtml(map.type)}</a> DDNet map${
            map.mapper
              ? ` created by <a href="/?mapper=${encodeURIComponent(map.mapper)}">${escapeHtml(map.mapper)}</a>`
              : ''
          }, worth <strong>${map.points} points</strong>${releaseIso ? ` (released ${escapeHtml(releaseIso)})` : ''}.
        </p>
        <dl class="ssr-meta-list">
          <div><dt>Category</dt><dd><a href="${escapeAttr(catUrl)}">${escapeHtml(map.type)}</a></dd></div>
          <div><dt>Difficulty</dt><dd>${map.difficulty} / 5 Stars</dd></div>
          <div><dt>Points</dt><dd>${map.points}</dd></div>
          <div><dt>Size</dt><dd>${escapeHtml(sizeText)}</dd></div>
          ${map.mapper ? `<div><dt>Mapper</dt><dd>${escapeHtml(map.mapper)}</dd></div>` : ''}
          ${releaseIso ? `<div><dt>Released</dt><dd>${escapeHtml(releaseIso)}</dd></div>` : ''}
        </dl>
        <div class="ssr-actions">
          <a class="btn btn-primary btn-sm" rel="nofollow" href="${escapeAttr(`/api/download?name=${encodeURIComponent(map.name)}&type=${encodeURIComponent(map.type)}&source=ddnet`)}" download="${escapeAttr(`${map.name}.map`)}">Download .map</a>
          <a class="btn btn-sm" href="${escapeAttr(webPreview)}" target="_blank" rel="noopener noreferrer">Web Preview</a>
          <a class="btn btn-sm" href="${escapeAttr(website)}" target="_blank" rel="noopener noreferrer">Official DDNet Page</a>
          <a class="btn btn-sm" href="${escapeAttr(catUrl)}">All ${escapeHtml(map.type)} Maps</a>
        </div>
      </div>
    </div>
    ${tilesHtml}
    ${relatedHtml}
  </article>`;
}

function buildCommunityMapSsrHtml(mapName, info) {
  const modeLabel = info.gameType || info.category || 'Community';
  const commLabel = info.communityName || 'Community Servers';
  const firstSeenIso = toIsoDate(info.firstSeen);

  return `<article id="ssrContent" class="ssr-block" data-ssr-type="community-map">
    <nav class="ssr-breadcrumb" aria-label="Breadcrumb">
      <a href="/">DDNet Archive</a>
      <span aria-hidden="true">/</span>
      <a href="/?tab=servers">Servers</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(mapName)}</span>
    </nav>
    <div class="ssr-map-info">
      <h1>${escapeHtml(mapName)}</h1>
      <p class="ssr-lead">
        <strong>${escapeHtml(mapName)}</strong> is a live community <strong>${escapeHtml(info.category)}</strong> map
        (${escapeHtml(modeLabel)}) hosted on <strong>${escapeHtml(commLabel)}</strong>,
        currently active on <strong>${info.liveServers}</strong> server${info.liveServers === 1 ? '' : 's'} with
        <strong>${info.livePlayers}</strong> online player${info.livePlayers === 1 ? '' : 's'}.
      </p>
      <dl class="ssr-meta-list">
        <div><dt>Category</dt><dd>${escapeHtml(info.category)}</dd></div>
        <div><dt>Mode</dt><dd>${escapeHtml(modeLabel)}</dd></div>
        <div><dt>Community</dt><dd>${escapeHtml(commLabel)}</dd></div>
        <div><dt>Online Players</dt><dd>${info.livePlayers}</dd></div>
        <div><dt>Live Servers</dt><dd>${info.liveServers}</dd></div>
        ${firstSeenIso ? `<div><dt>Tracked Since</dt><dd>${escapeHtml(firstSeenIso)}</dd></div>` : ''}
      </dl>
      <div class="ssr-actions">
        <a class="btn btn-primary btn-sm" href="/?tab=servers">Browse Live Servers</a>
        <a class="btn btn-sm" href="/">All Maps</a>
      </div>
    </div>
  </article>`;
}

function buildNotFoundSsrHtml(rawName) {
  return `<section id="ssrContent" class="ssr-block ssr-not-found" data-ssr-status="404">
    <h1>Map Not Found</h1>
    <p class="ssr-lead">No official DDNet or live community map matching <strong>${escapeHtml(rawName || 'this URL')}</strong> was found.</p>
    <div class="ssr-actions">
      <a class="btn btn-primary btn-sm" href="/">Browse All DDNet Maps</a>
    </div>
  </section>`;
}

function buildUpstreamErrorSsrHtml() {
  return `<section id="ssrContent" class="ssr-block ssr-not-found" data-ssr-status="503">
    <h1>Catalog Temporarily Unavailable</h1>
    <p class="ssr-lead">The upstream DDNet map catalog is temporarily unreachable. Please retry in a moment.</p>
    <div class="ssr-actions">
      <a class="btn btn-primary btn-sm" href="/">Return Home</a>
    </div>
  </section>`;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const { trimmed, hasTrailingSlash } = parseRawMapParam(url.pathname);

  if (trimmed === '') {
    return Response.redirect(`${SITE_ORIGIN}/`, 301);
  }

  const [baseHtml, maps] = await Promise.all([
    fetchShellHtml(context),
    fetchCatalogMaps(context, url.origin).catch(() => null),
  ]);

  if (trimmed === null) {
    const html404 = injectSeoIntoHtml(baseHtml, {
      title: 'Map Not Found – DDNet Archive',
      description: 'The requested DDNet map could not be found in the official catalog.',
      canonical: null,
      robots: 'noindex, follow',
      ssrHtml: buildNotFoundSsrHtml(url.pathname),
      replaceHomeH1: true,
    });
    return new Response(request.method === 'HEAD' ? null : html404, {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE_404,
      },
    });
  }

  if (!maps) {
    const html503 = injectSeoIntoHtml(baseHtml, {
      title: 'Catalog Temporarily Unavailable – DDNet Archive',
      description: 'The DDNet map catalog is temporarily unavailable. Please try again shortly.',
      canonical: null,
      robots: 'noindex, nofollow',
      ssrHtml: buildUpstreamErrorSsrHtml(),
      replaceHomeH1: true,
    });
    return new Response(request.method === 'HEAD' ? null : html503, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '60',
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'no-store',
      },
    });
  }

  const lower = trimmed.toLowerCase();
  const map =
    maps.find((m) => m.name === trimmed) ||
    maps.find((m) => m.name.toLowerCase() === lower) ||
    null;

  if (!map) {
    const [snapshot, statusRes] = await Promise.all([
      fetchMasterSnapshot(context, url.origin).catch(() => null),
      fetchStatusTwJson(`/map/name/${encodeURIComponent(trimmed)}`, 3500),
    ]);

    const masterMatches = snapshot
      ? snapshot.servers.filter((s) => s.mapName && s.mapName.toLowerCase() === lower)
      : [];
    const hasStatus = Boolean(statusRes.ok && statusRes.data && statusRes.data.name);

    if (masterMatches.length === 0 && !hasStatus) {
      const html404 = injectSeoIntoHtml(baseHtml, {
        title: 'Map Not Found – DDNet Archive',
        description: truncateMeta(
          `No official DDNet map named "${trimmed}" exists in the DDNet Archive catalog.`,
          158
        ),
        canonical: null,
        robots: 'noindex, follow',
        ssrHtml: buildNotFoundSsrHtml(trimmed),
        replaceHomeH1: true,
      });
      return new Response(request.method === 'HEAD' ? null : html404, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': CACHE_404,
        },
      });
    }

    const canonicalName = statusRes.data?.name || masterMatches[0]?.mapName || trimmed;
    const canonicalPath = `/map/${encodeUriSegment(canonicalName)}`;
    if (hasTrailingSlash || url.pathname !== canonicalPath) {
      return Response.redirect(`${SITE_ORIGIN}${canonicalPath}${url.search}`, 301);
    }

    const firstMaster = masterMatches.find((s) => s.community !== 'other') || masterMatches[0];
    const primaryCommunity = firstMaster?.community || 'other';
    const communityName = firstMaster?.communityName || 'Community Servers';
    const gameType =
      firstMaster?.gameType || statusRes.data?.servers?.[0]?.gameType?.name || '';
    const category = inferLiveCategory(gameType, canonicalName, primaryCommunity);
    const liveServers = Math.max(masterMatches.length, Number(statusRes.data?.numServers || 0));
    const livePlayers = Math.max(
      masterMatches.reduce((acc, s) => acc + s.players, 0),
      Number(statusRes.data?.numPlayers || statusRes.data?.numClients || 0)
    );
    const firstSeen = typeof statusRes.data?.createdAt === 'string' ? statusRes.data.createdAt : '';

    const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
    const title = truncateMeta(
      `${canonicalName} (${category}) – Live Server | DDNet Archive`,
      60
    );
    const description = truncateMeta(
      `${canonicalName} is a live ${category} (${gameType || category}) map across ${liveServers} server(s) with ${livePlayers} players online right now.`,
      158
    );

    const finalHtml = injectSeoIntoHtml(baseHtml, {
      title,
      description,
      canonical: canonicalUrl,
      ogImage: DEFAULT_OG_IMAGE,
      ogImageHasDims: true,
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: `${canonicalName} – DDNet Archive`,
      robots: 'noindex, follow',
      ssrHtml: buildCommunityMapSsrHtml(canonicalName, {
        category,
        gameType,
        communityName,
        liveServers,
        livePlayers,
        firstSeen,
      }),
      replaceHomeH1: true,
    });

    return new Response(request.method === 'HEAD' ? null : finalHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE_COMMUNITY,
      },
    });
  }

  const canonicalPath = `/map/${encodeUriSegment(map.name)}`;
  if (hasTrailingSlash || url.pathname !== canonicalPath) {
    return Response.redirect(`${SITE_ORIGIN}${canonicalPath}${url.search}`, 301);
  }

  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  const releaseIso = toIsoDate(map.release);
  const title = buildMapTitle(map);
  const description = truncateMeta(
    `${map.name} is a ${map.difficulty}-star ${map.type} DDNet map${
      map.mapper ? ` by ${map.mapper}` : ''
    } worth ${map.points} points${
      releaseIso ? `, released ${releaseIso}` : ''
    }. View rankings, records, tiles, and preview on DDNet Archive.`,
    158
  );

  const relatedMaps = maps
    .filter((m) => m.type === map.type && m.name !== map.name)
    .sort((a, b) => {
      const diffGap = Math.abs(a.difficulty - map.difficulty) - Math.abs(b.difficulty - map.difficulty);
      if (diffGap !== 0) return diffGap;
      return parseReleaseMs(b.release) - parseReleaseMs(a.release);
    })
    .slice(0, 8);

  const authors = map.mapper
    ? map.mapper
        .split(/\s*(?:,|&)\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ '@type': 'Person', name }))
    : [];

  const hasThumb = Boolean(map.thumbnail);
  const ogImage = hasThumb ? map.thumbnail : DEFAULT_OG_IMAGE;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'DDNet Archive', item: `${SITE_ORIGIN}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: `${map.type} Maps`,
            item: `${SITE_ORIGIN}/category/${encodeUriSegment(map.type)}`,
          },
          { '@type': 'ListItem', position: 3, name: map.name, item: canonicalUrl },
        ],
      },
      {
        '@type': 'CreativeWork',
        name: map.name,
        url: canonicalUrl,
        description,
        image: ogImage,
        inLanguage: 'en',
        genre: `DDNet ${map.type} Map`,
        ...(hasThumb ? { thumbnailUrl: map.thumbnail } : {}),
        ...(Array.isArray(map.tiles) && map.tiles.length > 0 ? { keywords: map.tiles } : {}),
        ...(authors.length > 0 ? { author: authors } : {}),
        ...(releaseIso ? { datePublished: releaseIso } : {}),
        about: {
          '@type': 'VideoGame',
          name: 'DDraceNetwork (DDNet)',
          url: 'https://ddnet.org/',
        },
        isPartOf: {
          '@type': 'WebSite',
          name: 'DDNet Archive',
          url: `${SITE_ORIGIN}/`,
        },
      },
    ],
  };

  const finalHtml = injectSeoIntoHtml(baseHtml, {
    title,
    description,
    canonical: canonicalUrl,
    ogImage,
    ogImageHasDims: true,
    ogImageWidth: hasThumb ? 360 : 1200,
    ogImageHeight: hasThumb ? 225 : 630,
    ogImageAlt: hasThumb ? `${map.name} DDNet map preview` : `${map.name} – DDNet Archive`,
    jsonLd,
    ssrHtml: buildMapSsrHtml(map, relatedMaps),
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
