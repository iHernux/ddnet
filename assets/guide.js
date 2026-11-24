import { escapeAttr, escapeHtml, t } from './i18n.js?v=20261124c';

export const GUIDE_SNIPPETS = {
  path_win: '%APPDATA%\\DDNet\\maps\\',
  path_linux: '~/.local/share/ddnet/maps/',
  path_mac: '~/Library/Application Support/DDNet/maps/',
  cmd_sv_map: 'sv_map "Multeasymap"',
  cmd_local_connect: 'connect localhost:8303',
  bind_manual_hammer: 'bind x "+toggle cl_dummy_hammer 1 0"',
  cfg_deepfly_on: [
    'bind mouse1 "+fire; +toggle cl_dummy_hammer 1 0"',
    'cl_message_client_color green',
    'echo Deep Fly ON',
    'bind x exec deepfly_off.cfg',
  ].join('\n'),
  cfg_deepfly_off: [
    'bind mouse1 +fire',
    'cl_dummy_hammer 0',
    'cl_message_client_color red',
    'echo Deep Fly OFF',
    'bind x exec deepfly_on.cfg',
  ].join('\n'),
  bind_deepfly_init: 'bind x exec deepfly_on.cfg',
  bind_deepfly_quick: [
    'bind c "bind mouse1 \\"+fire; +toggle cl_dummy_hammer 1 0\\""',
    'bind v "bind mouse1 +fire; cl_dummy_hammer 0"',
  ].join('\n'),
  bind_dummy_stability: [
    'cl_dummy_restore_weapon 0',
    'bind f "toggle cl_dummy_copy_moves 0 1"',
    'bind g "toggle cl_dummy_resetonswitch 0 1"',
    'bind h "dummy_reset; cl_dummy_resetonswitch 0; cl_dummy_control 0; cl_dummy_copy_moves 0"',
  ].join('\n'),
  bind_45deg:
    'bind z "+toggle cl_mouse_max_distance 2 400; +toggle inp_mousesens 1 200; +showhookcoll"',
};

