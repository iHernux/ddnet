export const TILES_LIST = [
  {
    id: 'DEATH',
    en: {
      name: 'Death',
      desc: 'Kills the tee immediately on contact and restarts from spawn (or teleports back in solo/practice).',
    },
    tr: {
      name: 'Death (Ölüm)',
      desc: 'Değen oyuncuyu anında öldürür ve başlangıç noktasına gönderir.',
    },
  },
  {
    id: 'THROUGH',
    en: {
      name: 'Old Hookthrough',
      desc: 'Lets your hook pass through solid walls and tiles when inside the hookthrough tile.',
    },
    tr: {
      name: 'Old Hookthrough (Eski Kanca Geçişi)',
      desc: 'Kancanın duvarların ve engellerin içinden geçmesini sağlayan klasik hookthrough karesidir.',
    },
  },
  {
    id: 'JUMP',
    en: {
      name: 'Customized Jumps',
      desc: 'Changes the maximum number of mid-air jumps available to the tee inside this zone.',
    },
    tr: {
      name: 'Customized Jumps (Özel Zıplama)',
      desc: 'Oyuncunun havada sahip olduğu ekstra zıplama (double jump) sayısını değiştirir.',
    },
  },
  {
    id: 'DFREEZE',
    en: {
      name: 'Deep Freeze',
      desc: 'Permanently freezes the tee until passing through a Deep Unfreeze tile; normal hammer/unfreeze cannot thaw it.',
    },
    tr: {
      name: 'Deep Freeze (Derin Dondurma)',
      desc: 'Tee\'yi süresiz dondurur; normal hammer veya ısıtma çözmez, yalnızca Deep Unfreeze karesiyle çözülür.',
    },
  },
  {
    id: 'EHOOK_START',
    en: {
      name: 'Endless Hook',
      desc: 'Grants unlimited hook duration so the tee can stay latched indefinitely until End Endless Hook.',
    },
    tr: {
      name: 'Endless Hook (Sonsuz Kanca)',
      desc: 'Kancanın süre sınırını kaldırır; oyuncu kancayı bırakana veya bitiş karesine kadar asılı kalabilir.',
    },
  },
  {
    id: 'HIT_END',
    en: {
      name: 'No Hit',
      desc: 'Disables hitting other tees with hammer, weapons, or hook interactions between players.',
    },
    tr: {
      name: 'No Hit (Temassız)',
      desc: 'Oyuncuların birbirine hammer, silah veya vuruşla etkileşim kurmasını kapatır.',
    },
  },
  {
    id: 'SOLO_START',
    en: {
      name: 'Solo',
      desc: 'Isolates each player into solo mode where teammates cannot collide, hook, or hammer each other.',
    },
    tr: {
      name: 'Solo (Tek Kişilik Bölge)',
      desc: 'Oyuncuyu solo moda alır; bu bölgede takım arkadaşlarıyla çarpışma, kanca ve hammer etkileşimi olmaz.',
    },
  },
  {
    id: 'TELE_GUN',
    en: {
      name: 'Tele Gun',
      desc: 'Turns shotgun/gun shots into teleport beams that warp the shooter to where the bullet hits.',
    },
    tr: {
      name: 'Tele Gun (Işınlanma Silahı)',
      desc: 'Silah atışının çarptığı noktaya oyuncuyu ışınlayan özel mekaniktir.',
    },
  },
  {
    id: 'TELE_GRENADE',
    en: {
      name: 'Tele Grenade',
      desc: 'Teleports the tee to the impact point of their grenade explosion.',
    },
    tr: {
      name: 'Tele Grenade (Işınlanma Bombası)',
      desc: 'Fırlatılan bombanın patladığı noktaya oyuncuyu ışınlar.',
    },
  },
  {
    id: 'TELE_LASER',
    en: {
      name: 'Tele Laser',
      desc: 'Teleports the tee to where their laser rifle beam hits.',
    },
    tr: {
      name: 'Tele Laser (Işınlanma Lazeri)',
      desc: 'Lazer tüfeği ışınının çarptığı noktaya oyuncuyu ışınlar.',
    },
  },
  {
    id: 'NPC_START',
    en: {
      name: 'No Player Collision',
      desc: 'Disables player-to-player body collision so tees pass right through one another.',
    },
    tr: {
      name: 'No Player Collision (Çarpışmasız)',
      desc: 'Oyuncular arası çarpışmayı kapatır; teeler birbirinin içinden geçebilir.',
    },
  },
  {
    id: 'SUPER_START',
    en: {
      name: 'Super Jumps',
      desc: 'Enables unlimited mid-air jumps for the tee until reaching the end tile.',
    },
    tr: {
      name: 'Super Jumps (Süper Zıplama)',
      desc: 'Bitiş karesine kadar havada sınırsız zıplama (multi-jump) imkânı verir.',
    },
  },
  {
    id: 'JETPACK_START',
    en: {
      name: 'Jetpack',
      desc: 'Turns the starter pistol into a jetpack thruster that propels the tee opposite to aim.',
    },
    tr: {
      name: 'Jetpack',
      desc: 'Tabancayı nişan yönünün tersine itiş sağlayan bir jetpack motoruna dönüştürür.',
    },
  },
  {
    id: 'WALLJUMP',
    en: {
      name: 'Walljump',
      desc: 'Refreshes a jump whenever touching a wall with this tile, allowing wall climbs.',
    },
    tr: {
      name: 'Walljump (Duvar Zıplaması)',
      desc: 'Bu kareye sahip duvara temas edildiğinde zıplama hakkını yenileyerek duvardan tırmanmayı sağlar.',
    },
  },
  {
    id: 'NPH_START',
    en: {
      name: 'No Player Hook',
      desc: 'Prevents hooking other tees while still allowing hooking walls and tiles.',
    },
    tr: {
      name: 'No Player Hook (Oyuncu Kancasız)',
      desc: 'Diğer oyuncuları kancalamayı engeller; duvarlara kanca atmaya izin verir.',
    },
  },
  {
    id: 'WEAPON_SHOTGUN',
    en: {
      name: 'Shotgun',
      desc: 'Fires a laser-like beam that pulls hooked/hit teammates toward you (useful for saves and wall-pulling).',
    },
    tr: {
      name: 'Shotgun (Pompalı)',
      desc: 'Vurduğu takım arkadaşını kendine doğru çeken lazer benzeri ışın fırlatır.',
    },
  },
  {
    id: 'WEAPON_GRENADE',
    en: {
      name: 'Grenade',
      desc: 'Launches explosive rockets used for rocket-jumping, boosting teammates, and knocking tees.',
    },
    tr: {
      name: 'Grenade (Bombaatar)',
      desc: 'Roket zıplayışı (rocket jump) ve takım arkadaşını hızlandırmak için kullanılan patlayıcı fırlatır.',
    },
  },
  {
    id: 'POWERUP_NINJA',
    en: {
      name: 'Ninja',
      desc: 'Gives temporary ninja dash ability that slices forward cleanly through the air.',
    },
    tr: {
      name: 'Ninja',
      desc: 'Oyuncuya havada ileri doğru hızlı atılma (dash) sağlayan geçici ninja gücü verir.',
    },
  },
  {
    id: 'WEAPON_RIFLE',
    en: {
      name: 'Rifle',
      desc: 'Laser rifle that unfreezes frozen teammates on hit and bounces off solid walls.',
    },
    tr: {
      name: 'Rifle (Lazer Tüfeği)',
      desc: 'Duvardan sekebilen ve vurduğu donmuş takım arkadaşının buzunu çözen lazer silahıdır.',
    },
  },
  {
    id: 'LASER_STOP',
    en: {
      name: 'Laser Stop',
      desc: 'Blocks shotgun and rifle laser beams completely so lasers cannot pass or bounce through.',
    },
    tr: {
      name: 'Laser Stop (Lazer Durdurucu)',
      desc: 'Pompalı ve lazer tüfeği ışınlarının bu kareden geçmesini veya sekmesini engeller.',
    },
  },
  {
    id: 'CRAZY_SHOTGUN',
    en: {
      name: 'Crazy Shotgun',
      desc: 'Upgrades the shotgun into rapid-fire bouncing bullets that launch tees strongly.',
    },
    tr: {
      name: 'Crazy Shotgun (Çılgın Pompalı)',
      desc: 'Pompalıyı duvarlardan seken ve oyuncuları güçlü iten hızlı atışlı silaha dönüştürür.',
    },
  },
  {
    id: 'DRAGGER',
    en: {
      name: 'Dragger',
      desc: 'Automated laser turret that locks onto nearby tees and pulls them toward itself.',
    },
    tr: {
      name: 'Dragger (Çekici Taret)',
      desc: 'Yakındaki oyuncuya kilitlenip lazerle kendisine doğru çeken otomatik taret.',
    },
  },
  {
    id: 'DOOR',
    en: {
      name: 'Door',
      desc: 'Solid barrier that only opens when a linked Switch or Timed Switch is activated.',
    },
    tr: {
      name: 'Door (Kapı)',
      desc: 'Bağlı olduğu anahtar (Switch) tetiklenene kadar geçişi kapatan kilitli engel.',
    },
  },
  {
    id: 'SWITCH_TIMED',
    en: {
      name: 'Timed Switch',
      desc: 'Activates linked doors, lasers, or mechanisms for a limited countdown duration.',
    },
    tr: {
      name: 'Timed Switch (Zamanlı Anahtar)',
      desc: 'Bağlı kapı veya mekanizmaları belirli bir süre boyunca açık tutan sayaçlı anahtar.',
    },
  },
  {
    id: 'SWITCH',
    en: {
      name: 'Switch',
      desc: 'Permanent switch (toggle or activate/deactivate) controlling linked doors or turrets.',
    },
    tr: {
      name: 'Switch (Anahtar)',
      desc: 'Bağlı kapıları, lazerleri veya taretleri kalıcı olarak açıp kapatan anahtar.',
    },
  },
  {
    id: 'STOP',
    en: {
      name: 'Stopper',
      desc: 'One-way or full directional wall that stops tees from moving past while often letting hooks/weapons through.',
    },
    tr: {
      name: 'Stopper (Tek Yönlü Engel)',
      desc: 'Oyuncunun geçişini belirli yönde veya tamamen durduran ama kanca/silaha izin verebilen engel.',
    },
  },
  {
    id: 'THROUGH_ALL',
    en: {
      name: 'New Hookthrough',
      desc: 'Blocks tee movement while allowing hooks to pass freely through every direction.',
    },
    tr: {
      name: 'New Hookthrough (Yeni Kanca Geçişi)',
      desc: 'Oyuncu geçişini engellerken kancanın her yönden serbestçe geçmesine izin veren blok.',
    },
  },
  {
    id: 'TUNE',
    en: {
      name: 'Tune Zone',
      desc: 'Applies custom map physics inside the zone (e.g. altered gravity, air control, hook strength, or gun speed).',
    },
    tr: {
      name: 'Tune Zone (Özel Fizik Bölgesi)',
      desc: 'Bölge içinde yerçekimi, kanca gücü veya hareket hızı gibi özel fizik kuralları uygular.',
    },
  },
  {
    id: 'OLDLASER',
    en: {
      name: 'Old Laser',
      desc: 'Restores classic Teeworlds/old-school laser physics where shotgun/rifle pulls work differently on frozen tees.',
    },
    tr: {
      name: 'Old Laser (Eski Lazer Fiziği)',
      desc: 'Klasik eski tip lazer ve pompalı çekiş/çözme fiziğini aktif eder.',
    },
  },
  {
    id: 'TELEINEVIL',
    en: {
      name: 'Red Teleport',
      desc: 'Evil teleport that resets player velocity to zero and clears hooked state upon teleporting.',
    },
    tr: {
      name: 'Red Teleport (Kırmızı Işınlayıcı)',
      desc: 'Işınlandığında oyuncunun hızını sıfırlayan ve kanca/silah durumunu kesen ışınlayıcı.',
    },
  },
  {
    id: 'TELEIN',
    en: {
      name: 'Teleport',
      desc: 'Standard blue teleport that moves the tee to the matching exit while preserving momentum.',
    },
    tr: {
      name: 'Teleport (Mavi Işınlayıcı)',
      desc: 'Oyuncunun mevcut hızını koruyarak eşleşen çıkış noktasına ışınlar.',
    },
  },
  {
    id: 'TELECHECK',
    en: {
      name: 'Checkpointed Teleport',
      desc: 'Saves the latest teleport destination checkpoint so touching a checkpointed tele returns you there.',
    },
    tr: {
      name: 'Checkpointed Teleport (Kayıtlı Işınlayıcı)',
      desc: 'En son geçilen kontrol noktasını kaydeder; düşüldüğünde oyuncuyu o noktaya geri ışınlar.',
    },
  },
  {
    id: 'TELEINWEAPON',
    en: {
      name: 'Weapon Teleport',
      desc: 'Teleports weapon projectiles (grenades, lasers, shotgun pellets) from entrance to exit.',
    },
    tr: {
      name: 'Weapon Teleport (Silah Işınlayıcı)',
      desc: 'Oyuncu yerine atılan mermi, bomba veya lazer ışınlarını çıkış noktasına ışınlar.',
    },
  },
  {
    id: 'TELEINHOOK',
    en: {
      name: 'Hook Teleport',
      desc: 'Teleports your hook across matching teleport entrances and exits.',
    },
    tr: {
      name: 'Hook Teleport (Kanca Işınlayıcı)',
      desc: 'Atılan kancanın ışınlayıcıdan geçip diğer taraftan çıkmasını sağlar.',
    },
  },
  {
    id: 'CHECKPOINT_FIRST',
    en: {
      name: 'Time Checkpoint',
      desc: 'Records split times along the course so players can compare their pace against personal or map records.',
    },
    tr: {
      name: 'Time Checkpoint (Süre Kontrol Noktası)',
      desc: 'Parkur üzerindeki ara geçiş sürelerini ölçer; rekorla kıyaslama yapmayı sağlar.',
    },
  },
  {
    id: 'BONUS',
    en: {
      name: 'Time Bonus',
      desc: 'Adds or subtracts bonus seconds from your run timer (e.g. secret shortcuts or time penalties).',
    },
    tr: {
      name: 'Time Bonus (Süre Bonusu)',
      desc: 'Koşu süresine saniye ekler veya gizli bonuslarda süreden düşer.',
    },
  },
  {
    id: 'BOOST',
    en: {
      name: 'Boost',
      desc: 'Accelerates or launches the tee in a set direction with constant speed force.',
    },
    tr: {
      name: 'Boost (Hızlandırıcı)',
      desc: 'Oyuncuyu belirlenen yöne doğru sabit kuvvetle hızlandırır veya fırlatır.',
    },
  },
  {
    id: 'PLASMAF',
    en: {
      name: 'Freezing/Exploding Plasma Turret',
      desc: 'Turret firing plasma orbs that both freeze tees and explode on impact.',
    },
    tr: {
      name: 'Donduran & Patlayan Plazma Tareti',
      desc: 'Çarptığında oyuncuyu dondurup patlama etkisi yaratan plazma topları ateşler.',
    },
  },
  {
    id: 'PLASMAE',
    en: {
      name: 'Exploding Plasma Turret',
      desc: 'Turret firing exploding plasma projectiles that knock tees back without freezing.',
    },
    tr: {
      name: 'Patlayan Plazma Tareti',
      desc: 'Dondurmadan sadece patlama itişiyle oyuncuyu savuran plazma topları fırlatır.',
    },
  },
  {
    id: 'PLASMAU',
    en: {
      name: 'Unfreezing Plasma Turret',
      desc: 'Turret firing plasma orbs that thaw frozen tees on hit.',
    },
    tr: {
      name: 'Çözen Plazma Tareti',
      desc: 'Vurduğu donmuş oyuncunun buzunu çözen plazma topları ateşler.',
    },
  },
];

