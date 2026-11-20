import { icons } from './icons.js';
import {
  detectInitialLang,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatRelativeTime,
  formatTime,
  isRecentRelease,
  parseReleaseMs,
  t,
} from './i18n.js';
import {
  fetchMapDetail,
  fetchMaps,
  fetchOnlineStats,
  fetchPlayerProfile,
  fetchPlayerSuggestions,
} from './api.js';

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

const LEGACY_CATEGORY_MAP = {
  Easy: 'DDmaX.Easy',
  Next: 'DDmaX.Next',
  Pro: 'DDmaX.Pro',
  Nut: 'DDmaX.Nut',
};

const STORAGE_KEYS = {
  mapFavs: 'ddnet_map_favs_v1',
  playerFavs: 'ddnet_player_favorites',
  playerHistory: 'ddnet_player_history',
  lang: 'ddnet_lang',
  theme: 'ddnet_theme',
  viewMode: 'ddnet_view_mode',
  pageSize: 'ddnet_page_size',
};

const VALID_SORTS = new Set([
  'release-desc',
  'name-asc',
  'name-desc',
  'diff-asc',
  'diff-desc',
  'points-desc',
]);

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
  mapsLoaded: false,
  mapsFetchedAt: null,
  mapsStale: false,
  filteredMaps: [],

  mapFavs: readSet(STORAGE_KEYS.mapFavs),
  playerFavs: readArray(STORAGE_KEYS.playerFavs),
  playerHistory: readArray(STORAGE_KEYS.playerHistory),

  activePlayerName: '',
  activePlayerData: null,
  playerLoading: false,
  playerError: null,
  showAllFinishes: false,

  onlineData: null,
  onlineError: false,

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
    return localStorage.getItem(STORAGE_KEYS.viewMode) === 'grid' ? 'grid' : 'table';
  } catch {
    return 'table';
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

// URL state sync
function loadStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const player = params.get('player');
  if (tab === 'players' || player) {
    state.tab = 'players';
  }
  if (player) {
    state.activePlayerName = player.trim();
  }

  const q = params.get('q') ?? params.get('search') ?? '';
  if (q) state.search = q;

  const rawCat = params.get('cat') ?? params.get('category') ?? '';
  if (rawCat) {
    state.category = LEGACY_CATEGORY_MAP[rawCat] || rawCat;
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
  if (mapParam) state.activeMapName = mapParam.trim();
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.tab === 'players') {
    params.set('tab', 'players');
    if (state.activePlayerName) params.set('player', state.activePlayerName);
  } else {
    if (state.search.trim()) params.set('q', state.search.trim());
    if (state.category) params.set('cat', state.category);
    if (state.difficulty !== '') params.set('star', state.difficulty);
    if (state.mapper) params.set('mapper', state.mapper);
    if (state.sort !== 'release-desc') params.set('sort', state.sort);
    if (state.viewMode !== 'table') params.set('view', state.viewMode);
    if (state.favOnly) params.set('fav', '1');
    if (state.page > 1) params.set('page', String(state.page));
  }
  if (state.activeMapName) {
    params.set('map', state.activeMapName);
  }
  const qs = params.toString();
  const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  history.replaceState(null, '', nextUrl);
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
  $('brandIcon').innerHTML = icons.logo(20);
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

function getOrderedCategories(maps) {
  const counts = new Map();
  for (const m of maps) {
    counts.set(m.type, (counts.get(m.type) || 0) + 1);
  }
  const known = CATEGORY_ORDER.filter((c) => counts.has(c));
  const extra = Array.from(counts.keys())
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...extra].map((name) => ({ name, count: counts.get(name) }));
}

function renderCategoryStrip() {
  const strip = $('categoryStrip');
  if (!strip) return;
  const cats = getOrderedCategories(state.maps);
  let html = `<button type="button" class="cat-pill${!state.category ? ' active' : ''}" data-cat-filter="">
    <span>${escapeHtml(tr('allCategories'))}</span>
    <span class="cat-count">${state.maps.length}</span>
  </button>`;

  for (const { name, count } of cats) {
    const active = state.category === name ? ' active' : '';
    html += `<button type="button" class="cat-pill${active}" data-cat-filter="${escapeAttr(name)}" data-cat="${escapeAttr(name)}">
      <span class="cat-dot" aria-hidden="true"></span>
      <span>${escapeHtml(name)}</span>
      <span class="cat-count">${count}</span>
    </button>`;
  }
  strip.innerHTML = html;
}