const GUIDE_COPY = {
  tr: {
    tabMaps: 'Harita Kurulumu & Oynama',
    tabDummy: 'Dummy Fly & Havada Asılı Kalma',

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

    dummyTitle: 'Oyuncular Dummy Fly ile havada nasıl bu kadar stabil / asılı kalabiliyor?',
    dummyCalloutTitle: 'Temel Sır: Otomatik Hammerfly değil, Deepfly Bind + Pseudofly 1:1 Hook Ritmi',
    dummyCalloutBody:
      'Varsayılan "Dummy Hammerfly" ayarı (toggle cl_dummy_hammer 0 1) dummy’nin sabit bir tempoyla sürekli çekiç sallamasına neden olur; bu yüzden hız ve yükseklik kontrolü zordur. Havada neredeyse kıpırdamadan asılı kalan veya dar koridorlarda ip gibi giden oyuncular iki tekniği birleştirir: (1) Çekici otomatik yerine Deepfly bind ile kendi sol tıkına (mouse1) veya ayrı bir tuşa bağlayarak yalnızca istedikleri tick’te vurdurmak, (2) Pseudofly ritmiyle (iki çekiçte bir uzun hook yerine her tek çekiçte kısa 1:1 hook) tee’leri birbirine çarptırmadan yerçekimini dengelemek.',

    hoverStepsTitle: 'Adım adım havada asılı kalma ve stabil uçuş tekniği',
    hoverSteps: [
      'Otomatik döngüyü kapat, kontrolü eline al: bind x "+toggle cl_dummy_hammer 1 0" veya Deepfly bind kullan. Böylece dummy sadece sen tuşa bastığında sana doğru çekiç sallar; basılı tutmadığın an vuruş durur.',
      '1:1 Hook ritmi (Pseudofly) uygula: Normal hammerfly’da sürücü 2 çekiçte bir uzun hook atarken, stabil kontrol ve havada kalma için sürücü her 1 çekiçte çok kısa hook (mouse2) atıp tee’ler çarpışmadan bırakır.',
      'İrtifa ve hızı mikro vuruşlarla dengele: Aşağı süzülürken veya aynı noktada asılı kalmak istediğinde daha kısa ve seyrek hook + tek tık çekiç uygula; yükselmek istediğinde hook süresini ve vuruş temposunu hafifçe artır.',
      'Yatay savrulmayı önle: Her çekiç darbesinden hemen sonra A/D ile çok küçük yön düzeltmeleri yap; yatay uçuşlarda gerekirse cl_dummy_copy_moves 1 ile dummy’nin de aynı yönde ivmelenmesini sağla.',
    ],

    bindsTitle: 'Hazır F1 Konsol Bind’leri ve .cfg Dosyaları',
    manualHammerTitle: 'Seçenek A — Tek tuşla manuel Dummy Hammer (Başlangıç için en pratik)',
    manualHammerDesc:
      'F1 konsoluna yapıştır. x tuşuna bastığın veya basılı tuttuğun anda dummy sana nişan alıp çekiç vurur; bırakınca durur.',

    deepflyCfgTitle: 'Seçenek B — Resmî Deepfly 2 Dosyalı .cfg Ayarı (Pro Standart)',
    deepflyCfgDesc:
      'DDNet Ayarlar → Genel → Dizini Aç yoluyla açılan ana yapılandırma klasörüne aşağıda verilen deepfly_on.cfg ve deepfly_off.cfg dosyalarını oluştur; ardından oyun içinde F1 konsolundan başlatma komutunu gir. Deepfly açıkken normal ateşin (mouse1) her tıkta dummy çekicini tetikler (deep freeze haritalarında da çalışır; harita yapımcısı sv_deepfly 0 kapattıysa yalnız normal modda çalışır).',
    fileOnLabel: 'deepfly_on.cfg (Config dizinine kaydet)',
    fileOffLabel: 'deepfly_off.cfg (Config dizinine kaydet)',
    initBindLabel: 'F1 Konsolundan başlat (x tuşu ile Aç / Kapat)',

    deepflyQuickTitle: 'Seçenek C — Dosya oluşturmadan F1 üzerinden 2 tuşlu hızlı Deepfly',
    deepflyQuickDesc:
      '.cfg dosyası oluşturmak istemiyorsan doğrudan F1 konsoluna yapıştır: c tuşu mouse1 üzerine Deepfly atar, v tuşu mouse1’i normale döndürür ve sıkışmayı önler.',

    stabilityTitle: 'Dummy Stabilite & Güvenli Sıfırlama Paketi (Önerilen)',
    stabilityDesc:
      'cl_dummy_restore_weapon 0: Dummy’nin tabanca ↔ çekiç arasında gidip gelmesini engeller, çekiçte kilitler. cl_dummy_copy_moves (f): Dummy’nin hareketlerini aynalamasını açar/kapatır. cl_dummy_resetonswitch (g): Tee değiştirirken basılı tuşların takılı kalmasını önler. h: Sıkışırsan tüm dummy durumlarını tek tuşla sıfırlar.',

    aimTitle: 'Bonus — 45° Hassas Açı Kilidi (İsteğe bağlı)',
    aimDesc:
      'Tuşa (z) basılı tutarken nişanı 45° katlarına kilitler; düz tırmanış ve double rocket için faydalıdır. Önceden farklı cl_mouse_max_distance (varsayılan 400) veya inp_mousesens (varsayılan 200) kullanıyorsan komuttaki 400/200 değerlerini F1 konsolundan baktığın kendi değerlerinle değiştir.',

    wikiRefsLabel: 'Resmî DDNet Wiki Kaynakları:',
  },
  en: {
    tabMaps: 'Map Setup & Play',
    tabDummy: 'Dummy Fly & Mid-Air Hover',

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

    dummyTitle: 'How players stay ultra-stable and hover still mid-air with Dummy Fly',
    dummyCalloutTitle: 'The Secret: Deepfly Bind (On-Click Dummy Hammer) + Pseudofly 1:1 Hook Timing',
    dummyCalloutBody:
      'The built-in auto-hammerfly toggle (toggle cl_dummy_hammer 0 1) forces the dummy to swing on a rigid timer, making fine altitude control awkward. Players who appear effortlessly suspended or motionless mid-air combine two things: (1) replacing auto-hammer with a manual Deepfly bind so the dummy hammers only on the exact ticks they click, and (2) Pseudofly pacing—hooking briefly once per hammer hit (1:1) rather than every two hits—never colliding body-to-body while canceling gravity on demand.',

    hoverStepsTitle: 'Step-by-step mid-air hovering & stability technique',
    hoverSteps: [
      'Switch from auto loop to manual control: Bind "+toggle cl_dummy_hammer 1 0" (standalone key or via Deepfly on mouse1) so your dummy only swings toward you when triggered, stopping immediately when released.',
      'Use 1:1 Pseudofly hook timing: Unlike standard hammerfly (hook every 2 hammers), hook briefly (mouse2) once per hammer hit—just long enough to pull into hammer range without letting the tees collide.',
      'Hold altitude by modulating cadence: Short, infrequent hook pulls + spaced clicks counteract fall speed cleanly so both tees hover in place; slightly longer hooks or faster taps climb or build horizontal speed.',
      'Micro-steer horizontally & stabilize drift: Tap A/D lightly right after each hammer hit, and toggle cl_dummy_copy_moves 1 briefly when gliding horizontally so the dummy mirrors your momentum.',
    ],

    bindsTitle: 'Ready-to-Use F1 Binds & .cfg Setups',
    manualHammerTitle: 'Option A — Single-key Manual Dummy Hammer (Simplest start)',
    manualHammerDesc:
      'Paste into the F1 console. Whenever you press/hold x, your dummy aims at you and hammers once cleanly instead of running an uncontrollable loop.',

    deepflyCfgTitle: 'Option B — Official 2-File Deepfly Config (Pro Standard)',
    deepflyCfgDesc:
      'Open DDNet → Settings → General → Open Directory, create deepfly_on.cfg and deepfly_off.cfg in the config root folder, then run the F1 bind below. When toggled ON, left-clicking (mouse1) fires normally while firing a frame-accurate dummy hammer impulse (works with deep-frozen tees too unless sv_deepfly 0 is set by the map).',
    fileOnLabel: 'deepfly_on.cfg (Save in config root)',
    fileOffLabel: 'deepfly_off.cfg (Save in config root)',
    initBindLabel: 'Bind in F1 console (Press x to toggle ON / OFF)',

    deepflyQuickTitle: 'Option C — Quick 2-key F1 Deepfly (No config files needed)',
    deepflyQuickDesc:
      'Paste directly in F1 if you prefer not creating .cfg files: press c to enable Deepfly on mouse1, and v to cleanly restore mouse1 and clear cl_dummy_hammer.',

    stabilityTitle: 'Dummy Stability & Emergency Reset Pack (Recommended)',
    stabilityDesc:
      'cl_dummy_restore_weapon 0 locks the dummy onto hammer so it stops flickering back to pistol. f toggles cl_dummy_copy_moves; g toggles cl_dummy_resetonswitch; h runs an instant emergency reset if a dummy input ever gets stuck.',

    aimTitle: 'Bonus — 45° Precision Aim Lock (Optional)',
    aimDesc:
      'Holding z constrains aim to crisp 45° increments for straight vertical control or double rockets. Note: check your current cl_mouse_max_distance (default 400) and inp_mousesens (default 200) in F1 first and replace 400/200 if customized.',

    wikiRefsLabel: 'Official DDNet Wiki References:',
  },
};

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

