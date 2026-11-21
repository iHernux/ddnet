import {
  CATEGORY_ORDER,
  SITE_ORIGIN,
  escapeXml,
  fetchCatalogMaps,
  parseReleaseMs,
  toIsoDate,
} from './_shared/seo.js';

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400';

function buildUrlEntry(loc, { lastmod = '', changefreq = '', priority = '' } = {}) {
  const parts = [`<url><loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${escapeXml(lastmod)}</lastmod>`);
  if (changefreq) parts.push(`<changefreq>${escapeXml(changefreq)}</changefreq>`);
  if (priority) parts.push(`<priority>${escapeXml(priority)}</priority>`);
  parts.push('</url>');
  return parts.join('');
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/sitemap.xml`, { method: 'GET' });

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      if (request.method === 'HEAD') {
        return new Response(null, { status: cached.status, headers: cached.headers });
      }
      return cached;
    }
  }

  try {
    const maps = await fetchCatalogMaps(context, url.origin);

    let globalLatestMs = 0;
    const catLatestMs = new Map();

    for (const m of maps) {
      const ms = parseReleaseMs(m.release);
      if (ms > globalLatestMs) globalLatestMs = ms;
      const prevCatMs = catLatestMs.get(m.type) || 0;
      if (ms > prevCatMs) {
        catLatestMs.set(m.type, ms);
      } else if (!catLatestMs.has(m.type)) {
        catLatestMs.set(m.type, 0);
      }
    }

    const globalLastmod = globalLatestMs ? new Date(globalLatestMs).toISOString().slice(0, 10) : '';

    const knownCats = CATEGORY_ORDER.filter((c) => catLatestMs.has(c));
    const extraCats = Array.from(catLatestMs.keys())
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort((a, b) => a.localeCompare(b));
    const orderedCats = [...knownCats, ...extraCats];

    const entries = [];
    entries.push(
      buildUrlEntry(`${SITE_ORIGIN}/`, {
        lastmod: globalLastmod,
        changefreq: 'daily',
        priority: '1.0',
      })
    );

    for (const cat of orderedCats) {
      const catMs = catLatestMs.get(cat) || globalLatestMs;
      const catLastmod = catMs ? new Date(catMs).toISOString().slice(0, 10) : '';
      entries.push(
        buildUrlEntry(`${SITE_ORIGIN}/category/${encodeURIComponent(cat)}`, {
          lastmod: catLastmod,
          changefreq: 'daily',
          priority: '0.9',
        })
      );
    }

    // Sort maps newest-first so Googlebot discovers fresh releases at the top of the sitemap
    const sortedMaps = [...maps].sort((a, b) => {
      const diff = parseReleaseMs(b.release) - parseReleaseMs(a.release);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    for (const m of sortedMaps) {
      entries.push(
        buildUrlEntry(`${SITE_ORIGIN}/map/${encodeURIComponent(m.name)}`, {
          lastmod: toIsoDate(m.release),
          changefreq: 'weekly',
          priority: '0.7',
        })
      );
    }

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      entries.join('\n') +
      '\n</urlset>\n';

    const headers = {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
    };

    const fullResponse = new Response(xml, { status: 200, headers });

    if (edgeCache) {
      const putPromise = edgeCache.put(cacheKey, fullResponse.clone());
      if (typeof context.waitUntil === 'function') {
        context.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }
    return fullResponse;
  } catch {
    // Graceful minimal fallback sitemap if ddnet.org is temporarily unreachable
    const fallbackXml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      buildUrlEntry(`${SITE_ORIGIN}/`, { changefreq: 'daily', priority: '1.0' }) +
      '\n</urlset>\n';
    const headers = {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300',
    };
    return new Response(request.method === 'HEAD' ? null : fallbackXml, { status: 200, headers });
  }
}
