/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   DATA / TOURNAMENTS — plantillas del circuito competitivo
   ------------------------------------------------------------
   prestige 1-10 determina premio, reputación y peso en el rating.
   El acceso NO es automático: cada plantilla exige un tier mínimo
   y, en los eventos grandes, superar un clasificatorio.
   ============================================================ */
(function (DCS) {
  'use strict';

  /* Reparto del bote por posición final (índice = puesto-1) */
  var PRIZE_SPLIT = [0.30, 0.175, 0.115, 0.08, 0.055, 0.055, 0.035, 0.035, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01];

  /* Porcentaje del premio del equipo que llega al jugador */
  var PLAYER_PRIZE_SHARE = 0.18;

  var TEMPLATES = {
    /* ---------------- TIER 3 ---------------- */
    t3_league: {
      id: 't3_league', kind: 'league', label: 'Liga regional División 2',
      prestige: 2, tier: 3, field: 8, groupSeries: 7, format: 'bo3',
      playoff: 2, playoffFormat: 'bo3', prize: 25000, regional: true, always: true,
      logo: null
    },
    t3_open: {
      id: 't3_open', kind: 'qualifier', label: 'Open qualifier',
      prestige: 2, tier: 3, field: 16, groupSeries: 2, format: 'bo1',
      playoff: 3, playoffFormat: 'bo3', prize: 12000, regional: true, chance: 0.75,
      logo: null
    },
    t3_online: {
      id: 't3_online', kind: 'tournament', label: 'Copa online',
      prestige: 3, tier: 3, field: 8, groupSeries: 3, format: 'bo1',
      playoff: 3, playoffFormat: 'bo3', prize: 40000, regional: true, chance: 0.5,
      logo: null
    },

    /* ---------------- TIER 2 ---------------- */
    t2_league: {
      id: 't2_league', kind: 'league', label: 'Liga regional División 1',
      prestige: 4, tier: 2, field: 8, groupSeries: 7, format: 'bo3',
      playoff: 2, playoffFormat: 'bo3', prize: 90000, regional: true, always: true,
      logo: null
    },
    t2_qual: {
      id: 't2_qual', kind: 'qualifier', label: 'Clasificatorio regional',
      prestige: 4, tier: 2, field: 12, groupSeries: 2, format: 'bo3',
      playoff: 3, playoffFormat: 'bo3', prize: 0, regional: true, chance: 0.85,
      logo: null
    },
    t2_intl: {
      id: 't2_intl', kind: 'tournament', label: 'Torneo internacional Tier 2',
      prestige: 6, tier: 2, field: 12, groupSeries: 4, format: 'bo2',
      playoff: 3, playoffFormat: 'bo3', prize: 300000, regional: false, gated: true,
      logo: null
    },

    /* ---------------- TIER 1 · ligas y clasificatorios ---------------- */
    t1_league: {
      id: 't1_league', kind: 'league', label: 'Liga regional División 1',
      prestige: 6, tier: 1, field: 8, groupSeries: 7, format: 'bo3',
      playoff: 2, playoffFormat: 'bo3', prize: 200000, regional: true, always: true,
      logo: null
    },
    /* Plantillas antiguas: partidas guardadas pueden seguir apuntándolas. */
    t1_major: {
      id: 't1_major', kind: 'international', label: 'Major',
      prestige: 8, tier: 1, field: 16, groupSeries: 5, format: 'bo2',
      playoff: 4, playoffFormat: 'bo3', prize: 1200000, regional: false, gated: true,
      logo: null
    },
    t1_elite: {
      id: 't1_elite', kind: 'elite', label: 'Invitational de élite',
      prestige: 9, tier: 1, field: 12, groupSeries: 4, format: 'bo2',
      playoff: 3, playoffFormat: 'bo3', prize: 900000, regional: false, gated: true, invite: true,
      logo: null
    },
    ti_qual: {
      id: 'ti_qual', kind: 'qualifier', label: 'Clasificatorio a The International',
      prestige: 7, tier: 2, field: 12, groupSeries: 3, format: 'bo3',
      playoff: 3, playoffFormat: 'bo3', prize: 0, regional: true,
      strongField: true, cutBonus: 0.10,
      logo: null
    },

    /* ---------------- Circuito internacional (series reales) ----------------
       Premio, field y formatos se reutilizan de t1_major / t1_elite / ti.
       logo queda preparado; no se inventa arte. */
    pgl_wallachia: {
      id: 'pgl_wallachia', series: 'pgl_wallachia', kind: 'international',
      label: 'PGL Wallachia',
      prestige: 8, tier: 1, field: 16, groupSeries: 5, format: 'bo2',
      playoff: 4, playoffFormat: 'bo3', prize: 1200000, regional: false, gated: true,
      logo: null
    },
    blast_slam: {
      id: 'blast_slam', series: 'blast_slam', kind: 'elite',
      label: 'BLAST Slam',
      prestige: 9, tier: 1, field: 12, groupSeries: 4, format: 'bo2',
      playoff: 3, playoffFormat: 'bo3', prize: 900000, regional: false, gated: true, invite: true,
      logo: null
    },
    dreamleague: {
      id: 'dreamleague', series: 'dreamleague', kind: 'international',
      label: 'DreamLeague',
      prestige: 8, tier: 1, field: 16, groupSeries: 5, format: 'bo2',
      playoff: 4, playoffFormat: 'bo3', prize: 1200000, regional: false, gated: true,
      logo: null
    },
    epl_masters: {
      id: 'epl_masters', series: 'epl_masters', kind: 'international',
      label: 'EPL Masters II',
      prestige: 8, tier: 1, field: 16, groupSeries: 5, format: 'bo2',
      playoff: 4, playoffFormat: 'bo3', prize: 1200000, regional: false, gated: true,
      logo: null
    },
    ti: {
      id: 'ti', series: 'ti', kind: 'ti', label: 'The International',
      prestige: 10, tier: 1, field: 16, groupSeries: 6, format: 'bo2',
      playoff: 5, playoffFormat: 'bo3', prize: 15000000, regional: false, gated: true,
      logo: null
    }
  };

  /* Series base del circuito. Cada temporada crea una edición (año) sin duplicar la plantilla. */
  var COMPETITIONS = [
    { id: 'pgl_wallachia', name: 'PGL Wallachia', rank: 'international', templateId: 'pgl_wallachia' },
    { id: 'blast_slam', name: 'BLAST Slam', rank: 'international', templateId: 'blast_slam' },
    { id: 'dreamleague', name: 'DreamLeague', rank: 'international', templateId: 'dreamleague' },
    { id: 'epl_masters', name: 'EPL Masters II', rank: 'international', templateId: 'epl_masters' },
    { id: 'ti', name: 'The International', rank: 'ti', templateId: 'ti' }
  ];

  /* Nombres de eventos generados: cabecera + apellido */
  var EVENT_HEADS = ['Ignition', 'Northgate', 'Solaris', 'Ardent', 'Vantage', 'Kingsfall', 'Vermillion',
    'Highwater', 'Ironpeak', 'Lumen', 'Crown', 'Sanctum', 'Aether', 'Redstone', 'Windborne', 'Silverline'];
  var EVENT_TAILS = ['Masters', 'Invitational', 'Championship', 'Series', 'Cup', 'Open', 'Classic', 'Games'];

  /* Etiquetas de resultado según puesto y tipo de torneo */
  function resultLabel(placement, field, template) {
    if (placement === 1) {
      if (template.kind === 'ti') return 'CAMPEÓN DE THE INTERNATIONAL';
      if (template.kind === 'international' || template.kind === 'elite') return 'Campeón internacional';
      if (template.kind === 'qualifier') return 'Clasificado';
      return 'Campeón';
    }
    if (placement === 2) return template.kind === 'qualifier' ? 'Clasificado' : 'Subcampeón';
    if (placement === 3) return '3er puesto';
    if (placement === 4) return '4º puesto';
    if (placement <= 6) return '5º-6º puesto';
    if (placement <= 8) return '7º-8º puesto';
    if (placement <= 12) return '9º-12º puesto';
    return placement + 'º puesto';
  }

  DCS.data = DCS.data || {};
  DCS.data.TOURNAMENT_TEMPLATES = TEMPLATES;
  DCS.data.COMPETITIONS = COMPETITIONS;
  DCS.data.PRIZE_SPLIT = PRIZE_SPLIT;
  DCS.data.PLAYER_PRIZE_SHARE = PLAYER_PRIZE_SHARE;
  DCS.data.EVENT_HEADS = EVENT_HEADS;
  DCS.data.EVENT_TAILS = EVENT_TAILS;
  DCS.data.resultLabel = resultLabel;
})(window.DCS = window.DCS || {});
