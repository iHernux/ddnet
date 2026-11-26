import {
  escapeAttr,
  escapeHtml,
  formatDuration,
  formatTime,
  parseReleaseMs,
  t,
} from './i18n.js?v=20261126m5';

function extractTypesMap(data) {
  const out = new Map();
  const typesObj = data?.types && typeof data.types === 'object' ? data.types : {};
  for (const [catName, catObj] of Object.entries(typesObj)) {
    const mapsObj = catObj?.maps && typeof catObj.maps === 'object' ? catObj.maps : {};
    for (const [mapName, info] of Object.entries(mapsObj)) {
      out.set(mapName.toLowerCase(), {
        name: mapName,
        type: catName,
        finishes: Number(info?.finishes || 0),
        time: Number(info?.time || 0),
        rank: Number(info?.rank || 0),
        totalFinishes: Number(info?.total_finishes || 0),
        points: Number(info?.points || 0),
      });
    }
  }
  return out;
}

function findOpenServerByMap(serversList) {
  const byLower = new Map();
  if (!Array.isArray(serversList)) return byLower;
  for (const s of serversList) {
    if (!s?.mapName || !s.address || s.passworded) continue;
    if (s.maxPlayers > 0 && s.players >= s.maxPlayers) continue;
    const key = s.mapName.toLowerCase();
    const prev = byLower.get(key);
    const hasTwoSlots = !s.maxPlayers || s.maxPlayers - s.players >= 2;
    const prevTwoSlots = prev && (!prev.maxPlayers || prev.maxPlayers - prev.players >= 2);
    if (
      !prev ||
      (hasTwoSlots && !prevTwoSlots) ||
      (hasTwoSlots === prevTwoSlots && s.players > prev.players)
    ) {
      byLower.set(key, s);
    }
  }
  return byLower;
}

function formatNum(n, lang) {
  return Number(n || 0).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');
}

