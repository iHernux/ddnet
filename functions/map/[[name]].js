import {
  DEFAULT_OG_IMAGE,
  SITE_ORIGIN,
  escapeAttr,
  escapeHtml,
  fetchCatalogMaps,
  fetchShellHtml,
  injectSeoIntoHtml,
  parseReleaseMs,
  toIsoDate,
} from '../_shared/seo.js';

const CACHE_OK = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400';
const CACHE_404 = 'public, max-age=60, s-maxage=300';

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
  const catUrl = `/category/${encodeURIComponent(map.type)}`;
  const releaseIso = toIsoDate(map.release);
  const sizeText = map.width && map.height ? `${map.width} × ${map.height}` : '—';
  const webPreview =
    map.webPreview || `https://ddnet.org/mappreview/?map=${encodeURIComponent(map.name)}`;
  const website = map.website || `https://ddnet.org/maps/${encodeURIComponent(map.name)}`;

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
                  `<li><a href="/map/${encodeURIComponent(rm.name)}">${escapeHtml(rm.name)}</a> <span>(${rm.difficulty}★ · ${rm.points} pts)</span></li>`
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
          <a class="btn btn-primary btn-sm" href="${escapeAttr(webPreview)}" target="_blank" rel="noopener noreferrer">Web Preview</a>
          <a class="btn btn-sm" href="${escapeAttr(website)}" target="_blank" rel="noopener noreferrer">Official DDNet Page</a>
          <a class="btn btn-sm" href="${escapeAttr(catUrl)}">All ${escapeHtml(map.type)} Maps</a>
        </div>
      </div>
    </div>
    ${tilesHtml}
    ${relatedHtml}
  </article>`;
}

function buildNotFoundSsrHtml(rawName) {
  return `<section id="ssrContent" class="ssr-block ssr-not-found" data-ssr-status="404">
    <h1>Map Not Found</h1>
    <p class="ssr-lead">No official DDNet map matching <strong>${escapeHtml(rawName || 'this URL')}</strong> was found in the catalog.</p>
    <div class="ssr-actions">
      <a class="btn btn-primary btn-sm" href="/">Browse All DDNet Maps</a>
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
      canonical: `${SITE_ORIGIN}/`,
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

  // If upstream maps.json failed transiently, serve app shell cleanly with 200 (no false 404)
  if (!maps) {
    return new Response(request.method === 'HEAD' ? null : baseHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    });
  }

  const lower = trimmed.toLowerCase();
  const map =
    maps.find((m) => m.name === trimmed) ||
    maps.find((m) => m.name.toLowerCase() === lower) ||
    null;

  if (!map) {
    const html404 = injectSeoIntoHtml(baseHtml, {
      title: `Map Not Found – DDNet Archive`,
      description: `No official DDNet map named "${trimmed}" exists in the DDNet Archive catalog.`,
      canonical: `${SITE_ORIGIN}/`,
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

  const canonicalPath = `/map/${encodeURIComponent(map.name)}`;
  if (hasTrailingSlash || url.pathname !== canonicalPath) {
    return Response.redirect(`${SITE_ORIGIN}${canonicalPath}${url.search}`, 301);
  }

  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  const releaseIso = toIsoDate(map.release);
  const title = `${map.name} (${map.type}, ${map.difficulty}★) – DDNet Map | DDNet Archive`;
  const description = `${map.name} is a ${map.difficulty}-star ${map.type} DDNet map${
    map.mapper ? ` by ${map.mapper}` : ''
  } worth ${map.points} points${
    releaseIso ? `, released ${releaseIso}` : ''
  }. View rankings, team records, tiles, and map preview on DDNet Archive.`;

  const relatedMaps = maps
    .filter((m) => m.type === map.type && m.name !== map.name)
    .sort((a, b) => {
      const diffGap = Math.abs(a.difficulty - map.difficulty) - Math.abs(b.difficulty - map.difficulty);
      if (diffGap !== 0) return diffGap;
      return parseReleaseMs(b.release) - parseReleaseMs(a.release);
    })
    .slice(0, 8);

  const ogImage = map.thumbnail || DEFAULT_OG_IMAGE;
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
            item: `${SITE_ORIGIN}/category/${encodeURIComponent(map.type)}`,
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
        genre: `DDNet ${map.type} Map`,
        ...(map.mapper ? { author: { '@type': 'Person', name: map.mapper } } : {}),
        ...(releaseIso ? { datePublished: releaseIso } : {}),
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
    ogImageHasDims: !map.thumbnail,
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
