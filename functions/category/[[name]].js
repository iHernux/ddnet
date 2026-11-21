import {
  CATEGORY_ORDER,
  DEFAULT_OG_IMAGE,
  LEGACY_CATEGORY_MAP,
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

function parseRawCategoryParam(pathname) {
  const prefix = '/category/';
  if (!pathname.startsWith(prefix)) return { trimmed: '', hasTrailingSlash: false };
  let rest = pathname.slice(prefix.length);
  let hasTrailingSlash = false;
  while (rest.endsWith('/')) {
    rest = rest.slice(0, -1);
    hasTrailingSlash = true;
  }
  if (!rest) return { trimmed: '', hasTrailingSlash };
  try {
    return { trimmed: decodeURIComponent(rest).trim(), hasTrailingSlash };
  } catch {
    return { trimmed: null, hasTrailingSlash };
  }
}

function buildCategorySsrHtml(category, catMaps, allCategories) {
  const topMaps = catMaps.slice(0, 30);
  const otherCats = allCategories.filter((c) => c !== category);

  return `<section id="ssrContent" class="ssr-block" data-ssr-type="category">
    <nav class="ssr-breadcrumb" aria-label="Breadcrumb">
      <a href="/">DDNet Archive</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(category)} Maps</span>
    </nav>
    <h1>${escapeHtml(category)} DDNet Maps (${catMaps.length})</h1>
    <p class="ssr-lead">
      Browse all <strong>${catMaps.length}</strong> official <strong>${escapeHtml(category)}</strong> maps in DDraceNetwork (DDNet), sorted by newest release.
    </p>
    <div class="ssr-cat-nav">
      ${otherCats
        .map(
          (c) =>
            `<a class="ssr-chip" href="/category/${encodeURIComponent(c)}">${escapeHtml(c)}</a>`
        )
        .join(' ')}
    </div>
    <ul class="ssr-map-grid">
      ${topMaps
        .map((m) => {
          const dateStr = toIsoDate(m.release);
          return `<li>
            <a href="/map/${encodeURIComponent(m.name)}"><strong>${escapeHtml(m.name)}</strong></a>
            <span>${m.difficulty}★ · ${m.points} pts${m.mapper ? ` · ${escapeHtml(m.mapper)}` : ''}${dateStr ? ` · ${escapeHtml(dateStr)}` : ''}</span>
          </li>`;
        })
        .join('')}
    </ul>
  </section>`;
}

function buildNotFoundSsrHtml(rawName) {
  return `<section id="ssrContent" class="ssr-block ssr-not-found" data-ssr-status="404">
    <h1>Category Not Found</h1>
    <p class="ssr-lead">No official DDNet category matching <strong>${escapeHtml(rawName || 'this URL')}</strong> was found.</p>
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
  const { trimmed, hasTrailingSlash } = parseRawCategoryParam(url.pathname);

  if (trimmed === '') {
    return Response.redirect(`${SITE_ORIGIN}/`, 301);
  }

  const [baseHtml, maps] = await Promise.all([
    fetchShellHtml(context),
    fetchCatalogMaps(context, url.origin).catch(() => null),
  ]);

  if (trimmed === null) {
    const html404 = injectSeoIntoHtml(baseHtml, {
      title: 'Category Not Found – DDNet Archive',
      description: 'The requested DDNet map category could not be found.',
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

  if (!maps) {
    return new Response(request.method === 'HEAD' ? null : baseHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    });
  }

  const availableSet = new Set(maps.map((m) => m.type));
  const known = CATEGORY_ORDER.filter((c) => availableSet.has(c));
  const extra = Array.from(availableSet)
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort((a, b) => a.localeCompare(b));
  const allCategories = [...known, ...extra];

  const lower = trimmed.toLowerCase();
  const mappedLegacy = LEGACY_CATEGORY_MAP[lower];
  const lookupLower = mappedLegacy ? mappedLegacy.toLowerCase() : lower;
  const canonicalCategory =
    allCategories.find((c) => c.toLowerCase() === lookupLower) || null;

  if (!canonicalCategory) {
    const html404 = injectSeoIntoHtml(baseHtml, {
      title: 'Category Not Found – DDNet Archive',
      description: `No official DDNet map category named "${trimmed}" exists in DDNet Archive.`,
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

  const canonicalPath = `/category/${encodeURIComponent(canonicalCategory)}`;
  if (hasTrailingSlash || url.pathname !== canonicalPath) {
    return Response.redirect(`${SITE_ORIGIN}${canonicalPath}${url.search}`, 301);
  }

  const catMaps = maps
    .filter((m) => m.type === canonicalCategory)
    .sort((a, b) => {
      const diff = parseReleaseMs(b.release) - parseReleaseMs(a.release);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

  let minPts = Infinity;
  let maxPts = 0;
  let minDiff = Infinity;
  let maxDiff = 0;
  for (const m of catMaps) {
    if (m.points < minPts) minPts = m.points;
    if (m.points > maxPts) maxPts = m.points;
    if (m.difficulty < minDiff) minDiff = m.difficulty;
    if (m.difficulty > maxDiff) maxDiff = m.difficulty;
  }
  if (!Number.isFinite(minPts)) minPts = 0;
  if (!Number.isFinite(minDiff)) minDiff = 0;

  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  const title = `${canonicalCategory} DDNet Maps (${catMaps.length} Maps) – DDNet Archive`;
  const description = `Browse all ${catMaps.length} official ${canonicalCategory} DDNet maps (${minDiff}–${maxDiff} stars, ${minPts}–${maxPts} points). Filter by difficulty or mapper and view live records on DDNet Archive.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'DDNet Archive', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: `${canonicalCategory} Maps`, item: canonicalUrl },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${canonicalCategory} DDNet Maps`,
        url: canonicalUrl,
        description,
        numberOfItems: catMaps.length,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: Math.min(30, catMaps.length),
          itemListElement: catMaps.slice(0, 30).map((m, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: m.name,
            url: `${SITE_ORIGIN}/map/${encodeURIComponent(m.name)}`,
          })),
        },
      },
    ],
  };

  const finalHtml = injectSeoIntoHtml(baseHtml, {
    title,
    description,
    canonical: canonicalUrl,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageHasDims: true,
    jsonLd,
    ssrHtml: buildCategorySsrHtml(canonicalCategory, catMaps, allCategories),
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
