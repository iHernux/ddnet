import {
  CORS_HEADERS,
  fetchMasterSnapshot,
  jsonResponse,
  safeHttpUrl,
} from '../_shared/live.js';

const ALLOWED_DDNET_TYPES = new Set([
  'novice',
  'moderate',
  'brutal',
  'insane',
  'dummy',
  'solo',
  'race',
  'oldschool',
  'ddmax.easy',
  'ddmax.next',
  'ddmax.pro',
  'ddmax.nut',
  'fun',
  'event',
]);

const UPSTREAM_TIMEOUT_MS = 15000;
const USER_AGENT = 'DDNet-Archive/2.2';

function isSafePublicHttpUrl(raw) {
  const safe = safeHttpUrl(raw);
  if (!safe) return '';
  try {
    const parsed = new URL(safe);
    if (parsed.username || parsed.password) return '';
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host) return '';
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '0.0.0.0' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '::1' ||
      /^(fc|fd)[0-9a-f:]+$/i.test(host) ||
      /^fe80:/i.test(host)
    ) {
      return '';
    }
    return safe;
  } catch {
    return '';
  }
}

async function fetchMapUpstream(targetUrl, method) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(targetUrl, {
      method: method === 'HEAD' ? 'HEAD' : 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      await res.body?.cancel?.().catch(() => {});
      return { ok: false, status: res.status, response: null, error: res.status >= 500 };
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html')) {
      await res.body?.cancel?.().catch(() => {});
      return { ok: false, status: 502, response: null, error: true };
    }
    return { ok: true, status: 200, response: res, error: false };
  } catch (err) {
    return {
      ok: false,
      status: err && err.name === 'AbortError' ? 504 : 502,
      response: null,
      error: true,
      timeout: Boolean(err && err.name === 'AbortError'),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildAttachmentHeaders(upstreamHeaders, canonicalName) {
  const baseName = String(canonicalName || 'map').replace(/\.map$/i, '').trim() || 'map';
  const asciiName =
    baseName
      .replace(/[^\x20-\x7E]|["\\/;]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'map';
  const utf8Name = encodeURIComponent(`${baseName}.map`).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${asciiName}.map"; filename*=UTF-8''${utf8Name}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    ...CORS_HEADERS,
  });

  const contentLength = upstreamHeaders?.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength.trim())) {
    headers.set('Content-Length', contentLength.trim());
  }
  return headers;
}

/**
 * Proxies individual .map binary downloads with proper attachment headers
 * and strict upstream URL allowlisting (official DDNet sources or verified master snapshot URLs).
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ error: 'Method not allowed' }, 405, { 'Cache-Control': 'no-store' });
  }

  const url = new URL(request.url);
  const name = (url.searchParams.get('name') || '').trim();
  if (!name || name.length > 128 || /[/\\\0\r\n]|\.\./.test(name)) {
    return jsonResponse({ error: 'Invalid map name' }, 400, { 'Cache-Control': 'no-store' });
  }

  const rawType = (url.searchParams.get('type') || '').trim().toLowerCase();
  const type = ALLOWED_DDNET_TYPES.has(rawType) ? rawType : '';
  const source = (url.searchParams.get('source') || '').trim().toLowerCase();

  let chosenUpstream = null;
  let canonicalName = name;
  let hadUpstreamError = false;
  let hadTimeout = false;

  // 1. Official DDNet map sources
  if (source !== 'community') {
    const officialCandidates = [`https://ddnet.org/mappreview/${encodeURIComponent(name)}.map`];
    if (type) {
      officialCandidates.push(
        `https://raw.githubusercontent.com/ddnet/ddnet-maps/master/types/${encodeURIComponent(type)}/maps/${encodeURIComponent(name)}.map`
      );
    }

    for (const candidateUrl of officialCandidates) {
      const attempt = await fetchMapUpstream(candidateUrl, request.method);
      if (attempt.ok && attempt.response) {
        chosenUpstream = attempt.response;
        break;
      }
      if (attempt.timeout) hadTimeout = true;
      if (attempt.error) hadUpstreamError = true;
    }
  }

  // 2. Community / master-snapshot fallback (no SSRF: URLs strictly read from master snapshot)
  if (!chosenUpstream && (source === 'community' || source !== 'ddnet')) {
    const snapshot = await fetchMasterSnapshot(context, url.origin).catch(() => null);
    if (snapshot) {
      const lowerName = name.toLowerCase();
      const candidateUrls = new Set();

      if (Array.isArray(snapshot.liveMaps)) {
        for (const lm of snapshot.liveMaps) {
          if (lm?.name && lm.name.toLowerCase() === lowerName) {
            canonicalName = lm.name;
            const safeUrl = isSafePublicHttpUrl(lm.mapUrl);
            if (safeUrl) candidateUrls.add(safeUrl);
          }
        }
      }

      if (Array.isArray(snapshot.servers)) {
        for (const srv of snapshot.servers) {
          if (srv?.mapName && srv.mapName.toLowerCase() === lowerName) {
            canonicalName = srv.mapName;
            const safeUrl = isSafePublicHttpUrl(srv.mapUrl);
            if (safeUrl) candidateUrls.add(safeUrl);
            if (
              !safeUrl &&
              srv.community === 'ddnet' &&
              typeof srv.mapSha256 === 'string' &&
              /^[0-9a-f]{64}$/i.test(srv.mapSha256.trim())
            ) {
              candidateUrls.add(
                `https://maps.ddnet.org/${encodeURIComponent(srv.mapName)}_${srv.mapSha256.trim().toLowerCase()}.map`
              );
            }
          }
        }
      }

      for (const candidateUrl of candidateUrls) {
        const attempt = await fetchMapUpstream(candidateUrl, request.method);
        if (attempt.ok && attempt.response) {
          chosenUpstream = attempt.response;
          break;
        }
        if (attempt.timeout) hadTimeout = true;
        if (attempt.error) hadUpstreamError = true;
      }
    }
  }

  if (!chosenUpstream) {
    if (hadTimeout) {
      return jsonResponse({ error: 'Upstream download timeout', status: 504 }, 504, {
        'Cache-Control': 'no-cache',
      });
    }
    if (hadUpstreamError) {
      return jsonResponse({ error: 'Upstream download error', status: 502 }, 502, {
        'Cache-Control': 'no-cache',
      });
    }
    return jsonResponse({ error: 'Map file not found', status: 404 }, 404, {
      'Cache-Control': 'public, max-age=60',
    });
  }

  const headers = buildAttachmentHeaders(chosenUpstream.headers, canonicalName);
  return new Response(request.method === 'HEAD' ? null : chosenUpstream.body, {
    status: 200,
    headers,
  });
}
