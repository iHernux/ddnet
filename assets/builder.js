import { escapeAttr, escapeHtml, t } from './i18n.js?v=20261126m4';
import { TILES_LIST, getTileInfo } from './tiles.js?v=20261126m4';

export const BUILDER_KEYS = [
  'r',
  'f',
  'e',
  'q',
  'c',
  'v',
  'x',
  'z',
  'g',
  'k',
  'b',
  'n',
  'mouse4',
  'mouse5',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'capslock',
  'lshift',
  'lctrl',
  'lalt',
  'a',
  'd',
  'space',
  't',
];

const CORE_DEFAULT_KEYS = new Set([
  'a',
  'd',
  'space',
  'mouse1',
  'mouse2',
  't',
  'y',
  'u',
  'tab',
  'escape',
  'f1',
  'f2',
]);

export function createDefaultBuilderState() {
  return {
    restoreWeapon: true,
    items: {
      pseudofly: { enabled: true, key: 'r' },
      deepfly: { enabled: false, key: 'f' },
      manualHammer: { enabled: true, key: 'e' },
      dummyCopy: { enabled: false, key: 'c' },
      emergencyReset: { enabled: true, key: 'f6' },
      quickKill: { enabled: false, key: 'k' },
      dummySwitch: { enabled: false, key: 'x' },
    },
  };
}

const BUILDER_COPY = {
  tr: {
    title: 'Görsel Bind & .cfg Oluşturucu',
    subtitle:
      'İstediğin mekanikleri aç, tuşlarını seç; çakışma yoksa oluşan komutları tek tıkla kopyala veya ddnet_custom.cfg olarak indir.',
    restoreLabel: 'Dummy çekiç kilidi (cl_dummy_restore_weapon 0)',
    restoreDesc: 'Dummy çekiç vurduktan sonra silaha geri dönmez; tüm fly bind’ları için önerilir.',
    rowPseudofly: 'Pseudofly Aç/Kapat (Mouse2)',
    rowPseudoflyDesc: 'Tek tuşla sağ tıkta kanca + anlık dummy hammer döngüsünü açar/kapatır.',
    rowDeepfly: 'Deepfly Aç/Kapat (Mouse1)',
    rowDeepflyDesc: 'Tek tuşla sol tıkta silah + anlık dummy hammer döngüsünü açar/kapatır.',
    rowManualHammer: 'Anlık Dummy Çekiç (Bas-Çek)',
    rowManualHammerDesc: 'Havada ince ayar için tam bastığın anda tek hammer vurdurur.',
    rowDummyCopy: 'Dummy Copy Aç/Kapat',
    rowDummyCopyDesc: 'Dummy’nin senin sağ/sol/zıplama hareketlerini kopyalamasını açar/kapatır.',
    rowEmergencyReset: 'Acil Sıfırlama (Mouse & Dummy)',
    rowEmergencyResetDesc: 'Fare tuşların kilitli kalırsa hepsini anında varsayılan +fire/+hook hâline döndürür.',
    rowQuickKill: 'Hızlı Kill (Respawn)',
    rowQuickKillDesc: 'Tek tuşla respawn atar.',
    rowDummySwitch: 'Ana Tee / Dummy Geçişi',
    rowDummySwitchDesc: 'Kontrolü ana tee ve dummy arasında geçirir.',
    conflictTitle: 'Tuş Çakışması Tespit Edildi',
    conflictDup: '"{key}" tuşu birden fazla aktif satırda seçili!',
    conflictCore: '"{key}" DDNet varsayılan temel kontrol tuşudur (hareket/sohbet/menü bozulabilir).',
    conflictOk: 'Çakışma yok — tüm seçili tuşlar güvenle kullanılabilir.',
    previewCfgLabel: 'Oluşturulan .cfg Dosya İçeriği',
    previewF1Label: 'F1 Konsol Komutu (Satır başı <255 karakter)',
    copyF1Btn: 'F1 Komutlarını Kopyala',
    downloadCfgBtn: 'ddnet_custom.cfg İndir',
    resetDefaultsBtn: 'Varsayılana Dön',

    mechTitle: 'Tüm Resmî Harita Mekanikleri (40 Kare)',
    mechSubtitle: 'Haritalarda karşılaştığın her oyun karesinin ne yaptığını incele ve o mekaniğe sahip haritaları listele.',
    mechSearchPlaceholder: 'Mekanik adı, kodu (DFREEZE) veya açıklama ara…',
    mechAll: 'Tümü',
    mechFreeze: 'Donma & Güvenlik',
    mechWeapons: 'Silah & Lazer',
    mechMovement: 'Hareket & Teleport',
    mechSwitches: 'Anahtar & Takım',
    mechMapsCount: '{n} harita',
    mechFilterBtn: 'Haritaları Gör',
  },
  en: {
    title: 'Visual Bind & .cfg Builder',
    subtitle:
      'Toggle the binds you want, assign keys, check live conflict warnings, and copy or download a ready-to-use ddnet_custom.cfg.',
    restoreLabel: 'Keep dummy hammer equipped (cl_dummy_restore_weapon 0)',
    restoreDesc: 'Prevents the dummy from switching back to gun after hammering.',
    rowPseudofly: 'Pseudofly Toggle (Mouse2)',
    rowPseudoflyDesc: 'Toggles RMB hook + instant dummy hammer pulse on one key.',
    rowDeepfly: 'Deepfly Toggle (Mouse1)',
    rowDeepflyDesc: 'Toggles LMB fire + instant dummy hammer pulse on one key.',
    rowManualHammer: 'Manual Dummy Hammer (Tap)',
    rowManualHammerDesc: 'Clean single-tap dummy hammer for hovering & mid-air control.',
    rowDummyCopy: 'Dummy Copy Moves Toggle',
    rowDummyCopyDesc: 'Toggles cl_dummy_copy_moves 1/0 so dummy mirrors your inputs.',
    rowEmergencyReset: 'Emergency Reset (Mouse & Dummy)',
    rowEmergencyResetDesc: 'Instantly restores normal +fire / +hook bindings if stuck mid-run.',
    rowQuickKill: 'Quick Kill (Respawn)',
    rowQuickKillDesc: 'Instant kill bind for fast restarts.',
    rowDummySwitch: 'Switch Main / Dummy Control',
    rowDummySwitchDesc: 'Switches keyboard control between main tee and dummy.',
    conflictTitle: 'Key Conflict Warning',
    conflictDup: 'Key "{key}" is assigned to multiple enabled binds!',
    conflictCore: '"{key}" is a core DDNet default key (movement/chat/menu may break).',
    conflictOk: 'No conflicts detected — selected keys are clean.',
    previewCfgLabel: 'Generated ddnet_custom.cfg Preview',
    previewF1Label: 'F1 Console Commands',
    copyF1Btn: 'Copy F1 Commands',
    downloadCfgBtn: 'Download ddnet_custom.cfg',
    resetDefaultsBtn: 'Reset Defaults',

    mechTitle: 'All Official Map Mechanics (40 Tiles)',
    mechSubtitle: 'Browse every official DDNet game tile, see how many maps use it, and filter maps by any mechanic.',
    mechSearchPlaceholder: 'Search mechanic name, tile code (DFREEZE), or effect…',
    mechAll: 'All',
    mechFreeze: 'Freeze & Safety',
    mechWeapons: 'Weapons & Lasers',
    mechMovement: 'Movement & Tele',
    mechSwitches: 'Switches & Teams',
    mechMapsCount: '{n} maps',
    mechFilterBtn: 'Filter Maps',
  },
};

