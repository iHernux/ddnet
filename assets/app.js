import { icons } from './icons.js?v=20261124a';
import {
  detectInitialLang,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  formatTime,
  isRecentRelease,
  parseReleaseMs,
  t,
} from './i18n.js?v=20261124a';
import {
  fetchMapDetail,
  fetchMaps,
  fetchOnlineStats,
  fetchPlayerProfile,
  fetchPlayerSuggestions,
  fetchServers,
} from './api.js?v=20261124a';

const CATEGORY_ORDER = [
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

const LIVE_CATEGORIES = ['Block', 'Gores', 'FNG', 'Community'];
const ALL_KNOWN_CATEGORIES = [...CATEGORY_ORDER, ...LIVE_CATEGORIES];

const LEGACY_CATEGORY_MAP = {
  Easy: 'DDmaX.Easy',
  Next: 'DDmaX.Next',
  Pro: 'DDmaX.Pro',
  Nut: 'DDmaX.Nut',
};

const COMMUNITY_FALLBACK = {
  ddnet: { id: 'ddnet', name: 'DDraceNetwork', shortName: 'DDNet', icon: 'https://info.ddnet.org/icons/ddnet.png' },
  kog: { id: 'kog', name: 'King of Gores', shortName: 'KoG', icon: 'https://info.ddnet.org/icons/kog.png' },
  teefusion: { id: 'teefusion', name: 'TeeFusion', shortName: 'TeeFusion', icon: 'https://info.ddnet.org/icons/teefusion.png' },
  axiom: { id: 'axiom', name: 'Axiom', shortName: 'Axiom', icon: 'https://info.ddnet.org/icons/axiom.png' },
  nobyfng: { id: 'nobyfng', name: "noby's fng", shortName: 'nobyfng', icon: 'https://info.ddnet.org/icons/nobyfng.png' },
  unique: { id: 'unique', name: 'Unique', shortName: 'Unique', icon: 'https://info.ddnet.org/icons/unique.png' },
  blockworlds: { id: 'blockworlds', name: 'Blockworlds', shortName: 'Blockworlds', icon: 'https://info.ddnet.org/icons/blockworlds.png' },
  ntcn: { id: 'ntcn', name: 'NewTeeworldsCN', shortName: 'NTCN', icon: 'https://info.ddnet.org/icons/ntcn.png' },
  other: { id: 'other', name: 'Community Servers', shortName: 'Community', icon: '' },
};

const STORAGE_KEYS = {
  mapFavs: 'ddnet_map_favs_v1',
  mapFavMeta: 'ddnet_map_fav_meta_v1',
  playerFavs: 'ddnet_player_favorites',
  playerHistory: 'ddnet_player_history',
  lang: 'ddnet_lang',
  theme: 'ddnet_theme',
  viewMode: 'ddnet_view_mode',
  pageSize: 'ddnet_page_size',
};

const VALID_SORTS = new Set([
  'release-desc',
  'live-desc',
  'name-asc',
  'name-desc',
  'diff-asc',
  'diff-desc',
  'points-desc',
]);

const VALID_REGIONS = new Set(['eu', 'na', 'sa', 'as', 'af', 'oc', 'other']);

const state = {
  lang: detectInitialLang(),
  theme: readTheme(),
  tab: 'maps',
  viewMode: readViewMode(),
  pageSize: readPageSize(),
  page: 1,
  search: '',
  category: '',
  difficulty: '',
  mapper: '',
  sort: 'release-desc',
  favOnly: false,

  maps: [],
  combinedMaps: [],
  mapsLoaded: false,
  mapsFetchedAt: null,
  mapsStale: false,
  filteredMaps: [],
  liveMapsByKey: new Map(),

  mapFavs: readSet(STORAGE_KEYS.mapFavs),
  mapFavMeta: readObject(STORAGE_KEYS.mapFavMeta),
  playerFavs: readArray(STORAGE_KEYS.playerFavs),
  playerHistory: readArray(STORAGE_KEYS.playerHistory),

  serversData: null,
  serversLoaded: false,
  serversLoading: false,
  serversError: false,
  serverCommunity: '',
  serverMode: '',
  serverRegion: '',
  serverSearch: '',
  serverActiveOnly: true,
  serverWeeklyMode: false,
  expandedServers: new Set(),

  activePlayerName: '',
  activePlayerData: null,
  playerLoading: false,
  playerError: null,
  showAllFinishes: false,

  onlineData: null,
  onlineError: false,
  liveModalTab: 'all',

  activeMapName: null,
  activeMapDetail: null,
  activeMapTab: 'ranks',
  mapDetailError: false,
  mapDetailReqId: 0,

  mapAcIndex: -1,
  mapAcItems: [],
  playerAcIndex: -1,
  playerAcItems: [],
};

let toastTimer = null;
let playerAcDebounce = null;
let mapSearchDebounce = null;
let serverSearchDebounce = null;

// Storage helpers
function readTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function readViewMode() {
  try {
    return localStorage.getItem(STORAGE_KEYS.viewMode) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

function readPageSize() {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEYS.pageSize));
    return n === 60 || n === 100 ? n : 30;
  } catch {
    return 30;
  }
}

function readSet(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

function readObject(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeObject(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    // Ignore storage errors
  }
}

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

function $(id) {
  return document.getElementById(id);
}

function tr(key, params = null) {
  return t(state.lang, key, params);
}

function showToast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2400);
}

async function copyText(text, feedbackMessage) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(feedbackMessage);
  } catch {
    showToast(text);
  }
}

function safeHttpUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch {
    return '';
  }
}

function safeConnectTarget(address) {
  if (typeof address !== 'string') return '';
  const clean = address.trim();
  if (!clean || /[\s"'<>\\]/.test(clean)) return '';
  return `ddnet://${clean}`;
}

function getCommunityInfo(id) {
  const key = String(id || '').trim().toLowerCase() || 'other';
  const liveMatch =
    state.serversData?.communities?.find((c) => c.id === key) ||
    state.onlineData?.communities?.find((c) => c.id === key);
  if (liveMatch) return liveMatch;
  return COMMUNITY_FALLBACK[key] || { id: key, name: key, shortName: key, icon: '' };
}

const SITE_ORIGIN = 'https://ddnet-archive.xyz';
const DEFAULT_TITLE = 'DDNet Archive – Player Stats, Map Search & DDNet Data';

function isModifiedClick(e) {
  return Boolean(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
}

function getSsrElement() {
  return document.getElementById('ssrContent');
}

function isSsrNotFoundActive() {
  const el = getSsrElement();
  return Boolean(el && el.getAttribute('data-ssr-status') === '404');
}

function clearSsrContent({ force = false } = {}) {
  const el = getSsrElement();
  if (!el) return;
  if (!force && el.getAttribute('data-ssr-status') === '404') return;
  el.remove();
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

function normalizeCategoryName(rawCat) {
  if (!rawCat) return '';
  const trimmed = String(rawCat).trim();
  if (LEGACY_CATEGORY_MAP[trimmed]) return LEGACY_CATEGORY_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [legacy, mapped] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (legacy.toLowerCase() === lower) return mapped;
  }
  const canonical = ALL_KNOWN_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return canonical || trimmed;
}

// Favorites helpers
function getFavKey(mapName) {
  const target = String(mapName || '').trim();
  if (!target) return null;
  if (state.mapFavs.has(target)) return target;
  const lower = target.toLowerCase();
  for (const item of state.mapFavs) {
    if (String(item).toLowerCase() === lower) return item;
  }
  return null;
}

function isMapFavorited(mapName) {
  return Boolean(getFavKey(mapName));
}

// URL state sync
function loadStateFromUrl() {
  state.tab = 'maps';
  state.activePlayerName = '';
  state.search = '';
  state.category = '';
  state.difficulty = '';
  state.mapper = '';
  state.sort = 'release-desc';
  state.favOnly = false;
  state.page = 1;
  state.activeMapName = null;
  state.serverCommunity = '';
  state.serverMode = '';
  state.serverRegion = '';
  state.serverSearch = '';

  const pathname = window.location.pathname || '/';
  const ssr404 = isSsrNotFoundActive();

  if (!ssr404 && pathname.startsWith('/map/')) {
    const rest = pathname.slice(5).replace(/\/+$/, '');
    if (rest) {
      state.activeMapName = decodePathSegment(rest);
    }
  } else if (!ssr404 && pathname.startsWith('/category/')) {
    const rest = pathname.slice(10).replace(/\/+$/, '');
    if (rest) {
      state.category = normalizeCategoryName(decodePathSegment(rest));
    }
  }

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const player = params.get('player');
  if (tab === 'players' || player) {
    state.tab = 'players';
  } else if (tab === 'servers') {
    state.tab = 'servers';
  }
  if (player) {
    state.activePlayerName = player.trim();
  }

  if (state.tab === 'servers') {
    const comm = (params.get('community') || '').trim().toLowerCase();
    if (comm) state.serverCommunity = comm;
    const mode = (params.get('mode') || '').trim();
    if (mode) state.serverMode = mode;
    const region = (params.get('region') || '').trim().toLowerCase();
    if (VALID_REGIONS.has(region)) state.serverRegion = region;
    const sq = params.get('q') ?? '';
    if (sq) state.serverSearch = sq;
  } else {
    const q = params.get('q') ?? params.get('search') ?? '';
    if (q) state.search = q;
  }

  const rawCat = params.get('cat') ?? params.get('category') ?? '';
  if (rawCat && !state.category) {
    state.category = normalizeCategoryName(rawCat);
  }

  const rawDiff = params.get('star') ?? params.get('stars') ?? '';
  if (rawDiff !== '' && /^[0-5]$/.test(rawDiff)) {
    state.difficulty = rawDiff;
  }

  const mapper = params.get('mapper') ?? '';
  if (mapper) state.mapper = mapper;

  const sort = params.get('sort') ?? '';
  if (VALID_SORTS.has(sort)) state.sort = sort;

  const view = params.get('view');
  if (view === 'grid' || view === 'table') state.viewMode = view;

  if (params.get('fav') === '1') state.favOnly = true;

  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page >= 1) state.page = page;

  const mapParam = params.get('map');
  if (mapParam && !state.activeMapName) state.activeMapName = mapParam.trim();
}

function updateDocumentMeta(nextPath) {
  let nextTitle = DEFAULT_TITLE;
  let canonicalPath = '/';

  if (state.activeMapName) {
    const pool = state.combinedMaps.length ? state.combinedMaps : state.maps;
    const found = pool.find((m) => m.name === state.activeMapName);
    if (found && found.difficulty !== null && found.difficulty !== undefined) {
      nextTitle = `${found.name} (${found.type}, ${found.difficulty}★) – DDNet Map | DDNet Archive`;
    } else if (found) {
      nextTitle = `${found.name} (${found.type}) – Live Map | DDNet Archive`;
    } else {
      nextTitle = `${state.activeMapName} – DDNet Map | DDNet Archive`;
    }
    canonicalPath = `/map/${encodeURIComponent(state.activeMapName)}`;
  } else if (state.tab === 'servers') {
    const commName = state.serverCommunity ? getCommunityInfo(state.serverCommunity).name : '';
    nextTitle = commName
      ? `${commName} Live Servers – DDNet Archive`
      : 'Live DDNet, KoG & Community Servers – DDNet Archive';
    canonicalPath = '/';
  } else if (state.tab === 'players' && state.activePlayerName) {
    nextTitle = `${state.activePlayerName} – DDNet Player Stats | DDNet Archive`;
    canonicalPath = '/';
  } else if (state.tab === 'players') {
    nextTitle = 'DDNet & Network Player Stats – DDNet Archive';
    canonicalPath = '/';
  } else if (state.category) {
    const pool = state.combinedMaps.length ? state.combinedMaps : state.maps;
    const catCount = state.mapsLoaded
      ? pool.filter((m) => m.type === state.category).length
      : 0;
    nextTitle = catCount
      ? `${state.category} DDNet Maps (${catCount} Maps) – DDNet Archive`
      : `${state.category} DDNet Maps – DDNet Archive`;
    canonicalPath = CATEGORY_ORDER.includes(state.category)
      ? `/category/${encodeURIComponent(state.category)}`
      : '/';
  } else if (nextPath === '/') {
    canonicalPath = '/';
  }

  document.title = nextTitle;
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) {
    canonicalEl.setAttribute('href', `${SITE_ORIGIN}${canonicalPath}`);
  }
}

function syncUrl({ push = false } = {}) {
  if (isSsrNotFoundActive()) return;

  let nextPath = '/';
  const params = new URLSearchParams();

  if (state.activeMapName) {
    nextPath = `/map/${encodeURIComponent(state.activeMapName)}`;
  } else if (state.tab === 'players') {
    nextPath = '/';
    params.set('tab', 'players');
    if (state.activePlayerName) params.set('player', state.activePlayerName);
  } else if (state.tab === 'servers') {
    nextPath = '/';
    params.set('tab', 'servers');
    if (state.serverCommunity) params.set('community', state.serverCommunity);
    if (state.serverMode) params.set('mode', state.serverMode);
    if (state.serverRegion) params.set('region', state.serverRegion);
    if (state.serverSearch.trim()) params.set('q', state.serverSearch.trim());
  } else {
    if (state.category && CATEGORY_ORDER.includes(state.category)) {
      nextPath = `/category/${encodeURIComponent(state.category)}`;
    } else {
      nextPath = '/';
      if (state.category) params.set('cat', state.category);
    }
    if (state.search.trim()) params.set('q', state.search.trim());
    if (state.difficulty !== '') params.set('star', state.difficulty);
    if (state.mapper) params.set('mapper', state.mapper);
    if (state.sort !== 'release-desc') params.set('sort', state.sort);
    if (state.viewMode !== 'grid') params.set('view', state.viewMode);
    if (state.favOnly) params.set('fav', '1');
    if (state.page > 1) params.set('page', String(state.page));
  }

  const qs = params.toString();
  const nextUrl = qs ? `${nextPath}?${qs}` : nextPath;
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl !== currentUrl) {
    if (push) {
      history.pushState(null, '', nextUrl);
    } else {
      history.replaceState(null, '', nextUrl);
    }
  }
  updateDocumentMeta(nextPath);
}

// Theme & Language
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  } catch {
    // Ignore storage errors
  }
  const btn = $('themeBtn');
  if (btn) {
    btn.innerHTML = state.theme === 'dark' ? icons.sun(16) : icons.moon(16);
  }
}

function applyTranslations() {
  document.documentElement.lang = state.lang;
  $('langBtn').textContent = state.lang.toUpperCase();

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = tr(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', tr(key));
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', tr(key));
  });

  document.querySelectorAll('[data-i18n-star]').forEach((el) => {
    const n = el.getAttribute('data-i18n-star');
    if (n) el.textContent = tr('starLevel', { n });
  });

  document.querySelectorAll('[data-i18n-pagesize]').forEach((el) => {
    const n = el.getAttribute('data-i18n-pagesize');
    if (n) el.textContent = tr('perPageOption', { n });
  });

  renderLiveStatusPill();
}

