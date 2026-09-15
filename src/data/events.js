/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   DATA / EVENTS — banco de acontecimientos de carrera
   ------------------------------------------------------------
   Contrato de cada evento:
     id      identificador único
     phase   'pre' | 'mid' | 'post' | 'any'
     when    (c) => bool          condición de aparición
     weight  (c) => number        peso relativo (0 = no sale)
     build   (c) => { title, text, tone, options? }
   Los efectos se aplican con c.fx (ver engine/events.js).
   Si un evento no ofrece opciones, es narrativo: forma parte de
   la historia. Si las ofrece, TODAS deben cambiar algo.
   ============================================================ */
(function (DCS) {
  'use strict';

  function has(c) { return !!c.team; }
  function young(c) { return c.player.age <= 22; }

  var EVENTS = [
    /* ---------------------------------------------------------
       NARRATIVOS
       --------------------------------------------------------- */
    {
      id: 'meta_shift', phase: 'pre', when: function () { return true; },
      weight: function () { return 10; },
      build: function (c) {
        var adapt = c.player.attrs.adapt;
        var good = c.rng.float() < (0.25 + adapt / 180);
        var delta = good ? c.rng.int(3, 8) : -c.rng.int(3, 9);
        c.fx.form(delta);
        c.fx.attrDrift('adapt', good ? 0.8 : 0.3);
        return {
          title: 'El parche lo cambia todo',
          tone: good ? 'good' : 'bad',
          text: good
            ? 'El nuevo parche mueve el meta hacia un estilo que encaja contigo. Los primeros scrims son prometedores.'
            : 'El nuevo parche entierra el estilo con el que te sientes cómodo. Vas a tener que reaprender cosas.'
        };
      }
    },
    {
      id: 'rivalry', phase: 'mid', when: has,
      weight: function (c) { return c.team.tier <= 2 ? 6 : 3; },
      build: function (c) {
        var rival = c.rng.pick(c.rivalNames);
        c.fx.morale(c.rng.int(-2, 5));
        return {
          title: 'Rivalidad',
          tone: 'neutral',
          text: 'La prensa regional lleva semanas alimentando el duelo entre tú y ' + rival +
            '. Cada vez que os cruzáis en un escenario hay más ruido del habitual.'
        };
      }
    },
    {
      id: 'mentor', phase: 'pre', when: function (c) { return has(c) && c.player.age <= 21; },
      weight: function () { return 6; },
      build: function (c) {
        var vet = c.rng.pick(c.teammateNames || ['un veterano del roster']);
        c.fx.attrDrift('sense', 1.6);
        c.fx.attrDrift('team', 1.2);
        c.fx.morale(4);
        return {
          title: 'Alguien decide enseñarte',
          tone: 'good',
          text: vet + ' se ha tomado en serio tu desarrollo. Revisáis repeticiones juntos después de cada bloque de scrims.'
        };
      }
    },
    {
      id: 'historic', phase: 'post', when: function (c) { return c.lastRating >= 87; },
      weight: function () { return 12; },
      build: function (c) {
        c.fx.rep(4);
        c.fx.morale(6);
        return {
          title: 'Temporada histórica',
          tone: 'great',
          text: 'Los analistas ya no discuten si eres bueno, discuten dónde te colocan en el ranking mundial de tu posición.'
        };
      }
    },
    {
      id: 'coach_change', phase: 'pre', when: has,
      weight: function () { return 6; },
      build: function (c) {
        var good = c.rng.chance(0.5);
        c.fx.synergy(good ? c.rng.int(3, 8) : -c.rng.int(2, 7));
        return {
          title: 'Cambio en el staff',
          tone: good ? 'good' : 'bad',
          text: good
            ? 'El nuevo entrenador ordena el caos: drafts más claros, roles definidos y menos discusiones en la voz.'
            : 'El nuevo entrenador quiere imponer un sistema que el vestuario no termina de comprar.'
        };
      }
    },
    {
      id: 'teammate_leaves', phase: 'pre', when: has,
      weight: function () { return 7; },
      build: function (c) {
        var who = c.rng.pick(c.teammateNames || ['un compañero']);
        c.fx.rerollTeammate();
        c.fx.synergy(-c.rng.int(4, 12));
        return {
          title: 'Se rompe el roster',
          tone: 'bad',
          text: who + ' abandona el equipo. Llega un sustituto y toca reconstruir la química desde cero.'
        };
      }
    },
    {
      id: 'visa', phase: 'mid', when: function (c) { return has(c) && c.team.tier <= 2; },
      weight: function () { return 3; },
      build: function (c) {
        c.fx.morale(-6);
        c.fx.flag('missEvent', true);
        return {
          title: 'Problemas de visado',
          tone: 'bad',
          text: 'Un trámite mal gestionado por la organización te deja fuera de un evento presencial. Lo ves desde casa.'
        };
      }
    },

    /* ---------------------------------------------------------
       DECISIONES
       --------------------------------------------------------- */
    {
      id: 'internal_conflict', phase: 'mid', when: has,
      weight: function (c) { return c.team.synergy < 55 ? 10 : 4; },
      build: function (c) {
        return {
          title: 'Conflicto interno',
          tone: 'bad',
          text: 'El vestuario está partido. Dos compañeros discuten en cada review y el resto elige bando en silencio. ' +
            'Alguien va a tener que mover ficha.',
          options: [
            {
              label: 'Dar la cara y mediar',
              hint: 'Te expones. Puede salir muy bien o muy mal.',
              apply: function (cc) {
                var ok = cc.rng.float() < 0.32 + cc.player.attrs.lead / 220 + cc.player.attrs.ment / 400;
                if (ok) {
                  cc.fx.synergy(cc.rng.int(6, 14));
                  cc.fx.attrDrift('lead', 2.2);
                  cc.fx.rep(2);
                  return 'Consigues sentar a todo el mundo en la misma sala. El equipo sale reforzado y tu palabra pesa más.';
                }
                cc.fx.synergy(-cc.rng.int(3, 9));
                cc.fx.morale(-7);
                cc.fx.rep(-2);
                return 'Te metes en un fuego que no era tuyo. Ahora eres parte del problema para media plantilla.';
              }
            },
            {
              label: 'Apartarme y centrarme en jugar',
              hint: 'Proteges tu rendimiento. El equipo sigue roto.',
              apply: function (cc) {
                cc.fx.synergy(-cc.rng.int(1, 5));
                cc.fx.form(cc.rng.int(2, 7));
                cc.fx.attrDrift('mech', 1.0);
                return 'Te encierras en tus repeticiones y en tu mecánica. El ambiente no mejora, pero tú juegas mejor.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'burnout', phase: 'mid', when: function (c) { return c.player.age >= 18; },
      weight: function (c) { return c.player.morale < 45 ? 9 : 3; },
      build: function (c) {
        return {
          title: 'No puedes más',
          tone: 'bad',
          text: 'Llevas meses encadenando bloques de scrims, viajes y madrugadas. Duermes mal y ya no disfrutas del juego.',
          options: [
            {
              label: 'Parar dos semanas',
              hint: 'Pierdes ritmo competitivo. Recuperas cabeza.',
              apply: function (cc) {
                cc.fx.morale(cc.rng.int(10, 20));
                cc.fx.form(-cc.rng.int(5, 12));
                cc.fx.attrDrift('ment', 1.8);
                return 'Desconectas del todo. Vuelves más lento de manos, pero con la cabeza en su sitio.';
              }
            },
            {
              label: 'Apretar los dientes',
              hint: 'Mantienes el ritmo. Arriesgas tu mentalidad.',
              apply: function (cc) {
                if (cc.rng.chance(0.45)) {
                  cc.fx.form(cc.rng.int(3, 9));
                  cc.fx.attrDrift('cons', 1.0);
                  return 'Aguantas el tirón y sales al otro lado más duro de lo que entraste.';
                }
                cc.fx.morale(-cc.rng.int(8, 16));
                cc.fx.attrDrift('ment', -2.0);
                cc.fx.form(-cc.rng.int(3, 8));
                return 'El desgaste te pasa por encima. Rindes por inercia y se nota en la voz durante las partidas.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'streaming', phase: 'pre', when: function (c) { return c.player.reputation >= 25; },
      weight: function () { return 5; },
      build: function (c) {
        var money = 12000 + Math.round(c.player.reputation * 900);
        return {
          title: 'Oferta de contenido',
          tone: 'neutral',
          text: 'Una plataforma te ofrece ' + DCS.ui.fmt.money(money) + ' por un acuerdo de streaming durante la temporada. ' +
            'Horas de directo que no vas a dedicar a entrenar.',
          options: [
            {
              label: 'Firmar el acuerdo',
              hint: 'Dinero y visibilidad. Menos horas de práctica.',
              apply: function (cc) {
                cc.fx.money(money);
                cc.fx.rep(3);
                cc.fx.trainingPenalty(0.35);
                return 'El dinero entra y tu nombre circula más. Tu tiempo de práctica, no tanto.';
              }
            },
            {
              label: 'Rechazarlo y entrenar',
              hint: 'Todo al desarrollo.',
              apply: function (cc) {
                cc.fx.trainingBonus(0.30);
                cc.fx.rep(-1);
                return 'Dices que no. Nadie te aplaude por ello, pero tus bloques de práctica son intocables.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'captaincy', phase: 'pre', when: function (c) { return has(c) && c.player.attrs.lead >= 45 && !c.player.isCaptain; },
      weight: function () { return 6; },
      build: function (c) {
        return {
          title: 'Te ofrecen el mando',
          tone: 'neutral',
          text: 'La organización quiere que asumas el rol de capitán y drafter. Más responsabilidad, más ruido, más culpa cuando se pierda.',
          options: [
            {
              label: 'Aceptar el mando',
              hint: 'Creces como líder. Tu juego individual se resiente.',
              apply: function (cc) {
                cc.fx.captain(true);
                cc.fx.attrDrift('lead', 4.0);
                cc.fx.attrDrift('sense', 1.5);
                cc.fx.trainingPenalty(0.20);
                cc.fx.synergy(cc.rng.int(2, 8));
                return 'Coges el micro y la responsabilidad del draft. El equipo tiene una voz clara.';
              }
            },
            {
              label: 'Prefiero centrarme en mi juego',
              hint: 'Sigues siendo un jugador puro.',
              apply: function (cc) {
                cc.fx.trainingBonus(0.15);
                cc.fx.attrDrift('lead', -0.5);
                return 'Declinas con educación. Otro coge el mando y tú sigues a lo tuyo.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'wrist', phase: 'mid', when: function (c) { return c.player.age >= 19; },
      weight: function (c) { return c.player.age >= 26 ? 6 : 3; },
      build: function (c) {
        return {
          title: 'La muñeca',
          tone: 'bad',
          text: 'Llevas semanas jugando con dolor. El fisio recomienda parar; el calendario dice que no.',
          options: [
            {
              label: 'Parar y tratarme',
              hint: 'Pierdes competición. Proteges tus manos.',
              apply: function (cc) {
                cc.fx.form(-cc.rng.int(6, 14));
                cc.fx.flag('missEvent', true);
                cc.fx.morale(-3);
                return 'Te pierdes parte del calendario, pero el dolor desaparece.';
              }
            },
            {
              label: 'Jugar con dolor',
              hint: 'Compites. Podrías arrastrarlo durante años.',
              apply: function (cc) {
                if (cc.rng.chance(0.55)) {
                  cc.fx.rep(2);
                  cc.fx.morale(3);
                  return 'Aguantas la temporada. Nadie sabe lo que te costó cada serie.';
                }
                cc.fx.capPenalty('mech', cc.rng.int(3, 8));
                cc.fx.attrDrift('mech', -3.0);
                return 'La lesión se cronifica. Tu velocidad de manos ya nunca vuelve del todo.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'role_change', phase: 'post',
      when: function (c) { return c.player.age >= 20 && c.lastRating < 62; },
      weight: function () { return 6; },
      build: function (c) {
        var target = c.altRole;
        return {
          title: 'Cambiar de posición',
          tone: 'neutral',
          text: 'Un entrenador que te conoce bien cree que estás desperdiciado en tu rol y te propone reconvertirte a ' +
            DCS.data.ROLES[target].name + ' (' + DCS.data.ROLES[target].label + ').',
          options: [
            {
              label: 'Cambiar de rol',
              hint: 'Reinicio parcial. Nuevo mercado, nuevo riesgo.',
              apply: function (cc) {
                cc.fx.changeRole(target);
                return 'Empiezas de cero en una posición nueva. Tu ficha en el mercado cambia por completo.';
              }
            },
            {
              label: 'Seguir en mi posición',
              hint: 'Doblas la apuesta por lo que sabes hacer.',
              apply: function (cc) {
                cc.fx.trainingBonus(0.25);
                cc.fx.morale(-2);
                return 'Rechazas la propuesta. Si esto sale mal, saldrá mal haciendo lo tuyo.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'region_move', phase: 'post',
      when: function (c) { return c.player.age >= 19 && c.player.reputation >= 20; },
      weight: function (c) { return c.player.status === 'free' ? 8 : 3; },
      build: function (c) {
        var reg = DCS.data.REGIONS[c.altRegion];
        return {
          title: 'Una llamada desde ' + reg.name,
          tone: 'neutral',
          text: 'Un contacto en ' + reg.name + ' te sugiere mudarte allí: hay más equipos buscando tu perfil, ' +
            'pero perderías tu red y tendrías que adaptarte a otra cultura competitiva.',
          options: [
            {
              label: 'Mudarme a ' + reg.short,
              hint: 'Otro mercado. Adaptación forzada.',
              apply: function (cc) {
                cc.fx.changeRegion(cc.altRegion);
                cc.fx.attrDrift('adapt', 2.0);
                cc.fx.form(-cc.rng.int(2, 8));
                return 'Haces las maletas. Tu carrera continúa a miles de kilómetros de donde empezó.';
              }
            },
            {
              label: 'Quedarme donde estoy',
              hint: 'Estabilidad. Menos puertas.',
              apply: function (cc) {
                cc.fx.morale(2);
                return 'Te quedas. Conoces a todo el mundo aquí y eso también vale.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'bootcamp', phase: 'pre', when: has,
      weight: function () { return 5; },
      build: function (c) {
        var cost = 8000 + c.player.age * 400;
        return {
          title: 'Bootcamp por tu cuenta',
          tone: 'neutral',
          text: 'La organización no cubre el bootcamp previo al calendario internacional. Puedes pagarlo tú: ' +
            DCS.ui.fmt.money(cost) + ' de tu bolsillo.',
          options: [
            {
              label: 'Pagarlo yo',
              hint: 'Inviertes en ti. El dinero no vuelve.',
              apply: function (cc) {
                cc.fx.money(-cost);
                cc.fx.trainingBonus(0.45);
                cc.fx.synergy(cc.rng.int(2, 7));
                return 'Dos semanas conviviendo con el equipo. Se nota en la coordinación.';
              }
            },
            {
              label: 'No pagarlo',
              hint: 'Guardas el dinero. Llegas más justo.',
              apply: function (cc) {
                cc.fx.form(-cc.rng.int(1, 6));
                return 'Preparáis el calendario online, cada uno desde su casa.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'contract_dispute', phase: 'post',
      when: function (c) { return has(c) && c.player.contract && c.player.contract.years > 0; },
      weight: function (c) { return c.lastRating > 75 ? 6 : 2; },
      build: function (c) {
        return {
          title: 'Renegociación',
          tone: 'neutral',
          text: 'Tu representante cree que estás cobrando por debajo de tu nivel y quiere reabrir el contrato. ' +
            'La organización no lo va a encajar bien.',
          options: [
            {
              label: 'Exigir mejora salarial',
              hint: 'Puede salir caro en imagen.',
              apply: function (cc) {
                if (cc.rng.float() < 0.35 + cc.lastRating / 250) {
                  cc.fx.salary(1.35);
                  return 'La organización cede. Cobras lo que crees que vales.';
                }
                cc.fx.rep(-3);
                cc.fx.morale(-6);
                cc.fx.synergy(-4);
                return 'La negociación se filtra. La organización te retrata como un problema.';
              }
            },
            {
              label: 'Dejarlo estar',
              hint: 'Buena imagen interna.',
              apply: function (cc) {
                cc.fx.rep(1);
                cc.fx.synergy(3);
                cc.fx.morale(2);
                return 'Firmas la paz. Dentro del club se agradece.';
              }
            }
          ]
        };
      }
    },
    {
      id: 'bench_threat', phase: 'post',
      when: function (c) { return has(c) && c.lastRating < 58 && c.player.age >= 18; },
      weight: function () { return 8; },
      build: function (c) {
        return {
          title: 'Te juegas el puesto',
          tone: 'bad',
          text: 'La organización ha probado a un sustituto en scrims. Te dan una temporada para responder, ' +
            'o te ofrecen salir ahora en buenos términos.',
          options: [
            {
              label: 'Quedarme y pelear el puesto',
              hint: 'Si falla, tu ficha se hunde.',
              apply: function (cc) {
                cc.fx.flag('provisional', true);
                cc.fx.morale(-4);
                return 'Te quedas. Cada scrim es una prueba.';
              }
            },
            {
              label: 'Salir y buscar equipo',
              hint: 'Mercado abierto sin garantías.',
              apply: function (cc) {
                cc.fx.leaveTeam('Salida acordada');
                cc.fx.rep(-1);
                return 'Rescindís de mutuo acuerdo. Estás libre y el mercado ya casi ha cerrado.';
              }
            }
          ]
        };
      }
    }
  ];

  DCS.data = DCS.data || {};
  DCS.data.EVENTS = EVENTS;
})(window.DCS = window.DCS || {});
