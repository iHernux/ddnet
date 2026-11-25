import { escapeAttr, escapeHtml, t } from './i18n.js?v=20261125a';

export const GUIDE_SNIPPETS = {
  // Map setup snippets
  path_win: '%APPDATA%\\DDNet\\maps\\',
  path_linux: '~/.local/share/ddnet/maps/',
  path_mac: '~/Library/Application Support/DDNet/maps/',
  cmd_sv_map: 'sv_map "Multeasymap"',
  cmd_local_connect: 'connect localhost:8303',

  // Dummy fly & mid-air hover snippets (all strictly single-line, <255 chars, free default keys)
  set_restore_weapon: 'cl_dummy_restore_weapon 0',
  bind_manual_key: 'bind e "+toggle cl_dummy_hammer 1 0"',
  cfg_deepfly_1file:
    'bind f "bind mouse1 \\"+fire; +toggle cl_dummy_hammer 1 0\\"; cl_message_client_color green; echo Deep Fly ON; bind f \\"bind mouse1 +fire; cl_dummy_hammer 0; cl_message_client_color red; echo Deep Fly OFF; exec deepfly.cfg\\""',
  exec_deepfly: 'exec deepfly.cfg',
  bind_deepfly_f1_on: 'bind f "bind mouse1 \\"+fire; +toggle cl_dummy_hammer 1 0\\"; echo Deep Fly ON"',
  bind_deepfly_f1_off: 'bind g "bind mouse1 +fire; cl_dummy_hammer 0; echo Deep Fly OFF"',
  cfg_pseudofly_1file:
    'bind r "bind mouse2 \\"+hook; +toggle cl_dummy_hammer 1 0\\"; cl_message_client_color green; echo Pseudofly ON; bind r \\"bind mouse2 +hook; cl_dummy_hammer 0; cl_message_client_color red; echo Pseudofly OFF; exec pseudofly.cfg\\""',
  exec_pseudofly: 'exec pseudofly.cfg',
  bind_emergency_reset:
    'bind f6 "bind mouse1 +fire; bind mouse2 +hook; cl_dummy_hammer 0; cl_dummy_copy_moves 0; cl_dummy_control 0; cl_dummy_resetonswitch 0; dummy_reset; echo Dummy Reset OK"',
  bind_copy_moves: 'bind j "toggle cl_dummy_copy_moves 0 1"',
  bind_reset_on_switch: 'bind n "toggle cl_dummy_resetonswitch 0 1"',
  bind_45deg:
    'bind z "+toggle cl_mouse_max_distance 2 400; +toggle inp_mousesens 1 200; +showhookcoll"',
  cmd_unbind_example: 'unbind e',
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

    // Dummy Fly & Hover Tab
    dummyTitle: 'Oyuncular Dummy ile havada nasıl bu kadar stabil / asılı kalabiliyor?',
    dummyCalloutTitle: 'Motor Mantığı: Sabit 0,5 sn Otomatik Döngü yerine Anlık Çekiç + 1:1 Pseudofly Ritmi',
    dummyCalloutBody:
      'DDNet 50 Hz (saniyede 50 tick) çalışır. Varsayılan H tuşundaki otomatik Dummy Hammerfly (toggle cl_dummy_hammer 0 1) açıkken dummy sabit olarak her 25 tick’te bir (0,50 sn) tam senin konumuna nişan alıp çekiç sallar; bu yüzden hızını düşürüp havada sabit durman zordur. "+toggle cl_dummy_hammer 1 0" ise tuşu bıraktığın an sayacı sıfırlar (m_DummyFire = 0). Böylece her kısa dokunuşta dummy anında tek bir isabetli çekiç vurur (yalnız 0,5 sn’den uzun basılı tutarsan 0,5 sn arayla tekrarlar). Bunun yanına 1:1 kısa hook (Pseudofly) eklendiğinde iki tee birbirine çarpmadan yerçekimini dengeler.',
    dummyBotNote:
      'Gerçekçi not: İnsan oyuncuların havada kalışında her zaman çok hafif ritmik sekme olur. Hilesiz sunucularda tee’nin tek piksel dahi kıpırdamadan robotik biçimde donup kaldığını görüyorsan, bu genellikle kısıtlamasız topluluk sunucularında kullanılan üçüncü parti bot/istemci eklentileridir (resmî DDNet sunucularında yasaktır).',

    step0Title: 'Adım 0 — Başlamadan Önceki Tek Zorunlu Ayar (Çakışmasız Tuş Sözü)',
    step0Intro:
      'Önce Esc → Dummy bağla ile dummy’ni çıkar. Aşağıdaki tüm tuşlar (E, F, G, R, J, N, Z, F6) DDNet’in varsayılan tuşlarıyla çakışmaz — X (Dummy Değiştir), H (Otomatik Hammerfly), S (Hook Çizgisi), C/V (/rank, /info), Q (/spec), P (/pause) olduğu gibi kalır.',
    restoreWeaponTitle: 'Dummy çekiç kilidi (F1 konsoluna 1 kez yapıştır & Enter)',
    restoreWeaponDesc:
      'Varsayılan değeri 1’dir; dummy elinde tabanca/lazer varken hammerfly açtığında 1 vuruştan sonra sürekli silaha geri döner ve ritmi bozar. 0 yaptığında dummy çekiçte kilitli kalır (settings_ddnet.cfg içine otomatik kaydolur). Sadece dummy’den self-laser/shotgun atacağında tekrar 1 yap.',

    methodsTitle: 'Adım 1 — Sana En Uygun Kurulumu Seç (Yalnızca 1 Tanesini Kur)',
    recBadge: 'Önerilen · En Basit',
    cfgBadge: 'Pro Standart · 1 Dosya',
    pseudoBadge: 'Tek Tuş Hook+Hammer · 1 Dosya',
    howToUseLabel: 'Nasıl kullanılır:',
    whereLabel: 'Nereye yazılır:',
    undoLabel: 'Kapatma:',

    m1Title: 'Yöntem 1 — Dosyasız Ayrı Tuşla Manuel Hammer (E Tuşu)',
    m1Steps: [
      'Oyun içinde F1 tuşuna basıp konsolu aç.',
      'Aşağıdaki komutu yapıştırıp Enter’a bas, ardından F1 ile kapat. (Başparmağa almak istersen e yerine mouse4 veya mouse5 yazabilirsin.)',
    ],
    m1Where: 'F1 konsolu — ayar dosyası oluşturman gerekmez, tek satırdır ve kalıcı kaydolur.',
    m1Use:
      'Sağ tıkla (Mouse2) dummy’ni yakala; çekici dummy’ye vurdurmak istediğin her an E’ye kısa dokun-bırak. Sol tık (Mouse1) tamamen normal ateş olarak kalır.',
    m1Undo: 'Sadece E’ye basmayı bırakman yeter; istersen F1’den unbind e yazarak kaldırabilirsin.',

    m2Title: 'Yöntem 2 — 1 Dosyalı Deepfly (Sol Tık Mouse1 + F ile Aç/Kapa)',
    m2Steps: [
      'DDNet → Ayarlar → Genel → Dizini Aç (Open Directory) butonuna bas. (Dikkat: maps/ klasörüne değil, doğrudan settings_ddnet.cfg dosyasının yanındaki ana dizine gir.)',
      'Burada deepfly.cfg adında yeni bir metin dosyası oluştur, aşağıdaki tek satırlık kodu yapıştırıp kaydet.',
      'Oyun içinde F1’e basıp sadece 1 kere exec deepfly.cfg yaz ve Enter’a bas.',
    ],
    m2Where: 'Ana config klasörü (deepfly.cfg) + 1 kez F1’de exec deepfly.cfg.',
    m2Use:
      'F tuşuna bastığında konsolda yeşil "Deep Fly ON" yazar ve her Mouse1 tıklaman hem ateş eder hem dummy’ye anlık çekiç vurdurur (deep freeze’deki dummy’de bile çalışır; harita yapımcısı sv_deepfly 0 ile engellemediyse).',
    m2Undo:
      'F tuşuna tekrar bas → kırmızı "Deep Fly OFF" yazar, Mouse1 normale (+fire) döner ve cl_dummy_hammer 0 sıfırlanır.',
    m2NoFileTitle: 'Dosya açmak istemiyorsan 0 dosyalı F1 alternatifi (F = Aç, G = Kapa)',
    m2NoFileDesc:
      'Bu iki satırı tek tek F1 konsoluna kopyalayıp Enter’a bas; dosya gerekmeden F ile açıp G ile kapatabilirsin.',

    m3Title: 'Yöntem 3 — Tek Tuşla Pseudofly / Havada Asılı Kalma (Mouse2 + R Aç/Kapa)',
    m3Steps: [
      'Aynı ana dizine (settings_ddnet.cfg yanına) pseudofly.cfg adında bir dosya oluştur ve aşağıdaki tek satırı kaydedin.',
      'Oyun içinde F1’e basıp 1 kere exec pseudofly.cfg yaz ve Enter’a bas.',
    ],
    m3Where: 'Ana config klasörü (pseudofly.cfg) + 1 kez F1’de exec pseudofly.cfg.',
    m3Use:
      'R tuşuyla Pseudofly’ı aç. Artık her Mouse2 (sağ tık) tıklaman hem hook atar hem dummy çekicini tetikler — 1:1 kısa hook + çekiç ritmiyle tek tuştan havada asılı kalabilirsin.',
    m3Undo: 'Normal hook’a dönmek için R tuşuna tekrar bas (veya acil durum için F6).',

    playTitle: 'Adım 2 — Oyunda Nasıl Uygulanır? (5 Adımda Stabil Havada Kalma)',
    playSteps: [
      'Hizala & Strong Hook avantajını bil: Düz duvarda veya zıplayıp dummy’nin üstüne geçerek hizalan. Ana tee’n sunucuya dummy’den önce girdiği için dummy üzerinde varsayılan olarak Strong Hook’a sahipsindir; bu da hook ile çekerken ve düşüşü frenlerken tam kontrol verir.',
      '1:1 Pseudofly ritmini kur: Klasik hammerfly’da her 2 çekiçte bir uzun hook atılır. Havada durmak veya iğne deliğinden geçmek için her 1 çekiçte bir çok kısa hook (Mouse2) at ve iki tee birbirine çarpmadan bırak.',
      'Aynı noktada asılı kalma vs yükselme: Kısa hook süresi + biraz daha seyrek vuruş düşüş hızını tam sıfırlayıp iki tee’yi havada asılı tutar; hook’u biraz uzatıp vuruş aralığını sıklaştırdığında yükselmeye veya yatay hızlanmaya başlarsın.',
      'Havada frenleme & tavan altı (Kinta): Çift zıplaman (double jump) yokken aşağı kontrollü inmek için çekici kesip arka arkaya kısa hooklarla tee’leri hafifçe çarpıştır. Alçak tavan altında yatay giderken her vuruştan hemen sonra A/D ile kısa dokunuşlar yap.',
      'Yön tuşunu basılı tutma: Havada asılı kalırken A/D’yi uzun basılı tutmak dengeyi bozar; yönü sadece vuruş anlarından sonra minik dokunuşlarla düzelt.',
    ],

    extrasTitle: 'Adım 3 — Ekstra Stabilite, Kritik Uyarılar ve Geri Alma',
    resetTitle: 'Acil Durum Sıfırlama Tuşu (F6 — Kesinlikle Önerilir)',
    resetDesc:
      'Mouse1/Mouse2 takılı kalırsa, deepfly açıkken yanlışlıkla çıkacak olursan veya dummy garip davranırsa F6 tuşuna bas: Mouse1/Mouse2’yi normale döndürür ve tüm dummy ayarlarını temizler.',
    copyTitle: 'Dummy Hareket Aynalama (J Tuşu — Aç / Kapat)',
    copyWarn:
      'Kritik Uyarı: cl_dummy_copy_moves 1 açıkken dummy yalnız A/D yönünü değil; hook, zıplama, nişan ve ateşini de birebir kopyalar. Bu yüzden havada asılı kalırken sürekli açık bırakma — yalnızca uzun yatay geçişlerde veya tırmanışta anlık açıp kapat. (cl_dummy_control 1 hook/ateş kopyalamayı ayırır ama resmî DDNet Wiki bu ayarın dummy çekiç vuruşlarını kaçırmasına yol açabildiğini belirtir.)',
    switchResetTitle: 'Tee Değiştirince Basılı Tuş Sıfırlama (N Tuşu)',
    switchResetDesc:
      'X ile dummy’ye geçerken basılı kalan yön/hook tuşlarının kilitlenmesini yönetir (0 = kapalı, 1 = dummy tuşlarını sıfırla). Duvar hooku tutarken tee değiştireceksen kapalı (0) tutmak düşmeni önler.',
    aimTitle: '45° Hassas Nişan Kilidi (Z Tuşu — İsteğe Bağlı)',
    aimDesc:
      'Z basılıyken nişanı tam 45° açılara kilitler. Önceden farklı cl_mouse_max_distance (varsayılan 400) veya inp_mousesens (varsayılan 200) kullanıyorsan komuttaki 400 ve 200 sayılarını kendi değerlerinle değiştir (mevcut değerini görmek için F1’e sadece komut adını yaz).',
    undoTitle: 'Kalıcılık & Kaldırma Notu',
    undoDesc:
      'DDNet oyundan çıkarken tüm bind’lerini settings_ddnet.cfg içine otomatik kaydeder. Deepfly/Pseudofly açıkken oyundan çıkarsan sonraki açılışta F6’ya bas veya kaldırdığın tuş için aşağıdaki gibi unbind kullan:',

    wikiRefsLabel: 'Doğrulanan Resmî Kaynaklar:',
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

    // Dummy Fly & Hover Tab
    dummyTitle: 'How players stay ultra-stable and hover still mid-air with Dummy Fly',
    dummyCalloutTitle: 'Real Engine Logic: Instant Reset + On-Demand Hits + 1:1 Pseudofly Rhythm',
    dummyCalloutBody:
      'DDNet runs at 50 ticks/sec. While the default H key (toggle cl_dummy_hammer 0 1) is ON, your dummy fires on a fixed 25-tick timer (once every 0.50 s) aimed at your tee—making it hard to brake or hover. With "+toggle cl_dummy_hammer 1 0", releasing the key immediately resets the internal counter (m_DummyFire = 0). Short taps trigger one instant, auto-aimed hit whenever you want (holding >0.50 s repeats every 0.50 s). Paired with 1:1 short hook timing (Pseudofly), you cancel gravity cleanly in mid-air.',
    dummyBotNote:
      'Honest note: Legitimate players always have tiny rhythmic micro-bounces. If you see a tee frozen completely motionless on a single pixel in an unrestricted community server, that is typically a third-party bot or modified client (strictly prohibited on official DDNet servers).',

    step0Title: 'Step 0 — One Required Setting First (Zero Key Conflicts)',
    step0Intro:
      'Spawn your dummy first via Esc → Connect Dummy. All binds below use free keys (E, F, G, R, J, N, Z, F6) and leave DDNet defaults intact: X (Switch Dummy), H (Auto Hammerfly), S (Hookline), C/V (/rank, /info), Q (/spec), P (/pause).',
    restoreWeaponTitle: 'Lock dummy on hammer (Paste once in F1 console & press Enter)',
    restoreWeaponDesc:
      'Default is 1: if your dummy held pistol/shotgun/laser before swinging, it flips back to that weapon after 1 hit and ruins your rhythm. Setting 0 keeps it locked on Hammer (saved automatically to settings_ddnet.cfg). Set back to 1 only for dummy self-laser or shotgun shots.',

    methodsTitle: 'Step 1 — Pick ONE Setup Below (Only Install One)',
    recBadge: 'Recommended · Simplest',
    cfgBadge: 'Pro Standard · 1 File',
    pseudoBadge: '1-Button Hover · 1 File',
    howToUseLabel: 'How to use:',
    whereLabel: 'Where it goes:',
    undoLabel: 'Turn off / undo:',

    m1Title: 'Option 1 — Zero-File Dedicated Key (E Key Manual Hammer)',
    m1Steps: [
      'Press F1 in-game to open the local console.',
      'Paste this single line, press Enter, then press F1 to close. (Swap e for mouse4 or mouse5 if you prefer a side mouse button.)',
    ],
    m1Where: 'F1 console only — no .cfg files needed; DDNet saves it automatically.',
    m1Use:
      'Hook your dummy with Mouse2 (+hook) and tap E once for every hit you want when hovering or pacing 1:1 Pseudofly. Mouse1 stays untouched for normal firing.',
    m1Undo: 'Just stop pressing E—or run unbind e in F1 to remove it completely.',

    m2Title: 'Option 2 — 1-File Deepfly Toggle (Mouse1 Fire+Hammer, F Toggles ON/OFF)',
    m2Steps: [
      'Open DDNet → Settings → General → Open Directory (important: stay in the config root beside settings_ddnet.cfg, NOT inside maps/).',
      'Create a text file named deepfly.cfg, paste the single line below, and save.',
      'Press F1 in-game and run exec deepfly.cfg once.',
    ],
    m2Where: 'Config root folder (deepfly.cfg) + run exec deepfly.cfg once in F1.',
    m2Use:
      'Press F to toggle Deep Fly ON (prints green "Deep Fly ON" in console): every Mouse1 click fires your weapon AND triggers an instant dummy hammer toward you (also works on deep-frozen tees unless blocked by sv_deepfly 0).',
    m2Undo:
      'Press F again (red "Deep Fly OFF"): restores normal Mouse1 (+fire) and clears cl_dummy_hammer 0.',
    m2NoFileTitle: 'Zero-file F1 alternative (F = ON, G = OFF)',
    m2NoFileDesc:
      'Paste each line into F1 and press Enter if you do not want to create any .cfg file.',

    m3Title: 'Option 3 — Single-Button Pseudofly / Hover (Mouse2 Hook+Hammer, R Toggle)',
    m3Steps: [
      'In that same config root folder (beside settings_ddnet.cfg), create pseudofly.cfg with the single line below.',
      'Press F1 in-game and run exec pseudofly.cfg once.',
    ],
    m3Where: 'Config root folder (pseudofly.cfg) + run exec pseudofly.cfg once in F1.',
    m3Use:
      'Press R to enable Pseudofly. Now Mouse2 (right click) both hooks AND fires a dummy hammer hit—great for 1-button 1:1 hover pacing.',
    m3Undo: 'Press R again to restore plain +hook (or press F6 anytime).',

    playTitle: 'Step 2 — How to Hover & Fly Stably In-Game (5 Steps)',
    playSteps: [
      'Line up & use Strong Hook: Stack against a wall or jump over your dummy. Because your main tee connects before your dummy, you have Strong Hook on your dummy by default—giving tighter pull and braking control.',
      'Use 1:1 Pseudofly timing: Standard hammerfly hooks once every two hammers. To hover or navigate tight gaps, hook briefly (Mouse2) once per hammer (1:1), releasing before the tees bump so hammer never hits cooldown on contact.',
      'Hovering still vs climbing: Very short hook pulls + spaced hammer clicks cleanly cancel fall speed so both tees float near one spot; slightly longer hooks + faster taps climb or build speed.',
      'Drop brake & low-ceiling Kinta: Without double-jump, stop hammering and repeatedly tap Mouse2 to bump together gently downward. Under low ceilings (Kinta), tap A/D right after each hit in tiny bursts.',
      'Do not hold A/D down continuously while hovering: Always micro-tap right after each hammer impulse to correct horizontal drift.',
    ],

    extrasTitle: 'Step 3 — Safety Reset, Warnings & Unbinding',
    resetTitle: 'Emergency Reset Key (F6 — Strongly Recommended)',
    resetDesc:
      'If Mouse1/Mouse2 ever gets stuck or you quit while Deepfly/Pseudofly was toggled ON, press F6: immediately restores +fire/+hook and resets all dummy states cleanly.',
    copyTitle: 'Dummy Copy Moves (J Key Toggle)',
    copyWarn:
      'Important Caveat: When cl_dummy_copy_moves 1 is ON, the dummy mirrors ALL inputs (hook, jump, aim, fire, left/right)—not just A/D! Keep it OFF while hovering, and only toggle briefly during long horizontal glides. (cl_dummy_control 1 separates hook/jump/fire, though the official DDNet Wiki warns it makes dummy hammer miss occasionally.)',
    switchResetTitle: 'Reset Keys When Switching Tees (N Key Toggle)',
    switchResetDesc:
      'Controls whether held inputs clear when pressing X to switch tees (0 = off, 1 = reset dummy). Keep OFF (0) when holding a wall hook before switching so your tee does not let go.',
    aimTitle: '45° Precision Aim Lock (Z Key — Optional)',
    aimDesc:
      'Locks aim to 45° increments while held. If you customized cl_mouse_max_distance (default 400) or inp_mousesens (default 200), check your values in F1 first and replace 400/200.',
    undoTitle: 'Saving & Removing Binds',
    undoDesc:
      'DDNet automatically saves binds to settings_ddnet.cfg on exit. Always press F6 before quitting if Deepfly/Pseudofly is toggled ON, or remove a bind cleanly with unbind:',

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
      <p class="guide-lead">${escapeHtml(c.step0Intro)}</p>
      ${renderCopyCard(c.restoreWeaponTitle, c.restoreWeaponDesc, 'set_restore_weapon', GUIDE_SNIPPETS.set_restore_weapon, lang, icons)}
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.terminal(15)}
        <h3>${escapeHtml(c.methodsTitle)}</h3>
      </div>

      <article class="guide-method-card guide-method-rec" data-guide-method="manual">
        <div class="guide-method-head">
          <h4>${escapeHtml(c.m1Title)}</h4>
          <span class="guide-badge guide-badge-rec">${escapeHtml(c.recBadge)}</span>
        </div>
        <ol class="guide-steps">
          ${c.m1Steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
        </ol>
        ${renderSnippetBox('F1 Console (E Key / mouse4)', 'bind_manual_key', GUIDE_SNIPPETS.bind_manual_key, lang, icons)}
        <div class="guide-kv-list">
          <div class="guide-kv"><strong>${escapeHtml(c.whereLabel)}</strong> <span>${escapeHtml(c.m1Where)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.howToUseLabel)}</strong> <span>${escapeHtml(c.m1Use)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.undoLabel)}</strong> <span>${escapeHtml(c.m1Undo)}</span></div>
        </div>
      </article>

      <article class="guide-method-card" data-guide-method="deepfly">
        <div class="guide-method-head">
          <h4>${escapeHtml(c.m2Title)}</h4>
          <span class="guide-badge">${escapeHtml(c.cfgBadge)}</span>
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
        <div class="guide-sub-block">
          <div class="guide-sub-title">${escapeHtml(c.m2NoFileTitle)}</div>
          <p class="guide-lead">${escapeHtml(c.m2NoFileDesc)}</p>
          ${renderSnippetBox('F1: F = Deep Fly ON', 'bind_deepfly_f1_on', GUIDE_SNIPPETS.bind_deepfly_f1_on, lang, icons)}
          ${renderSnippetBox('F1: G = Deep Fly OFF', 'bind_deepfly_f1_off', GUIDE_SNIPPETS.bind_deepfly_f1_off, lang, icons)}
        </div>
      </article>

      <article class="guide-method-card" data-guide-method="pseudofly">
        <div class="guide-method-head">
          <h4>${escapeHtml(c.m3Title)}</h4>
          <span class="guide-badge">${escapeHtml(c.pseudoBadge)}</span>
        </div>
        <ol class="guide-steps">
          ${c.m3Steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
        </ol>
        ${renderSnippetBox('pseudofly.cfg (1 Line)', 'cfg_pseudofly_1file', GUIDE_SNIPPETS.cfg_pseudofly_1file, lang, icons)}
        ${renderSnippetBox('F1 Console (Run 1x)', 'exec_pseudofly', GUIDE_SNIPPETS.exec_pseudofly, lang, icons)}
        <div class="guide-kv-list">
          <div class="guide-kv"><strong>${escapeHtml(c.whereLabel)}</strong> <span>${escapeHtml(c.m3Where)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.howToUseLabel)}</strong> <span>${escapeHtml(c.m3Use)}</span></div>
          <div class="guide-kv"><strong>${escapeHtml(c.undoLabel)}</strong> <span>${escapeHtml(c.m3Undo)}</span></div>
        </div>
      </article>
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.gamepad(15)}
        <h3>${escapeHtml(c.playTitle)}</h3>
      </div>
      <ol class="guide-steps">
        ${c.playSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </section>

    <section class="guide-section">
      <div class="guide-section-head">
        ${icons.shield(15)}
        <h3>${escapeHtml(c.extrasTitle)}</h3>
      </div>
      ${renderCopyCard(c.resetTitle, c.resetDesc, 'bind_emergency_reset', GUIDE_SNIPPETS.bind_emergency_reset, lang, icons)}
      <div class="guide-warn">${escapeHtml(c.copyWarn)}</div>
      ${renderCopyCard(c.copyTitle, '', 'bind_copy_moves', GUIDE_SNIPPETS.bind_copy_moves, lang, icons)}
      ${renderCopyCard(c.switchResetTitle, c.switchResetDesc, 'bind_reset_on_switch', GUIDE_SNIPPETS.bind_reset_on_switch, lang, icons)}
      ${renderCopyCard(c.aimTitle, c.aimDesc, 'bind_45deg', GUIDE_SNIPPETS.bind_45deg, lang, icons)}
      ${renderCopyCard(c.undoTitle, c.undoDesc, 'cmd_unbind_example', GUIDE_SNIPPETS.cmd_unbind_example, lang, icons)}
    </section>

    <div class="guide-links">
      <span class="muted">${escapeHtml(c.wikiRefsLabel)}</span>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Dummy" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Dummy Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Pseudofly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Pseudofly Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Hammerfly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Hammerfly Wiki</span></a>
      <a class="btn btn-sm" href="https://wiki.ddnet.org/wiki/Binds#Deep_Fly" target="_blank" rel="noopener noreferrer">${icons.externalLink(12)}<span>Deep Fly Binds</span></a>
    </div>
  `;
}