function hydrateStaticIcons() {
  $('steamBtn').innerHTML = icons.gamepad(16);
  $('githubBtn').innerHTML = icons.github(16);
  $('mapSearchIcon').innerHTML = icons.search(15);
  $('mapSearchClear').innerHTML = icons.x(14);
  $('favBtnIcon').innerHTML = icons.star(15);
  $('randomBtnIcon').innerHTML = icons.shuffle(15);
  $('viewTableBtn').innerHTML = icons.list(15);
  $('viewGridBtn').innerHTML = icons.grid(15);
  $('prevPageBtn').innerHTML = icons.chevronLeft(16);
  $('nextPageBtn').innerHTML = icons.chevronRight(16);
  $('serverSearchIcon').innerHTML = icons.search(15);
  $('serverSearchClear').innerHTML = icons.x(14);
  $('serverWeeklyIcon').innerHTML = icons.flame(14);
  $('serverRefreshBtn').innerHTML = icons.refresh(15);
  $('playerSearchIcon').innerHTML = icons.search(15);
  $('playerSearchClear').innerHTML = icons.x(14);
  $('mapModalClose').innerHTML = icons.x(16);
  $('liveModalClose').innerHTML = icons.x(16);
}

// Rendering helpers
function renderStars(count) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  if (n === 0) {
    return `<span class="stars" title="${escapeAttr(tr('starZero'))}"><span class="star-off">0★</span></span>`;
  }
  let html = '<span class="stars" aria-label="' + n + ' stars">';
  for (let i = 1; i <= 5; i += 1) {
    html +=
      i <= n
        ? `<span>${icons.starFilled(12)}</span>`
        : `<span class="star-off">${icons.star(12)}</span>`;
  }
  html += '</span>';
  return html;
}

function renderCategoryBadge(category) {
  const cat = category || 'Other';
  return `<span class="cat-badge" data-cat="${escapeAttr(cat)}"><span class="cat-dot" aria-hidden="true"></span>${escapeHtml(cat)}</span>`;
}

function renderCommunityPill(communityId, label = '') {
  const info = getCommunityInfo(communityId);
  const text = label || info.shortName || info.name || communityId;
  const icon = safeHttpUrl(info.icon);
  return `<span class="comm-badge">${icon ? `<img src="${escapeAttr(icon)}" alt="" width="14" height="14" loading="lazy" />` : ''}<span>${escapeHtml(text)}</span></span>`;
}

function getOrderedCategories(maps) {
  const counts = new Map();
  for (const m of maps) {
    counts.set(m.type, (counts.get(m.type) || 0) + 1);
  }
  const known = ALL_KNOWN_CATEGORIES.filter((c) => counts.has(c));
  const extra = Array.from(counts.keys())
    .filter((c) => !ALL_KNOWN_CATEGORIES.includes(c))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...extra].map((name) => ({ name, count: counts.get(name) }));
}

function syncLiveMapsIndex() {
  const next = new Map();

  if (state.onlineData) {
    const seedList = Array.isArray(state.onlineData.topAllMaps)
      ? state.onlineData.topAllMaps
      : Array.isArray(state.onlineData.topMaps)
        ? state.onlineData.topMaps
        : [];
    for (const m of seedList) {
      if (!m || !m.name) continue;
      next.set(m.name.toLowerCase(), {
        name: m.name,
        players: Number(m.players || 0),
        servers: Number(m.servers || 0),
        primaryCommunity: m.community || m.primaryCommunity || 'ddnet',
        primaryCommunityName: getCommunityInfo(m.community || m.primaryCommunity || 'ddnet').name,
        gameType: m.gameType || '',
        category: m.category || 'Community',
        mapUrl: '',
        mapSize: 0,
      });
    }
  }

  if (state.serversData && Array.isArray(state.serversData.liveMaps)) {
    for (const m of state.serversData.liveMaps) {
      if (!m || !m.name) continue;
      next.set(m.name.toLowerCase(), {
        name: m.name,
        players: Number(m.players || 0),
        servers: Number(m.servers || 0),
        primaryCommunity: m.primaryCommunity || 'other',
        primaryCommunityName: m.primaryCommunityName || getCommunityInfo(m.primaryCommunity).name,
        gameType: m.gameType || '',
        category: m.category || 'Community',
        mapUrl: safeHttpUrl(m.mapUrl),
        mapSize: Number(m.mapSize || 0),
      });
    }
  }

  state.liveMapsByKey = next;
  if (state.mapsLoaded) {
    applyMapFilters();
    if (state.tab === 'maps') {
      renderMapsContent({ pushUrl: false });
    }
  }
}

function getCombinedMaps() {
  const combined = [];
  const seenLower = new Set();

  for (const m of state.maps) {
    const lower = m.name.toLowerCase();
    seenLower.add(lower);
    const live = state.liveMapsByKey.get(lower);
    combined.push({
      ...m,
      source: 'ddnet',
      community: 'ddnet',
      communityName: 'DDraceNetwork',
      gameType: live?.gameType || '',
      livePlayers: live ? live.players : 0,
      liveServers: live ? live.servers : 0,
    });
  }

  for (const lm of state.liveMapsByKey.values()) {
    const lower = lm.name.toLowerCase();
    if (seenLower.has(lower)) continue;
    seenLower.add(lower);
    combined.push({
      name: lm.name,
      mapper: '',
      type: lm.category || 'Community',
      gameType: lm.gameType || '',
      community: lm.primaryCommunity || 'other',
      communityName: lm.primaryCommunityName || 'Community Servers',
      difficulty: null,
      points: null,
      release: '',
      width: 0,
      height: 0,
      tiles: [],
      thumbnail: '',
      source: 'live',
      livePlayers: lm.players || 0,
      liveServers: lm.servers || 0,
      mapUrl: lm.mapUrl || '',
      mapSize: lm.mapSize || 0,
    });
  }

  // Ensure every favorited map (including offline custom/community maps) always appears in the catalog
  for (const favName of state.mapFavs) {
    const clean = String(favName || '').trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (seenLower.has(lower)) continue;
    seenLower.add(lower);
    const meta = state.mapFavMeta[clean] || {};
    combined.push({
      name: clean,
      mapper: typeof meta.mapper === 'string' ? meta.mapper : '',
      type: typeof meta.type === 'string' && meta.type ? meta.type : 'Community',
      gameType: typeof meta.gameType === 'string' ? meta.gameType : '',
      community: typeof meta.community === 'string' ? meta.community : '',
      communityName: typeof meta.communityName === 'string' ? meta.communityName : '',
      difficulty: typeof meta.difficulty === 'number' ? meta.difficulty : null,
      points: typeof meta.points === 'number' ? meta.points : null,
      release: typeof meta.release === 'string' ? meta.release : '',
      width: 0,
      height: 0,
      tiles: [],
      thumbnail: typeof meta.thumbnail === 'string' ? meta.thumbnail : '',
      source: typeof meta.source === 'string' && meta.source ? meta.source : 'community',
      livePlayers: 0,
      liveServers: 0,
      mapUrl: '',
      mapSize: 0,
    });
  }

  return combined;
}

function renderCategoryStrip() {
  const strip = $('categoryStrip');
  if (!strip) return;
  const pool = state.combinedMaps.length ? state.combinedMaps : state.maps;
  const cats = getOrderedCategories(pool);
  let html = `<a href="/" class="cat-pill${!state.category ? ' active' : ''}" data-cat-filter="">
    <span>${escapeHtml(tr('allCategories'))}</span>
    <span class="cat-count">${pool.length}</span>
  </a>`;

  for (const { name, count } of cats) {
    const active = state.category === name ? ' active' : '';
    const href = CATEGORY_ORDER.includes(name)
      ? `/category/${encodeURIComponent(name)}`
      : `/?cat=${encodeURIComponent(name)}`;
    html += `<a href="${escapeAttr(href)}" class="cat-pill${active}" data-cat-filter="${escapeAttr(name)}" data-cat="${escapeAttr(name)}">
      <span class="cat-dot" aria-hidden="true"></span>
      <span>${escapeHtml(name)}</span>
      <span class="cat-count">${count}</span>
    </a>`;
  }
  strip.innerHTML = html;
}

function applyMapFilters() {
  const allMaps = getCombinedMaps();
  state.combinedMaps = allMaps;

  const q = state.search.trim().toLowerCase();
  const mapperFilter = state.mapper.trim().toLowerCase();
  const cat = state.category;
  const diff = state.difficulty === '' ? null : Number(state.difficulty);
  const favOnly = state.favOnly;

  const filtered = allMaps.filter((m) => {
    if (favOnly && !isMapFavorited(m.name)) return false;
    if (cat && m.type !== cat) return false;
    if (diff !== null && (m.difficulty === null || m.difficulty === undefined || m.difficulty !== diff)) {
      return false;
    }
    if (mapperFilter && !(m.mapper || '').toLowerCase().includes(mapperFilter)) return false;
    if (q) {
      const nameMatch = m.name.toLowerCase().includes(q);
      const mapperMatch = (m.mapper || '').toLowerCase().includes(q);
      const typeMatch = (m.type || '').toLowerCase().includes(q);
      const gtMatch = (m.gameType || '').toLowerCase().includes(q);
      const commMatch = (m.communityName || '').toLowerCase().includes(q);
      if (!nameMatch && !mapperMatch && !typeMatch && !gtMatch && !commMatch) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'live-desc': {
        const liveDiff = (b.livePlayers || 0) - (a.livePlayers || 0);
        if (liveDiff !== 0) return liveDiff;
        const srvDiff = (b.liveServers || 0) - (a.liveServers || 0);
        if (srvDiff !== 0) return srvDiff;
        return parseReleaseMs(b.release) - parseReleaseMs(a.release) || a.name.localeCompare(b.name);
      }
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'diff-asc': {
        const ad = a.difficulty ?? 99;
        const bd = b.difficulty ?? 99;
        return ad - bd || (a.points ?? 9999) - (b.points ?? 9999) || a.name.localeCompare(b.name);
      }
      case 'diff-desc': {
        const ad = a.difficulty ?? -1;
        const bd = b.difficulty ?? -1;
        return bd - ad || (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name);
      }
      case 'points-desc': {
        const ap = a.points ?? -1;
        const bp = b.points ?? -1;
        return bp - ap || (b.difficulty ?? -1) - (a.difficulty ?? -1) || a.name.localeCompare(b.name);
      }
      case 'release-desc':
      default: {
        const diffMs = parseReleaseMs(b.release) - parseReleaseMs(a.release);
        if (diffMs !== 0) return diffMs;
        const liveDiff = (b.livePlayers || 0) - (a.livePlayers || 0);
        return liveDiff !== 0 ? liveDiff : a.name.localeCompare(b.name);
      }
    }
  });

  state.filteredMaps = filtered;
}

function renderMetaBar() {
  const meta = $('resultsMeta');
  const active = $('activeFilters');
  if (!meta || !active) return;

  const total = state.combinedMaps.length || state.maps.length;
  const shown = state.filteredMaps.length;
  const locale = state.lang === 'tr' ? 'tr-TR' : 'en-US';
  const countText =
    shown === total
      ? tr('resultsTotal', { total: total.toLocaleString(locale) })
      : tr('resultsCount', {
          shown: shown.toLocaleString(locale),
          total: total.toLocaleString(locale),
        });
  const parts = [`<span class="tabular">${escapeHtml(countText)}</span>`];

  if (state.mapsFetchedAt) {
    parts.push('<span class="meta-sep" aria-hidden="true">·</span>');
    parts.push(`<span>${escapeHtml(tr('lastSync', { date: formatDate(state.mapsFetchedAt, state.lang) }))}</span>`);
  }
  if (state.mapsStale) {
    parts.push('<span class="meta-sep" aria-hidden="true">·</span>');
    parts.push(`<span>${escapeHtml(tr('staleNotice'))}</span>`);
  }
  meta.innerHTML = parts.join('');

  const tags = [];
  if (state.search.trim()) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-filter="search">${escapeHtml(
        tr('filterSearchLabel', { q: state.search.trim() })
      )} ${icons.x(12)}</button>`
    );
  }
  if (state.category) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-filter="category">${escapeHtml(
        tr('filterCategoryLabel', { cat: state.category })
      )} ${icons.x(12)}</button>`
    );
  }
  if (state.difficulty !== '') {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-filter="difficulty">${escapeHtml(
        tr('filterDifficultyLabel', { diff: state.difficulty })
      )} ${icons.x(12)}</button>`
    );
  }
  if (state.mapper) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-filter="mapper">${escapeHtml(
        tr('filterMapperLabel', { mapper: state.mapper })
      )} ${icons.x(12)}</button>`
    );
  }
  if (state.favOnly) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-filter="fav">${escapeHtml(
        tr('filterFavLabel')
      )} ${icons.x(12)}</button>`
    );
  }
  if (tags.length > 0) {
    tags.push(
      `<button type="button" class="filter-reset" data-clear-filter="all">${escapeHtml(
        tr('clearAllFilters')
      )}</button>`
    );
  }
  active.innerHTML = tags.join('');
}

function renderMapsContent({ pushUrl = false } = {}) {
  clearSsrContent();
  const total = state.filteredMaps.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const startIdx = (state.page - 1) * state.pageSize;
  const slice = state.filteredMaps.slice(startIdx, startIdx + state.pageSize);

  $('favCountBadge').textContent = String(state.mapFavs.size);
  $('favOnlyBtn').classList.toggle('active', state.favOnly);
  $('favOnlyBtn').setAttribute('aria-pressed', String(state.favOnly));
  $('viewTableBtn').classList.toggle('active', state.viewMode === 'table');
  $('viewGridBtn').classList.toggle('active', state.viewMode === 'grid');

  const searchWrap = $('mapSearch').closest('.search-wrap');
  searchWrap.classList.toggle('has-value', Boolean(state.search));
  $('mapSearchClear').classList.toggle('hidden', !state.search);

  renderCategoryStrip();
  renderMetaBar();

  $('mapsSkeleton').classList.add('hidden');
  $('mapsError').classList.add('hidden');

  if (total === 0) {
    const emptyBox = $('mapsEmpty');
    const hintEl = emptyBox.querySelector('.state-hint');
    if (hintEl) {
      const hasOtherFilters = Boolean(
        state.category || state.difficulty !== '' || state.search.trim() || state.mapper
      );
      hintEl.textContent =
        state.favOnly && state.mapFavs.size > 0 && hasOtherFilters
          ? tr('favHiddenByFiltersHint')
          : tr('emptyHint');
    }
    emptyBox.classList.remove('hidden');
    $('mapsTableWrap').classList.add('hidden');
    $('mapsGrid').classList.add('hidden');
    $('paginationBar').classList.add('hidden');
    syncUrl({ push: pushUrl });
    return;
  }

  $('mapsEmpty').classList.add('hidden');
  $('paginationBar').classList.remove('hidden');

  if (state.viewMode === 'grid') {
    $('mapsTableWrap').classList.add('hidden');
    $('mapsGrid').classList.remove('hidden');
    renderMapsGrid(slice);
  } else {
    $('mapsGrid').classList.add('hidden');
    $('mapsTableWrap').classList.remove('hidden');
    renderMapsTable(slice);
  }

  const endIdx = Math.min(total, startIdx + slice.length);
  $('pageSummary').textContent = tr('pageSummary', { start: startIdx + 1, end: endIdx, total });
  $('pageIndicator').textContent = tr('pageOf', { page: state.page, total: totalPages });
  $('prevPageBtn').disabled = state.page <= 1;
  $('nextPageBtn').disabled = state.page >= totalPages;
  $('pageSizeSelect').value = String(state.pageSize);

  syncUrl({ push: pushUrl });
}

function renderMapsTable(maps) {
  const tbody = $('mapsTableBody');
  const rows = maps.map((m) => {
    const isFav = isMapFavorited(m.name);
    const isOfficial = m.source === 'ddnet';
    const recent = isOfficial && isRecentRelease(m.release);
    const commInfo = m.community ? getCommunityInfo(m.community) : null;
    const commIcon = safeHttpUrl(commInfo?.icon);

    const thumbHtml = m.thumbnail
      ? `<div class="thumb-sm"><img src="${escapeAttr(m.thumbnail)}" alt="" loading="lazy" decoding="async" /></div>`
      : `<div class="thumb-sm thumb-sm-live">${commIcon ? `<img src="${escapeAttr(commIcon)}" alt="" loading="lazy" />` : icons.server(13)}</div>`;

    const diffCell =
      m.difficulty !== null && m.difficulty !== undefined
        ? renderStars(m.difficulty)
        : `<span class="muted">${escapeHtml(m.gameType || tr('communityMapTag'))}</span>`;

    const pointsCell =
      m.points !== null && m.points !== undefined ? escapeHtml(String(m.points)) : '—';

    const mapperCell = m.mapper
      ? `<button type="button" class="mapper-link" data-filter-mapper="${escapeAttr(m.mapper)}" title="${escapeAttr(m.mapper)}">${escapeHtml(m.mapper)}</button>`
      : m.communityName
        ? `<span class="muted">${escapeHtml(m.communityName)}</span>`
        : '<span class="muted">—</span>';

    const releaseCell =
      m.livePlayers > 0
        ? `<span class="live-inline-pill"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(tr('liveNowShort', { n: m.livePlayers }))}</span>`
        : escapeHtml(formatDate(m.release, state.lang));

    const mobileSub = m.mapper || (m.communityName ? `${m.communityName}${m.gameType ? ` · ${m.gameType}` : ''}` : m.gameType || '');

    return `<tr>
      <td class="col-fav">
        <button type="button" class="row-icon-btn${isFav ? ' fav-active' : ''}" data-toggle-fav="${escapeAttr(m.name)}" title="${escapeAttr(tr('toggleFav'))}" aria-label="${escapeAttr(tr('toggleFav'))}">
          ${isFav ? icons.starFilled(15) : icons.star(15)}
        </button>
      </td>
      <td>
        <div class="map-cell">
          ${thumbHtml}
          <div class="map-cell-text">
            <div class="map-cell-title">
              <a href="/map/${encodeURIComponent(m.name)}" class="map-name-btn" data-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</a>
              ${recent ? `<span class="new-tag">${escapeHtml(tr('newBadge'))}</span>` : ''}
              ${m.livePlayers > 0 ? `<span class="live-badge tabular"><span class="live-dot" aria-hidden="true"></span>${m.livePlayers}</span>` : ''}
            </div>
            ${mobileSub ? `<div class="map-mobile-sub">${escapeHtml(mobileSub)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${renderCategoryBadge(m.type)}</td>
      <td>${diffCell}</td>
      <td class="col-num col-points">${pointsCell}</td>
      <td class="col-mapper">${mapperCell}</td>
      <td class="col-release tabular">${releaseCell}</td>
      <td class="col-actions">
        <button type="button" class="row-icon-btn" data-copy-map="${escapeAttr(m.name)}" title="${escapeAttr(tr('copyCmd'))}" aria-label="${escapeAttr(tr('copyCmd'))}">
          ${icons.copy(14)}
        </button>
      </td>
    </tr>`;
  });
  tbody.innerHTML = rows.join('');
}

