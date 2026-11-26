import { escapeAttr, escapeHtml, t } from './i18n.js?v=20261126m5';
import { renderConfigBuilderHtml, renderMechanicsExplorerHtml } from './builder.js?v=20261126m5';

export const GUIDE_SNIPPETS = {
  // Map setup snippets
  path_win: '%APPDATA%\\DDNet\\maps\\',
  path_linux: '~/.local/share/ddnet/maps/',
  path_mac: '~/Library/Application Support/DDNet/maps/',
  cmd_sv_map: 'sv_map "Multeasymap"',
  cmd_local_connect: 'connect localhost:8303',

  // Essential Dummy Fly & Mid-Air Hover snippets (single-line, <255 chars, free default keys)
  set_restore_weapon: 'cl_dummy_restore_weapon 0',
  cfg_pseudofly_1file:
    'bind r "bind mouse2 \\"+hook; +toggle cl_dummy_hammer 1 0\\"; cl_message_client_color green; echo Pseudofly ON; bind r \\"bind mouse2 +hook; cl_dummy_hammer 0; cl_message_client_color red; echo Pseudofly OFF; exec pseudofly.cfg\\""',
  exec_pseudofly: 'exec pseudofly.cfg',
  cfg_deepfly_1file:
    'bind f "bind mouse1 \\"+fire; +toggle cl_dummy_hammer 1 0\\"; cl_message_client_color green; echo Deep Fly ON; bind f \\"bind mouse1 +fire; cl_dummy_hammer 0; cl_message_client_color red; echo Deep Fly OFF; exec deepfly.cfg\\""',
  exec_deepfly: 'exec deepfly.cfg',
  bind_emergency_reset:
    'bind f6 "bind mouse1 +fire; bind mouse2 +hook; cl_dummy_hammer 0; dummy_reset; echo Dummy Reset OK"',
  bind_manual_key: 'bind e "+toggle cl_dummy_hammer 1 0"',
};