function applyMapFilters() {
  const q = state.search.trim().toLowerCase();
  const mapperFilter = state.mapper.trim().toLowerCase();
  const cat = state.category;
  const diff = state.difficulty === '' ? null : Number(state.difficulty);
  const favOnly = state.favOnly;

  const filtered = state.maps.filter((m) => {
    if (favOnly && !state.mapFavs.has(m.name)) return false;
    if (cat && m.type !== cat) return false;
    if (diff !== null && m.difficulty !== diff) return false;
    if (mapperFilter && !(m.mapper || '').toLowerCase().includes(mapperFilter)) return false;
    if (q) {
      const nameMatch = m.name.toLowerCase().includes(q);
      const mapperMatch = (m.mapper || '').toLowerCase().includes(q);
      if (!nameMatch && !mapperMatch) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'diff-asc':
        return a.difficulty - b.difficulty || a.points - b.points || a.name.localeCompare(b.name);
      case 'diff-desc':
        return b.difficulty - a.difficulty || b.points - a.points || a.name.localeCompare(b.name);
      case 'points-desc':
        return b.points - a.points || b.difficulty - a.difficulty || a.name.localeCompare(b.name);
      case 'release-desc':
      default: {
        const diffMs = parseReleaseMs(b.release) - parseReleaseMs(a.release);
        return diffMs !== 0 ? diffMs : a.name.localeCompare(b.name);
      }
    }
  });

  state.filteredMaps = filtered;
}

