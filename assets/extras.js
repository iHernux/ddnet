import {
  escapeAttr,
  escapeHtml,
  formatDate,
  formatDuration,
  parseReleaseMs,
} from './i18n.js?v=20261126';

export const STORAGE_KEY_PLAYLISTS = 'ddnet_playlists_v1';

const EXTRAS_COPY = {
  tr: {
    newReleasesTitle: 'Yeni Çıkan Resmî Haritalar',
    newReleasesHide: 'Gizle',
    newReleasesShow: 'Göster',
    similarMapsTitle: 'Benzer Haritalar',
    playlistManageTitle: 'Harita Listeleri (Playlists)',
    playlistCreateTitle: 'Yeni Liste Oluştur',
    playlistNamePlaceholder: 'Liste adı (örn. Antrenman Paketi)…',
    playlistMapsPlaceholder: 'Harita adları (virgülle ayır: Multeasymap, Just2Easy)…',
    playlistIncludeFavs: 'Mevcut favori haritalarımı ({n}) listeye ekle',
    playlistCreateBtn: 'Liste Oluştur',
    playlistSavedTitle: 'Kayıtlı Listelerim',
    playlistEmpty: 'Henüz kayıtlı listen yok. Yukarıdan oluşturabilir veya herhangi bir harita detayından ekleyebilirsin.',
    playlistUseBtn: 'Listeyi Aç',
    playlistShareBtn: 'Link Kopyala',
    playlistDeleteBtn: 'Sil',
    playlistSharedBadge: 'Paylaşılan Liste',
    playlistSaveSharedBtn: 'Listelerime Kaydet',
    playlistClearBtn: 'Listeden Çık',
    playlistMapsCount: '{n} harita',
    playlistAddTo: '+ Listeye Ekle',
    playlistQuickTitle: 'Listeye Ekle / Yeni Oluştur',
    playlistNewQuickPlaceholder: 'Yeni liste adı…',
    playlistAddedToast: '"{map}" → "{list}" listesine eklendi',
    playlistCopiedShareToast: 'Paylaşılabilir playlist linki panoya kopyalandı',
    playlistSavedToast: '"{name}" kaydedildi',
    exportPlayerCardBtn: 'Kart PNG İndir',
    cardPoints: 'Toplam Puan',
    cardGlobalRank: 'Genel Sıra',
    cardTeamRank: 'Takım Sırası',
    cardSoloRank: 'Solo Sırası',
    cardHours365: 'Son 365 Gün',
    cardNetTime: 'Toplam Ağ Süresi',
    cardGenerated: 'DDNet Archive · ddnet-archive.xyz',
  },
  en: {
    newReleasesTitle: 'Newly Released Official Maps',
    newReleasesHide: 'Hide',
    newReleasesShow: 'Show',
    similarMapsTitle: 'Similar Maps',
    playlistManageTitle: 'Shareable Map Playlists',
    playlistCreateTitle: 'Create Playlist',
    playlistNamePlaceholder: 'Playlist name (e.g. Weekend Pack)…',
    playlistMapsPlaceholder: 'Map names (comma-separated: Multeasymap, Just2Easy)…',
    playlistIncludeFavs: 'Include my current favorited maps ({n})',
    playlistCreateBtn: 'Create Playlist',
    playlistSavedTitle: 'Saved Playlists',
    playlistEmpty: 'No saved playlists yet. Create one above or add maps from any map detail modal.',
    playlistUseBtn: 'Apply Filter',
    playlistShareBtn: 'Copy Share Link',
    playlistDeleteBtn: 'Delete',
    playlistSharedBadge: 'Shared Playlist',
    playlistSaveSharedBtn: 'Save Copy',
    playlistClearBtn: 'Exit Playlist',
    playlistMapsCount: '{n} maps',
    playlistAddTo: '+ Playlist',
    playlistQuickTitle: 'Add Map to Playlist',
    playlistNewQuickPlaceholder: 'New playlist name…',
    playlistAddedToast: 'Added "{map}" to "{list}"',
    playlistCopiedShareToast: 'Shareable playlist URL copied to clipboard',
    playlistSavedToast: 'Saved playlist "{name}"',
    exportPlayerCardBtn: 'Save Card PNG',
    cardPoints: 'Total Points',
    cardGlobalRank: 'Global Rank',
    cardTeamRank: 'Team Rank',
    cardSoloRank: 'Solo Rank',
    cardHours365: '365d Hours',
    cardNetTime: 'Network Playtime',
    cardGenerated: 'DDNet Archive · ddnet-archive.xyz',
  },
};

