/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* Categorías y textos del patrimonio. Sin fórmulas de simulación. */
(function (DCS) {
  'use strict';

  DCS.data.WEALTH_CATS = [
    { id: 'realEstate', name: 'Bienes raíces', risk: 'Bajo', potential: 'Medio',
      blurb: 'Crecimiento estable y algo de renta. Poca volatilidad.' },
    { id: 'funds', name: 'Fondos', risk: 'Bajo', potential: 'Bajo / medio',
      blurb: 'La opción más conservadora. Techo limitado.' },
    { id: 'business', name: 'Negocio personal', risk: 'Medio', potential: 'Alto',
      blurb: 'Marca, contenido, academia. Tu nombre cuenta.' },
    { id: 'esports', name: 'Esports', risk: 'Medio / alto', potential: 'Alto',
      blurb: 'Equipos, academias y orgs. Ligado a tu carrera.' },
    { id: 'tech', name: 'Tecnología', risk: 'Alto', potential: 'Muy alto',
      blurb: 'Startups y producto digital. Puede multiplicarse o hundirse.' }
  ];

  DCS.data.WEALTH_AMOUNTS = [25000, 100000, 250000, 500000];

  DCS.data.WEALTH_CLIMATE = [
    { id: 'techBoom', title: 'Boom tecnológico', weight: 1,
      note: 'Las apuestas en tecnología tienen más recorrido este año.' },
    { id: 'recession', title: 'Crisis económica', weight: 1,
      note: 'Inmuebles y fondos se resienten. El efectivo aguanta mejor.' },
    { id: 'esportsBoom', title: 'Explosión del sector esports', weight: 1,
      note: 'El dinero fluye hacia orgs, academias y gaming.' },
    { id: 'housing', title: 'Mercado inmobiliario fuerte', weight: 1,
      note: 'Las propiedades ganan valor con más facilidad.' }
  ];
})(window.DCS = window.DCS || {});