export function detectBuilderConflicts(bState, lang = 'en') {
  const c = BUILDER_COPY[lang === 'tr' ? 'tr' : 'en'];
  const warnings = [];
  const used = new Map();

  for (const [id, item] of Object.entries(bState.items || {})) {
    if (!item?.enabled) continue;
    const key = String(item.key || '').trim().toLowerCase();
    if (!key) continue;
    if (CORE_DEFAULT_KEYS.has(key)) {
      warnings.push(c.conflictCore.replace('{key}', key));
    }
    if (!used.has(key)) used.set(key, []);
    used.get(key).push(id);
  }

  for (const [key, ids] of used.entries()) {
    if (ids.length > 1) {
      warnings.push(c.conflictDup.replace('{key}', key));
    }
  }
  return Array.from(new Set(warnings));
}

export function buildConfigLines(bState) {
  const lines = [];
  if (bState.restoreWeapon) {
    lines.push('cl_dummy_restore_weapon 0');
  }
  const it = bState.items || {};
  if (it.pseudofly?.enabled) {
    const k = it.pseudofly.key || 'r';
    lines.push(
      `bind ${k} "bind mouse2 \\"+hook; +toggle cl_dummy_hammer 1 0\\"; cl_message_client_color green; echo Pseudofly ON; bind ${k} \\"bind mouse2 +hook; cl_dummy_hammer 0; cl_message_client_color red; echo Pseudofly OFF; exec ddnet_custom.cfg\\""`
    );
  }
  if (it.deepfly?.enabled) {
    const k = it.deepfly.key || 'f';
    lines.push(
      `bind ${k} "bind mouse1 \\"+fire; +toggle cl_dummy_hammer 1 0\\"; cl_message_client_color green; echo Deep Fly ON; bind ${k} \\"bind mouse1 +fire; cl_dummy_hammer 0; cl_message_client_color red; echo Deep Fly OFF; exec ddnet_custom.cfg\\""`
    );
  }
  if (it.manualHammer?.enabled) {
    const k = it.manualHammer.key || 'e';
    lines.push(`bind ${k} "+toggle cl_dummy_hammer 1 0"`);
  }
  if (it.dummyCopy?.enabled) {
    const k = it.dummyCopy.key || 'c';
    lines.push(`bind ${k} "toggle cl_dummy_copy_moves 1 0"`);
  }
  if (it.emergencyReset?.enabled) {
    const k = it.emergencyReset.key || 'f6';
    lines.push(`bind ${k} "bind mouse1 +fire; bind mouse2 +hook; cl_dummy_hammer 0; dummy_reset; echo Dummy Reset OK"`);
  }
  if (it.quickKill?.enabled) {
    const k = it.quickKill.key || 'k';
    lines.push(`bind ${k} kill`);
  }
  if (it.dummySwitch?.enabled) {
    const k = it.dummySwitch.key || 'x';
    lines.push(`bind ${k} "toggle cl_dummy 0 1"`);
  }
  return lines;
}

