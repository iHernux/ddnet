export const SITE_ORIGIN = 'https://ddnet-archive.xyz';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;
export const MAPS_UPSTREAM_URL = 'https://ddnet.org/releases/maps.json';

export const CATEGORY_ORDER = [
  'Novice',
  'Moderate',
  'Brutal',
  'Insane',
  'Dummy',
  'Solo',
  'Race',
  'Oldschool',
  'DDmaX.Easy',
  'DDmaX.Next',
  'DDmaX.Pro',
  'DDmaX.Nut',
  'Fun',
  'Event',
];

export const LEGACY_CATEGORY_MAP = {
  easy: 'DDmaX.Easy',
  next: 'DDmaX.Next',
  pro: 'DDmaX.Pro',
  nut: 'DDmaX.Nut',
};

export function encodeUriSegment(str) {
  return encodeURIComponent(String(str ?? '')).replace(/'/g, '%27');
}

export function truncateMeta(str, maxLen = 158) {
  const text = String(str ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  if (maxLen <= 1) return text.slice(0, Math.max(0, maxLen));
  const slice = text.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace >= Math.floor((maxLen - 1) * 0.5) ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:\-–—]+$/, '')}…`;
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function safeJsonLd(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function parseReleaseMs(releaseStr) {
  if (!releaseStr) return 0;
  const iso = String(releaseStr).includes('T')
    ? String(releaseStr)
    : `${String(releaseStr).replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function toIsoDate(releaseStr) {
  const ms = parseReleaseMs(releaseStr);
  if (!ms) return '';
  return new Date(ms).toISOString().slice(0, 10);
}

export function normalizeMap(m) {
  const name = typeof m?.name === 'string' ? m.name.trim() : '';
  if (!name) return null;

  return {
    name,
    mapper: typeof m.mapper === 'string' ? m.mapper : '',
    type: typeof m.type === 'string' && m.type ? m.type : 'Other',
    difficulty: typeof m.difficulty === 'number' && Number.isFinite(m.difficulty) ? m.difficulty : 0,
    points: typeof m.points === 'number' && Number.isFinite(m.points) ? m.points : 0,
    release: typeof m.release === 'string' ? m.release : '',
    width: typeof m.width === 'number' && Number.isFinite(m.width) ? m.width : 0,
    height: typeof m.height === 'number' && Number.isFinite(m.height) ? m.height : 0,
    tiles: Array.isArray(m.tiles) ? m.tiles : [],
    thumbnail: typeof m.thumbnail === 'string' ? m.thumbnail : '',
    website:
      typeof m.website === 'string' && m.website
        ? m.website
        : `https://ddnet.org/maps/${encodeUriSegment(name)}`,
    webPreview: typeof m.web_preview === 'string' ? m.web_preview : '',
  };
}

/**
 * Fetches and normalizes the official DDNet map catalog with Cloudflare Edge caching.
 * Safe in both Cloudflare Workers and local Node.js verification.
 */
export async function fetchCatalogMaps(context, origin = SITE_ORIGIN) {
  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = new Request(`${origin}/_internal/catalog-v1`, { method: 'GET' });

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const data = await cached.json();
      if (Array.isArray(data)) return data;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const upstream = await fetch(MAPS_UPSTREAM_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.0',
        Accept: 'application/json',
      },
    });
    if (!upstream.ok) {
      throw new Error(`Upstream catalog HTTP ${upstream.status}`);
    }
    const raw = await upstream.json();
    if (!Array.isArray(raw)) {
      throw new Error('Invalid upstream catalog format');
    }

    const maps = [];
    for (const entry of raw) {
      const normalized = normalizeMap(entry);
      if (normalized) maps.push(normalized);
    }

    if (edgeCache) {
      const cacheRes = new Response(JSON.stringify(maps), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=1800, s-maxage=1800',
        },
      });
      const putPromise = edgeCache.put(cacheKey, cacheRes);
      if (context && typeof context.waitUntil === 'function') {
        context.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }

    return maps;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchShellHtml(context) {
  const url = new URL(context.request.url);
  const assetReq = new Request(new URL('/', url.origin), { method: 'GET' });
  const res = await context.env.ASSETS.fetch(assetReq);
  return res.text();
}

