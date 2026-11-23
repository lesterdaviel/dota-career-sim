/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   DATA / ARCHETYPES — estilos de jugador
   ------------------------------------------------------------
   Ninguno es objetivamente superior: todos suman aprox. lo mismo
   en atributos iniciales y compensan con modificadores ocultos
   de varianza, techo y resistencia a rachas.
   ============================================================ */
(function (DCS) {
  'use strict';

  var ARCHETYPES = {
    mechanical: {
      id: 'mechanical',
      name: 'Mecánico',
      desc: 'Manos privilegiadas. Su techo individual es enorme, pero tarda más en entender el juego de equipo.',
      pros: 'Mecánicas y hero pool superiores',
      cons: 'Teamplay y liderazgo más lentos',
      attr: { mech: 9, sense: -3, pool: 5, cons: -1, ment: -2, team: -5, adapt: 0, lead: -4 },
      growth: { mech: 1.15, sense: 0.95, pool: 1.10, cons: 1.00, ment: 0.95, team: 0.90, adapt: 1.00, lead: 0.85 },
      variance: 1.05,      /* volatilidad de la forma */
      slumpResist: 1.00,   /* >1 = aguanta mejor las malas rachas */
      ceilingBonus: 2,     /* pequeño ajuste al potencial oculto */
      mmrBias: 220
    },
    smart: {
      id: 'smart',
      name: 'Inteligente',
      desc: 'Lee la partida antes de que ocurra. Menos explosivo, más difícil de sorprender.',
      pros: 'Game sense y adaptación superiores',
      cons: 'Menor explosividad mecánica',
      attr: { mech: -5, sense: 9, pool: 2, cons: 2, ment: 1, team: 2, adapt: 6, lead: 0 },
      growth: { mech: 0.92, sense: 1.15, pool: 1.05, cons: 1.05, ment: 1.02, team: 1.05, adapt: 1.15, lead: 1.00 },
      variance: 0.92,
      slumpResist: 1.10,
      ceilingBonus: 0,
      mmrBias: -60
    },
    aggressive: {
      id: 'aggressive',
      name: 'Agresivo',
      desc: 'Capaz de destrozar un torneo entero. También capaz de hundir una serie el mismo día.',
      pros: 'Actuaciones extraordinarias más frecuentes',
      cons: 'Mucha más volatilidad',
      attr: { mech: 6, sense: 0, pool: 1, cons: -8, ment: -2, team: -1, adapt: 2, lead: 0 },
      growth: { mech: 1.10, sense: 1.00, pool: 1.00, cons: 0.85, ment: 0.95, team: 0.95, adapt: 1.05, lead: 0.95 },
      variance: 1.45,
      slumpResist: 0.85,
      ceilingBonus: 3,
      mmrBias: 140
    },
    consistent: {
      id: 'consistent',
      name: 'Consistente',
      desc: 'Rara vez brilla, rara vez falla. Los entrenadores duermen tranquilos con el en el roster.',
      pros: 'Muy pocas malas rachas',
      cons: 'Pocas actuaciones memorables',
      attr: { mech: -1, sense: 2, pool: 0, cons: 9, ment: 4, team: 2, adapt: -2, lead: 0 },
      growth: { mech: 0.98, sense: 1.02, pool: 0.98, cons: 1.15, ment: 1.10, team: 1.05, adapt: 0.92, lead: 1.00 },
      variance: 0.65,
      slumpResist: 1.30,
      ceilingBonus: -2,
      mmrBias: -20
    },
    leader: {
      id: 'leader',
      name: 'Líder',
      desc: 'Organiza, calma y arrastra al equipo. Su valor no siempre aparece en las estadísticas.',
      pros: 'Liderazgo, mentalidad y sinergia superiores',
      cons: 'Desarrollo mecánico más lento',
      attr: { mech: -6, sense: 3, pool: -1, cons: 2, ment: 6, team: 6, adapt: 1, lead: 12 },
      growth: { mech: 0.88, sense: 1.08, pool: 0.98, cons: 1.05, ment: 1.12, team: 1.12, adapt: 1.02, lead: 1.20 },
      variance: 0.85,
      slumpResist: 1.20,
      ceilingBonus: 0,
      mmrBias: -140
    }
  };

  var ARCHETYPE_LIST = ['mechanical', 'smart', 'aggressive', 'consistent', 'leader'];

  DCS.data = DCS.data || {};
  DCS.data.ARCHETYPES = ARCHETYPES;
  DCS.data.ARCHETYPE_LIST = ARCHETYPE_LIST;
})(window.DCS = window.DCS || {});