export function renderDuoCompareHtml({
  dataA,
  dataB,
  officialMapsByLower,
  categoryOrder,
  serversList,
  duoState,
  lang,
  icons,
  safeConnectTarget,
}) {
  const nameA = dataA.player || duoState.playerA;
  const nameB = dataB.player || duoState.playerB;

  const ptsA = dataA.points?.points ?? null;
  const ptsB = dataB.points?.points ?? null;
  const rankA = dataA.points?.rank ?? null;
  const rankB = dataB.points?.rank ?? null;
  const teamA = dataA.team_rank?.rank ?? null;
  const teamB = dataB.team_rank?.rank ?? null;
  const soloA = dataA.rank?.rank ?? null;
  const soloB = dataB.rank?.rank ?? null;
  const hrsA = dataA.hours_played_past_365_days ?? null;
  const hrsB = dataB.hours_played_past_365_days ?? null;
  const netA = dataA.network?.totalPlayTime ?? 0;
  const netB = dataB.network?.totalPlayTime ?? 0;

  const mapA = extractTypesMap(dataA);
  const mapB = extractTypesMap(dataB);
  const openServers = findOpenServerByMap(serversList);

  const buckets = {
    'both-unfin': [],
    'only-a': [],
    'only-b': [],
    'both-fin': [],
  };

  const allCatalog = Array.from(officialMapsByLower.values());
  for (const m of allCatalog) {
    const lower = m.name.toLowerCase();
    const ea = mapA.get(lower);
    const eb = mapB.get(lower);
    const fa = ea ? ea.finishes : 0;
    const fb = eb ? eb.finishes : 0;
    const entry = {
      name: m.name,
      type: m.type,
      difficulty: m.difficulty ?? 0,
      points: m.points ?? 0,
      release: m.release || '',
      thumbnail: m.thumbnail || '',
      totalFinishes: ea?.totalFinishes || eb?.totalFinishes || 0,
      finishesA: fa,
      finishesB: fb,
      timeA: ea?.time || 0,
      timeB: eb?.time || 0,
      server: openServers.get(lower) || null,
    };

    if (fa === 0 && fb === 0) buckets['both-unfin'].push(entry);
    else if (fa > 0 && fb === 0) buckets['only-a'].push(entry);
    else if (fa === 0 && fb > 0) buckets['only-b'].push(entry);
    else buckets['both-fin'].push(entry);
  }

  const activeTab = buckets[duoState.tab] ? duoState.tab : 'both-unfin';
  const activeList = buckets[activeTab].filter((item) => {
    if (duoState.category && item.type !== duoState.category) return false;
    if (duoState.difficulty !== '' && item.difficulty !== Number(duoState.difficulty)) return false;
    return true;
  });

  activeList.sort((x, y) => {
    switch (duoState.sort) {
      case 'points-desc':
        return y.points - x.points || x.difficulty - y.difficulty || x.name.localeCompare(y.name);
      case 'release-desc':
        return parseReleaseMs(y.release) - parseReleaseMs(x.release) || x.name.localeCompare(y.name);
      case 'finishes-desc':
      default:
        return (
          y.totalFinishes - x.totalFinishes ||
          x.difficulty - y.difficulty ||
          x.name.localeCompare(y.name)
        );
    }
  });

  const shownCount = Math.min(activeList.length, duoState.limit || 40);
  const slice = activeList.slice(0, shownCount);

  const metricRows = [
    {
      label: t(lang, 'playerPoints'),
      valA: ptsA !== null ? formatNum(ptsA, lang) : '—',
      valB: ptsB !== null ? formatNum(ptsB, lang) : '—',
      win: ptsA !== null && ptsB !== null ? (ptsA > ptsB ? 'a' : ptsB > ptsA ? 'b' : '') : '',
    },
    {
      label: t(lang, 'playerGlobalRank'),
      valA: rankA ? `#${formatNum(rankA, lang)}` : '—',
      valB: rankB ? `#${formatNum(rankB, lang)}` : '—',
      win: rankA && rankB ? (rankA < rankB ? 'a' : rankB < rankA ? 'b' : '') : rankA ? 'a' : rankB ? 'b' : '',
    },
    {
      label: t(lang, 'playerTeamRank'),
      valA: teamA ? `#${formatNum(teamA, lang)}` : '—',
      valB: teamB ? `#${formatNum(teamB, lang)}` : '—',
      win: teamA && teamB ? (teamA < teamB ? 'a' : teamB < teamA ? 'b' : '') : teamA ? 'a' : teamB ? 'b' : '',
    },
    {
      label: t(lang, 'playerSoloRank'),
      valA: soloA ? `#${formatNum(soloA, lang)}` : '—',
      valB: soloB ? `#${formatNum(soloB, lang)}` : '—',
      win: soloA && soloB ? (soloA < soloB ? 'a' : soloB < soloA ? 'b' : '') : soloA ? 'a' : soloB ? 'b' : '',
    },
    {
      label: t(lang, 'playerHours365'),
      valA: hrsA !== null ? t(lang, 'playerHoursValue', { n: hrsA }) : '—',
      valB: hrsB !== null ? t(lang, 'playerHoursValue', { n: hrsB }) : '—',
      win: hrsA !== null && hrsB !== null ? (hrsA > hrsB ? 'a' : hrsB > hrsA ? 'b' : '') : '',
    },
    {
      label: t(lang, 'playerNetworkPlaytime'),
      valA: netA > 0 ? formatDuration(netA, lang) : '—',
      valB: netB > 0 ? formatDuration(netB, lang) : '—',
      win: netA > 0 && netB > 0 ? (netA > netB ? 'a' : netB > netA ? 'b' : '') : netA > 0 ? 'a' : netB > 0 ? 'b' : '',
    },
  ];

  const typesA = dataA.types || {};
  const typesB = dataB.types || {};
  const cats = categoryOrder.filter((c) => typesA[c] || typesB[c]);

  const catOptions = categoryOrder
    .map((c) => `<option value="${escapeAttr(c)}"${duoState.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`)
    .join('');

  return `
    <div class="profile-card duo-card">
      <div class="duo-header-vs">
        <button type="button" class="duo-player-pill" data-open-player="${escapeAttr(nameA)}">${escapeHtml(nameA)}</button>
        <span class="duo-vs-badge">VS</span>
        <button type="button" class="duo-player-pill" data-open-player="${escapeAttr(nameB)}">${escapeHtml(nameB)}</button>
      </div>

      <div class="duo-metrics-grid">
        ${metricRows
          .map(
            (r) => `<div class="metric-box duo-metric-box">
              <div class="metric-label">${escapeHtml(r.label)}</div>
              <div class="duo-metric-pair tabular">
                <span class="${r.win === 'a' ? 'duo-win' : ''}">${escapeHtml(r.valA)}</span>
                <span class="muted">·</span>
                <span class="${r.win === 'b' ? 'duo-win' : ''}">${escapeHtml(r.valB)}</span>
              </div>
            </div>`
          )
          .join('')}
      </div>

      ${
        cats.length > 0
          ? `<div>
              <h3 class="section-heading">${escapeHtml(t(lang, 'playerCategoryProgress'))}</h3>
              <div class="duo-cat-grid">
                ${cats
                  .map((cat) => {
                    const pA = typesA[cat]?.points?.points ?? 0;
                    const pB = typesB[cat]?.points?.points ?? 0;
                    const tot = typesA[cat]?.points?.total ?? typesB[cat]?.points?.total ?? 0;
                    const wA = tot > 0 ? Math.min(100, Math.round((pA / tot) * 100)) : 0;
                    const wB = tot > 0 ? Math.min(100, Math.round((pB / tot) * 100)) : 0;
                    return `<div class="duo-cat-card" data-cat="${escapeAttr(cat)}">
                      <div class="cat-stat-top">
                        <span class="cat-badge" data-cat="${escapeAttr(cat)}"><span class="cat-dot"></span>${escapeHtml(cat)}</span>
                        <span class="cat-stat-pts tabular"><strong class="${pA > pB ? 'duo-win' : ''}">${pA}</strong> / <strong class="${pB > pA ? 'duo-win' : ''}">${pB}</strong> <span class="muted">(${tot})</span></span>
                      </div>
                      <div class="duo-dual-bars">
                        <div class="progress-track"><div class="progress-fill" style="width:${wA}%"></div></div>
                        <div class="progress-track"><div class="progress-fill duo-fill-b" style="width:${wB}%"></div></div>
                      </div>
                    </div>`;
                  })
                  .join('')}
              </div>
            </div>`
          : ''
      }

      <div class="duo-planner">
        <div class="duo-planner-head">
          <h3 class="section-heading" style="margin:0;">${escapeHtml(t(lang, 'duoPlannerTitle'))}</h3>
          <div class="duo-planner-filters">
            <select class="select select-sm" id="duoCatSelect" aria-label="Category">
              <option value="">${escapeHtml(t(lang, 'allCategories'))}</option>
              ${catOptions}
            </select>
            <select class="select select-sm" id="duoDiffSelect" aria-label="Difficulty">
              <option value="">${escapeHtml(t(lang, 'allDifficulties'))}</option>
              <option value="0"${duoState.difficulty === '0' ? ' selected' : ''}>${escapeHtml(t(lang, 'starZero'))}</option>
              <option value="1"${duoState.difficulty === '1' ? ' selected' : ''}>${escapeHtml(t(lang, 'starLevel', { n: 1 }))}</option>
              <option value="2"${duoState.difficulty === '2' ? ' selected' : ''}>${escapeHtml(t(lang, 'starLevel', { n: 2 }))}</option>
              <option value="3"${duoState.difficulty === '3' ? ' selected' : ''}>${escapeHtml(t(lang, 'starLevel', { n: 3 }))}</option>
              <option value="4"${duoState.difficulty === '4' ? ' selected' : ''}>${escapeHtml(t(lang, 'starLevel', { n: 4 }))}</option>
              <option value="5"${duoState.difficulty === '5' ? ' selected' : ''}>${escapeHtml(t(lang, 'starLevel', { n: 5 }))}</option>
            </select>
            <select class="select select-sm" id="duoSortSelect" aria-label="Sort">
              <option value="finishes-desc"${duoState.sort === 'finishes-desc' ? ' selected' : ''}>${escapeHtml(t(lang, 'sortFinishesDesc'))}</option>
              <option value="points-desc"${duoState.sort === 'points-desc' ? ' selected' : ''}>${escapeHtml(t(lang, 'sortPointsDesc'))}</option>
              <option value="release-desc"${duoState.sort === 'release-desc' ? ' selected' : ''}>${escapeHtml(t(lang, 'sortReleaseDesc'))}</option>
            </select>
          </div>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn${activeTab === 'both-unfin' ? ' active' : ''}" data-duo-tab="both-unfin">${escapeHtml(t(lang, 'duoTabBothUnfin'))} (${buckets['both-unfin'].length})</button>
          <button type="button" class="tab-btn${activeTab === 'only-a' ? ' active' : ''}" data-duo-tab="only-a">${escapeHtml(t(lang, 'duoTabOnlyPlayer', { name: nameA }))} (${buckets['only-a'].length})</button>
          <button type="button" class="tab-btn${activeTab === 'only-b' ? ' active' : ''}" data-duo-tab="only-b">${escapeHtml(t(lang, 'duoTabOnlyPlayer', { name: nameB }))} (${buckets['only-b'].length})</button>
          <button type="button" class="tab-btn${activeTab === 'both-fin' ? ' active' : ''}" data-duo-tab="both-fin">${escapeHtml(t(lang, 'duoTabBothFin'))} (${buckets['both-fin'].length})</button>
        </div>

        ${
          slice.length === 0
            ? `<div class="state-box"><div class="state-hint">${escapeHtml(t(lang, 'emptyTitle'))}</div></div>`
            : `<div class="list-box">
                ${slice
                  .map((m) => {
                    const connectUrl = m.server ? safeConnectTarget(m.server.address) : '';
                    let rightHtml = `<span class="muted tabular">${escapeHtml(t(lang, 'pointsUnit', { n: m.points }))}</span>`;
                    if (activeTab === 'both-fin' && m.timeA > 0 && m.timeB > 0) {
                      const fasterA = m.timeA < m.timeB;
                      const fasterB = m.timeB < m.timeA;
                      rightHtml = `<span class="mono${fasterA ? ' duo-win' : ''}">${escapeHtml(formatTime(m.timeA))}</span><span class="muted">vs</span><span class="mono${fasterB ? ' duo-win' : ''}">${escapeHtml(formatTime(m.timeB))}</span>`;
                    } else if (m.server && connectUrl) {
                      rightHtml += `<a class="btn btn-primary btn-sm" href="${escapeAttr(connectUrl)}" title="${escapeAttr(m.server.name)}">${icons.play(11)}<span>${escapeHtml(t(lang, 'connectServer'))} (${m.server.players}/${m.server.maxPlayers || '?'})</span></a>`;
                    }
                    return `<div class="list-row duo-map-row">
                      <div class="list-row-left">
                        <a href="/map/${encodeURIComponent(m.name)}" class="map-name-btn" data-open-map="${escapeAttr(m.name)}">${escapeHtml(m.name)}</a>
                        <span class="cat-badge" data-cat="${escapeAttr(m.type)}"><span class="cat-dot"></span>${escapeHtml(m.type)}</span>
                        <span class="duo-star-chip">${m.difficulty}★</span>
                      </div>
                      <div class="list-row-right">${rightHtml}</div>
                    </div>`;
                  })
                  .join('')}
              </div>`
        }

        ${
          activeList.length > shownCount
            ? `<div style="margin-top:8px;">
                <button type="button" class="btn btn-sm" id="duoShowMoreBtn">${escapeHtml(t(lang, 'playerShowMore', { n: activeList.length - shownCount }))}</button>
              </div>`
            : ''
        }
      </div>
    </div>
  `;
}