function renderMapsGrid(maps) {
  const grid = $('mapsGrid');
  const cards = maps.map((m) => {
    const isFav = isMapFavorited(m.name);
    const isOfficial = m.source === 'ddnet';
    const recent = isOfficial && isRecentRelease(m.release);
    const commInfo = m.community ? getCommunityInfo(m.community) : null;
    const commIcon = safeHttpUrl(commInfo?.icon);

    const thumbContent = m.thumbnail
      ? `<img src="${escapeAttr(m.thumbnail)}" alt="${escapeAttr(m.name)}" loading="lazy" decoding="async" />`
      : `<div class="card-thumb-live" data-cat="${escapeAttr(m.type)}">
          ${commIcon ? `<img class="card-thumb-comm-icon" src="${escapeAttr(commIcon)}" alt="" loading="lazy" />` : `<span class="card-thumb-fallback-icon">${icons.map(24)}</span>`}
          <span class="card-thumb-mode">${escapeHtml(m.gameType || m.type)}</span>
        </div>`;

    const leftBadges = [];
    if (recent) leftBadges.push(`<span class="new-tag">${escapeHtml(tr('newBadge'))}</span>`);
    if (m.livePlayers > 0) {
      leftBadges.push(
        `<span class="live-badge tabular"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(tr('liveNowShort', { n: m.livePlayers }))}</span>`
      );
    }

    const subtitleHtml = m.mapper
      ? `<button type="button" class="mapper-link" data-filter-mapper="${escapeAttr(m.mapper)}">${escapeHtml(m.mapper)}</button>`
      : `<span>${escapeHtml(
          m.communityName && m.gameType && m.communityName !== m.gameType
            ? `${m.communityName} · ${m.gameType}`
            : m.communityName || m.gameType || tr('communityMapTag')
        )}</span>`;

    const footerHtml = isOfficial
      ? `${renderStars(m.difficulty)}
         <span class="tabular">${escapeHtml(tr('pointsUnit', { n: m.points ?? 0 }))} · ${escapeHtml(formatDate(m.release, state.lang))}</span>`
      : `<span class="muted">${escapeHtml(m.gameType || m.type)}</span>
         <span class="tabular">${
           m.liveServers > 0
             ? escapeHtml(tr('liveServersShort', { n: m.liveServers }))
             : escapeHtml(tr('communityMapTag'))
         }</span>`;

    return `<article class="map-card">
      <div class="card-thumb" data-open-map="${escapeAttr(m.name)}">
        ${thumbContent}
        <div class="card-thumb-overlay">
          <div class="card-thumb-badges">${leftBadges.join('')}</div>
          <button type="button" class="row-icon-btn${isFav ? ' fav-active' : ''}" data-toggle-fav="${escapeAttr(m.name)}" title="${escapeAttr(tr('toggleFav'))}" aria-label="${escapeAttr(tr('toggleFav'))}">
            ${isFav ? icons.starFilled(14) : icons.star(14)}
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <a href="/map/${encodeURIComponent(m.name)}" class="card-title" data-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</a>
          ${renderCategoryBadge(m.type)}
        </div>
        <div class="card-mapper">${subtitleHtml}</div>
        <div class="card-footer">${footerHtml}</div>
      </div>
    </article>`;
  });
  grid.innerHTML = cards.join('');
}

function showMapsSkeleton() {
  $('mapsSkeleton').classList.remove('hidden');
  $('mapsSkeleton').innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton-row"></div>').join('');
  $('mapsError').classList.add('hidden');
  $('mapsEmpty').classList.add('hidden');
  $('mapsTableWrap').classList.add('hidden');
  $('mapsGrid').classList.add('hidden');
  $('paginationBar').classList.add('hidden');
}

async function loadMapCatalog({ forceRefresh = false } = {}) {
  if (!state.mapsLoaded) {
    showMapsSkeleton();
  }
  try {
    const result = await fetchMaps({ forceRefresh });
    state.maps = result.maps;
    state.mapsLoaded = true;
    state.mapsFetchedAt = result.lastModified || result.fetchedAt || null;
    state.mapsStale = Boolean(result.fromStaleCache);

    applyMapFilters();
    renderMapsContent();

    if (state.activeMapName && $('mapModal').classList.contains('hidden')) {
      openMapModal(state.activeMapName, { push: false });
    }
  } catch {
    $('mapsSkeleton').classList.add('hidden');
    $('mapsError').classList.remove('hidden');
  }
}

// Map Autocomplete
function updateMapAutocomplete() {
  const box = $('mapAutocomplete');
  const q = state.search.trim().toLowerCase();
  const pool = state.combinedMaps.length ? state.combinedMaps : state.maps;
  if (!q || pool.length === 0) {
    box.classList.add('hidden');
    state.mapAcItems = [];
    state.mapAcIndex = -1;
    return;
  }

  const starts = [];
  const includes = [];
  for (const m of pool) {
    const nameL = m.name.toLowerCase();
    const mapperL = (m.mapper || '').toLowerCase();
    if (nameL.startsWith(q)) {
      starts.push(m);
    } else if (nameL.includes(q) || mapperL.includes(q)) {
      includes.push(m);
    }
    if (starts.length >= 8 && includes.length >= 8) break;
  }

  const results = [...starts, ...includes].slice(0, 8);
  state.mapAcItems = results;
  state.mapAcIndex = -1;

  if (results.length === 0) {
    box.classList.add('hidden');
    return;
  }

  box.innerHTML = results
    .map(
      (m, idx) => `<button type="button" class="dropdown-item" data-map-ac="${escapeAttr(m.name)}" data-idx="${idx}" role="option">
      <span class="dropdown-main">${escapeHtml(m.name)}</span>
      <span class="dropdown-sub">${escapeHtml(m.type)}${m.mapper ? ` · ${escapeHtml(m.mapper)}` : m.communityName ? ` · ${escapeHtml(m.communityName)}` : ''}</span>
    </button>`
    )
    .join('');
  box.classList.remove('hidden');
}

function highlightDropdownItem(box, index) {
  const items = box.querySelectorAll('.dropdown-item');
  items.forEach((el, i) => el.classList.toggle('selected', i === index));
  if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
}

// Body Scroll Lock (prevents background scrolling on iOS/Android & desktop when a modal is open)
let lockedScrollY = 0;
let isBodyLocked = false;

function syncBodyScrollLock() {
  const anyOpen =
    !$('mapModal').classList.contains('hidden') || !$('liveModal').classList.contains('hidden');
  if (anyOpen && !isBodyLocked) {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    isBodyLocked = true;
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.body.style.top = `-${lockedScrollY}px`;
  } else if (!anyOpen && isBodyLocked) {
    isBodyLocked = false;
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, lockedScrollY);
  }
}

function findBaseMapForModal(mapName) {
  const pool = state.combinedMaps.length ? state.combinedMaps : state.maps;
  const lower = mapName.toLowerCase();
  const found =
    pool.find((m) => m.name === mapName) ||
    pool.find((m) => m.name.toLowerCase() === lower);
  if (found) return found;

  const live = state.liveMapsByKey.get(lower);
  if (live) {
    return {
      name: live.name,
      mapper: '',
      type: live.category || 'Community',
      gameType: live.gameType || '',
      community: live.primaryCommunity || 'other',
      communityName: live.primaryCommunityName || 'Community Servers',
      difficulty: null,
      points: null,
      release: '',
      width: 0,
      height: 0,
      tiles: [],
      thumbnail: '',
      source: 'live',
      livePlayers: live.players || 0,
      liveServers: live.servers || 0,
      mapUrl: live.mapUrl || '',
      mapSize: live.mapSize || 0,
    };
  }

  return {
    name: mapName,
    mapper: '',
    type: 'Community',
    gameType: '',
    community: '',
    communityName: '',
    difficulty: null,
    points: null,
    release: '',
    width: 0,
    height: 0,
    tiles: [],
    thumbnail: '',
    source: 'unknown',
  };
}

// Map Detail Modal
function openMapModal(mapName, { push = true } = {}) {
  clearSsrContent({ force: true });
  const baseMap = findBaseMapForModal(mapName);

  state.activeMapName = baseMap.name;
  state.activeMapDetail = null;
  state.activeMapTab = 'ranks';
  state.mapDetailError = false;
  const reqId = ++state.mapDetailReqId;

  $('mapModalTitle').textContent = baseMap.name;
  renderMapModalShell(baseMap, null);
  updateMapModalDynamicSections(baseMap, null, true, false);
  $('mapModal').classList.remove('hidden');
  $('mapModalBody').scrollTop = 0;
  syncBodyScrollLock();
  syncUrl({ push });

  fetchMapDetail(baseMap.name)
    .then((detail) => {
      if (reqId !== state.mapDetailReqId) return;
      state.activeMapDetail = detail;
      state.mapDetailError = false;
      $('mapModalTitle').textContent = detail.name || baseMap.name;
      renderMapModalShell(baseMap, detail);
      updateMapModalDynamicSections(baseMap, detail, false, false);
    })
    .catch(() => {
      if (reqId !== state.mapDetailReqId) return;
      state.mapDetailError = true;
      updateMapModalDynamicSections(baseMap, null, false, true);
    });
}

function closeMapModal({ push = true } = {}) {
  $('mapModal').classList.add('hidden');
  state.activeMapName = null;
  state.activeMapDetail = null;
  state.mapDetailError = false;
  state.mapDetailReqId += 1;
  syncBodyScrollLock();
  syncUrl({ push });
}