function inferImageMimeType(imageUrl) {
  const clean = String(imageUrl || '').split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  return '';
}

export function injectSeoIntoHtml(
  baseHtml,
  {
    title,
    description,
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    ogImageHasDims = true,
    ogImageWidth = null,
    ogImageHeight = null,
    ogImageAlt = '',
    robots = '',
    jsonLd = null,
    ssrHtml = '',
    replaceHomeH1 = true,
  }
) {
  let html = baseHtml;

  const safeTitle = escapeHtml(title);
  const safeAttrTitle = escapeAttr(title);
  const safeDesc = escapeAttr(description);
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;
  const safeOgImage = escapeAttr(resolvedOgImage);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${safeTitle}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="description" content="${safeDesc}" />`
  );

  if (canonical) {
    const safeCanonical = escapeAttr(canonical);
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      () => `<link rel="canonical" href="${safeCanonical}" />`
    );
    html = html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      () => `<meta property="og:url" content="${safeCanonical}" />`
    );
    html = html.replace(
      /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i,
      () => `<meta name="twitter:url" content="${safeCanonical}" />`
    );
  } else {
    html = html
      .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>\s*/i, () => '')
      .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>\s*/i, () => '')
      .replace(/<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>\s*/i, () => '');
  }

  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:title" content="${safeAttrTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:image" content="${safeOgImage}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="twitter:title" content="${safeAttrTitle}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="twitter:description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="twitter:image" content="${safeOgImage}" />`
  );

  if (ogImageWidth && ogImageHeight) {
    html = html
      .replace(
        /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
        () => `<meta property="og:image:width" content="${escapeAttr(String(ogImageWidth))}" />`
      )
      .replace(
        /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
        () => `<meta property="og:image:height" content="${escapeAttr(String(ogImageHeight))}" />`
      );
  } else if (!ogImageHasDims) {
    html = html
      .replace(/<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>\s*/i, () => '')
      .replace(/<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>\s*/i, () => '');
  }

  const imageMime = inferImageMimeType(resolvedOgImage);
  if (imageMime) {
    html = html.replace(
      /<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>/i,
      () => `<meta property="og:image:type" content="${escapeAttr(imageMime)}" />`
    );
  } else {
    html = html.replace(/<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>\s*/i, () => '');
  }

  if (ogImageAlt) {
    const safeAlt = escapeAttr(ogImageAlt);
    html = html
      .replace(
        /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
        () => `<meta property="og:image:alt" content="${safeAlt}" />`
      )
      .replace(
        /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i,
        () => `<meta name="twitter:image:alt" content="${safeAlt}" />`
      );
  }

  if (robots) {
    html = html.replace(
      /<\/head>/i,
      () => `<meta name="robots" content="${escapeAttr(robots)}" />\n</head>`
    );
  }

  if (jsonLd) {
    const ldTag = `<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>`;
    if (html.includes('<!-- JSONLD_START -->') && html.includes('<!-- JSONLD_END -->')) {
      html = html.replace(
        /<!-- JSONLD_START -->[\s\S]*?<!-- JSONLD_END -->/,
        () => `<!-- JSONLD_START -->\n${ldTag}\n<!-- JSONLD_END -->`
      );
    } else {
      html = html.replace(/<\/head>/i, () => `${ldTag}\n</head>`);
    }
  } else if (robots && robots.includes('noindex')) {
    html = html.replace(/<!-- JSONLD_START -->[\s\S]*?<!-- JSONLD_END -->\s*/i, () => '');
  }

  if (replaceHomeH1) {
    html = html
      .replace(/<div\s+class="page-intro"\s+id="pageIntro"[^>]*>[\s\S]*?<\/div>\s*/i, () => '')
      .replace(/<h1\s+id="homeSrHeading"[^>]*>[\s\S]*?<\/h1>\s*/i, () => '');
  }

  if (ssrHtml && html.includes('<!-- SSR_SLOT -->')) {
    html = html.replace('<!-- SSR_SLOT -->', () => ssrHtml);
  }

  return html;
}