const GUIDE_COPY = {
  tr: {
    tabMaps: 'Harita Kurulumu & Oynama',
    tabDummy: 'Dummy Fly & Havada Asılı Kalma',
    tabBuilder: '.cfg Oluşturucu',
    tabMechanics: 'Mekanikler (40)',

    installTitle: '1. İndirilen .map dosyaları nereye atılır?',
    installIntro:
      'İndirdiğin .map uzantılı dosyayı aşağıdaki işletim sistemine uygun maps klasörünün içine kopyala. Klasörü bulmakta zorlanırsan DDNet içinde Ayarlar → Genel → Dizini Aç (Settings → General → Open Directory) butonuna basıp çıkan klasördeki maps/ alt klasörünü açabilirsin.',
    osWin: 'Windows',
    osLinux: 'Linux',
    osMac: 'macOS',

    localTitle: '2. İndirdiğin haritayı yerel (offline/LAN) açma',
    localSteps: [
      'DDNet kurulum klasöründen (Steam’de: Sağ tık → Yönet → Yerel dosyalara göz at) DDNet-Server uygulamasını başlat.',
      'Açılan sunucu konsoluna (veya oyun içinden F2 RCON / autoexec_server.cfg içine) haritanın tam adını .map uzantısı olmadan yaz. Her harita kartında ve detay penceresinde sv_map kopyala butonu bulunur:',
      'DDNet’te Oyna → LAN sekmesinden yerel sunucunu seç veya F1 konsoluna bağlan yaz; dummy bağlamak için Esc → Dummy bağla (Connect Dummy) seçeneğini kullan.',
    ],

    onlineTitle: '3. Canlı online sunuculara katılma',
    onlineDesc:
      'İndirmeden oynamak için Sunucular sekmesinde veya harita detay penceresinde herhangi bir sunucunun Bağlan (ddnet://) butonuna tıkla ya da IP’yi kopyalayıp F1 konsoluna connect ip:port şeklinde yapıştır.',

    // Essential Dummy Fly & Hover Tab
    dummyTitle: 'Dummy ile havada nasıl stabil kalınır?',
    dummyCalloutTitle: 'Mantığı: Otomatik 0,50 sn Döngüsü yerine Anlık Çekiç + 1:1 Pseudofly',
    dummyCalloutBody:
      'Varsayılan H tuşu (Otomatik Hammerfly) açıkken dummy sabit olarak her 0,50 saniyede bir vurur; bu yüzden yavaşlayıp havada durmak zordur. "+toggle cl_dummy_hammer 1 0" tuş bırakılınca sayacı sıfırladığı için kısa dokunuşlarla tam istediğin anda tek çekiç vurursun. Bunun yanında 1:1 kısa sağ tık (Pseudofly) yapınca tee’ler çarpışmadan yerçekimini dengeler.',
    dummyBotNote:
      'Not: Gerçek oyuncular havada kalırken her zaman çok hafif ritmik sekme olur; tek piksel kıpırdamayan robotik asılı kalma yalnız kısıtlamasız sunucularda bot/modlu istemcilerle olur (resmî DDNet’te yasaktır).',

    step0Title: 'Önce 1 Ayar (F1 Konsoluna Yapıştır & Enter)',
    step0Desc:
      'Esc → Dummy bağla ile dummy’ni çıkar. Aşağıdaki tuşlar (R, F, F6, E) varsayılan DDNet tuşlarıyla (X, H, S, C, V) çakışmaz.',
    restoreWeaponTitle: 'Dummy çekiç kilidi (1 kez yapıştır & Enter)',
    restoreWeaponDesc:
      'Varsayılan 1’dir; dummy her vuruştan sonra silaha dönüp ritmi bozar. 0 yaptığında çekiçte kalır ve kalıcı kaydolur.',

    methodsTitle: 'Sana Uygun Olanı Seç (Sadece 1 Tanesini Kur)',
    recBadge: 'Önerilen · Havada Asılı Kalma',
    altBadge: 'Alternatif · Klasik Deepfly',
    whereLabel: 'Nereye konur:',
    howToUseLabel: 'Nasıl kullanılır:',
    undoLabel: 'Nasıl kapatılır:',

    m1Title: '1. Tek Tuş Pseudofly — Sağ Tık Mouse2 (En Popüler)',
    m1Steps: [
      'DDNet → Ayarlar → Genel → Dizini Aç yolunu aç (maps/ içine DEĞİL, doğrudan settings_ddnet.cfg yanına gir).',
      'pseudofly.cfg adında bir dosya açıp alttaki tek satırı yapıştır ve kaydet.',
      'Oyun içinde F1’e basıp 1 kere exec pseudofly.cfg yaz ve Enter’a bas.',
    ],
    m1Where: 'Ana config klasörü (pseudofly.cfg) + F1’den 1 kez exec pseudofly.cfg.',
    m1Use:
      'R tuşuna basıp aç (yeşil "Pseudofly ON" yazar). Artık her sağ tık (Mouse2) hem hook atar hem dummy’ye çekiç vurdurur; kısa ritmik tıklamalarla havada asılı kalabilirsin.',
    m1Undo: 'Normal duvara hook atacağında tekrar R’ye bas (kırmızı "Pseudofly OFF").',

    m2Title: '2. Klasik Deepfly — Sol Tık Mouse1 (Deep Freeze İçin)',
    m2Steps: [
      'Aynı config klasörüne (settings_ddnet.cfg yanına) deepfly.cfg açıp alttaki tek satırı kaydet.',
      'F1’e basıp 1 kere exec deepfly.cfg yaz ve Enter’a bas.',
    ],
    m2Where: 'Ana config klasörü (deepfly.cfg) + F1’den 1 kez exec deepfly.cfg.',
    m2Use:
      'F tuşuyla aç ("Deep Fly ON"): her sol tık (Mouse1) ateş ederken dummy’ye çekiç vurdurur. Sağ tık (Mouse2) normal kalır; deep freeze haritalarında da çalışır (sv_deepfly 0 engellemediyse).',
    m2Undo: 'Kapatmak için F tuşuna tekrar bas ("Deep Fly OFF").',

    tipsTitle: 'Oyunda Uygulama İpuçları & Güvenli Sıfırlama',
    playSteps: [
      'Önce sen bağlan & hizalan: Ana tee’n dummy’den önce girdiği için otomatik olarak Strong Hook’a (güçlü çekme) sahipsindir; bu düşüşü frenlemeyi kolaylaştırır.',
      '1:1 ritim kur: Havada sabit durmak için her tek çekiçte bir çok kısa sağ tık yap (tee’ler çarpışmadan bırak); yükselmek için hook süresini ve hızını biraz artır.',
      'Yönü minik dokunuşlarla düzelt: A/D tuşlarını basılı tutma, her vuruşun hemen ardından kısa tıkla.',
    ],
    resetTitle: 'Acil Durum Sıfırlama (F6 — Önerilen)',
    resetDesc:
      'Deepfly/Pseudofly açıkken oyundan çıkarsan veya Mouse1/Mouse2 takılı kalırsa F6’ya bas; her şeyi anında normale döndürür.',

    quickDetailsSummary: 'Dosya oluşturmadan hızlı deneme (F1 — Opsiyonel)',
    quickDetailsDesc:
      'Dosya açmadan hemen denemek için F1’e yapıştır (e yerine farenin yan tuşu mouse4 yazabilirsin): Mouse2 ile hooklarken her vuruş için E’ye basıp bırak. Kaldırmak için F1’e unbind e yaz.',

    wikiRefsLabel: 'Doğrulanan Kaynaklar:',
  },
  en: {
    tabMaps: 'Map Setup & Play',
    tabDummy: 'Dummy Fly & Mid-Air Hover',
    tabBuilder: 'Config Builder',
    tabMechanics: 'Mechanics (40)',

    installTitle: '1. Where to put downloaded .map files',
    installIntro:
      'Move your downloaded .map file into your DDNet maps folder below. The easiest cross-platform shortcut is opening DDNet → Settings → General → Open Directory, then placing the file inside the maps/ subfolder.',
    osWin: 'Windows',
    osLinux: 'Linux',
    osMac: 'macOS',

    localTitle: '2. Loading & playing a map locally',
    localSteps: [
      'Launch DDNet-Server from your DDNet installation folder (Steam: Right-click → Manage → Browse local files).',
      'In the server console (or F2 RCON / autoexec_server.cfg), run sv_map with the map name (without .map). Every map card and modal on this site has a 1-click Copy sv_map button:',
      'In the DDNet client, go to Play → LAN and join your local server (or open F1 and run connect localhost:8303). To spawn your dummy, press Esc → Connect Dummy.',
    ],

    onlineTitle: '3. Joining live servers without downloading',
    onlineDesc:
      'Open the Servers tab (or any map detail modal) and click Join (ddnet://) on a live server, or click Copy IP and paste connect ip:port into the F1 console.',

    // Essential Dummy Fly & Hover Tab
    dummyTitle: 'How to hover & fly stably with Dummy',
    dummyCalloutTitle: 'How It Works: Instant Reset Hammer + 1:1 Pseudofly Timing',
    dummyCalloutBody:
      'With the default H key (Auto Hammerfly), the dummy fires on a rigid 0.50 s timer, making it hard to slow down or hover. "+toggle cl_dummy_hammer 1 0" resets that timer on release, so each short tap gives an instant aimed hit on demand. Paired with brief 1:1 hooks (Pseudofly), you cancel gravity cleanly without colliding.',
    dummyBotNote:
      'Note: Real human players always have tiny rhythmic micro-bounces; completely motionless single-pixel hovering on unrestricted servers is typically a bot or modified client (banned on official DDNet servers).',

    step0Title: 'Step 0 — One Required Setting (Paste in F1 & Press Enter)',
    step0Desc:
      'Spawn your dummy via Esc → Connect Dummy. All keys below (R, F, F6, E) are free and leave DDNet defaults (X, H, S, C, V) untouched.',
    restoreWeaponTitle: 'Lock dummy on hammer (Paste once in F1 & Enter)',
    restoreWeaponDesc:
      'Default is 1, which flips the dummy back to gun/laser after 1 swing. Setting 0 locks it on hammer and saves automatically.',

    methodsTitle: 'Pick ONE Setup Below',
    recBadge: 'Recommended · 1-Button Hover',
    altBadge: 'Alternative · Classic Deepfly',
    whereLabel: 'Where it goes:',
    howToUseLabel: 'How to use:',
    undoLabel: 'How to turn off:',

    m1Title: '1. One-Button Pseudofly — Mouse2 Hook+Hammer (Most Popular)',
    m1Steps: [
      'Open DDNet → Settings → General → Open Directory (stay beside settings_ddnet.cfg, NOT inside maps/).',
      'Create pseudofly.cfg, paste the single line below, and save.',
      'In-game press F1, type exec pseudofly.cfg once, and press Enter.',
    ],
    m1Where: 'Config root folder (pseudofly.cfg) + run exec pseudofly.cfg once in F1.',
    m1Use:
      'Press R to toggle ON (green "Pseudofly ON"). Now Mouse2 (right-click) both hooks and fires a dummy hammer hit—use short rhythmic clicks to hover in place.',
    m1Undo: 'Press R again before hooking walls normally (red "Pseudofly OFF").',

    m2Title: '2. Classic Deepfly — Mouse1 Fire+Hammer (Best for Deep Freeze)',
    m2Steps: [
      'In the same config root (beside settings_ddnet.cfg), create deepfly.cfg with the single line below.',
      'Press F1 and run exec deepfly.cfg once.',
    ],
    m2Where: 'Config root folder (deepfly.cfg) + run exec deepfly.cfg once in F1.',
    m2Use:
      'Press F to toggle ON ("Deep Fly ON"): left-clicking (Mouse1) triggers your dummy hammer while leaving Mouse2 normal. Works with deep-frozen tees too unless disabled by sv_deepfly 0.',
    m2Undo: 'Press F again to restore normal Mouse1 ("Deep Fly OFF").',

    tipsTitle: '3 Quick Hover Tips & Safety Reset',
    playSteps: [
      'Strong Hook advantage: Because you connect before your dummy, you have Strong Hook by default—making pulls and drop braking easier.',
      '1:1 rhythm: For hovering in one spot, hook very briefly once per hammer hit and release before bumping; hold slightly longer to climb.',
      'Micro-tap A/D: Do not hold movement keys down while hovering—correct drift with quick taps right after each hit.',
    ],
    resetTitle: 'Emergency Reset Key (F6 — Recommended)',
    resetDesc:
      'If Mouse1/Mouse2 ever feels stuck or you quit while Deepfly/Pseudofly was toggled ON, press F6 to reset everything back to normal.',

    quickDetailsSummary: 'Quick test without creating files (F1 — Optional)',
    quickDetailsDesc:
      'To test with zero files, paste this in F1 (swap e for mouse4 if preferred): hook with Mouse2 and tap E per hammer hit. Run unbind e in F1 to remove.',

    wikiRefsLabel: 'Verified Sources:',
  },
};