function renderMapModalShell(base, detail = null) {
  const body = $('mapModalBody');
  const mapName = detail?.name || base.name;
  const isCommunity = detail?.source === 'community' || (base.source !== 'ddnet' && !base.thumbnail);
  const type = detail?.type || base.type || 'Other';
  const difficulty = detail?.difficulty ?? base.difficulty;
  const mapper = detail?.mapper ?? base.mapper ?? '';
  const thumbnail = !isCommunity ? (detail?.thumbnail || base.thumbnail || '') : '';
  const isFav = isMapFavorited(mapName);

  let metaHtml = `${renderCategoryBadge(type)}`;
  if (isCommunity) {
    const comms = Array.isArray(detail?.communities) && detail.communities.length > 0
      ? detail.communities
      : base.community
        ? [{ id: base.community, name: base.communityName || getCommunityInfo(base.community).name }]
        : [];
    for (const c of comms.slice(0, 3)) {
      metaHtml += renderCommunityPill(c.id, c.name);
    }
    const mode = detail?.gameType || base.gameType;
    if (mode && mode !== type) {
      metaHtml += `<span class="mode-pill">${escapeHtml(mode)}</span>`;
    }
  } else {
    if (difficulty !== null && difficulty !== undefined) {
      metaHtml += renderStars(difficulty);
    }
    if (mapper) {
      metaHtml += `<button type="button" class="mapper-link" data-modal-mapper="${escapeAttr(mapper)}" title="${escapeAttr(tr('mapDetailFilterMapper'))}">${escapeHtml(mapper)}</button>`;
    }
  }

  let actionsHtml = '';
  if (isCommunity) {
    const dlUrl = safeHttpUrl(detail?.mapDownloadUrl || base.mapUrl || '');
    const statusUrl = `https://status.tw/maps/${encodeURIComponent(mapName)}`;
    const hasKog =
      detail?.primaryCommunity === 'kog' ||
      base.community === 'kog' ||
      detail?.communities?.some((c) => c.id === 'kog');

    actionsHtml = `
      ${dlUrl ? `<a class="btn btn-primary btn-sm" href="${escapeAttr(dlUrl)}" target="_blank" rel="noopener noreferrer">${icons.download(14)}<span>${escapeHtml(tr('mapDetailDownloadMap'))}</span></a>` : ''}
      <a class="btn btn-sm" href="${escapeAttr(statusUrl)}" target="_blank" rel="noopener noreferrer">${icons.externalLink(14)}<span>${escapeHtml(tr('mapDetailStatusTwBtn'))}</span></a>
      ${hasKog ? `<a class="btn btn-sm" href="https://kog.tw/#p=maps&map=${encodeURIComponent(mapName)}" target="_blank" rel="noopener noreferrer">${icons.externalLink(14)}<span>${escapeHtml(tr('mapDetailKogBtn'))}</span></a>` : ''}
      <button type="button" class="btn btn-sm" data-copy-map="${escapeAttr(mapName)}">${icons.copy(14)}<span>${escapeHtml(tr('mapDetailCopyBtn'))}</span></button>
      <button type="button" class="btn btn-sm btn-toggle${isFav ? ' active' : ''}" data-modal-fav="${escapeAttr(mapName)}">${isFav ? icons.starFilled(14) : icons.star(14)}<span>${escapeHtml(tr('mapDetailFavBtn'))}</span></button>
    `;
  } else {
    const website = detail?.website || base.website || `https://ddnet.org/maps/${encodeURIComponent(mapName)}`;
    const webPreview =
      detail?.web_preview ||
      base.webPreview ||
      `https://ddnet.org/mappreview/?map=${encodeURIComponent(mapName)}`;
    actionsHtml = `
      <a class="btn btn-primary btn-sm" href="${escapeAttr(webPreview)}" target="_blank" rel="noopener noreferrer">${icons.eye(14)}<span>${escapeHtml(tr('mapDetailPreviewBtn'))}</span></a>
      <a class="btn btn-sm" href="${escapeAttr(website)}" target="_blank" rel="noopener noreferrer">${icons.externalLink(14)}<span>${escapeHtml(tr('mapDetailDdnetBtn'))}</span></a>
      <button type="button" class="btn btn-sm" data-copy-map="${escapeAttr(mapName)}">${icons.copy(14)}<span>${escapeHtml(tr('mapDetailCopyBtn'))}</span></button>
      <button type="button" class="btn btn-sm btn-toggle${isFav ? ' active' : ''}" data-modal-fav="${escapeAttr(mapName)}">${isFav ? icons.starFilled(14) : icons.star(14)}<span>${escapeHtml(tr('mapDetailFavBtn'))}</span></button>
    `;
  }

  body.innerHTML = `
    ${
      thumbnail
        ? `<div class="modal-hero"><img id="mapModalHeroImg" src="${escapeAttr(thumbnail)}" alt="${escapeAttr(mapName)}" /></div>`
        : ''
    }
    <div class="modal-meta-row">${metaHtml}</div>
    <div class="modal-actions">${actionsHtml}</div>
    <div id="mapModalStats"></div>
    <div id="mapModalTiles"></div>
    <div id="mapModalRecords"></div>
    <div id="mapModalLiveServers"></div>
  `;
}

function renderModalLiveServerRows(servers) {
  if (!Array.isArray(servers) || servers.length === 0) {
    return `<div class="state-hint">${escapeHtml(tr('noLiveServersNow'))}</div>`;
  }
  return `<div class="modal-server-list">
    ${servers
      .map((s) => {
        const connectUrl = safeConnectTarget(s.address);
        const clients = Array.isArray(s.clients) ? s.clients : [];
        return `<div class="modal-server-item">
          <div class="modal-server-top">
            <div class="modal-server-title">
              ${s.country ? `<span class="country-tag">${escapeHtml(s.country)}</span>` : ''}
              <span class="server-name-text">${escapeHtml(s.name)}</span>
              ${s.community && s.community !== 'other' ? renderCommunityPill(s.community, s.communityName) : ''}
              ${s.gameType ? `<span class="mode-pill">${escapeHtml(s.gameType)}</span>` : ''}
            </div>
            <div class="modal-server-right">
              <span class="server-cap tabular${s.players > 0 ? ' active' : ''}">${s.players} / ${s.maxPlayers || '?'}</span>
              ${
                s.address
                  ? `<button type="button" class="btn btn-sm" data-copy-connect="${escapeAttr(s.address)}">${icons.copy(13)}<span>${escapeHtml(tr('copyConnect'))}</span></button>`
                  : ''
              }
              ${
                connectUrl
                  ? `<a class="btn btn-primary btn-sm" href="${escapeAttr(connectUrl)}">${icons.play(12)}<span>${escapeHtml(tr('connectServer'))}</span></a>`
                  : ''
              }
            </div>
          </div>
          ${
            clients.length > 0
              ? `<div class="server-roster-inline">
                  ${clients
                    .map(
                      (c) => `<button type="button" class="player-chip" data-open-player="${escapeAttr(c.name)}">${escapeHtml(c.name)}${c.clan ? ` <span class="muted">${escapeHtml(c.clan)}</span>` : ''}</button>`
                    )
                    .join('')}
                </div>`
              : ''
          }
        </div>`;
      })
      .join('')}
  </div>`;
}

function updateMapModalDynamicSections(base, detail, isLoading, hasError) {
  const heroImg = $('mapModalHeroImg');
  if (heroImg && detail?.source !== 'community' && detail?.thumbnail && heroImg.getAttribute('src') !== detail.thumbnail) {
    heroImg.closest('.modal-hero')?.classList.remove('hidden');
    heroImg.style.display = '';
    heroImg.src = detail.thumbnail;
  }

  const isCommunity = detail?.source === 'community' || (base.source !== 'ddnet' && !detail?.points && !detail?.ranks);
  const statsEl = $('mapModalStats');
  const tilesEl = $('mapModalTiles');
  const recordsEl = $('mapModalRecords');
  const liveServersEl = $('mapModalLiveServers');

  if (isCommunity && (detail?.source === 'community' || base.source !== 'ddnet')) {
    const modeText = detail?.gameType || base.gameType || detail?.type || base.type || '—';
    const livePlayers = detail?.livePlayersCount ?? base.livePlayers ?? 0;
    const liveServers = detail?.liveServersCount ?? base.liveServers ?? 0;
    const sizeBytes = detail?.mapSize || base.mapSize || 0;
    const fourthLabel = sizeBytes > 0 ? tr('mapDetailFileSize') : tr('mapDetailFirstSeen');
    const fourthValue =
      sizeBytes > 0
        ? formatFileSize(sizeBytes)
        : detail?.firstSeen
          ? formatDate(detail.firstSeen, state.lang)
          : '—';

    if (statsEl) {
      statsEl.innerHTML = `<div class="stats-grid-4">
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailLiveMode'))}</div><div class="metric-value">${escapeHtml(modeText)}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailLivePlayers'))}</div><div class="metric-value">${Number(livePlayers).toLocaleString()}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailLiveServers'))}</div><div class="metric-value">${Number(liveServers).toLocaleString()}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(fourthLabel)}</div><div class="metric-value tabular">${escapeHtml(fourthValue)}</div></div>
      </div>`;
    }
    if (tilesEl) tilesEl.innerHTML = '';

    if (recordsEl) {
      if (isLoading) {
        recordsEl.innerHTML = `<div class="state-hint">${escapeHtml(tr('mapDetailLoadingRecords'))}</div>`;
      } else if (hasError) {
        recordsEl.innerHTML = `<div class="live-notice">${escapeHtml(tr('mapDetailLiveNotice'))}</div>`;
      } else {
        recordsEl.innerHTML = `<div class="live-notice">${escapeHtml(tr('mapDetailLiveNotice'))}</div>`;
      }
    }

    if (liveServersEl) {
      if (detail && Array.isArray(detail.servers)) {
        liveServersEl.innerHTML = `<div>
          <div class="section-heading">${escapeHtml(tr('mapDetailActiveServersTitle'))}</div>
          ${renderModalLiveServerRows(detail.servers)}
        </div>`;
      } else {
        liveServersEl.innerHTML = '';
      }
    }
    return;
  }

  // Official DDNet map view
  const difficulty = detail?.difficulty ?? base.difficulty ?? 0;
  const points = detail?.points ?? base.points ?? 0;
  const release = detail?.release ?? base.release ?? '';
  const width = detail?.width ?? base.width ?? 0;
  const height = detail?.height ?? base.height ?? 0;
  const tiles = Array.isArray(detail?.tiles) ? detail.tiles : base.tiles || [];

  const avgTimeRaw = detail?.average_time ?? detail?.median_time;
  const finishersCount = detail?.finishers;
  const finishesCount = detail?.finishes;
  const biggestTeam = detail?.biggest_team;

  if (statsEl) {
    statsEl.innerHTML = `<div class="stats-grid-4">
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsPoints'))}</div><div class="metric-value">${points > 0 ? escapeHtml(String(points)) : '—'}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsFinishers'))}</div><div class="metric-value">${finishersCount !== undefined ? escapeHtml(finishersCount.toLocaleString()) : '—'}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsFinishes'))}</div><div class="metric-value">${finishesCount !== undefined ? escapeHtml(finishesCount.toLocaleString()) : '—'}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsAvgTime'))}</div><div class="metric-value mono">${avgTimeRaw ? escapeHtml(formatTime(avgTimeRaw)) : '—'}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsRelease'))}</div><div class="metric-value">${escapeHtml(formatDate(release, state.lang))}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsSize'))}</div><div class="metric-value tabular">${width && height ? `${width} × ${height}` : '—'}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsBiggestTeam'))}</div><div class="metric-value">${biggestTeam ? escapeHtml(tr('mapDetailPlayersUnit', { n: biggestTeam })) : '—'}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('mapDetailStatsDifficulty'))}</div><div class="metric-value">${difficulty} / 5</div></div>
    </div>`;
  }

  if (tilesEl) {
    tilesEl.innerHTML =
      tiles.length > 0
        ? `<div>
            <div class="section-heading">${escapeHtml(tr('mapDetailTilesTitle'))}</div>
            <div class="tiles-strip">
              ${tiles
                .map(
                  (tile) =>
                    `<span class="tile-chip" title="${escapeAttr(tile)}"><img src="https://ddnet.org/tiles/${encodeURIComponent(tile)}.png" alt="${escapeAttr(tile)}" loading="lazy" /></span>`
                )
                .join('')}
            </div>
          </div>`
        : '';
  }

  if (recordsEl) {
    if (isLoading) {
      recordsEl.innerHTML = `<div class="state-hint">${escapeHtml(tr('mapDetailLoadingRecords'))}</div>`;
    } else if (hasError) {
      recordsEl.innerHTML = `<div class="state-hint">${escapeHtml(tr('mapDetailRecordsError'))}</div>`;
    } else if (detail) {
      recordsEl.innerHTML = `<div>
        <div class="tabs-bar">
          <button type="button" class="tab-btn${state.activeMapTab === 'ranks' ? ' active' : ''}" data-map-tab="ranks">${escapeHtml(tr('mapDetailTabRanks'))}</button>
          <button type="button" class="tab-btn${state.activeMapTab === 'team' ? ' active' : ''}" data-map-tab="team">${escapeHtml(tr('mapDetailTabTeam'))}</button>
          <button type="button" class="tab-btn${state.activeMapTab === 'most' ? ' active' : ''}" data-map-tab="most">${escapeHtml(tr('mapDetailTabMost'))}</button>
        </div>
        <div id="mapRecordsPanel">${renderMapRecordsTab(detail, state.activeMapTab)}</div>
      </div>`;
    } else {
      recordsEl.innerHTML = '';
    }
  }

  if (liveServersEl) {
    const liveSrvs = detail?.liveInfo?.servers;
    if (Array.isArray(liveSrvs) && liveSrvs.length > 0) {
      liveServersEl.innerHTML = `<div>
        <div class="section-heading">${escapeHtml(tr('mapDetailCurrentlyLive'))} (${detail.liveInfo.numPlayers} ${escapeHtml(tr('liveWord'))})</div>
        ${renderModalLiveServerRows(liveSrvs.slice(0, 6))}
      </div>`;
    } else {
      liveServersEl.innerHTML = '';
    }
  }
}

function renderMapRecordsTab(detail, tab) {
  if (tab === 'ranks') {
    const list = Array.isArray(detail.ranks) ? detail.ranks.slice(0, 15) : [];
    if (list.length === 0) return `<div class="state-hint">${escapeHtml(tr('mapDetailNoRecords'))}</div>`;
    return `<div class="list-box">
      ${list
        .map((r, i) => {
          const name = r.player || r.name || '?';
          const flag = r.country
            ? `<img class="flag-img" src="https://ddnet.org/countryflags/${encodeURIComponent(r.country)}.png" alt="" loading="lazy" />`
            : '';
          return `<div class="list-row">
            <div class="list-row-left">
              <span class="rank-num${i < 3 ? ' top3' : ''}">${i + 1}.</span>
              ${flag}
              <button type="button" class="map-name-btn" data-open-player="${escapeAttr(name)}">${escapeHtml(name)}</button>
            </div>
            <div class="list-row-right mono">${escapeHtml(formatTime(r.time))}</div>
          </div>`;
        })
        .join('')}
    </div>`;
  }

  if (tab === 'team') {
    const list = Array.isArray(detail.team_ranks) ? detail.team_ranks.slice(0, 12) : [];
    if (list.length === 0) return `<div class="state-hint">${escapeHtml(tr('mapDetailNoRecords'))}</div>`;
    return `<div class="list-box">
      ${list
        .map((team, i) => {
          const players = Array.isArray(team.players) ? team.players : [];
          const playerLinks = players
            .map(
              (p) =>
                `<button type="button" class="mapper-link" data-open-player="${escapeAttr(p)}">${escapeHtml(p)}</button>`
            )
            .join(', ');
          return `<div class="list-row">
            <div class="list-row-left" style="flex-wrap:wrap;">
              <span class="rank-num${i < 3 ? ' top3' : ''}">${i + 1}.</span>
              <span>${playerLinks}</span>
            </div>
            <div class="list-row-right mono">${escapeHtml(formatTime(team.time))}</div>
          </div>`;
        })
        .join('')}
    </div>`;
  }

  const most = Array.isArray(detail.max_finishes) ? detail.max_finishes.slice(0, 12) : [];
  if (most.length === 0) return `<div class="state-hint">${escapeHtml(tr('mapDetailNoRecords'))}</div>`;
  return `<div class="list-box">
    ${most
      .map((item, i) => {
        const name = item.player || item.name || '?';
        const count = item.num ?? item.finishes ?? 0;
        const flag = item.country
          ? `<img class="flag-img" src="https://ddnet.org/countryflags/${encodeURIComponent(item.country)}.png" alt="" loading="lazy" />`
          : '';
        return `<div class="list-row">
          <div class="list-row-left">
            <span class="rank-num${i < 3 ? ' top3' : ''}">${i + 1}.</span>
            ${flag}
            <button type="button" class="map-name-btn" data-open-player="${escapeAttr(name)}">${escapeHtml(name)}</button>
          </div>
          <div class="list-row-right tabular">${escapeHtml(tr('mapDetailTimesUnit', { n: count }))}</div>
        </div>`;
      })
      .join('')}
  </div>`;
}