export function renderGuideModalContent(lang, activeTab, icons) {
  const c = GUIDE_COPY[lang === 'tr' ? 'tr' : 'en'];
  const tab = activeTab === 'dummy' ? 'dummy' : 'maps';

  const tabsHtml = `<div class="tabs-bar guide-tabs" role="tablist">
    <button type="button" class="tab-btn${tab === 'maps' ? ' active' : ''}" data-guide-tab="maps" role="tab" aria-selected="${tab === 'maps' ? 'true' : 'false'}">
      ${icons.folder(14)}<span>${escapeHtml(c.tabMaps)}</span>
    </button>
    <button type="button" class="tab-btn${tab === 'dummy' ? ' active' : ''}" data-guide-tab="dummy" role="tab" aria-selected="${tab === 'dummy' ? 'true' : 'false'}">
      ${icons.terminal(14)}<span>${escapeHtml(c.tabDummy)}</span>
    </button>
  </div>`;

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
        ${renderCopyCard('DDNet-Server', '', 'cmd_sv_map', GUIDE_SNIPPETS.cmd_sv_map, lang, icons)}
        ${renderCopyCard('F1 Client Console', '', 'cmd_local_connect', GUIDE_SNIPPETS.cmd_local_connect, lang, icons)}
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
      </div>
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.sliders(15)}
        <h3>${escapeHtml(c.hoverStepsTitle)}</h3>
      </div>
      <ol class="guide-steps">
        ${c.hoverSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.terminal(15)}
        <h3>${escapeHtml(c.bindsTitle)}</h3>
      </div>
      ${renderCopyCard(c.manualHammerTitle, c.manualHammerDesc, 'bind_manual_hammer', GUIDE_SNIPPETS.bind_manual_hammer, lang, icons)}
      <div class="guide-note">${escapeHtml(c.deepflyCfgTitle)} — ${escapeHtml(c.deepflyCfgDesc)}</div>
      ${renderCopyCard(c.fileOnLabel, '', 'cfg_deepfly_on', GUIDE_SNIPPETS.cfg_deepfly_on, lang, icons)}
      ${renderCopyCard(c.fileOffLabel, '', 'cfg_deepfly_off', GUIDE_SNIPPETS.cfg_deepfly_off, lang, icons)}
      ${renderCopyCard(c.initBindLabel, '', 'bind_deepfly_init', GUIDE_SNIPPETS.bind_deepfly_init, lang, icons)}
      ${renderCopyCard(c.deepflyQuickTitle, c.deepflyQuickDesc, 'bind_deepfly_quick', GUIDE_SNIPPETS.bind_deepfly_quick, lang, icons)}
      ${renderCopyCard(c.stabilityTitle, c.stabilityDesc, 'bind_dummy_stability', GUIDE_SNIPPETS.bind_dummy_stability, lang, icons)}
      ${renderCopyCard(c.aimTitle, c.aimDesc, 'bind_45deg', GUIDE_SNIPPETS.bind_45deg, lang, icons)}
    </section>

    <div class="guide-links">
      <span class="muted">${escapeHtml(c.wikiRefsLabel)}</span>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Dummy" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Dummy Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Pseudofly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Pseudofly Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Binds#Deep_Fly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Deep Fly Binds</span></a>
    </div>
  `;
}