function renderSnippetBox(label, snippetId, codeText, lang, icons) {
  return `<div class="guide-code-card">
    <div class="guide-code-head">
      <div class="guide-code-meta">
        <strong>${escapeHtml(label)}</strong>
      </div>
      <button type="button" class="btn btn-sm" data-copy-snippet-id="${escapeAttr(snippetId)}">
        ${icons.copy(13)}
        <span>${escapeHtml(t(lang, 'copyBtn'))}</span>
      </button>
    </div>
    <pre class="guide-code-pre mono"><code>${escapeHtml(codeText)}</code></pre>
  </div>`;
}

function renderCopyCard(title, desc, snippetId, codeText, lang, icons) {
  return `<div class="guide-code-card">
    <div class="guide-code-head">
      <div class="guide-code-meta">
        <strong>${escapeHtml(title)}</strong>
        ${desc ? `<span>${escapeHtml(desc)}</span>` : ''}
      </div>
      <button type="button" class="btn btn-sm" data-copy-snippet-id="${escapeAttr(snippetId)}">
        ${icons.copy(13)}
        <span>${escapeHtml(t(lang, 'copyBtn'))}</span>
      </button>
    </div>
    <pre class="guide-code-pre mono"><code>${escapeHtml(codeText)}</code></pre>
  </div>`;
}