// Live Status & Modal
function renderLiveStatusPill() {
  const pill = $('liveStatusBtn');
  const txt = $('liveStatusText');
  if (!pill || !txt) return;

  const onlinePlayers =
    state.onlineData && typeof state.onlineData.totalPlayers === 'number'
      ? state.onlineData.totalPlayers
      : state.serversData && typeof state.serversData.totalPlayers === 'number'
        ? state.serversData.totalPlayers
        : null;

  if (onlinePlayers !== null) {
    pill.classList.add('online');
    const num = onlinePlayers.toLocaleString(state.lang === 'tr' ? 'tr-TR' : 'en-US');
    txt.innerHTML = `<span class="tabular">${escapeHtml(num)}</span><span class="live-suffix"> ${escapeHtml(tr('liveWord'))}</span>`;
  } else {
    pill.classList.remove('online');
    txt.textContent = tr('liveConnecting');
  }
}

async function loadOnlineData() {
  try {
    state.onlineData = await fetchOnlineStats();
    state.onlineError = false;
    syncLiveMapsIndex();
  } catch {
    state.onlineError = true;
  }
  renderLiveStatusPill();
  if (!$('liveModal').classList.contains('hidden')) {
    renderLiveModal();
  }
}

function openLiveModal() {
  $('liveModal').classList.remove('hidden');
  $('liveModalBody').scrollTop = 0;
  syncBodyScrollLock();
  renderLiveModal();
  loadOnlineData();
}

function closeLiveModal() {
  $('liveModal').classList.add('hidden');
  syncBodyScrollLock();
}

function renderLiveModal() {
  const body = $('liveModalBody');
  const d = state.onlineData || state.serversData;

  if (!d && state.onlineError) {
    body.innerHTML = `<div class="state-hint">${escapeHtml(tr('liveError'))}</div>`;
    return;
  }
  if (!d) {
    body.innerHTML = `<div class="state-hint">${escapeHtml(tr('liveLoading'))}</div>`;
    return;
  }

  const communities = Array.isArray(d.communities) ? d.communities.slice(0, 8) : [];
  const allMaps = Array.isArray(d.topAllMaps)
    ? d.topAllMaps
    : Array.isArray(d.liveMaps)
      ? d.liveMaps.slice(0, 15)
      : [];
  const ddnetMaps = Array.isArray(d.topMaps) ? d.topMaps : [];
  const shownMaps = state.liveModalTab === 'ddnet' ? ddnetMaps : allMaps.length > 0 ? allMaps : ddnetMaps;

  body.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveTotalPlayers'))}</div><div class="metric-value">${(d.totalPlayers ?? 0).toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveActiveServers'))}</div><div class="metric-value tabular">${(d.activeServers ?? 0).toLocaleString()} / ${(d.totalServers ?? 0).toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveOfficialPlayers'))}</div><div class="metric-value">${(d.ddnetPlayers ?? 0).toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveKogPlayers'))}</div><div class="metric-value">${(d.kogPlayers ?? 0).toLocaleString()}</div></div>
    </div>

    ${
      communities.length > 0
        ? `<div>
            <div class="section-heading">${escapeHtml(tr('liveCommunitiesTitle'))}</div>
            <div class="live-comm-grid">
              ${communities
                .map((c) => {
                  const icon = safeHttpUrl(c.icon);
                  const label = c.id === 'other' ? tr('serversOtherCommunity') : c.shortName || c.name;
                  return `<button type="button" class="live-comm-card" data-live-comm="${escapeAttr(c.id)}">
                    <div class="live-comm-top">
                      ${icon ? `<img src="${escapeAttr(icon)}" alt="" width="16" height="16" loading="lazy" />` : icons.server(14)}
                      <span class="live-comm-name">${escapeHtml(label)}</span>
                    </div>
                    <div class="live-comm-stats tabular">${c.players.toLocaleString()} ${escapeHtml(tr('liveWord'))} · ${c.servers}</div>
                  </button>`;
                })
                .join('')}
            </div>
          </div>`
        : ''
    }

    <div>
      <div class="live-section-head">
        <div class="section-heading" style="margin:0;">${escapeHtml(tr('liveHotMapsTitle'))}</div>
        <div class="segmented segmented-sm" role="group">
          <button type="button" class="seg-btn${state.liveModalTab === 'all' ? ' active' : ''}" data-live-tab="all">${escapeHtml(tr('liveTabAll'))}</button>
          <button type="button" class="seg-btn${state.liveModalTab === 'ddnet' ? ' active' : ''}" data-live-tab="ddnet">${escapeHtml(tr('liveTabDdnet'))}</button>
        </div>
      </div>
      <div class="list-box">
        ${shownMaps
          .map((m, i) => {
            const cat = m.category || '';
            return `<div class="list-row">
              <div class="list-row-left">
                <span class="rank-num${i < 3 ? ' top3' : ''}">${i + 1}.</span>
                <a href="/map/${encodeURIComponent(m.name)}" class="map-name-btn" data-live-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</a>
                ${cat ? renderCategoryBadge(cat) : ''}
              </div>
              <div class="list-row-right tabular">
                <span>${escapeHtml(tr('liveServersCount', { n: m.servers }))}</span>
                <span>${escapeHtml(tr('livePlayersCount', { n: m.players }))}</span>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </div>

    <div class="live-modal-footer">
      <button type="button" class="btn btn-primary" id="liveBrowseServersBtn">${escapeHtml(tr('serversBrowseAll'))}</button>
    </div>
  `;
}

// Servers View
async function loadServersData({ forceRefresh = false } = {}) {
  if (state.serversLoading && !forceRefresh) return;
  state.serversLoading = true;
  if (!state.serversLoaded && state.tab === 'servers') {
    $('serversSkeleton').classList.remove('hidden');
    $('serversSkeleton').innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton-row"></div>').join('');
    $('serversError').classList.add('hidden');
    $('serversEmpty').classList.add('hidden');
    $('serversList').classList.add('hidden');
  }

  try {
    const data = await fetchServers({ forceRefresh });
    state.serversData = data;
    state.serversLoaded = true;
    state.serversError = false;
    state.serversLoading = false;

    populateServerModeOptions();
    syncLiveMapsIndex();
    renderLiveStatusPill();

    if (state.tab === 'servers') {
      renderServersView();
    }
  } catch {
    state.serversLoading = false;
    state.serversError = true;
    if (state.tab === 'servers' && !state.serversLoaded) {
      $('serversSkeleton').classList.add('hidden');
      $('serversError').classList.remove('hidden');
    }
  }
}

function populateServerModeOptions() {
  const select = $('serverModeSelect');
  if (!select || !state.serversData) return;
  const modes = Array.isArray(state.serversData.gameTypes) ? state.serversData.gameTypes : [];
  const current = state.serverMode;

  let html = `<option value="">${escapeHtml(tr('serversAllModes'))}</option>`;
  for (const gt of modes) {
    html += `<option value="${escapeAttr(gt.name)}">${escapeHtml(gt.name)} (${gt.players})</option>`;
  }
  if (current && !modes.some((gt) => gt.name.toLowerCase() === current.toLowerCase())) {
    html += `<option value="${escapeAttr(current)}">${escapeHtml(current)}</option>`;
  }
  select.innerHTML = html;
  select.value = current;
}

function renderCommunityStrip() {
  const strip = $('communityStrip');
  const infoBar = $('communityInfoBar');
  if (!strip || !state.serversData) return;

  const d = state.serversData;
  const communities = Array.isArray(d.communities) ? d.communities : [];

  let html = `<button type="button" class="community-card${!state.serverCommunity ? ' active' : ''}" data-server-comm="">
    <div class="community-card-top">
      ${icons.globe(15)}
      <span class="community-card-name">${escapeHtml(tr('serversAllCommunities'))}</span>
    </div>
    <div class="community-card-meta tabular">${d.totalPlayers.toLocaleString()} ${escapeHtml(tr('liveWord'))} · ${d.totalServers.toLocaleString()}</div>
  </button>`;

  for (const c of communities) {
    const active = state.serverCommunity === c.id ? ' active' : '';
    const icon = safeHttpUrl(c.icon);
    const label = c.id === 'other' ? tr('serversOtherCommunity') : c.name;
    html += `<button type="button" class="community-card${active}" data-server-comm="${escapeAttr(c.id)}">
      <div class="community-card-top">
        ${icon ? `<img src="${escapeAttr(icon)}" alt="" width="16" height="16" loading="lazy" />` : icons.server(15)}
        <span class="community-card-name">${escapeHtml(label)}</span>
      </div>
      <div class="community-card-meta tabular">${c.players.toLocaleString()} ${escapeHtml(tr('liveWord'))} · ${c.activeServers}/${c.servers}</div>
    </button>`;
  }
  strip.innerHTML = html;

  if (infoBar) {
    const selected = state.serverCommunity
      ? communities.find((c) => c.id === state.serverCommunity)
      : null;
    if (selected && selected.id !== 'other') {
      const icon = safeHttpUrl(selected.icon);
      const links = (Array.isArray(selected.contactUrls) ? selected.contactUrls : [])
        .map(safeHttpUrl)
        .filter(Boolean)
        .slice(0, 3);
      const modesText = Array.isArray(selected.topGameTypes) ? selected.topGameTypes.join(' · ') : '';

      infoBar.innerHTML = `
        <div class="community-info-left">
          ${icon ? `<img src="${escapeAttr(icon)}" alt="" width="20" height="20" />` : ''}
          <div>
            <strong>${escapeHtml(selected.name)}</strong>
            ${modesText ? `<span class="muted"> · ${escapeHtml(modesText)}</span>` : ''}
          </div>
        </div>
        ${
          links.length > 0
            ? `<div class="community-info-links">
                ${links
                  .map((u) => {
                    let host = u;
                    try {
                      host = new URL(u).hostname.replace(/^www\./, '');
                    } catch {
                      // keep full
                    }
                    return `<a class="btn btn-sm" href="${escapeAttr(u)}" target="_blank" rel="noopener noreferrer">${icons.externalLink(13)}<span>${escapeHtml(host)}</span></a>`;
                  })
                  .join('')}
              </div>`
            : ''
        }
      `;
      infoBar.classList.remove('hidden');
    } else {
      infoBar.classList.add('hidden');
      infoBar.innerHTML = '';
    }
  }
}

function getFilteredServers() {
  if (!state.serversData) return [];
  const source = state.serverWeeklyMode
    ? state.serversData.topWeekly || []
    : state.serversData.servers || [];
  const comm = state.serverCommunity;
  const mode = state.serverMode.toLowerCase();
  const region = state.serverRegion;
  const q = state.serverSearch.trim().toLowerCase();

  return source.filter((s) => {
    if (comm && s.community !== comm) return false;
    if (mode && (s.gameType || '').toLowerCase() !== mode) return false;
    if (region && (s.region || 'other') !== region) return false;
    if (!state.serverWeeklyMode && state.serverActiveOnly && s.players <= 0) return false;
    if (q) {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchMap = (s.mapName || '').toLowerCase().includes(q);
      const matchMode = (s.gameType || '').toLowerCase().includes(q);
      const matchCountry = (s.country || '').toLowerCase().includes(q);
      const matchComm = (s.communityName || '').toLowerCase().includes(q);
      const matchClient =
        Array.isArray(s.clients) &&
        s.clients.some(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.clan || '').toLowerCase().includes(q)
        );
      if (!matchName && !matchMap && !matchMode && !matchCountry && !matchComm && !matchClient) {
        return false;
      }
    }
    return true;
  });
}

function renderServersMeta(filtered) {
  const meta = $('serversMeta');
  const active = $('serversActiveFilters');
  if (!meta || !active) return;

  if (state.serverWeeklyMode) {
    meta.innerHTML = `<span><strong>${escapeHtml(tr('serversWeeklyTitle'))}</strong> · ${escapeHtml(tr('serversWeeklyHint'))}</span>`;
  } else {
    const shownPlayers = filtered.reduce((acc, s) => acc + (s.players || 0), 0);
    meta.innerHTML = `<span class="tabular">${escapeHtml(
      tr('serversSummary', {
        shown: filtered.length.toLocaleString(),
        players: shownPlayers.toLocaleString(),
      })
    )}</span>`;
  }

  const tags = [];
  if (state.serverSearch.trim()) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-server-filter="search">${escapeHtml(
        tr('filterSearchLabel', { q: state.serverSearch.trim() })
      )} ${icons.x(12)}</button>`
    );
  }
  if (state.serverCommunity) {
    const label =
      state.serverCommunity === 'other'
        ? tr('serversOtherCommunity')
        : getCommunityInfo(state.serverCommunity).name;
    tags.push(
      `<button type="button" class="filter-tag" data-clear-server-filter="community">${escapeHtml(label)} ${icons.x(12)}</button>`
    );
  }
  if (state.serverMode) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-server-filter="mode">${escapeHtml(state.serverMode)} ${icons.x(12)}</button>`
    );
  }
  if (state.serverRegion) {
    tags.push(
      `<button type="button" class="filter-tag" data-clear-server-filter="region">${escapeHtml(state.serverRegion.toUpperCase())} ${icons.x(12)}</button>`
    );
  }
  if (tags.length > 0) {
    tags.push(
      `<button type="button" class="filter-reset" data-clear-server-filter="all">${escapeHtml(tr('clearAllFilters'))}</button>`
    );
  }
  active.innerHTML = tags.join('');
}

