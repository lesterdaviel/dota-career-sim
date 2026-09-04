/* ============================================================
   DATA / TEAMS — catálogo cerrado de organizaciones
   ------------------------------------------------------------
   Solo los equipos entregados por el usuario (logos + fichas).
   El tier del catálogo es el de partida de una carrera nueva.
   Durante la simulación el mundo guarda `baseTier` (inicial) y
   `tier` (actual); este último puede subir o bajar.
   ============================================================ */
(function (DCS) {
  'use strict';

  function t(id, name, region, rating, tier) {
    var strength = Math.round(42 + (rating - 1000) * 50 / 519);
    if (strength < 40) strength = 40;
    if (strength > 95) strength = 95;
    /* En el build de un solo archivo (tools/build-dist.sh) las fotos van
       incrustadas como data URI en DCS.assetsInline, así no dependen de
       que se suba también la carpeta assets/ junto al index.html. En
       desarrollo local (varios ficheros) esa variable no existe y se
       usa la ruta normal, que sí funciona porque assets/ vive al lado. */
    var logo = (DCS.assetsInline && DCS.assetsInline[id]) || ('assets/teams/' + id + '.png');
    return {
      id: id,
      name: name,
      region: region,
      tier: tier,
      rating: rating,
      strength: strength,
      logo: logo
    };
  }

  /* Ratings: se conservan los ya usados en el catálogo. Los tres
     equipos nuevos llevan rating provisional dentro de la banda
     del resto de Tier 2 (aprox. 1018–1074). */
  var TEAMS = [
    /* --- Tier 1 --- */
    t('team-vision', 'TEAM VISION', 'eeu', 1519, 1),
    t('team-spirit', 'Team Spirit', 'eeu', 1445, 1),
    t('team-yandex', 'Team Yandex', 'eeu', 1333, 1),
    t('boomboys', 'BoomBoys', 'eeu', 1309, 1),
    t('iron-wing', 'Iron Wing', 'eeu', 1297, 1),
    t('team-liquid', 'Team Liquid', 'weu', 1276, 1),
    t('aurora-gaming', 'Aurora Gaming', 'eeu', 1256, 1),
    t('team-falcons', 'Team Falcons', 'weu', 1223, 1),
    t('lgd-gaming', 'LGD Gaming', 'sa', 1209, 1),
    t('nigma-galaxy', 'Nigma Galaxy', 'weu', 1191, 1),
    t('vici-gaming', 'Vici Gaming', 'cn', 1176, 1),
    t('playtime', 'PlayTime', 'sa', 1131, 1),
    t('xtreme-gaming', 'Xtreme Gaming', 'cn', 1091, 1),
    t('natus-vincere', 'Natus Vincere', 'eeu', 1083, 1),
    t('og', 'OG', 'sea', 1059, 1),

    /* --- Tier 2 --- */
    t('gamerlegion', 'GamerLegion', 'na', 1074, 2),
    t('team-resilience', 'Team Resilience', 'cn', 1059, 2),
    t('virtus-pro', 'Virtus.pro', 'eeu', 1046, 2),
    t('power-rangers', 'Power Rangers', 'eeu', 1042, 2),
    t('1win', '1Win', 'eeu', 1038, 2),              /* rating provisional */
    t('team-nemesis', 'Team Nemesis', 'sea', 1035, 2), /* rating provisional */
    t('yakult-brothers', 'Yakult Brothers', 'cn', 1033, 2),
    t('huligani', 'Huligani', 'eeu', 1028, 2),        /* rating provisional */
    t('yellow-submarine', 'Yellow Submarine', 'eeu', 1023, 2),
    t('mouz', 'MOUZ', 'weu', 1018, 2),
    t('amaru-gaming', 'Amaru Gaming', 'sa', 1026, 2),

    /* --- Tier 3 --- */
    t('rune-eaters-esports', 'Rune Eaters Esports', 'weu', 1046, 3),
    t('level-up', 'Level UP', 'weu', 1036, 3),
    t('zero-tenacity', 'Zero Tenacity', 'weu', 1023, 3),
    t('team-lynx', 'Team Lynx', 'eeu', 1015, 3),
    t('spirit-academy', 'Spirit Academy', 'eeu', 1008, 3),
    t('pipsqueak-4', 'Pipsqueak+4', 'weu', 1000, 3),
    t('sar', 'SAR', 'sa', 1000, 3),
    t('estar-backs', 'ESTAR BACKS', 'sa', 1000, 3)
  ];

  var BY_ID = {};
  var BY_NAME = {};
  TEAMS.forEach(function (team) {
    BY_ID[team.id] = team;
    BY_NAME[team.name] = team;
  });
  /* Alias de clubes fusionados: logos/nombres en historiales viejos. */
  BY_ID['oh-yes'] = BY_ID['yellow-submarine'];
  BY_NAME['OH Yes'] = BY_ID['yellow-submarine'];

  function lookup(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return BY_ID[ref] || BY_NAME[ref] || null;
    }
    if (ref.id && BY_ID[ref.id]) return BY_ID[ref.id];
    if (ref.teamId && BY_ID[ref.teamId]) return BY_ID[ref.teamId];
    if (ref.name && BY_NAME[ref.name]) return BY_NAME[ref.name];
    if (ref.teamName && BY_NAME[ref.teamName]) return BY_NAME[ref.teamName];
    return null;
  }

  function logoPath(ref) {
    var cat = lookup(ref);
    if (cat && cat.logo) return cat.logo;
    if (ref && typeof ref === 'object' && ref.logo) return ref.logo;
    if (cat) return 'assets/teams/' + cat.id + '.png';
    return null;
  }

  function catalogTier(ref) {
    var cat = lookup(ref);
    if (cat && typeof cat.tier === 'number') return cat.tier;
    return null;
  }

  /* Tier que ve el mundo ahora: el dinámico del estado, no el del catálogo. */
  function currentTier(ref) {
    if (ref && typeof ref === 'object') {
      if (typeof ref.tier === 'number') return ref.tier;
      if (typeof ref.baseTier === 'number') return ref.baseTier;
    }
    return catalogTier(ref);
  }

  DCS.data = DCS.data || {};
  DCS.data.TEAMS = TEAMS;
  DCS.data.TEAM_BY_ID = BY_ID;
  DCS.data.TEAM_BY_NAME = BY_NAME;
  DCS.data.teamLookup = lookup;
  DCS.data.teamLogo = logoPath;
  DCS.data.teamBaseTier = catalogTier;
  DCS.data.teamTier = currentTier;
})(window.DCS = window.DCS || {});