export function renderGuideModalContent(lang, activeTab, icons, extraCtx = {}) {
  const c = GUIDE_COPY[lang === 'tr' ? 'tr' : 'en'];
  const tab =
    activeTab === 'dummy' || activeTab === 'builder' || activeTab === 'mechanics'
      ? activeTab
      : 'maps';

  const tabsHtml = `<div class="tabs-bar guide-tabs" role="tablist">
    <button type="button" class="tab-btn${tab === 'maps' ? ' active' : ''}" data-guide-tab="maps" role="tab" aria-selected="${tab === 'maps' ? 'true' : 'false'}">
      ${icons.folder(14)}<span>${escapeHtml(c.tabMaps)}</span>
    </button>
    <button type="button" class="tab-btn${tab === 'dummy' ? ' active' : ''}" data-guide-tab="dummy" role="tab" aria-selected="${tab === 'dummy' ? 'true' : 'false'}">
      ${icons.terminal(14)}<span>${escapeHtml(c.tabDummy)}</span>
    </button>
    <button type="button" class="tab-btn${tab === 'builder' ? ' active' : ''}" data-guide-tab="builder" role="tab" aria-selected="${tab === 'builder' ? 'true' : 'false'}">
      ${icons.sliders(14)}<span>${escapeHtml(c.tabBuilder)}</span>
    </button>
    <button type="button" class="tab-btn${tab === 'mechanics' ? ' active' : ''}" data-guide-tab="mechanics" role="tab" aria-selected="${tab === 'mechanics' ? 'true' : 'false'}">
      ${icons.map(14)}<span>${escapeHtml(c.tabMechanics)}</span>
    </button>
  </div>`;

  if (tab === 'builder') {
    return `${tabsHtml}${renderConfigBuilderHtml({
      builderState: extraCtx.builderState,
      lang,
      icons,
    })}`;
  }

  if (tab === 'mechanics') {
    return `${tabsHtml}${renderMechanicsExplorerHtml({
      lang,
      icons,
      tileCounts: extraCtx.tileCounts,
      search: extraCtx.mechSearch || '',
      group: extraCtx.mechGroup || 'all',
    })}`;
  }

  if (tab === 'maps') {
    const pathRows = [
      { os: c.osWin, id: 'path_win', value: GUIDE_SNIPPETS.path_win },
      { os: c.osLinux, id: 'path_linux', value: GUIDE_SNIPPETS.path_linux },
      { os: c.osMac, id: 'path_mac', value: GUIDE_SNIPPETS.path_mac },
    ];

    return `${tabsHtml}
      <section class="guide-section">
        <div class="guide-section-head">
          ${icons.folder(15)}
          <h3>${escapeHtml(c.installTitle)}</h3>
        </div>
        <p class="guide-lead">${escapeHtml(c.installIntro)}</p>
        <div class="guide-path-list">
          ${pathRows
            .map(
              (r) => `<div class="guide-path-row">
                <span class="guide-path-os">${escapeHtml(r.os)}</span>
                <code class="guide-path-val mono">${escapeHtml(r.value)}</code>
                <button type="button" class="btn btn-sm" data-copy-snippet-id="${escapeAttr(r.id)}">
                  ${icons.copy(13)}<span>${escapeHtml(t(lang, 'copyBtn'))}</span>
                </button>
              </div>`
            )
            .join('')}
        </div>
      </section>

      <section class="guide-section">
        <div class="guide-section-head">
          ${icons.terminal(15)}
          <h3>${escapeHtml(c.localTitle)}</h3>
        </div>
        <ol class="guide-steps">
          ${c.localSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
        </ol>
        ${renderSnippetBox('DDNet-Server', 'cmd_sv_map', GUIDE_SNIPPETS.cmd_sv_map, lang, icons)}
        ${renderSnippetBox('F1 Client Console', 'cmd_local_connect', GUIDE_SNIPPETS.cmd_local_connect, lang, icons)}
      </section>

      <section class="guide-section">
        <div class="guide-section-head">
          ${icons.globe(15)}
          <h3>${escapeHtml(c.onlineTitle)}</h3>
        </div>
        <p class="guide-lead">${escapeHtml(c.onlineDesc)}</p>
      </section>
    `;
  }

  return `${tabsHtml}
    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.activity(15)}
        <h3>${escapeHtml(c.dummyTitle)}</h3>
      </div>
      <div class="guide-callout">
        <div class="guide-callout-title">${escapeHtml(c.dummyCalloutTitle)}</div>
        <p class="guide-callout-body">${escapeHtml(c.dummyCalloutBody)}</p>
        <p class="guide-callout-note">${escapeHtml(c.dummyBotNote)}</p>
      </div>
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.sliders(15)}
        <h3>${escapeHtml(c.step0Title)}</h3>
      </div>
      <p class="guide-lead">${escapeHtml(c.step0Desc)}</p>
      ${renderCopyCard(c.restoreWeaponTitle, c.restoreWeaponDesc, 'set_restore_weapon', GUIDE_SNIPPETS.set_restore_weapon, lang, icons)}
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.terminal(15)}
        <h3>${escapeHtml(c.methodsTitle)}</h3>
      </div>

      <article class="guide-method-card guide-method-rec" data-guide-method="pseudofly">
        <div class="guide-method-head">
          <h4>${escapeHtml(c.m1Title)}</h4>
          <span class="guide-badge guide-badge-rec">${escapeHtml(c.recBadge)}</span>
        </div>
        <ol class="guide-steps">
          ${c.m1Steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
        </ol>
        ${renderSnippetBox('pseudofly.cfg (1 Line)', 'cfg_pseudofly_1file', GUIDE_SNIPPETS.cfg_pseudofly_1file, lang, icons)}
        ${renderSnippetBox('F1 Console (Run 1x)', 'exec_pseudofly', GUIDE_SNIPPETS.exec_pseudofly, lang, icons)}
        <div class="guide-kv-list">
          <div class="guide-kv"><strong>${escapeHtml(c.whereLabel)}</strong> <span>${escapeHtml(c.m1Where)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.howToUseLabel)}</strong> <span>${escapeHtml(c.m1Use)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.undoLabel)}</strong> <span>${escapeHtml(c.m1Undo)}</span></div>
        </div>
      </article>

      <article class="guide-method-card" data-guide-method="deepfly">
        <div class="guide-method-head">
          <h4>${escapeHtml(c.m2Title)}</h4>
          <span class="guide-badge">${escapeHtml(c.altBadge)}</span>
        </div>
        <ol class="guide-steps">
          ${c.m2Steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
        </ol>
        ${renderSnippetBox('deepfly.cfg (1 Line)', 'cfg_deepfly_1file', GUIDE_SNIPPETS.cfg_deepfly_1file, lang, icons)}
        ${renderSnippetBox('F1 Console (Run 1x)', 'exec_deepfly', GUIDE_SNIPPETS.exec_deepfly, lang, icons)}
        <div class="guide-kv-list">
          <div class="guide-kv"><strong>${escapeHtml(c.whereLabel)}</strong> <span>${escapeHtml(c.m2Where)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.howToUseLabel)}</strong> <span>${escapeHtml(c.m2Use)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.undoLabel)}</strong> <span>${escapeHtml(c.m2Undo)}</span></div>
        </div>
      </article>
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.gamepad(15)}
        <h3>${escapeHtml(c.tipsTitle)}</h3>
      </div>
      <ol class="guide-steps">
        ${c.playSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
      ${renderCopyCard(c.resetTitle, c.resetDesc, 'bind_emergency_reset', GUIDE_SNIPPETS.bind_emergency_reset, lang, icons)}
      <details class="guide-details">
        <summary>${escapeHtml(c.quickDetailsSummary)}</summary>
        <div class="guide-details-body">
          <p class="guide-lead">${escapeHtml(c.quickDetailsDesc)}</p>
          ${renderSnippetBox('F1 Console (E Key / mouse4)', 'bind_manual_key', GUIDE_SNIPPETS.bind_manual_key, lang, icons)}
        </div>
      </details>
    </section>

    <div class="guide-links">
      <span class="muted">${escapeHtml(c.wikiRefsLabel)}</span>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Pseudofly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Pseudofly Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Dummy" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Dummy Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Binds#Deep_Fly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Deep Fly Binds</span></a>
    </div>
  `;
}