function renderServerCard(s, index = null) {
  const key = s.address || s.name;
  const expanded = state.expandedServers.has(key);
  const clients = Array.isArray(s.clients) ? s.clients : [];
  const connectUrl = safeConnectTarget(s.address);
  const pct = s.maxPlayers > 0 ? Math.min(100, Math.round((s.players / s.maxPlayers) * 100)) : 0;

  return `<article class="server-card">
    <div class="server-card-main">
      <div class="server-card-info">
        <div class="server-title-row">
          ${index !== null ? `<span class="rank-num${index < 3 ? ' top3' : ''}">${index + 1}.</span>` : ''}
          ${s.country ? `<span class="country-tag">${escapeHtml(s.country)}</span>` : ''}
          <h3 class="server-name">${escapeHtml(s.name)}</h3>
          ${s.passworded ? `<span class="flag-badge" title="${escapeAttr(tr('serversPassworded'))}">${icons.lock(12)}</span>` : ''}
          ${s.requiresLogin ? `<span class="flag-badge" title="${escapeAttr(tr('serversRequiresLogin'))}">${icons.shield(12)}</span>` : ''}
        </div>
        <div class="server-sub-row">
          ${renderCommunityPill(s.community, s.community === 'other' ? tr('serversOtherCommunity') : s.communityName)}
          ${s.gameType ? `<span class="mode-pill">${escapeHtml(s.gameType)}</span>` : ''}
          ${
            s.mapName
              ? `<a href="/map/${encodeURIComponent(s.mapName)}" class="server-map-link" data-open-map="${escapeAttr(s.mapName)}">${icons.map(13)}<span>${escapeHtml(s.mapName)}</span></a>`
              : ''
          }
          ${
            state.serverWeeklyMode && typeof s.avgPlayers === 'number'
              ? `<span class="weekly-stat tabular">${escapeHtml(tr('serversAvgPeak', { avg: s.avgPlayers, peak: s.peakPlayers ?? 0 }))}</span>`
              : ''
          }
        </div>
      </div>

      <div class="server-card-right">
        <div class="server-cap-wrap">
          <div class="server-cap tabular${s.players > 0 ? ' active' : ''}">${s.players} / ${s.maxPlayers || '?'}</div>
          <div class="server-cap-bar"><div class="server-cap-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="server-actions">
          ${
            clients.length > 0
              ? `<button type="button" class="btn btn-sm" data-toggle-server-players="${escapeAttr(key)}">
                  ${expanded ? icons.chevronUp(13) : icons.chevronDown(13)}
                  <span>${escapeHtml(expanded ? tr('serversHidePlayers', { n: clients.length }) : tr('serversShowPlayers', { n: clients.length }))}</span>
                </button>`
              : ''
          }
          ${
            s.address
              ? `<button type="button" class="btn btn-sm" data-copy-connect="${escapeAttr(s.address)}">${icons.copy(13)}<span>${escapeHtml(tr('copyConnect'))}</span></button>`
              : ''
          }
          ${
            connectUrl
              ? `<a class="btn btn-primary btn-sm" href="${escapeAttr(connectUrl)}">${icons.play(12)}<span>${escapeHtml(tr('connectServer'))}</span></a>`
              : ''
          }
        </div>
      </div>
    </div>
    ${
      expanded && clients.length > 0
        ? `<div class="server-roster">
            ${clients
              .map(
                (c) => `<button type="button" class="player-chip" data-open-player="${escapeAttr(c.name)}">
                  <span class="player-chip-name">${escapeHtml(c.name)}</span>
                  ${c.clan ? `<span class="player-chip-clan">${escapeHtml(c.clan)}</span>` : ''}
                  ${c.score !== null && c.score !== undefined && c.score >= 0 ? `<span class="player-chip-score mono">${c.score}</span>` : ''}
                </button>`
              )
              .join('')}
          </div>`
        : ''
    }
  </article>`;
}

function renderServersView({ pushUrl = false } = {}) {
  clearSsrContent();

  $('serverSearch').value = state.serverSearch;
  const searchWrap = $('serverSearch').closest('.search-wrap');
  searchWrap.classList.toggle('has-value', Boolean(state.serverSearch));
  $('serverSearchClear').classList.toggle('hidden', !state.serverSearch);
  $('serverModeSelect').value = state.serverMode;
  $('serverRegionSelect').value = state.serverRegion;
  $('serverActiveOnlyBtn').classList.toggle('active', state.serverActiveOnly && !state.serverWeeklyMode);
  $('serverActiveOnlyBtn').setAttribute('aria-pressed', String(state.serverActiveOnly));
  $('serverActiveOnlyBtn').disabled = state.serverWeeklyMode;
  $('serverWeeklyBtn').classList.toggle('active', state.serverWeeklyMode);
  $('serverWeeklyBtn').setAttribute('aria-pressed', String(state.serverWeeklyMode));

  if (!state.serversLoaded) {
    if (state.serversError) {
      $('serversSkeleton').classList.add('hidden');
      $('serversError').classList.remove('hidden');
    } else {
      $('serversSkeleton').classList.remove('hidden');
    }
    syncUrl({ push: pushUrl });
    return;
  }

  $('serversSkeleton').classList.add('hidden');
  $('serversError').classList.add('hidden');

  renderCommunityStrip();
  const filtered = getFilteredServers();
  renderServersMeta(filtered);

  const listEl = $('serversList');
  if (filtered.length === 0) {
    $('serversEmpty').classList.remove('hidden');
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
    syncUrl({ push: pushUrl });
    return;
  }

  $('serversEmpty').classList.add('hidden');
  listEl.classList.remove('hidden');
  listEl.innerHTML = filtered
    .map((s, idx) => renderServerCard(s, state.serverWeeklyMode ? idx : null))
    .join('');

  syncUrl({ push: pushUrl });
}

// Player View
function addPlayerHistory(name) {
  const next = [name, ...state.playerHistory.filter((n) => n.toLowerCase() !== name.toLowerCase())].slice(0, 12);
  state.playerHistory = next;
  writeArray(STORAGE_KEYS.playerHistory, next);
}

function togglePlayerFavorite(name) {
  const exists = state.playerFavs.some((n) => n.toLowerCase() === name.toLowerCase());
  if (exists) {
    state.playerFavs = state.playerFavs.filter((n) => n.toLowerCase() !== name.toLowerCase());
    showToast(tr('removedFav', { name }));
  } else {
    state.playerFavs = [name, ...state.playerFavs];
    showToast(tr('addedFav', { name }));
  }
  writeArray(STORAGE_KEYS.playerFavs, state.playerFavs);
  renderPlayerQuickLists();
  if (state.activePlayerData) renderPlayerView();
}

function renderPlayerQuickLists() {
  const favSec = $('playerFavSection');
  const histSec = $('playerHistorySection');
  const favList = $('playerFavList');
  const histList = $('playerHistoryList');

  if (state.playerFavs.length > 0) {
    favSec.classList.remove('hidden');
    favList.innerHTML = state.playerFavs
      .map(
        (name) =>
          `<button type="button" class="quick-chip" data-pick-player="${escapeAttr(name)}">${icons.starFilled(12)}<span>${escapeHtml(name)}</span></button>`
      )
      .join('');
  } else {
    favSec.classList.add('hidden');
  }

  if (state.playerHistory.length > 0) {
    histSec.classList.remove('hidden');
    histList.innerHTML = state.playerHistory
      .map(
        (name) =>
          `<button type="button" class="quick-chip" data-pick-player="${escapeAttr(name)}">${icons.clock(12)}<span>${escapeHtml(name)}</span></button>`
      )
      .join('');
  } else {
    histSec.classList.add('hidden');
  }
}

async function openPlayerProfile(playerName) {
  const trimmed = String(playerName || '').trim();
  if (!trimmed) return;

  state.activePlayerName = trimmed;
  state.playerLoading = true;
  state.playerError = null;
  state.showAllFinishes = false;
  $('playerSearch').value = trimmed;
  $('playerSearchClear').classList.remove('hidden');
  $('playerAutocomplete').classList.add('hidden');
  syncUrl();
  renderPlayerView();

  try {
    const data = await fetchPlayerProfile(trimmed);
    state.activePlayerData = data;
    state.activePlayerName = data.player || trimmed;
    state.playerLoading = false;
    addPlayerHistory(state.activePlayerName);
    renderPlayerQuickLists();
    renderPlayerView();
    syncUrl();
  } catch (err) {
    state.activePlayerData = null;
    state.playerLoading = false;
    state.playerError = err.status === 404 ? 'not_found' : 'error';
    renderPlayerView();
  }
}

function renderNetworkActivitySection(network) {
  if (!network) return '';
  const favSrvName = network.favoriteServer?.name || '—';
  const favMapName = network.favoriteMap?.name || '';
  const favModeName = network.favoriteGameType?.name || '—';
  const daily = Array.isArray(network.dailyPlayTime) ? network.dailyPlayTime : [];
  const maxDaily = daily.reduce((m, d) => Math.max(m, d.playTime || 0), 0);

  return `<div class="network-activity-block">
    <h3 class="section-heading">${escapeHtml(tr('playerNetworkActivity'))}</h3>
    <div class="metrics-grid">
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerNetworkPlaytime'))}</div><div class="metric-value">${escapeHtml(formatDuration(network.totalPlayTime, state.lang))}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerNetworkSessions'))}</div><div class="metric-value tabular">${Number(network.sessionCount || 0).toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerNetworkFavMode'))}</div><div class="metric-value">${escapeHtml(favModeName)}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerNetworkFavMap'))}</div><div class="metric-value">${
        favMapName
          ? `<button type="button" class="map-name-btn" data-open-map="${escapeAttr(favMapName)}">${escapeHtml(favMapName)}</button>`
          : '—'
      }</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerNetworkFavServer'))}</div><div class="metric-value" title="${escapeAttr(favSrvName)}">${escapeHtml(favSrvName)}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerNetworkLongest'))}</div><div class="metric-value">${escapeHtml(formatDuration(network.longestSession, state.lang))}</div></div>
    </div>
    ${
      daily.length > 0 && maxDaily > 0
        ? `<div class="activity-chart-wrap">
            <div class="activity-chart-head">
              <span>${escapeHtml(tr('playerDailyActivity'))}</span>
              <span class="muted">${escapeHtml(daily[0].date)} – ${escapeHtml(daily[daily.length - 1].date)}</span>
            </div>
            <div class="activity-chart" aria-label="${escapeAttr(tr('playerDailyActivity'))}">
              ${daily
                .map((d) => {
                  const pct = d.playTime > 0 ? Math.max(10, Math.round((d.playTime / maxDaily) * 100)) : 4;
                  const titleText = `${d.date}: ${formatDuration(d.playTime, state.lang)}`;
                  return `<div class="activity-bar${d.playTime > 0 ? ' active' : ''}" style="height:${pct}%" title="${escapeAttr(titleText)}"></div>`;
                })
                .join('')}
            </div>
          </div>`
        : ''
    }
  </div>`;
}

