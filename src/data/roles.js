/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   DATA / ROLES — definición de las 5 posiciones
   ------------------------------------------------------------
   Cada rol define:
   - weights     : pesos de atributos para la valoración general
   - growthBias  : qué atributos progresan más rápido en ese rol
   - statModel   : generación de la línea estadística por mapa
   - ratingSpec  : criterios (distintos por rol) del rating 0-100
   - display     : qué se muestra al usuario y cómo
   Un Carry y un Hard Support NO se evalúan con los mismos datos.
   ============================================================ */
(function (DCS) {
  'use strict';

  /* statModel: value = gauss(base * (1 + slope*f) + win*signo, sd)
     f = factor de nivel del jugador, aprox [-1.2, +1.4]
     Claves con "abs" usan escala absoluta: base + abs*f            */

  var ROLES = {
    carry: {
      id: 'carry', pos: 1, name: 'Carry', short: 'POS 1', label: 'Posición 1',
      desc: 'Farmea, escala y cierra las partidas en el late game.',
      weights: { mech: 0.26, sense: 0.16, pool: 0.12, cons: 0.16, ment: 0.08, team: 0.10, adapt: 0.08, lead: 0.04 },
      growthBias: { mech: 1.20, sense: 0.95, pool: 1.00, cons: 1.05, ment: 0.95, team: 0.90, adapt: 0.95, lead: 0.80 },
      impact: 0.28,
      statModel: {
        kills: { base: 8.4, slope: 0.42, sd: 3.1, win: 2.3, min: 0 },
        deaths: { base: 4.8, slope: -0.34, sd: 1.9, win: -1.3, min: 0 },
        assists: { base: 9.4, slope: 0.20, sd: 3.4, win: 2.0, min: 0 },
        gpm: { base: 598, slope: 0.28, sd: 68, win: 52, min: 180 },
        xpm: { base: 655, slope: 0.27, sd: 74, win: 58, min: 200 },
        lastHits: { base: 372, slope: 0.29, sd: 66, win: 28, min: 60 },
        heroDamage: { base: 24200, slope: 0.44, sd: 5800, win: 3600, min: 2000 },
        towerDamage: { base: 6400, slope: 0.48, sd: 2900, win: 2600, min: 100 },
        netWorth: { base: 25800, slope: 0.30, sd: 4900, win: 3400, min: 4000 },
        killPart: { base: 0.62, slope: 0.13, sd: 0.075, win: 0.04, min: 0.15, max: 0.98 }
      },
      ratingSpec: [
        { key: 'kda', w: 0.17, low: 2.2, high: 7.5 },
        { key: 'gpm', w: 0.18, low: 470, high: 720 },
        { key: 'lastHits', w: 0.09, low: 270, high: 470 },
        { key: 'netWorth', w: 0.10, low: 19000, high: 33000 },
        { key: 'heroDamage', w: 0.15, low: 16000, high: 34000 },
        { key: 'towerDamage', w: 0.09, low: 2500, high: 11000 },
        { key: 'deaths', w: 0.12, low: 7.0, high: 2.6 },
        { key: 'killPart', w: 0.10, low: 0.48, high: 0.80 }
      ],
      display: [
        { key: 'kda', label: 'KDA', fmt: 'dec2' },
        { key: 'kills', label: 'Kills', fmt: 'dec1' },
        { key: 'deaths', label: 'Deaths', fmt: 'dec1' },
        { key: 'assists', label: 'Assists', fmt: 'dec1' },
        { key: 'gpm', label: 'GPM', fmt: 'int' },
        { key: 'xpm', label: 'XPM', fmt: 'int' },
        { key: 'lastHits', label: 'Last hits', fmt: 'int' },
        { key: 'netWorth', label: 'Net worth', fmt: 'int' },
        { key: 'heroDamage', label: 'Daño a héroes', fmt: 'int' },
        { key: 'towerDamage', label: 'Daño a edificios', fmt: 'int' },
        { key: 'killPart', label: 'Part. en kills', fmt: 'pct' }
      ]
    },

    mid: {
      id: 'mid', pos: 2, name: 'Mid', short: 'POS 2', label: 'Posición 2',
      desc: 'Gana la calle central y dicta el ritmo del early game.',
      weights: { mech: 0.28, sense: 0.20, pool: 0.14, cons: 0.12, ment: 0.08, team: 0.08, adapt: 0.08, lead: 0.02 },
      growthBias: { mech: 1.22, sense: 1.05, pool: 1.10, cons: 0.95, ment: 0.95, team: 0.85, adapt: 1.00, lead: 0.80 },
      impact: 0.29,
      statModel: {
        kills: { base: 9.6, slope: 0.46, sd: 3.3, win: 2.4, min: 0 },
        deaths: { base: 4.9, slope: -0.30, sd: 1.9, win: -1.2, min: 0 },
        assists: { base: 11.0, slope: 0.22, sd: 3.7, win: 2.2, min: 0 },
        gpm: { base: 588, slope: 0.29, sd: 66, win: 50, min: 180 },
        xpm: { base: 702, slope: 0.30, sd: 78, win: 62, min: 220 },
        lastHits: { base: 328, slope: 0.26, sd: 62, win: 24, min: 50 },
        heroDamage: { base: 27300, slope: 0.45, sd: 6400, win: 3900, min: 2500 },
        runes: { base: 7.4, slope: 0.30, sd: 2.3, win: 0.8, min: 0 },
        laneAdv: { base: 0, abs: 13, sd: 17, win: 6, min: -70, max: 75 },
        earlyImpact: { base: 50, abs: 24, sd: 11, win: 5, min: 2, max: 99 },
        killPart: { base: 0.68, slope: 0.11, sd: 0.07, win: 0.04, min: 0.2, max: 0.98 }
      },
      ratingSpec: [
        { key: 'kda', w: 0.15, low: 2.4, high: 7.5 },
        { key: 'laneAdv', w: 0.16, low: -25, high: 45 },
        { key: 'gpm', w: 0.13, low: 450, high: 700 },
        { key: 'xpm', w: 0.10, low: 540, high: 830 },
        { key: 'heroDamage', w: 0.16, low: 18000, high: 38000 },
        { key: 'kills', w: 0.08, low: 6, high: 14 },
        { key: 'killPart', w: 0.10, low: 0.55, high: 0.85 },
        { key: 'earlyImpact', w: 0.12, low: 30, high: 80 }
      ],
      display: [
        { key: 'kda', label: 'KDA', fmt: 'dec2' },
        { key: 'kills', label: 'Kills', fmt: 'dec1' },
        { key: 'deaths', label: 'Deaths', fmt: 'dec1' },
        { key: 'assists', label: 'Assists', fmt: 'dec1' },
        { key: 'gpm', label: 'GPM', fmt: 'int' },
        { key: 'xpm', label: 'XPM', fmt: 'int' },
        { key: 'lastHits', label: 'Last hits', fmt: 'int' },
        { key: 'heroDamage', label: 'Daño a héroes', fmt: 'int' },
        { key: 'killPart', label: 'Participación', fmt: 'pct' },
        { key: 'laneAdv', label: 'Ventaja vs mid', fmt: 'signed' },
        { key: 'runes', label: 'Runas', fmt: 'dec1' },
        { key: 'earlyImpact', label: 'Impacto temprano', fmt: 'score' }
      ]
    },

    offlane: {
      id: 'offlane', pos: 3, name: 'Offlane', short: 'POS 3', label: 'Posición 3',
      desc: 'Crea espacio, inicia las peleas y absorbe presión.',
      weights: { mech: 0.16, sense: 0.20, pool: 0.12, cons: 0.12, ment: 0.10, team: 0.18, adapt: 0.08, lead: 0.04 },
      growthBias: { mech: 1.02, sense: 1.10, pool: 1.00, cons: 1.00, ment: 1.05, team: 1.15, adapt: 1.05, lead: 1.00 },
      impact: 0.22,
      statModel: {
        kills: { base: 6.1, slope: 0.36, sd: 2.6, win: 1.8, min: 0 },
        deaths: { base: 6.5, slope: -0.26, sd: 2.2, win: -1.5, min: 0 },
        assists: { base: 13.8, slope: 0.28, sd: 4.0, win: 2.8, min: 0 },
        gpm: { base: 468, slope: 0.26, sd: 58, win: 44, min: 140 },
        xpm: { base: 558, slope: 0.27, sd: 66, win: 52, min: 160 },
        lastHits: { base: 188, slope: 0.24, sd: 46, win: 16, min: 20 },
        heroDamage: { base: 19800, slope: 0.42, sd: 5200, win: 3000, min: 1500 },
        damageTaken: { base: 41000, slope: 0.34, sd: 9000, win: 2500, min: 6000 },
        teamfightPart: { base: 0.70, slope: 0.11, sd: 0.07, win: 0.04, min: 0.2, max: 0.98 },
        initiations: { base: 5.4, slope: 0.48, sd: 2.0, win: 0.9, min: 0 },
        objectives: { base: 3.1, slope: 0.44, sd: 1.5, win: 1.1, min: 0 },
        killPart: { base: 0.72, slope: 0.10, sd: 0.07, win: 0.04, min: 0.2, max: 0.98 }
      },
      ratingSpec: [
        { key: 'teamfightPart', w: 0.17, low: 0.58, high: 0.86 },
        { key: 'initiations', w: 0.15, low: 2.5, high: 9 },
        { key: 'assists', w: 0.13, low: 9, high: 20 },
        { key: 'killPart', w: 0.13, low: 0.58, high: 0.88 },
        { key: 'heroDamage', w: 0.12, low: 12000, high: 28000 },
        { key: 'damageTaken', w: 0.10, low: 28000, high: 58000 },
        { key: 'objectives', w: 0.10, low: 1.5, high: 5.5 },
        { key: 'deaths', w: 0.10, low: 9.0, high: 4.2 }
      ],
      display: [
        { key: 'kda', label: 'KDA', fmt: 'dec2' },
        { key: 'kills', label: 'Kills', fmt: 'dec1' },
        { key: 'deaths', label: 'Deaths', fmt: 'dec1' },
        { key: 'assists', label: 'Assists', fmt: 'dec1' },
        { key: 'killPart', label: 'Part. en kills', fmt: 'pct' },
        { key: 'heroDamage', label: 'Daño a héroes', fmt: 'int' },
        { key: 'damageTaken', label: 'Daño recibido', fmt: 'int' },
        { key: 'teamfightPart', label: 'Teamfight part.', fmt: 'pct' },
        { key: 'gpm', label: 'GPM', fmt: 'int' },
        { key: 'xpm', label: 'XPM', fmt: 'int' },
        { key: 'objectives', label: 'Objetivos', fmt: 'dec1' },
        { key: 'initiations', label: 'Iniciaciones', fmt: 'dec1' }
      ]
    },

    pos4: {
      id: 'pos4', pos: 4, name: 'Soft Support', short: 'POS 4', label: 'Posición 4',
      desc: 'Roaming, presión temprana y creación de jugadas.',
      weights: { mech: 0.14, sense: 0.22, pool: 0.12, cons: 0.10, ment: 0.10, team: 0.20, adapt: 0.08, lead: 0.04 },
      growthBias: { mech: 1.00, sense: 1.15, pool: 1.05, cons: 0.95, ment: 1.05, team: 1.15, adapt: 1.05, lead: 1.05 },
      impact: 0.17,
      statModel: {
        kills: { base: 5.0, slope: 0.34, sd: 2.4, win: 1.6, min: 0 },
        deaths: { base: 7.6, slope: -0.22, sd: 2.4, win: -1.6, min: 0 },
        assists: { base: 16.6, slope: 0.30, sd: 4.4, win: 3.2, min: 0 },
        gpm: { base: 342, slope: 0.24, sd: 48, win: 34, min: 110 },
        xpm: { base: 420, slope: 0.25, sd: 54, win: 40, min: 130 },
        heroDamage: { base: 12400, slope: 0.40, sd: 3800, win: 2000, min: 800 },
        obsWards: { base: 7.4, slope: 0.24, sd: 2.2, win: 0.5, min: 0 },
        sentries: { base: 6.0, slope: 0.26, sd: 2.1, win: 0.4, min: 0 },
        wardsDestroyed: { base: 4.4, slope: 0.44, sd: 1.9, win: 0.7, min: 0 },
        stacks: { base: 3.2, slope: 0.40, sd: 1.5, win: 0.4, min: 0 },
        runes: { base: 6.4, slope: 0.34, sd: 2.2, win: 0.6, min: 0 },
        smokes: { base: 3.5, slope: 0.44, sd: 1.6, win: 0.6, min: 0 },
        teamfightPart: { base: 0.74, slope: 0.10, sd: 0.07, win: 0.04, min: 0.2, max: 0.98 },
        earlyImpact: { base: 50, abs: 24, sd: 11, win: 5, min: 2, max: 99 },
        killPart: { base: 0.77, slope: 0.08, sd: 0.06, win: 0.03, min: 0.25, max: 0.98 }
      },
      ratingSpec: [
        { key: 'assists', w: 0.16, low: 11, high: 23 },
        { key: 'killPart', w: 0.13, low: 0.62, high: 0.90 },
        { key: 'obsWards', w: 0.09, low: 5, high: 11 },
        { key: 'wardsDestroyed', w: 0.11, low: 2.5, high: 8 },
        { key: 'stacks', w: 0.09, low: 1.5, high: 5.5 },
        { key: 'runes', w: 0.09, low: 4, high: 10 },
        { key: 'smokes', w: 0.11, low: 1.8, high: 6 },
        { key: 'teamfightPart', w: 0.12, low: 0.60, high: 0.88 },
        { key: 'earlyImpact', w: 0.10, low: 30, high: 80 }
      ],
      display: [
        { key: 'kda', label: 'KDA', fmt: 'dec2' },
        { key: 'assists', label: 'Assists', fmt: 'dec1' },
        { key: 'deaths', label: 'Deaths', fmt: 'dec1' },
        { key: 'killPart', label: 'Participación', fmt: 'pct' },
        { key: 'obsWards', label: 'Wards', fmt: 'dec1' },
        { key: 'sentries', label: 'Sentries', fmt: 'dec1' },
        { key: 'wardsDestroyed', label: 'Wards destruidos', fmt: 'dec1' },
        { key: 'stacks', label: 'Stacks', fmt: 'dec1' },
        { key: 'runes', label: 'Runas', fmt: 'dec1' },
        { key: 'smokes', label: 'Smoke plays', fmt: 'dec1' },
        { key: 'teamfightPart', label: 'Teamfight part.', fmt: 'pct' },
        { key: 'earlyImpact', label: 'Impacto temprano', fmt: 'score' }
      ]
    },

    pos5: {
      id: 'pos5', pos: 5, name: 'Hard Support', short: 'POS 5', label: 'Posición 5',
      desc: 'Visión, sacrificio y sostén del equipo entero.',
      weights: { mech: 0.10, sense: 0.22, pool: 0.10, cons: 0.12, ment: 0.12, team: 0.22, adapt: 0.06, lead: 0.06 },
      growthBias: { mech: 0.92, sense: 1.15, pool: 0.95, cons: 1.05, ment: 1.10, team: 1.20, adapt: 1.00, lead: 1.15 },
      impact: 0.15,
      statModel: {
        kills: { base: 3.2, slope: 0.28, sd: 1.8, win: 1.1, min: 0 },
        deaths: { base: 8.4, slope: -0.20, sd: 2.6, win: -1.7, min: 0 },
        assists: { base: 18.6, slope: 0.30, sd: 4.6, win: 3.4, min: 0 },
        gpm: { base: 300, slope: 0.22, sd: 42, win: 28, min: 90 },
        xpm: { base: 372, slope: 0.23, sd: 48, win: 34, min: 110 },
        heroDamage: { base: 9600, slope: 0.38, sd: 3200, win: 1600, min: 500 },
        obsWards: { base: 13.8, slope: 0.28, sd: 3.2, win: 0.6, min: 0 },
        sentries: { base: 9.0, slope: 0.28, sd: 2.6, win: 0.5, min: 0 },
        wardsDestroyed: { base: 5.4, slope: 0.40, sd: 2.0, win: 0.7, min: 0 },
        stacks: { base: 5.0, slope: 0.44, sd: 1.9, win: 0.5, min: 0 },
        smokes: { base: 3.2, slope: 0.40, sd: 1.5, win: 0.5, min: 0 },
        supportGold: { base: 3750, slope: 0.40, sd: 1000, win: 250, min: 300 },
        teamfightPart: { base: 0.76, slope: 0.09, sd: 0.065, win: 0.04, min: 0.25, max: 0.98 },
        killPart: { base: 0.80, slope: 0.07, sd: 0.055, win: 0.03, min: 0.3, max: 0.99 }
      },
      ratingSpec: [
        { key: 'assists', w: 0.17, low: 13, high: 25 },
        { key: 'obsWards', w: 0.14, low: 9, high: 19 },
        { key: 'sentries', w: 0.11, low: 5.5, high: 13 },
        { key: 'wardsDestroyed', w: 0.09, low: 3, high: 8.5 },
        { key: 'stacks', w: 0.11, low: 2.5, high: 8 },
        { key: 'teamfightPart', w: 0.13, low: 0.62, high: 0.90 },
        { key: 'deaths', w: 0.10, low: 11, high: 6 },
        { key: 'killPart', w: 0.09, low: 0.66, high: 0.92 },
        { key: 'supportGold', w: 0.06, low: 2400, high: 5600 }
      ],
      display: [
        { key: 'kda', label: 'KDA', fmt: 'dec2' },
        { key: 'assists', label: 'Assists', fmt: 'dec1' },
        { key: 'deaths', label: 'Deaths', fmt: 'dec1' },
        { key: 'killPart', label: 'Participación', fmt: 'pct' },
        { key: 'obsWards', label: 'Observer wards', fmt: 'dec1' },
        { key: 'sentries', label: 'Sentry wards', fmt: 'dec1' },
        { key: 'wardsDestroyed', label: 'Wards destruidos', fmt: 'dec1' },
        { key: 'stacks', label: 'Stacks', fmt: 'dec1' },
        { key: 'teamfightPart', label: 'Teamfight part.', fmt: 'pct' },
        { key: 'smokes', label: 'Smoke part.', fmt: 'dec1' },
        { key: 'supportGold', label: 'Oro en soporte', fmt: 'int' }
      ]
    }
  };

  var ROLE_LIST = ['carry', 'mid', 'offlane', 'pos4', 'pos5'];

  var ATTRS = [
    { key: 'mech', label: 'Mecánicas' },
    { key: 'sense', label: 'Game Sense' },
    { key: 'pool', label: 'Hero Pool' },
    { key: 'cons', label: 'Consistencia' },
    { key: 'ment', label: 'Mentalidad' },
    { key: 'team', label: 'Teamplay' },
    { key: 'adapt', label: 'Adaptación' },
    { key: 'lead', label: 'Liderazgo' }
  ];

  var ATTR_KEYS = ATTRS.map(function (a) { return a.key; });

  DCS.data = DCS.data || {};
  DCS.data.ROLES = ROLES;
  DCS.data.ROLE_LIST = ROLE_LIST;
  DCS.data.ATTRS = ATTRS;
  DCS.data.ATTR_KEYS = ATTR_KEYS;
})(window.DCS = window.DCS || {});