export const TILES_MAP = new Map(TILES_LIST.map((t) => [t.id, t]));

export const POPULAR_TILE_IDS = [
  'DFREEZE',
  'LASER_STOP',
  'OLDLASER',
  'WALLJUMP',
  'JETPACK_START',
  'POWERUP_NINJA',
  'EHOOK_START',
  'TELE_GUN',
  'CRAZY_SHOTGUN',
  'DRAGGER',
  'PLASMAF',
  'SOLO_START',
];

export function normalizeTileId(raw) {
  const key = String(raw || '').trim().toUpperCase();
  return TILES_MAP.has(key) ? key : '';
}

export function getTileInfo(tileId, lang = 'en') {
  const key = String(tileId || '').trim();
  const entry = TILES_MAP.get(key) || TILES_MAP.get(key.toUpperCase());
  const l = lang === 'tr' ? 'tr' : 'en';
  const iconUrl = `https://ddnet.org/tiles/${encodeURIComponent(key)}.png`;
  if (!entry) {
    const pretty = key.replace(/_/g, ' ');
    return {
      id: key,
      name: pretty || key,
      desc: '',
      iconUrl,
    };
  }
  const copy = entry[l] || entry.en;
  return {
    id: entry.id,
    name: copy.name,
    desc: copy.desc,
    iconUrl,
  };
}