function renderPlayerView() {
  renderPlayerQuickLists();
  const container = $('playerProfile');
  if (!container) return;

  if (state.playerLoading) {
    container.innerHTML = `<div class="skeleton-list">${Array.from({ length: 5 }, () => '<div class="skeleton-row"></div>').join('')}</div>`;
    return;
  }

  if (state.playerError === 'not_found') {
    container.innerHTML = `<div class="state-box">
      <div class="state-title">${escapeHtml(tr('playerNotFoundTitle'))}</div>
      <div class="state-hint">${escapeHtml(tr('playerNotFoundHint', { name: state.activePlayerName }))}</div>
    </div>`;
    return;
  }

  if (state.playerError) {
    container.innerHTML = `<div class="state-box">
      <div class="state-title">${escapeHtml(tr('playerErrorTitle'))}</div>
      <button type="button" class="btn btn-primary" data-pick-player="${escapeAttr(state.activePlayerName)}">${escapeHtml(tr('retryBtn'))}</button>
    </div>`;
    return;
  }

  if (!state.activePlayerData) {
    container.innerHTML = `<div class="state-box">
      <div class="state-title">${escapeHtml(tr('playerEmptyTitle'))}</div>
      <div class="state-hint">${escapeHtml(tr('playerEmptyHint'))}</div>
    </div>`;
    return;
  }

  const d = state.activePlayerData;
  const name = d.player || state.activePlayerName;
  const hasDdnet = d.hasDdnetProfile !== false && Boolean(d.points);
  const net = d.network || null;
  const isOnline = Boolean(net?.online && Array.isArray(net.sessions) && net.sessions.length > 0);
  const liveSession = isOnline ? net.sessions[0] : null;
  const isFav = state.playerFavs.some((n) => n.toLowerCase() === name.toLowerCase());
  const globalRank = d.points?.rank;

  const onlineBannerHtml = liveSession
    ? `<div class="online-now-banner">
        <div class="online-now-left">
          <span class="live-dot" aria-hidden="true"></span>
          <div class="online-now-text">
            <strong>${escapeHtml(tr('playerOnlineNow'))}:</strong>
            <span>${escapeHtml(liveSession.serverName)}</span>
            ${liveSession.gameType ? `<span class="mode-pill">${escapeHtml(liveSession.gameType)}</span>` : ''}
            ${
              liveSession.mapName
                ? `<a href="/map/${encodeURIComponent(liveSession.mapName)}" class="map-name-btn" data-open-map="${escapeAttr(liveSession.mapName)}">${escapeHtml(liveSession.mapName)}</a>`
                : ''
            }
          </div>
        </div>
        <div class="online-now-actions">
          ${
            liveSession.address
              ? `<button type="button" class="btn btn-sm" data-copy-connect="${escapeAttr(liveSession.address)}">${icons.copy(13)}<span>${escapeHtml(tr('copyConnect'))}</span></button>`
              : ''
          }
          ${
            safeConnectTarget(liveSession.address)
              ? `<a class="btn btn-primary btn-sm" href="${escapeAttr(safeConnectTarget(liveSession.address))}">${icons.play(12)}<span>${escapeHtml(tr('connectServer'))}</span></a>`
              : ''
          }
        </div>
      </div>`
    : '';

  const networkSectionHtml = renderNetworkActivitySection(net);

  let ddnetSectionsHtml = '';
  if (!hasDdnet) {
    ddnetSectionsHtml = `<div class="live-notice">${escapeHtml(tr('playerNetworkOnlyHint'))}</div>`;
  } else {
    const pts = d.points?.points ?? 0;
    const totalPts = d.points?.total ?? 0;
    const pct = totalPts > 0 ? Math.min(100, Math.round((pts / totalPts) * 1000) / 10) : 0;
    const teamRank = d.team_rank?.rank;
    const soloRank = d.rank?.rank;
    const hours = d.hours_played_past_365_days;
    const favServer = d.favorite_server?.server || '—';
    const weeklyPts = d.points_last_week?.points ?? 0;
    const monthlyPts = d.points_last_month?.points ?? 0;
    const firstFinish = d.first_finish;

    const typesObj = d.types && typeof d.types === 'object' ? d.types : {};
    const orderedTypes = [
      ...CATEGORY_ORDER.filter((k) => typesObj[k]),
      ...Object.keys(typesObj).filter((k) => !CATEGORY_ORDER.includes(k)),
    ];

    const allFinishes = Array.isArray(d.last_finishes) ? d.last_finishes : [];
    const visibleFinishes = state.showAllFinishes ? allFinishes : allFinishes.slice(0, 15);
    const partners = Array.isArray(d.favorite_partners) ? d.favorite_partners.slice(0, 10) : [];

    ddnetSectionsHtml = `
      <div class="progress-block">
        <div class="progress-head">
          <span>${escapeHtml(tr('playerPoints'))}</span>
          <span class="tabular"><strong>${pts.toLocaleString()}</strong> / ${totalPts.toLocaleString()} (${pct}%)</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerTeamRank'))}</div><div class="metric-value">${teamRank ? `#${teamRank.toLocaleString()}` : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerSoloRank'))}</div><div class="metric-value">${soloRank ? `#${soloRank.toLocaleString()}` : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerHours365'))}</div><div class="metric-value">${hours !== undefined ? escapeHtml(tr('playerHoursValue', { n: hours })) : '—'}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerFavServer'))}</div><div class="metric-value">${escapeHtml(favServer)}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerWeeklyMonthly'))}</div><div class="metric-value">+${weeklyPts} / +${monthlyPts}</div></div>
        <div class="metric-box"><div class="metric-label">${escapeHtml(tr('playerFirstFinish'))}</div><div class="metric-value">${firstFinish?.map ? `${escapeHtml(firstFinish.map)} (${escapeHtml(formatDate(firstFinish.timestamp, state.lang))})` : '—'}</div></div>
      </div>

      ${
        orderedTypes.length > 0
          ? `<div>
              <h3 class="section-heading">${escapeHtml(tr('playerCategoryProgress'))}</h3>
              <div class="cat-progress-grid">
                ${orderedTypes
                  .map((cat) => {
                    const info = typesObj[cat] || {};
                    const cp = info.points?.points ?? 0;
                    const ct = info.points?.total ?? 0;
                    const cpct = ct > 0 ? Math.min(100, Math.round((cp / ct) * 100)) : 0;
                    const crank = info.points?.rank;
                    return `<div class="cat-stat-card" data-cat="${escapeAttr(cat)}">
                      <div class="cat-stat-top">
                        <span class="cat-badge" data-cat="${escapeAttr(cat)}"><span class="cat-dot"></span>${escapeHtml(cat)}</span>
                        <span class="cat-stat-pts">${crank ? `#${crank.toLocaleString()}` : ''}</span>
                      </div>
                      <div class="cat-stat-top">
                        <span class="cat-stat-pts">${cp} / ${ct}</span>
                        <span class="cat-stat-pts">${cpct}%</span>
                      </div>
                      <div class="progress-track"><div class="progress-fill" style="width:${cpct}%"></div></div>
                    </div>`;
                  })
                  .join('')}
              </div>
            </div>`
          : ''
      }

      <div class="profile-columns">
        <div>
          <h3 class="section-heading">${escapeHtml(tr('playerRecentFinishes'))}</h3>
          <div class="list-box">
            ${
              visibleFinishes.length > 0
                ? visibleFinishes
                    .map((f) => {
                      const mapName = f.map || '?';
                      return `<div class="list-row">
                        <div class="list-row-left">
                          <a href="/map/${encodeURIComponent(mapName)}" class="map-name-btn" data-open-map="${escapeAttr(mapName)}">${escapeHtml(mapName)}</a>
                          ${f.type ? renderCategoryBadge(f.type) : ''}
                        </div>
                        <div class="list-row-right">
                          <span class="mono">${escapeHtml(formatTime(f.time))}</span>
                          <span>${escapeHtml(formatRelativeTime(f.timestamp, state.lang))}</span>
                        </div>
                      </div>`;
                    })
                    .join('')
                : `<div class="list-row"><span class="state-hint">${escapeHtml(tr('playerDdnetNoFinishes'))}</span></div>`
            }
          </div>
          ${
            allFinishes.length > 15
              ? `<div style="margin-top:8px;">
                  <button type="button" class="btn btn-sm" id="toggleFinishesBtn">
                    ${escapeHtml(
                      state.showAllFinishes
                        ? tr('playerShowLess')
                        : tr('playerShowMore', { n: allFinishes.length - 15 })
                    )}
                  </button>
                </div>`
              : ''
          }
        </div>

        <div>
          <h3 class="section-heading">${escapeHtml(tr('playerPartners'))}</h3>
          <div class="list-box">
            ${
              partners.length > 0
                ? partners
                    .map(
                      (p) => `<div class="list-row">
                        <div class="list-row-left">
                          <button type="button" class="map-name-btn" data-pick-player="${escapeAttr(p.name)}">${escapeHtml(p.name)}</button>
                        </div>
                        <div class="list-row-right tabular">${escapeHtml(tr('playerFinishesCount', { n: p.finishes }))}</div>
                      </div>`
                    )
                    .join('')
                : `<div class="list-row"><span class="state-hint">—</span></div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-title-wrap">
          <h2 class="profile-name">${escapeHtml(name)}</h2>
          ${globalRank ? `<span class="rank-pill">#${globalRank.toLocaleString()}</span>` : ''}
          ${isOnline ? `<span class="live-badge"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(tr('playerOnlineBadge'))}</span>` : ''}
        </div>
        <div class="profile-actions">
          <button type="button" class="btn btn-sm btn-toggle${isFav ? ' active' : ''}" data-fav-player="${escapeAttr(name)}">
            ${isFav ? icons.starFilled(14) : icons.star(14)}
            <span>${escapeHtml(isFav ? tr('playerRemoveFav') : tr('playerAddFav'))}</span>
          </button>
          ${
            hasDdnet
              ? `<a class="btn btn-sm" href="https://ddnet.org/players/${encodeURIComponent(name)}/" target="_blank" rel="noopener noreferrer">
                  ${icons.externalLink(14)}
                  <span>${escapeHtml(tr('playerViewOnDdnet'))}</span>
                </a>`
              : ''
          }
          <a class="btn btn-sm" href="https://status.tw/players/${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">
            ${icons.externalLink(14)}
            <span>${escapeHtml(tr('playerViewOnStatusTw'))}</span>
          </a>
        </div>
      </div>

      ${onlineBannerHtml}
      ${ddnetSectionsHtml}
      ${networkSectionHtml}
    </div>
  `;
}

// Tab switching
function switchTab(tabName) {
  if (tabName === 'players') state.tab = 'players';
  else if (tabName === 'servers') state.tab = 'servers';
  else state.tab = 'maps';

  $('navMaps').classList.toggle('active', state.tab === 'maps');
  $('navServers').classList.toggle('active', state.tab === 'servers');
  $('navPlayers').classList.toggle('active', state.tab === 'players');
  $('mapsView').classList.toggle('hidden', state.tab !== 'maps');
  $('serversView').classList.toggle('hidden', state.tab !== 'servers');
  $('playersView').classList.toggle('hidden', state.tab !== 'players');

  if (state.tab === 'players') {
    renderPlayerView();
    if (state.activePlayerName && !state.activePlayerData && !state.playerLoading) {
      openPlayerProfile(state.activePlayerName);
    }
  } else if (state.tab === 'servers') {
    if (!state.serversLoaded) {
      loadServersData();
    }
    renderServersView();
  }
  syncUrl();
}

function toggleFavoriteMap(mapName) {
  const cleanName = String(mapName || '').trim();
  if (!cleanName) return;

  const existingKey = getFavKey(cleanName);
  if (existingKey) {
    state.mapFavs.delete(existingKey);
    delete state.mapFavMeta[existingKey];
    showToast(tr('removedFav', { name: existingKey }));
  } else {
    const pool = state.combinedMaps.length ? state.combinedMaps : state.maps;
    const match =
      pool.find((m) => m.name === cleanName) ||
      pool.find((m) => m.name.toLowerCase() === cleanName.toLowerCase()) ||
      (state.activeMapDetail?.name?.toLowerCase() === cleanName.toLowerCase()
        ? state.activeMapDetail
        : null) ||
      state.liveMapsByKey.get(cleanName.toLowerCase());

    state.mapFavs.add(cleanName);
    state.mapFavMeta[cleanName] = {
      type: match?.type || match?.category || 'Community',
      gameType: match?.gameType || '',
      community: match?.community || match?.primaryCommunity || '',
      communityName: match?.communityName || match?.primaryCommunityName || '',
      source: match?.source || 'community',
      mapper: match?.mapper || '',
      difficulty: typeof match?.difficulty === 'number' ? match.difficulty : null,
      points: typeof match?.points === 'number' ? match.points : null,
      release: match?.release || '',
      thumbnail: match?.thumbnail || '',
    };
    showToast(tr('addedFav', { name: cleanName }));
  }

  writeSet(STORAGE_KEYS.mapFavs, state.mapFavs);
  writeObject(STORAGE_KEYS.mapFavMeta, state.mapFavMeta);
  applyMapFilters();
  renderMapsContent();

  if (
    state.activeMapName &&
    state.activeMapName.toLowerCase() === cleanName.toLowerCase() &&
    !$('mapModal').classList.contains('hidden')
  ) {
    const modalFavBtn = $('mapModalBody')?.querySelector('[data-modal-fav]');
    if (modalFavBtn) {
      const isFav = isMapFavorited(state.activeMapName);
      modalFavBtn.classList.toggle('active', isFav);
      modalFavBtn.innerHTML = `${isFav ? icons.starFilled(14) : icons.star(14)}<span>${escapeHtml(tr('mapDetailFavBtn'))}</span>`;
    }
  }
}

function openRandomMap() {
  const pool =
    state.filteredMaps.length > 0
      ? state.filteredMaps
      : state.combinedMaps.length > 0
        ? state.combinedMaps
        : state.maps;
  if (pool.length === 0) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  openMapModal(pick.name);
}

// Bindings
function bindEvents() {
  // Capture broken images gracefully without inline onerror
  document.addEventListener(
    'error',
    (e) => {
      const target = e.target;
      if (target && target.tagName === 'IMG') {
        if (target.id === 'mapModalHeroImg') {
          target.closest('.modal-hero')?.classList.add('hidden');
        } else {
          target.style.display = 'none';
        }
      }
    },
    true
  );

  $('brandLink').addEventListener('click', (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    clearSsrContent({ force: true });
    state.search = '';
    state.category = '';
    state.difficulty = '';
    state.mapper = '';
    state.favOnly = false;
    state.sort = 'release-desc';
    state.page = 1;
    $('mapSearch').value = '';
    $('difficultySelect').value = '';
    $('sortSelect').value = 'release-desc';
    if (!$('mapModal').classList.contains('hidden')) {
      closeMapModal({ push: false });
    }
    switchTab('maps');
    applyMapFilters();
    renderMapsContent({ pushUrl: true });
  });

  $('navMaps').addEventListener('click', () => {
    clearSsrContent({ force: true });
    switchTab('maps');
  });
  $('navServers').addEventListener('click', () => {
    clearSsrContent({ force: true });
    switchTab('servers');
  });
  $('navPlayers').addEventListener('click', () => {
    clearSsrContent({ force: true });
    switchTab('players');
  });

  $('langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'tr' ? 'en' : 'tr';
    try {
      localStorage.setItem(STORAGE_KEYS.lang, state.lang);
    } catch {
      // Ignore
    }
    applyTranslations();
    if (state.mapsLoaded) renderMapsContent();
    if (state.tab === 'servers' && state.serversLoaded) {
      populateServerModeOptions();
      renderServersView();
    }
    if (state.tab === 'players') renderPlayerView();
    if (!$('liveModal').classList.contains('hidden')) renderLiveModal();
    if (!$('mapModal').classList.contains('hidden') && state.activeMapName) {
      const base = findBaseMapForModal(state.activeMapName);
      renderMapModalShell(base, state.activeMapDetail);
      updateMapModalDynamicSections(
        base,
        state.activeMapDetail,
        !state.activeMapDetail && !state.mapDetailError,
        state.mapDetailError
      );
    }
  });

  $('themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });

  $('liveStatusBtn').addEventListener('click', openLiveModal);
  $('liveModalClose').addEventListener('click', closeLiveModal);
  $('liveModal').addEventListener('click', (e) => {
    if (e.target.id === 'liveModal') closeLiveModal();
  });

  $('mapModalClose').addEventListener('click', closeMapModal);
  $('mapModal').addEventListener('click', (e) => {
    if (e.target.id === 'mapModal') closeMapModal();
  });

  // Map search & autocomplete
  $('mapSearch').addEventListener('input', (e) => {
    clearSsrContent({ force: true });
    state.search = e.target.value;
    state.page = 1;
    updateMapAutocomplete();
    clearTimeout(mapSearchDebounce);
    mapSearchDebounce = setTimeout(() => {
      applyMapFilters();
      renderMapsContent();
    }, 90);
  });

  $('mapSearch').addEventListener('keydown', (e) => {
    const box = $('mapAutocomplete');
    const items = state.mapAcItems;
    if (box.classList.contains('hidden') || items.length === 0) {
      if (e.key === 'Escape') {
        box.classList.add('hidden');
        e.target.blur();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.mapAcIndex = (state.mapAcIndex + 1) % items.length;
      highlightDropdownItem(box, state.mapAcIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.mapAcIndex = state.mapAcIndex <= 0 ? items.length - 1 : state.mapAcIndex - 1;
      highlightDropdownItem(box, state.mapAcIndex);
    } else if (e.key === 'Enter' && state.mapAcIndex >= 0) {
      e.preventDefault();
      const chosen = items[state.mapAcIndex];
      box.classList.add('hidden');
      if (chosen) openMapModal(chosen.name);
    } else if (e.key === 'Escape') {
      box.classList.add('hidden');
    }
  });

  $('mapSearchClear').addEventListener('click', () => {
    state.search = '';
    state.page = 1;
    $('mapSearch').value = '';
    $('mapAutocomplete').classList.add('hidden');
    applyMapFilters();
    renderMapsContent();
    $('mapSearch').focus();
  });

  $('difficultySelect').addEventListener('change', (e) => {
    state.difficulty = e.target.value;
    state.page = 1;
    applyMapFilters();
    renderMapsContent();
  });

  $('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 1;
    applyMapFilters();
    renderMapsContent();
  });

  $('favOnlyBtn').addEventListener('click', () => {
    state.favOnly = !state.favOnly;
    state.page = 1;
    applyMapFilters();
    renderMapsContent();
  });

  $('randomMapBtn').addEventListener('click', openRandomMap);

  $('viewTableBtn').addEventListener('click', () => {
    state.viewMode = 'table';
    try {
      localStorage.setItem(STORAGE_KEYS.viewMode, 'table');
    } catch {
      // Ignore
    }
    renderMapsContent();
  });

  $('viewGridBtn').addEventListener('click', () => {
    state.viewMode = 'grid';
    try {
      localStorage.setItem(STORAGE_KEYS.viewMode, 'grid');
    } catch {
      // Ignore
    }
    renderMapsContent();
  });

  $('prevPageBtn').addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      renderMapsContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  $('nextPageBtn').addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(state.filteredMaps.length / state.pageSize));
    if (state.page < totalPages) {
      state.page += 1;
      renderMapsContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  $('pageSizeSelect').addEventListener('change', (e) => {
    const nextSize = Number(e.target.value);
    state.pageSize = nextSize === 60 || nextSize === 100 ? nextSize : 30;
    state.page = 1;
    try {
      localStorage.setItem(STORAGE_KEYS.pageSize, String(state.pageSize));
    } catch {
      // Ignore
    }
    renderMapsContent();
  });

  $('retryMapsBtn').addEventListener('click', () => loadMapCatalog({ forceRefresh: true }));
  $('emptyClearBtn').addEventListener('click', () => {
    state.search = '';
    state.category = '';
    state.difficulty = '';
    state.mapper = '';
    state.favOnly = false;
    state.page = 1;
    $('mapSearch').value = '';
    $('difficultySelect').value = '';
    applyMapFilters();
    renderMapsContent();
  });

  // Servers View events
  $('serverSearch').addEventListener('input', (e) => {
    state.serverSearch = e.target.value;
    clearTimeout(serverSearchDebounce);
    serverSearchDebounce = setTimeout(() => {
      renderServersView();
    }, 80);
  });

  $('serverSearchClear').addEventListener('click', () => {
    state.serverSearch = '';
    $('serverSearch').value = '';
    renderServersView();
    $('serverSearch').focus();
  });

  $('serverModeSelect').addEventListener('change', (e) => {
    state.serverMode = e.target.value;
    renderServersView();
  });

  $('serverRegionSelect').addEventListener('change', (e) => {
    state.serverRegion = e.target.value;
    renderServersView();
  });

  $('serverActiveOnlyBtn').addEventListener('click', () => {
    state.serverActiveOnly = !state.serverActiveOnly;
    renderServersView();
  });

  $('serverWeeklyBtn').addEventListener('click', () => {
    state.serverWeeklyMode = !state.serverWeeklyMode;
    renderServersView();
  });

  $('serverRefreshBtn').addEventListener('click', () => loadServersData({ forceRefresh: true }));
  $('retryServersBtn').addEventListener('click', () => loadServersData({ forceRefresh: true }));
  $('serversEmptyClearBtn').addEventListener('click', () => {
    state.serverSearch = '';
    state.serverCommunity = '';
    state.serverMode = '';
    state.serverRegion = '';
    state.serverActiveOnly = false;
    state.serverWeeklyMode = false;
    $('serverModeSelect').value = '';
    $('serverRegionSelect').value = '';
    renderServersView();
  });

  // Player Search & Autocomplete
  $('playerSearch').addEventListener('input', (e) => {
    const val = e.target.value;
    $('playerSearchClear').classList.toggle('hidden', !val);
    clearTimeout(playerAcDebounce);
    const box = $('playerAutocomplete');
    if (val.trim().length < 2) {
      box.classList.add('hidden');
      state.playerAcItems = [];
      state.playerAcIndex = -1;
      return;
    }
    playerAcDebounce = setTimeout(async () => {
      try {
        const items = await fetchPlayerSuggestions(val.trim());
        state.playerAcItems = items;
        state.playerAcIndex = -1;
        if (items.length === 0) {
          box.classList.add('hidden');
          return;
        }
        box.innerHTML = items
          .map((item, idx) => {
            const subParts = [];
            if (item.online) {
              const label = item.currentMap || item.currentServer || tr('playerOnlineBadge');
              subParts.push(`<span class="live-inline-pill"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(label)}</span>`);
            }
            if (item.points > 0) {
              subParts.push(escapeHtml(tr('pointsUnit', { n: item.points.toLocaleString() })));
            }
            return `<button type="button" class="dropdown-item" data-player-ac="${escapeAttr(item.name)}" data-idx="${idx}" role="option">
              <span class="dropdown-main">${escapeHtml(item.name)}</span>
              <span class="dropdown-sub tabular">${subParts.join(' · ')}</span>
            </button>`;
          })
          .join('');
        box.classList.remove('hidden');
      } catch {
        // Request aborted or failed silently
      }
    }, 220);
  });

  $('playerSearch').addEventListener('keydown', (e) => {
    const box = $('playerAutocomplete');
    const items = state.playerAcItems;
    if (e.key === 'ArrowDown' && !box.classList.contains('hidden') && items.length > 0) {
      e.preventDefault();
      state.playerAcIndex = (state.playerAcIndex + 1) % items.length;
      highlightDropdownItem(box, state.playerAcIndex);
    } else if (e.key === 'ArrowUp' && !box.classList.contains('hidden') && items.length > 0) {
      e.preventDefault();
      state.playerAcIndex = state.playerAcIndex <= 0 ? items.length - 1 : state.playerAcIndex - 1;
      highlightDropdownItem(box, state.playerAcIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!box.classList.contains('hidden') && state.playerAcIndex >= 0 && items[state.playerAcIndex]) {
        openPlayerProfile(items[state.playerAcIndex].name);
      } else {
        openPlayerProfile(e.target.value);
      }
    } else if (e.key === 'Escape') {
      box.classList.add('hidden');
    }
  });

  $('playerSearchClear').addEventListener('click', () => {
    $('playerSearch').value = '';
    $('playerSearchClear').classList.add('hidden');
    $('playerAutocomplete').classList.add('hidden');
    $('playerSearch').focus();
  });

  // Global click delegation
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Close dropdowns when clicking outside
    if (!target.closest('#mapSearch') && !target.closest('#mapAutocomplete')) {
      $('mapAutocomplete').classList.add('hidden');
    }
    if (!target.closest('#playerSearch') && !target.closest('#playerAutocomplete')) {
      $('playerAutocomplete').classList.add('hidden');
    }

    const catBtn = target.closest('[data-cat-filter]');
    if (catBtn) {
      if (catBtn.tagName === 'A' && isModifiedClick(e)) return;
      e.preventDefault();
      clearSsrContent({ force: true });
      state.category = catBtn.getAttribute('data-cat-filter') || '';
      state.page = 1;
      applyMapFilters();
      renderMapsContent({ pushUrl: true });
      return;
    }

    const clearBtn = target.closest('[data-clear-filter]');
    if (clearBtn) {
      const which = clearBtn.getAttribute('data-clear-filter');
      if (which === 'search' || which === 'all') {
        state.search = '';
        $('mapSearch').value = '';
      }
      if (which === 'category' || which === 'all') state.category = '';
      if (which === 'difficulty' || which === 'all') {
        state.difficulty = '';
        $('difficultySelect').value = '';
      }
      if (which === 'mapper' || which === 'all') state.mapper = '';
      if (which === 'fav' || which === 'all') state.favOnly = false;
      state.page = 1;
      applyMapFilters();
      renderMapsContent();
      return;
    }

    const serverCommBtn = target.closest('[data-server-comm]');
    if (serverCommBtn) {
      state.serverCommunity = serverCommBtn.getAttribute('data-server-comm') || '';
      renderServersView();
      return;
    }

    const clearSrvBtn = target.closest('[data-clear-server-filter]');
    if (clearSrvBtn) {
      const which = clearSrvBtn.getAttribute('data-clear-server-filter');
      if (which === 'search' || which === 'all') state.serverSearch = '';
      if (which === 'community' || which === 'all') state.serverCommunity = '';
      if (which === 'mode' || which === 'all') {
        state.serverMode = '';
        $('serverModeSelect').value = '';
      }
      if (which === 'region' || which === 'all') {
        state.serverRegion = '';
        $('serverRegionSelect').value = '';
      }
      renderServersView();
      return;
    }

    const togglePlayersBtn = target.closest('[data-toggle-server-players]');
    if (togglePlayersBtn) {
      const key = togglePlayersBtn.getAttribute('data-toggle-server-players');
      if (state.expandedServers.has(key)) state.expandedServers.delete(key);
      else state.expandedServers.add(key);
      renderServersView();
      return;
    }

    const copyConnectBtn = target.closest('[data-copy-connect]');
    if (copyConnectBtn) {
      e.stopPropagation();
      const addr = copyConnectBtn.getAttribute('data-copy-connect') || '';
      const cmd = `connect ${addr}`;
      copyText(cmd, tr('copiedConnect', { cmd }));
      return;
    }

    const liveTabBtn = target.closest('[data-live-tab]');
    if (liveTabBtn) {
      state.liveModalTab = liveTabBtn.getAttribute('data-live-tab') === 'ddnet' ? 'ddnet' : 'all';
      renderLiveModal();
      return;
    }

    const liveCommBtn = target.closest('[data-live-comm]');
    if (liveCommBtn) {
      state.serverCommunity = liveCommBtn.getAttribute('data-live-comm') || '';
      closeLiveModal();
      switchTab('servers');
      return;
    }

    if (target.closest('#liveBrowseServersBtn')) {
      closeLiveModal();
      switchTab('servers');
      return;
    }

    const mapAcBtn = target.closest('[data-map-ac]');
    if (mapAcBtn) {
      $('mapAutocomplete').classList.add('hidden');
      openMapModal(mapAcBtn.getAttribute('data-map-ac'));
      return;
    }

    const favBtn = target.closest('[data-toggle-fav]');
    if (favBtn) {
      e.stopPropagation();
      toggleFavoriteMap(favBtn.getAttribute('data-toggle-fav'));
      return;
    }

    const copyBtn = target.closest('[data-copy-map]');
    if (copyBtn) {
      e.stopPropagation();
      const cmd = `sv_map "${copyBtn.getAttribute('data-copy-map')}"`;
      copyText(cmd, tr('copiedCmd', { cmd }));
      return;
    }

    const mapperBtn = target.closest('[data-filter-mapper]');
    if (mapperBtn) {
      state.mapper = mapperBtn.getAttribute('data-filter-mapper') || '';
      state.page = 1;
      applyMapFilters();
      renderMapsContent();
      return;
    }

    const openMapEl = target.closest('[data-open-map]');
    if (openMapEl) {
      if (openMapEl.tagName === 'A' && isModifiedClick(e)) return;
      e.preventDefault();
      openMapModal(openMapEl.getAttribute('data-open-map'));
      return;
    }

    const liveMapEl = target.closest('[data-live-open-map]');
    if (liveMapEl) {
      if (liveMapEl.tagName === 'A' && isModifiedClick(e)) return;
      e.preventDefault();
      const targetName = liveMapEl.getAttribute('data-live-open-map');
      openMapModal(targetName);
      closeLiveModal();
      return;
    }

    const modalFavBtn = target.closest('[data-modal-fav]');
    if (modalFavBtn) {
      toggleFavoriteMap(modalFavBtn.getAttribute('data-modal-fav'));
      return;
    }

    const modalMapperBtn = target.closest('[data-modal-mapper]');
    if (modalMapperBtn) {
      state.mapper = modalMapperBtn.getAttribute('data-modal-mapper') || '';
      state.page = 1;
      closeMapModal();
      switchTab('maps');
      applyMapFilters();
      renderMapsContent();
      return;
    }

    const mapTabBtn = target.closest('[data-map-tab]');
    if (mapTabBtn && state.activeMapDetail) {
      state.activeMapTab = mapTabBtn.getAttribute('data-map-tab');
      $('mapModalBody')
        .querySelectorAll('[data-map-tab]')
        .forEach((b) => b.classList.toggle('active', b === mapTabBtn));
      const panel = $('mapRecordsPanel');
      if (panel) panel.innerHTML = renderMapRecordsTab(state.activeMapDetail, state.activeMapTab);
      return;
    }

    const openPlayerBtn = target.closest('[data-open-player]');
    if (openPlayerBtn) {
      const name = openPlayerBtn.getAttribute('data-open-player');
      if (!$('mapModal').classList.contains('hidden')) {
        closeMapModal();
      }
      switchTab('players');
      openPlayerProfile(name);
      return;
    }

    const acPlayerBtn = target.closest('[data-player-ac]');
    if (acPlayerBtn) {
      openPlayerProfile(acPlayerBtn.getAttribute('data-player-ac'));
      return;
    }

    const pickPlayerBtn = target.closest('[data-pick-player]');
    if (pickPlayerBtn) {
      openPlayerProfile(pickPlayerBtn.getAttribute('data-pick-player'));
      return;
    }

    const favPlayerBtn = target.closest('[data-fav-player]');
    if (favPlayerBtn) {
      togglePlayerFavorite(favPlayerBtn.getAttribute('data-fav-player'));
      return;
    }

    if (target.closest('#toggleFinishesBtn')) {
      state.showAllFinishes = !state.showAllFinishes;
      renderPlayerView();
    }
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName || '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      if (!$('mapModal').classList.contains('hidden')) {
        closeMapModal();
        return;
      }
      if (!$('liveModal').classList.contains('hidden')) {
        closeLiveModal();
        return;
      }
      if (!$('mapAutocomplete').classList.contains('hidden')) {
        $('mapAutocomplete').classList.add('hidden');
        return;
      }
      if (!$('playerAutocomplete').classList.contains('hidden')) {
        $('playerAutocomplete').classList.add('hidden');
        return;
      }
      if (isTyping) {
        e.target.blur();
      }
      return;
    }

    if (isTyping) return;

    if (e.key === '/') {
      e.preventDefault();
      const input =
        state.tab === 'players'
          ? $('playerSearch')
          : state.tab === 'servers'
            ? $('serverSearch')
            : $('mapSearch');
      input?.focus();
    } else if (
      (e.key === 'r' || e.key === 'R') &&
      state.tab === 'maps' &&
      $('mapModal').classList.contains('hidden') &&
      $('liveModal').classList.contains('hidden')
    ) {
      e.preventDefault();
      openRandomMap();
    }
  });

  // Sync UI on browser Back/Forward navigation
  window.addEventListener('popstate', () => {
    clearSsrContent({ force: true });
    loadStateFromUrl();
    $('mapSearch').value = state.search;
    $('difficultySelect').value = state.difficulty;
    $('sortSelect').value = state.sort;
    $('navMaps').classList.toggle('active', state.tab === 'maps');
    $('navServers').classList.toggle('active', state.tab === 'servers');
    $('navPlayers').classList.toggle('active', state.tab === 'players');
    $('mapsView').classList.toggle('hidden', state.tab !== 'maps');
    $('serversView').classList.toggle('hidden', state.tab !== 'servers');
    $('playersView').classList.toggle('hidden', state.tab !== 'players');

    if (state.mapsLoaded) {
      applyMapFilters();
      renderMapsContent({ pushUrl: false });
    }

    if (state.activeMapName) {
      openMapModal(state.activeMapName, { push: false });
    } else if (!$('mapModal').classList.contains('hidden')) {
      closeMapModal({ push: false });
    }

    if (state.tab === 'servers') {
      if (!state.serversLoaded) loadServersData();
      renderServersView({ pushUrl: false });
    }

    if (state.tab === 'players') {
      renderPlayerView();
      if (state.activePlayerName && state.activePlayerData?.player !== state.activePlayerName) {
        openPlayerProfile(state.activePlayerName);
      }
    }
  });
}

// Initialize
function init() {
  loadStateFromUrl();
  hydrateStaticIcons();
  applyTheme();
  applyTranslations();

  $('mapSearch').value = state.search;
  $('difficultySelect').value = state.difficulty;
  $('sortSelect').value = state.sort;
  $('pageSizeSelect').value = String(state.pageSize);
  $('serverSearch').value = state.serverSearch;
  $('serverRegionSelect').value = state.serverRegion;
  if (state.activePlayerName) {
    $('playerSearch').value = state.activePlayerName;
    $('playerSearchClear').classList.remove('hidden');
  }

  bindEvents();
  switchTab(state.tab);
  loadMapCatalog();
  loadOnlineData();
  loadServersData();
}

init();