function renderMetaBar() {
  const meta = $('resultsMeta');
  const active = $('activeFilters');
  if (!meta || !active) return;

  const total = state.maps.length;
  const shown = state.filteredMaps.length;
  const parts = [`<span class="tabular">${escapeHtml(tr('resultsCount', { shown, total }))}</span>`];

  if (state.mapsFetchedAt) {
    parts.push('<span class="meta-sep" aria-hidden="true">·</span>');
    parts.push(`<span>${escapeHtml(tr('lastSync', { date: formatDate(state.mapsFetchedAt, state.lang) }))}</span>`);
  }
  if (state.mapsStale) {
    parts.push('<span class="meta-sep" aria-hidden="true">·</span>');
    parts.push(`<span>${escapeHtml(tr('staleNotice'))}</span>`);
  }
  parts.push(
    `<button type="button" class="meta-refresh-btn" id="refreshMapsBtn">${icons.refresh(13)}<span>${escapeHtml(tr('refreshCatalog'))}</span></button>`
  );
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

function renderMapsContent() {
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
    $('mapsEmpty').classList.remove('hidden');
    $('mapsTableWrap').classList.add('hidden');
    $('mapsGrid').classList.add('hidden');
    $('paginationBar').classList.add('hidden');
    syncUrl();
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

  syncUrl();
}

function renderMapsTable(maps) {
  const tbody = $('mapsTableBody');
  const rows = maps.map((m) => {
    const isFav = state.mapFavs.has(m.name);
    const recent = isRecentRelease(m.release);
    const thumbHtml = m.thumbnail
      ? `<div class="thumb-sm"><img src="${escapeAttr(m.thumbnail)}" alt="" loading="lazy" decoding="async" /></div>`
      : '<div class="thumb-sm"></div>';

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
              <button type="button" class="map-name-btn" data-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</button>
              ${recent ? `<span class="new-tag">${escapeHtml(tr('newBadge'))}</span>` : ''}
            </div>
            ${m.mapper ? `<div class="map-mobile-sub">${escapeHtml(m.mapper)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${renderCategoryBadge(m.type)}</td>
      <td>${renderStars(m.difficulty)}</td>
      <td class="col-num col-points">${m.points > 0 ? escapeHtml(String(m.points)) : '—'}</td>
      <td class="col-mapper">
        ${
          m.mapper
            ? `<button type="button" class="mapper-link" data-filter-mapper="${escapeAttr(m.mapper)}" title="${escapeAttr(m.mapper)}">${escapeHtml(m.mapper)}</button>`
            : '<span class="muted">—</span>'
        }
      </td>
      <td class="col-release tabular">${escapeHtml(formatDate(m.release, state.lang))}</td>
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
    const isFav = state.mapFavs.has(m.name);
    const recent = isRecentRelease(m.release);
    return `<article class="map-card">
      <div class="card-thumb" data-open-map="${escapeAttr(m.name)}">
        ${m.thumbnail ? `<img src="${escapeAttr(m.thumbnail)}" alt="${escapeAttr(m.name)}" loading="lazy" decoding="async" />` : ''}
        <div class="card-thumb-overlay">
          ${recent ? `<span class="new-tag">${escapeHtml(tr('newBadge'))}</span>` : '<span></span>'}
          <button type="button" class="row-icon-btn${isFav ? ' fav-active' : ''}" data-toggle-fav="${escapeAttr(m.name)}" title="${escapeAttr(tr('toggleFav'))}" aria-label="${escapeAttr(tr('toggleFav'))}">
            ${isFav ? icons.starFilled(14) : icons.star(14)}
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <button type="button" class="card-title" data-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</button>
          ${renderCategoryBadge(m.type)}
        </div>
        <div class="card-mapper">
          ${
            m.mapper
              ? `<button type="button" class="mapper-link" data-filter-mapper="${escapeAttr(m.mapper)}">${escapeHtml(m.mapper)}</button>`
              : '—'
          }
        </div>
        <div class="card-footer">
          ${renderStars(m.difficulty)}
          <span class="tabular">${m.points > 0 ? escapeHtml(tr('pointsUnit', { n: m.points })) : ''} · ${escapeHtml(formatDate(m.release, state.lang))}</span>
        </div>
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

    if (state.activeMapName && !$('mapModal').classList.contains('hidden')) {
      // Already open
    } else if (state.activeMapName) {
      openMapModal(state.activeMapName);
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
  if (!q || state.maps.length === 0) {
    box.classList.add('hidden');
    state.mapAcItems = [];
    state.mapAcIndex = -1;
    return;
  }

  const starts = [];
  const includes = [];
  for (const m of state.maps) {
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
      <span class="dropdown-sub">${escapeHtml(m.type)}${m.mapper ? ` · ${escapeHtml(m.mapper)}` : ''}</span>
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

// Map Detail Modal
function openMapModal(mapName) {
  const baseMap =
    state.maps.find((m) => m.name === mapName) ||
    state.maps.find((m) => m.name.toLowerCase() === mapName.toLowerCase()) || {
      name: mapName,
      mapper: '',
      type: 'Other',
      difficulty: 0,
      points: 0,
      release: '',
      width: 0,
      height: 0,
      tiles: [],
      thumbnail: `https://ddnet.org/ranks/maps/${encodeURIComponent(mapName.replace(/\s+/g, '_'))}.png`,
      website: `https://ddnet.org/maps/${encodeURIComponent(mapName)}`,
      webPreview: `https://ddnet.org/mappreview/?map=${encodeURIComponent(mapName)}`,
    };

  state.activeMapName = baseMap.name;
  state.activeMapDetail = null;
  state.activeMapTab = 'ranks';
  state.mapDetailError = false;
  const reqId = ++state.mapDetailReqId;

  $('mapModalTitle').textContent = baseMap.name;
  renderMapModalShell(baseMap);
  updateMapModalDynamicSections(baseMap, null, true, false);
  $('mapModal').classList.remove('hidden');
  $('mapModalBody').scrollTop = 0;
  syncBodyScrollLock();
  syncUrl();

  fetchMapDetail(baseMap.name)
    .then((detail) => {
      if (reqId !== state.mapDetailReqId) return;
      state.activeMapDetail = detail;
      state.mapDetailError = false;
      updateMapModalDynamicSections(baseMap, detail, false, false);
    })
    .catch(() => {
      if (reqId !== state.mapDetailReqId) return;
      state.mapDetailError = true;
      updateMapModalDynamicSections(baseMap, null, false, true);
    });
}

function closeMapModal() {
  $('mapModal').classList.add('hidden');
  state.activeMapName = null;
  state.activeMapDetail = null;
  state.mapDetailError = false;
  state.mapDetailReqId += 1;
  syncBodyScrollLock();
  syncUrl();
}

function renderMapModalShell(base) {
  const body = $('mapModalBody');
  const mapName = base.name;
  const type = base.type || 'Other';
  const difficulty = base.difficulty ?? 0;
  const mapper = base.mapper || '';
  const thumbnail = base.thumbnail || '';
  const website = base.website || `https://ddnet.org/maps/${encodeURIComponent(mapName)}`;
  const webPreview =
    base.webPreview || `https://ddnet.org/mappreview/?map=${encodeURIComponent(mapName)}`;
  const isFav = state.mapFavs.has(mapName);

  body.innerHTML = `
    ${
      thumbnail
        ? `<div class="modal-hero"><img id="mapModalHeroImg" src="${escapeAttr(thumbnail)}" alt="${escapeAttr(mapName)}" /></div>`
        : ''
    }
    <div class="modal-meta-row">
      ${renderCategoryBadge(type)}
      ${renderStars(difficulty)}
      ${
        mapper
          ? `<button type="button" class="mapper-link" data-modal-mapper="${escapeAttr(mapper)}" title="${escapeAttr(tr('mapDetailFilterMapper'))}">${escapeHtml(mapper)}</button>`
          : ''
      }
    </div>

    <div class="modal-actions">
      <a class="btn btn-primary btn-sm" href="${escapeAttr(webPreview)}" target="_blank" rel="noopener noreferrer">${icons.eye(14)}<span>${escapeHtml(tr('mapDetailPreviewBtn'))}</span></a>
      <a class="btn btn-sm" href="${escapeAttr(website)}" target="_blank" rel="noopener noreferrer">${icons.externalLink(14)}<span>${escapeHtml(tr('mapDetailDdnetBtn'))}</span></a>
      <button type="button" class="btn btn-sm" data-copy-map="${escapeAttr(mapName)}">${icons.copy(14)}<span>${escapeHtml(tr('mapDetailCopyBtn'))}</span></button>
      <button type="button" class="btn btn-sm btn-toggle${isFav ? ' active' : ''}" data-modal-fav="${escapeAttr(mapName)}">${isFav ? icons.starFilled(14) : icons.star(14)}<span>${escapeHtml(tr('mapDetailFavBtn'))}</span></button>
    </div>

    <div id="mapModalStats"></div>
    <div id="mapModalTiles"></div>
    <div id="mapModalRecords"></div>
  `;
}

function updateMapModalDynamicSections(base, detail, isLoading, hasError) {
  const heroImg = $('mapModalHeroImg');
  if (heroImg && detail?.thumbnail && heroImg.getAttribute('src') !== detail.thumbnail) {
    heroImg.closest('.modal-hero')?.classList.remove('hidden');
    heroImg.style.display = '';
    heroImg.src = detail.thumbnail;
  }

  const mapName = detail?.name || base.name;
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

  const statsEl = $('mapModalStats');
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

  const tilesEl = $('mapModalTiles');
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

  const recordsEl = $('mapModalRecords');
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

  if (state.onlineData && typeof state.onlineData.ddnetPlayers === 'number') {
    pill.classList.add('online');
    txt.textContent = tr('liveSummary', {
      players: state.onlineData.ddnetPlayers.toLocaleString(state.lang === 'tr' ? 'tr-TR' : 'en-US'),
    });
  } else {
    pill.classList.remove('online');
    txt.textContent = tr('liveConnecting');
  }
}

async function loadOnlineData() {
  try {
    state.onlineData = await fetchOnlineStats();
    state.onlineError = false;
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
  if (!state.onlineData && state.onlineError) {
    body.innerHTML = `<div class="state-hint">${escapeHtml(tr('liveError'))}</div>`;
    return;
  }
  if (!state.onlineData) {
    body.innerHTML = `<div class="state-hint">${escapeHtml(tr('liveLoading'))}</div>`;
    return;
  }

  const d = state.onlineData;
  const topMaps = Array.isArray(d.topMaps) ? d.topMaps : [];

  body.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveOfficialPlayers'))}</div><div class="metric-value">${d.ddnetPlayers.toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveOfficialServers'))}</div><div class="metric-value">${d.ddnetServers.toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveTotalPlayers'))}</div><div class="metric-value">${d.totalPlayers.toLocaleString()}</div></div>
      <div class="metric-box"><div class="metric-label">${escapeHtml(tr('liveTotalServers'))}</div><div class="metric-value">${d.totalServers.toLocaleString()}</div></div>
    </div>

    <div>
      <div class="section-heading">${escapeHtml(tr('liveHotMapsTitle'))}</div>
      <div class="list-box">
        ${topMaps
          .map(
            (m, i) => `<div class="list-row">
            <div class="list-row-left">
              <span class="rank-num${i < 3 ? ' top3' : ''}">${i + 1}.</span>
              <button type="button" class="map-name-btn" data-live-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</button>
            </div>
            <div class="list-row-right tabular">
              <span>${escapeHtml(tr('liveServersCount', { n: m.servers }))}</span>
              <span>${escapeHtml(tr('livePlayersCount', { n: m.players }))}</span>
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>
  `;
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
  const pts = d.points?.points ?? 0;
  const totalPts = d.points?.total ?? 0;
  const pct = totalPts > 0 ? Math.min(100, Math.round((pts / totalPts) * 1000) / 10) : 0;
  const globalRank = d.points?.rank;
  const teamRank = d.team_rank?.rank;
  const soloRank = d.rank?.rank;
  const hours = d.hours_played_past_365_days;
  const favServer = d.favorite_server?.server || '—';
  const weeklyPts = d.points_last_week?.points ?? 0;
  const monthlyPts = d.points_last_month?.points ?? 0;
  const firstFinish = d.first_finish;
  const isFav = state.playerFavs.some((n) => n.toLowerCase() === name.toLowerCase());

  const typesObj = d.types && typeof d.types === 'object' ? d.types : {};
  const orderedTypes = [
    ...CATEGORY_ORDER.filter((k) => typesObj[k]),
    ...Object.keys(typesObj).filter((k) => !CATEGORY_ORDER.includes(k)),
  ];

  const allFinishes = Array.isArray(d.last_finishes) ? d.last_finishes : [];
  const visibleFinishes = state.showAllFinishes ? allFinishes : allFinishes.slice(0, 15);
  const partners = Array.isArray(d.favorite_partners) ? d.favorite_partners.slice(0, 10) : [];

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-title-wrap">
          <h2 class="profile-name">${escapeHtml(name)}</h2>
          ${globalRank ? `<span class="rank-pill">#${globalRank.toLocaleString()}</span>` : ''}
        </div>
        <div class="profile-actions">
          <button type="button" class="btn btn-sm btn-toggle${isFav ? ' active' : ''}" data-fav-player="${escapeAttr(name)}">
            ${isFav ? icons.starFilled(14) : icons.star(14)}
            <span>${escapeHtml(isFav ? tr('playerRemoveFav') : tr('playerAddFav'))}</span>
          </button>
          <a class="btn btn-sm" href="https://ddnet.org/players/${encodeURIComponent(name)}/" target="_blank" rel="noopener noreferrer">
            ${icons.externalLink(14)}
            <span>${escapeHtml(tr('playerViewOnDdnet'))}</span>
          </a>
        </div>
      </div>

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

      <div>
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
      </div>

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
                          <button type="button" class="map-name-btn" data-open-map="${escapeAttr(mapName)}">${escapeHtml(mapName)}</button>
                          ${f.type ? renderCategoryBadge(f.type) : ''}
                        </div>
                        <div class="list-row-right">
                          <span class="mono">${escapeHtml(formatTime(f.time))}</span>
                          <span>${escapeHtml(formatRelativeTime(f.timestamp, state.lang))}</span>
                        </div>
                      </div>`;
                    })
                    .join('')
                : `<div class="list-row"><span class="state-hint">—</span></div>`
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
    </div>
  `;
}

// Tab switching
function switchTab(tabName) {
  state.tab = tabName === 'players' ? 'players' : 'maps';
  $('navMaps').classList.toggle('active', state.tab === 'maps');
  $('navPlayers').classList.toggle('active', state.tab === 'players');
  $('mapsView').classList.toggle('hidden', state.tab !== 'maps');
  $('playersView').classList.toggle('hidden', state.tab !== 'players');

  if (state.tab === 'players') {
    renderPlayerView();
    if (state.activePlayerName && !state.activePlayerData && !state.playerLoading) {
      openPlayerProfile(state.activePlayerName);
    }
  }
  syncUrl();
}

function toggleFavoriteMap(mapName) {
  if (state.mapFavs.has(mapName)) {
    state.mapFavs.delete(mapName);
    showToast(tr('removedFav', { name: mapName }));
  } else {
    state.mapFavs.add(mapName);
    showToast(tr('addedFav', { name: mapName }));
  }
  writeSet(STORAGE_KEYS.mapFavs, state.mapFavs);
  applyMapFilters();
  renderMapsContent();
  if (state.activeMapName === mapName && !$('mapModal').classList.contains('hidden')) {
    const modalFavBtn = $('mapModalBody')?.querySelector('[data-modal-fav]');
    if (modalFavBtn) {
      const isFav = state.mapFavs.has(mapName);
      modalFavBtn.classList.toggle('active', isFav);
      modalFavBtn.innerHTML = `${isFav ? icons.starFilled(14) : icons.star(14)}<span>${escapeHtml(tr('mapDetailFavBtn'))}</span>`;
    }
  }
}

function openRandomMap() {
  const pool = state.filteredMaps.length > 0 ? state.filteredMaps : state.maps;
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
    e.preventDefault();
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
    switchTab('maps');
    applyMapFilters();
    renderMapsContent();
  });

  $('navMaps').addEventListener('click', () => switchTab('maps'));
  $('navPlayers').addEventListener('click', () => switchTab('players'));

  $('langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'tr' ? 'en' : 'tr';
    try {
      localStorage.setItem(STORAGE_KEYS.lang, state.lang);
    } catch {
      // Ignore
    }
    applyTranslations();
    if (state.mapsLoaded) renderMapsContent();
    if (state.tab === 'players') renderPlayerView();
    if (!$('liveModal').classList.contains('hidden')) renderLiveModal();
    if (!$('mapModal').classList.contains('hidden') && state.activeMapName) {
      const base = state.maps.find((m) => m.name === state.activeMapName) || { name: state.activeMapName };
      renderMapModalShell(base);
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
          .map(
            (item, idx) => `<button type="button" class="dropdown-item" data-player-ac="${escapeAttr(item.name)}" data-idx="${idx}" role="option">
            <span class="dropdown-main">${escapeHtml(item.name)}</span>
            <span class="dropdown-sub tabular">${escapeHtml(tr('pointsUnit', { n: item.points.toLocaleString() }))}</span>
          </button>`
          )
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
      state.category = catBtn.getAttribute('data-cat-filter') || '';
      state.page = 1;
      applyMapFilters();
      renderMapsContent();
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

    if (target.closest('#refreshMapsBtn')) {
      loadMapCatalog({ forceRefresh: true });
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
      openMapModal(openMapEl.getAttribute('data-open-map'));
      return;
    }

    const liveMapEl = target.closest('[data-live-open-map]');
    if (liveMapEl) {
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
      closeMapModal();
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
      const input = state.tab === 'players' ? $('playerSearch') : $('mapSearch');
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
  if (state.activePlayerName) {
    $('playerSearch').value = state.activePlayerName;
    $('playerSearchClear').classList.remove('hidden');
  }

  bindEvents();
  switchTab(state.tab);
  loadMapCatalog();
  loadOnlineData();
}

init();