export function tx(lang, key, params = null) {
  const dict = EXTRAS_COPY[lang === 'tr' ? 'tr' : 'en'];
  let out = dict[key] ?? EXTRAS_COPY.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

export function readPlaylists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.maps))
      .map((p) => ({
        id: p.id,
        name: p.name.slice(0, 60),
        maps: Array.from(new Set(p.maps.map((m) => String(m || '').trim()).filter(Boolean))).slice(0, 50),
        updatedAt: p.updatedAt || Date.now(),
      }));
  } catch {
    return [];
  }
}

export function writePlaylists(lists) {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(lists));
  } catch {
    // Ignore quota errors
  }
}

export function encodePlaylistParam({ name, maps }) {
  const cleanName = String(name || 'Playlist').trim().slice(0, 60) || 'Playlist';
  const cleanMaps = Array.isArray(maps)
    ? Array.from(new Set(maps.map((m) => String(m || '').trim()).filter(Boolean))).slice(0, 50)
    : [];
  const payload = JSON.stringify({ n: cleanName, m: cleanMaps });
  const bytes = new TextEncoder().encode(payload);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodePlaylistParam(raw) {
  try {
    const clean = String(raw || '').trim().replaceAll('-', '+').replaceAll('_', '/');
    if (!clean || clean.length > 8192) return null;
    const padded = clean + '==='.slice((clean.length + 3) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !Array.isArray(parsed.m)) return null;
    const maps = Array.from(
      new Set(parsed.m.map((m) => String(m || '').trim()).filter(Boolean))
    ).slice(0, 50);
    if (maps.length === 0) return null;
    return {
      name: String(parsed.n || 'Shared Playlist').trim().slice(0, 60) || 'Shared Playlist',
      maps,
    };
  } catch {
    return null;
  }
}

export function buildPlaylistShareUrl(playlist) {
  const param = encodePlaylistParam(playlist);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ddnet-archive.xyz';
  return `${origin}/?list=${encodeURIComponent(param)}`;
}

export function renderPlaylistBannerHtml({ playlist, isShared, lang, icons }) {
  if (!playlist) return '';
  return `<div class="playlist-banner">
    <div class="playlist-banner-left">
      ${isShared ? `<span class="skin-badge">${escapeHtml(tx(lang, 'playlistSharedBadge'))}</span>` : ''}
      <strong>${escapeHtml(playlist.name)}</strong>
      <span class="muted tabular">(${escapeHtml(tx(lang, 'playlistMapsCount', { n: playlist.maps.length }))})</span>
    </div>
    <div class="playlist-banner-actions">
      <button type="button" class="btn btn-sm" id="playlistCopyShareBtn">${icons.copy(13)}<span>${escapeHtml(tx(lang, 'playlistShareBtn'))}</span></button>
      ${isShared ? `<button type="button" class="btn btn-primary btn-sm" id="playlistSaveSharedBtn">${escapeHtml(tx(lang, 'playlistSaveSharedBtn'))}</button>` : ''}
      <button type="button" class="btn btn-sm" id="playlistClearActiveBtn">${icons.x(13)}<span>${escapeHtml(tx(lang, 'playlistClearBtn'))}</span></button>
    </div>
  </div>`;
}

export function renderPlaylistModalHtml({ playlists, activePlaylistId, favCount, lang, icons }) {
  const listHtml =
    playlists.length > 0
      ? `<div class="list-box">
          ${playlists
            .map(
              (pl) => `<div class="list-row playlist-row${activePlaylistId === pl.id ? ' active' : ''}">
                <div class="list-row-left">
                  <strong>${escapeHtml(pl.name)}</strong>
                  <span class="muted tabular">${escapeHtml(tx(lang, 'playlistMapsCount', { n: pl.maps.length }))}</span>
                </div>
                <div class="list-row-right">
                  <button type="button" class="btn btn-primary btn-sm" data-activate-playlist="${escapeAttr(pl.id)}">${escapeHtml(tx(lang, 'playlistUseBtn'))}</button>
                  <button type="button" class="btn btn-sm" data-share-playlist="${escapeAttr(pl.id)}">${icons.copy(13)}<span>${escapeHtml(tx(lang, 'playlistShareBtn'))}</span></button>
                  <button type="button" class="btn btn-sm" data-delete-playlist="${escapeAttr(pl.id)}">${icons.x(13)}<span>${escapeHtml(tx(lang, 'playlistDeleteBtn'))}</span></button>
                </div>
              </div>`
            )
            .join('')}
        </div>`
      : `<div class="state-box"><div class="state-hint">${escapeHtml(tx(lang, 'playlistEmpty'))}</div></div>`;

  return `
    <section class="guide-section">
      <h3 class="section-heading" style="margin:0;">${escapeHtml(tx(lang, 'playlistCreateTitle'))}</h3>
      <form id="playlistCreateForm" class="playlist-create-form">
        <input type="text" id="playlistNameInput" class="input" maxlength="60" placeholder="${escapeAttr(tx(lang, 'playlistNamePlaceholder'))}" required />
        <input type="text" id="playlistMapsInput" class="input" placeholder="${escapeAttr(tx(lang, 'playlistMapsPlaceholder'))}" />
        ${
          favCount > 0
            ? `<label class="skin-toggle-row" style="font-weight:500;">
                <input type="checkbox" id="playlistIncludeFavs" />
                <span>${escapeHtml(tx(lang, 'playlistIncludeFavs', { n: favCount }))}</span>
              </label>`
            : ''
        }
        <div>
          <button type="submit" class="btn btn-primary btn-sm">${escapeHtml(tx(lang, 'playlistCreateBtn'))}</button>
        </div>
      </form>
    </section>

    <section class="guide-section" style="margin-top:14px;">
      <h3 class="section-heading" style="margin:0;">${escapeHtml(tx(lang, 'playlistSavedTitle'))}</h3>
      ${listHtml}
    </section>
  `;
}

export function renderNewReleasesStripHtml(officialMaps, lang, collapsed, icons) {
  if (!Array.isArray(officialMaps) || officialMaps.length === 0) return '';
  const newest = officialMaps
    .filter((m) => m && (!m.source || m.source === 'ddnet') && m.release)
    .slice()
    .sort((a, b) => parseReleaseMs(b.release) - parseReleaseMs(a.release))
    .slice(0, 8);
  if (newest.length === 0) return '';

  return `<div class="new-releases-wrap">
    <div class="new-releases-head">
      <span class="new-releases-title">${icons.flame(14)}<span>${escapeHtml(tx(lang, 'newReleasesTitle'))}</span></span>
      <button type="button" class="btn btn-sm" id="toggleNewReleasesBtn">${escapeHtml(tx(lang, collapsed ? 'newReleasesShow' : 'newReleasesHide'))}</button>
    </div>
    ${
      collapsed
        ? ''
        : `<div class="new-releases-strip">
            ${newest
              .map(
                (m) => `<a href="/map/${encodeURIComponent(m.name)}" class="new-release-card" data-open-map="${escapeAttr(m.name)}">
                  ${m.thumbnail ? `<img src="${escapeAttr(m.thumbnail)}" alt="${escapeAttr(m.name)}" loading="lazy" decoding="async" />` : '<div class="new-release-thumb-empty"></div>'}
                  <div class="new-release-info">
                    <div class="new-release-name" title="${escapeAttr(m.name)}">${escapeHtml(m.name)}</div>
                    <div class="new-release-meta">
                      <span class="cat-badge" data-cat="${escapeAttr(m.type)}"><span class="cat-dot"></span>${escapeHtml(m.type)}</span>
                      <span class="muted tabular">${escapeHtml(formatDate(m.release, lang))}</span>
                    </div>
                  </div>
                </a>`
              )
              .join('')}
          </div>`
    }
  </div>`;
}

export function findSimilarMaps(targetMap, officialMaps, limit = 6) {
  if (!targetMap || !Array.isArray(officialMaps) || officialMaps.length === 0) return [];
  const targetLower = String(targetMap.name || '').toLowerCase();
  const targetTiles = new Set(Array.isArray(targetMap.tiles) ? targetMap.tiles : []);
  const targetMapper = String(targetMap.mapper || '').trim().toLowerCase();

  const scored = [];
  for (const m of officialMaps) {
    if (!m || (m.source && m.source !== 'ddnet')) continue;
    if (m.name.toLowerCase() === targetLower) continue;

    let score = 0;
    if (m.type && m.type === targetMap.type) score += 40;
    if (
      targetMap.difficulty !== null &&
      targetMap.difficulty !== undefined &&
      m.difficulty !== null &&
      m.difficulty !== undefined
    ) {
      const diffGap = Math.abs(m.difficulty - targetMap.difficulty);
      if (diffGap === 0) score += 30;
      else if (diffGap === 1) score += 15;
    }
    if (targetTiles.size > 0 && Array.isArray(m.tiles) && m.tiles.length > 0) {
      let inter = 0;
      for (const tId of m.tiles) if (targetTiles.has(tId)) inter += 1;
      const union = targetTiles.size + m.tiles.length - inter;
      if (union > 0) score += (inter / union) * 35;
    }
    if (targetMapper && (m.mapper || '').toLowerCase() === targetMapper) {
      score += 15;
    }
    scored.push({ map: m, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      parseReleaseMs(b.map.release) - parseReleaseMs(a.map.release) ||
      a.map.name.localeCompare(b.map.name)
  );
  return scored.slice(0, limit).map((x) => x.map);
}

export function renderSimilarMapsHtml(targetMap, officialMaps, lang) {
  const sims = findSimilarMaps(targetMap, officialMaps, 6);
  if (sims.length === 0) return '';
  return `<div class="similar-section">
    <div class="section-heading">${escapeHtml(tx(lang, 'similarMapsTitle'))}</div>
    <div class="similar-maps-grid">
      ${sims
        .map(
          (m) => `<a href="/map/${encodeURIComponent(m.name)}" class="similar-map-card" data-open-map="${escapeAttr(m.name)}">
            ${m.thumbnail ? `<img src="${escapeAttr(m.thumbnail)}" alt="${escapeAttr(m.name)}" loading="lazy" />` : '<div class="new-release-thumb-empty"></div>'}
            <div class="similar-map-meta">
              <div class="similar-map-name" title="${escapeAttr(m.name)}">${escapeHtml(m.name)}</div>
              <div class="similar-map-sub">
                <span class="cat-badge" data-cat="${escapeAttr(m.type)}"><span class="cat-dot"></span>${escapeHtml(m.type)}</span>
                <span class="duo-star-chip">${m.difficulty ?? 0}★</span>
              </div>
            </div>
          </a>`
        )
        .join('')}
    </div>
  </div>`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export async function exportPlayerCardPng(playerData, lang = 'en') {
  const name = playerData?.player || 'Player';
  const ddnet = playerData?.ddnet || playerData || {};
  const pts = ddnet.points?.points ?? null;
  const maxPts = ddnet.points?.total ?? null;
  const gRank = ddnet.points?.rank ?? null;
  const tRank = ddnet.team_rank?.rank ?? null;
  const sRank = ddnet.rank?.rank ?? null;
  const hrs365 = ddnet.hours_played_past_365_days ?? null;
  const netTime = playerData?.network?.totalPlayTime ?? 0;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1200, 630);
  grad.addColorStop(0, '#0d1017');
  grad.addColorStop(1, '#182032');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle decorative glow
  const glow = ctx.createRadialGradient(1020, 110, 20, 1020, 110, 420);
  glow.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
  glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);

  // Card frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 28, 28, 1144, 574, 24);
  ctx.stroke();

  // Header
  ctx.fillStyle = '#60a5fa';
  ctx.font = '600 18px sans-serif';
  ctx.fillText('DDNET ARCHIVE', 64, 86);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 46px sans-serif';
  ctx.fillText(name, 64, 144);

  if (gRank) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    drawRoundedRect(ctx, 940, 68, 196, 48, 24);
    ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.font = '700 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${gRank.toLocaleString()}`, 1038, 100);
    ctx.textAlign = 'left';
  }

  // Metric tiles
  const stats = [
    [tx(lang, 'cardPoints'), pts !== null ? (maxPts ? `${pts.toLocaleString()} / ${maxPts.toLocaleString()}` : pts.toLocaleString()) : '—'],
    [tx(lang, 'cardGlobalRank'), gRank ? `#${gRank.toLocaleString()}` : '—'],
    [tx(lang, 'cardTeamRank'), tRank ? `#${tRank.toLocaleString()}` : '—'],
    [tx(lang, 'cardSoloRank'), sRank ? `#${sRank.toLocaleString()}` : '—'],
    [tx(lang, 'cardHours365'), hrs365 !== null ? `${hrs365} h` : '—'],
    [tx(lang, 'cardNetTime'), netTime > 0 ? formatDuration(netTime, lang) : '—'],
  ];

  stats.forEach(([label, val], idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const bx = 64 + col * 364;
    const by = 186 + row * 102;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    drawRoundedRect(ctx, bx, by, 344, 86, 14);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 15px sans-serif';
    ctx.fillText(label, bx + 18, by + 30);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 24px monospace';
    ctx.fillText(String(val), bx + 18, by + 65);
  });

  // Top 4 categories progress
  const types = ddnet.types && typeof ddnet.types === 'object' ? ddnet.types : {};
  const catEntries = Object.entries(types)
    .filter(([, obj]) => obj?.points?.total > 0)
    .sort((a, b) => (b[1].points.points || 0) - (a[1].points.points || 0))
    .slice(0, 4);

  catEntries.forEach(([cat, obj], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 64 + col * 546;
    const by = 414 + row * 66;
    const got = obj.points.points || 0;
    const tot = obj.points.total || 1;
    const ratio = Math.max(0, Math.min(1, got / tot));

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(cat, bx, by + 18);

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.font = '500 15px monospace';
    ctx.fillText(`${got} / ${tot} (${Math.round(ratio * 100)}%)`, bx + 520, by + 18);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundedRect(ctx, bx, by + 30, 520, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    drawRoundedRect(ctx, bx, by + 30, Math.max(10, Math.round(520 * ratio)), 10, 5);
    ctx.fill();
  });

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '500 15px sans-serif';
  ctx.fillText(tx(lang, 'cardGenerated'), 64, 574);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w.-]+/g, '_') || 'player'}_ddnet_card.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