export function renderConfigBuilderHtml({ builderState, lang, icons }) {
  const c = BUILDER_COPY[lang === 'tr' ? 'tr' : 'en'];
  const warnings = detectBuilderConflicts(builderState, lang);
  const lines = buildConfigLines(builderState);
  const cfgText = `# Generated by DDNet Archive Config Builder\n${lines.join('\n')}\n`;

  const rows = [
    ['pseudofly', c.rowPseudofly, c.rowPseudoflyDesc],
    ['deepfly', c.rowDeepfly, c.rowDeepflyDesc],
    ['manualHammer', c.rowManualHammer, c.rowManualHammerDesc],
    ['dummyCopy', c.rowDummyCopy, c.rowDummyCopyDesc],
    ['emergencyReset', c.rowEmergencyReset, c.rowEmergencyResetDesc],
    ['quickKill', c.rowQuickKill, c.rowQuickKillDesc],
    ['dummySwitch', c.rowDummySwitch, c.rowDummySwitchDesc],
  ];

  const rowsHtml = rows
    .map(([id, title, desc]) => {
      const cfg = builderState.items[id] || { enabled: false, key: 'r' };
      const options = BUILDER_KEYS.map(
        (k) => `<option value="${k}"${cfg.key === k ? ' selected' : ''}>${escapeHtml(k.toUpperCase())}</option>`
      ).join('');
      return `<div class="cfg-row">
        <label class="cfg-row-toggle">
          <input type="checkbox" data-cfg-enable="${id}"${cfg.enabled ? ' checked' : ''} />
          <div class="cfg-row-info">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(desc)}</span>
          </div>
        </label>
        <select class="select select-sm cfg-key-select" data-cfg-key="${id}" aria-label="${escapeAttr(title)} key"${cfg.enabled ? '' : ' disabled'}>
          ${options}
        </select>
      </div>`;
    })
    .join('');

  return `
    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.sliders(15)}
        <h3>${escapeHtml(c.title)}</h3>
      </div>
      <p class="guide-lead">${escapeHtml(c.subtitle)}</p>

      <div class="cfg-row">
        <label class="cfg-row-toggle">
          <input type="checkbox" id="cfgRestoreWeaponToggle"${builderState.restoreWeapon ? ' checked' : ''} />
          <div class="cfg-row-info">
            <strong>${escapeHtml(c.restoreLabel)}</strong>
            <span>${escapeHtml(c.restoreDesc)}</span>
          </div>
        </label>
      </div>

      <div class="cfg-rows-list">
        ${rowsHtml}
      </div>

      <div id="cfgStatusBanner" class="${warnings.length > 0 ? 'cfg-conflict-warning' : 'cfg-ok-banner'}">
        <strong>${escapeHtml(warnings.length > 0 ? c.conflictTitle : c.conflictOk)}</strong>
        ${
          warnings.length > 0
            ? `<ul class="cfg-conflict-list">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
            : ''
        }
      </div>

      <div>
        <div class="cfg-preview-label">${escapeHtml(c.previewCfgLabel)}</div>
        <pre class="cfg-preview-code mono" id="cfgPreviewText">${escapeHtml(cfgText)}</pre>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-primary btn-sm" id="cfgCopyF1Btn">${icons.copy(14)}<span>${escapeHtml(c.copyF1Btn)}</span></button>
        <button type="button" class="btn btn-sm" id="cfgDownloadBtn">${icons.download(14)}<span>${escapeHtml(c.downloadCfgBtn)}</span></button>
        <button type="button" class="btn btn-sm" id="cfgResetDefaultsBtn">${escapeHtml(c.resetDefaultsBtn)}</button>
      </div>
    </section>
  `;
}

const TILE_GROUP_BY_ID = new Map([
  ...['DEATH', 'DFREEZE', 'EHOOK_START', 'HIT_END', 'SOLO_START', 'NPC_START', 'NPH_START', 'STOP', 'THROUGH', 'THROUGH_ALL'].map((id) => [id, 'freeze']),
  ...['WEAPON_SHOTGUN', 'WEAPON_GRENADE', 'WEAPON_RIFLE', 'POWERUP_NINJA', 'CRAZY_SHOTGUN', 'LASER_STOP', 'OLDLASER', 'DRAGGER', 'PLASMAF', 'PLASMAE', 'PLASMAU'].map((id) => [id, 'weapons']),
  ...['JUMP', 'JETPACK_START', 'WALLJUMP', 'TELE_GUN', 'TELE_GRENADE', 'TELE_LASER', 'TELEINEVIL', 'TELEIN', 'TELECHECK', 'TELEINWEAPON', 'TELEINHOOK', 'BOOST', 'SUPER_START'].map((id) => [id, 'movement']),
  ...['DOOR', 'SWITCH_TIMED', 'SWITCH', 'TUNE', 'CHECKPOINT_FIRST', 'BONUS'].map((id) => [id, 'switches']),
]);

export function renderMechanicsGridHtml({ lang, icons, tileCounts, search = '', group = 'all' }) {
  const c = BUILDER_COPY[lang === 'tr' ? 'tr' : 'en'];
  const q = String(search || '').trim().toLowerCase();

  const items = TILES_LIST.filter((tile) => {
    const grp = TILE_GROUP_BY_ID.get(tile.id) || 'switches';
    if (group !== 'all' && grp !== group) return false;
    if (!q) return true;
    const info = getTileInfo(tile.id, lang);
    return (
      tile.id.toLowerCase().includes(q) ||
      info.name.toLowerCase().includes(q) ||
      info.desc.toLowerCase().includes(q)
    );
  });

  if (items.length === 0) {
    return `<div class="state-box"><div class="state-hint">${escapeHtml(t(lang, 'emptyTitle'))}</div></div>`;
  }

  return items
    .map((tile) => {
      const info = getTileInfo(tile.id, lang);
      const count = tileCounts?.get(tile.id) || 0;
      const countText = c.mechMapsCount.replace('{n}', count.toLocaleString());
      return `<div class="mech-card" data-mech-id="${escapeAttr(tile.id)}">
        <div class="mech-card-head">
          <img src="${escapeAttr(info.icon)}" alt="${escapeAttr(info.name)}" width="28" height="28" loading="lazy" />
          <div class="mech-card-titles">
            <strong>${escapeHtml(info.name)}</strong>
            <div class="mech-card-badges">
              <span class="tile-code">${escapeHtml(tile.id)}</span>
              <span class="mech-count-pill tabular">${escapeHtml(countText)}</span>
            </div>
          </div>
        </div>
        <p class="mech-card-desc">${escapeHtml(info.desc)}</p>
        <div class="mech-card-foot">
          <button type="button" class="btn btn-sm" data-filter-tile="${escapeAttr(tile.id)}">
            ${icons.map(13)}<span>${escapeHtml(c.mechFilterBtn)} (${count})</span>
          </button>
        </div>
      </div>`;
    })
    .join('');
}

export function renderMechanicsExplorerHtml({ lang, icons, tileCounts, search = '', group = 'all' }) {
  const c = BUILDER_COPY[lang === 'tr' ? 'tr' : 'en'];
  const groups = [
    ['all', c.mechAll],
    ['freeze', c.mechFreeze],
    ['weapons', c.mechWeapons],
    ['movement', c.mechMovement],
    ['switches', c.mechSwitches],
  ];

  return `
    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.map(15)}
        <h3>${escapeHtml(c.mechTitle)}</h3>
      </div>
      <p class="guide-lead">${escapeHtml(c.mechSubtitle)}</p>

      <div class="mech-toolbar">
        <div class="search-wrap">
          <span class="search-leading">${icons.search(14)}</span>
          <input
            type="search"
            id="mechSearchInput"
            class="input search-input"
            value="${escapeAttr(search)}"
            placeholder="${escapeAttr(c.mechSearchPlaceholder)}"
            autocomplete="off"
          />
        </div>
        <div class="category-strip" id="mechGroupPills">
          ${groups
            .map(
              ([id, label]) =>
                `<button type="button" class="cat-pill${group === id ? ' active' : ''}" data-mech-group="${id}">${escapeHtml(label)}</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="mech-grid" id="mechGrid">
        ${renderMechanicsGridHtml({ lang, icons, tileCounts, search, group })}
      </div>
    </section>
  `;
}
