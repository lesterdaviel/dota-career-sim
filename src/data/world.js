/* ============================================================
   DATA / WORLD — regiones, nacionalidades y bancos de nombres
   ------------------------------------------------------------
   Todo el ecosistema de la V1 es ficticio. Los nombres de
   organizaciones y jugadores se generan proceduralmente para que
   dos carreras no compartan el mismo mundo competitivo.
   ============================================================ */
(function (DCS) {
  'use strict';

  var REGIONS = {
    eeu: {
      id: 'eeu', name: 'Europa del Este', short: 'EEU', strength: 1.00, slots: { t1: 5, t2: 7, t3: 9 },
      nationalities: ['Rusia', 'Ucrania', 'Kazajistán', 'Bielorrusia', 'Polonia', 'Georgia', 'Moldavia', 'Estonia', 'Letonia', 'Armenia']
    },
    weu: {
      id: 'weu', name: 'Europa Occidental', short: 'WEU', strength: 0.96, slots: { t1: 5, t2: 7, t3: 9 },
      nationalities: ['Suecia', 'Finlandia', 'Dinamarca', 'Alemania', 'España', 'Francia', 'Reino Unido', 'Bulgaria', 'Rumanía', 'Serbia', 'Israel', 'Países Bajos']
    },
    cn: {
      id: 'cn', name: 'China', short: 'CN', strength: 0.99, slots: { t1: 5, t2: 6, t3: 8 },
      nationalities: ['China']
    },
    sea: {
      id: 'sea', name: 'Sudeste Asiático', short: 'SEA', strength: 0.87, slots: { t1: 3, t2: 6, t3: 9 },
      nationalities: ['Filipinas', 'Malasia', 'Indonesia', 'Singapur', 'Tailandia', 'Vietnam', 'Australia', 'Nueva Zelanda']
    },
    na: {
      id: 'na', name: 'Norteamérica', short: 'NA', strength: 0.80, slots: { t1: 3, t2: 5, t3: 8 },
      nationalities: ['Estados Unidos', 'Canadá', 'México']
    },
    sa: {
      id: 'sa', name: 'Sudamérica', short: 'SA', strength: 0.76, slots: { t1: 2, t2: 5, t3: 8 },
      nationalities: ['Perú', 'Brasil', 'Argentina', 'Chile', 'Bolivia', 'Colombia', 'Uruguay', 'Ecuador']
    }
  };

  var REGION_LIST = ['eeu', 'weu', 'cn', 'sea', 'na', 'sa'];

  /* Nacionalidades del jugador: independientes de la región competitiva.
     Incluye los países ya usados por región más el resto de estados soberanos. */
  var NATIONALITIES = [
    'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda',
    'Arabia Saudita', 'Argelia', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados', 'Baréin', 'Bélgica', 'Belice',
    'Benín', 'Bielorrusia', 'Birmania', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana',
    'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Bután', 'Cabo Verde',
    'Camboya', 'Camerún', 'Canadá', 'Catar', 'Chad', 'Chile', 'China', 'Chipre',
    'Colombia', 'Comoras', 'Congo', 'Corea del Norte', 'Corea del Sur', 'Costa de Marfil',
    'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica', 'Ecuador', 'Egipto',
    'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia',
    'España', 'Estados Unidos', 'Estonia', 'Etiopía', 'Filipinas', 'Finlandia',
    'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Ghana', 'Granada', 'Grecia',
    'Guatemala', 'Guinea', 'Guinea-Bisáu', 'Guinea Ecuatorial', 'Guyana', 'Haití',
    'Honduras', 'Hungría', 'India', 'Indonesia', 'Irak', 'Irán', 'Irlanda', 'Islandia',
    'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia', 'Jamaica', 'Japón', 'Jordania',
    'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kosovo', 'Kuwait', 'Laos',
    'Lesoto', 'Letonia', 'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania',
    'Luxemburgo', 'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui', 'Maldivas',
    'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'México', 'Micronesia',
    'Moldavia', 'Mónaco', 'Mongolia', 'Montenegro', 'Mozambique', 'Namibia', 'Nauru',
    'Nepal', 'Nicaragua', 'Níger', 'Nigeria', 'Noruega', 'Nueva Zelanda', 'Omán',
    'Países Bajos', 'Pakistán', 'Palaos', 'Palestina', 'Panamá', 'Papúa Nueva Guinea',
    'Paraguay', 'Perú', 'Polonia', 'Portugal', 'Reino Unido', 'República Centroafricana',
    'República Checa', 'República Democrática del Congo', 'República Dominicana',
    'Ruanda', 'Rumanía', 'Rusia', 'Samoa', 'San Cristóbal y Nieves', 'San Marino',
    'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe', 'Senegal',
    'Serbia', 'Seychelles', 'Sierra Leona', 'Singapur', 'Siria', 'Somalia', 'Sri Lanka',
    'Suazilandia', 'Sudáfrica', 'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam',
    'Tailandia', 'Taiwán', 'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo', 'Tonga',
    'Trinidad y Tobago', 'Túnez', 'Turkmenistán', 'Turquía', 'Tuvalu', 'Ucrania',
    'Uganda', 'Uruguay', 'Uzbekistán', 'Vanuatu', 'Vaticano', 'Venezuela', 'Vietnam',
    'Yemen', 'Yibuti', 'Zambia', 'Zimbabue'
  ];

  /* --- generación de nicks de NPC --------------------------- */
  var NICK_HEADS = ['Zar', 'Kro', 'Nyx', 'Vex', 'Sable', 'Orin', 'Kai', 'Mizu', 'Rask', 'Volt', 'Dune',
    'Pyre', 'Halo', 'Grim', 'Lume', 'Astra', 'Ferro', 'Nokt', 'Sirin', 'Tal', 'Wren', 'Ovi', 'Jak',
    'Sol', 'Riven', 'Kobi', 'Drax', 'Mera', 'Onyx', 'Skarn', 'Ilyo', 'Nero', 'Quill', 'Zeph', 'Bram',
    'Cinder', 'Fenn', 'Gale', 'Hex', 'Ion', 'Jinx', 'Kite', 'Lark', 'Moss', 'Nova', 'Pike', 'Rook',
    'Sage', 'Torn', 'Umbra', 'Vane', 'Wisp', 'Yarn', 'Zind', 'Bo', 'Chi', 'Dei', 'Enk', 'Fum'];
  var NICK_TAILS = ['', '', '', 'ix', 'or', 'zy', 'en', 'ka', 'ov', 'is', 'ael', 'ux', 'yn', 'ar', 'ez',
    'oo', 'ky', 'ta', 'lo', 'us', 'iel', 'aq', 'ro'];
  var NICK_SOLO = ['Hollow', 'Static', 'Marrow', 'Basalt', 'Vertigo', 'Cascade', 'Obelisk', 'Tundra',
    'Kismet', 'Lantern', 'Meridian', 'Requiem', 'Salvo', 'Thistle', 'Vandal', 'Whisper', 'Zenith',
    'Anvil', 'Bishop', 'Cobalt', 'Dredge', 'Ember', 'Fathom', 'Glacier', 'Harrow', 'Ivory'];

  /* --- generación de organizaciones -------------------------- */
  var ORG_HEADS = ['Aurora', 'Eclipse', 'Vanguard', 'Meridian', 'Nomad', 'Titan', 'Phantom', 'Solstice',
    'Ironclad', 'Riftborn', 'Zenith', 'Bastion', 'Crimson', 'Halcyon', 'Nebula', 'Obsidian', 'Pinnacle',
    'Quasar', 'Rogue Sun', 'Sable', 'Tempest', 'Umbral', 'Verdant', 'Wildcard', 'Onyx', 'Polaris',
    'Kestrel', 'Lodestar', 'Monsoon', 'Nightfall', 'Oracle', 'Pyre', 'Ravine', 'Sentinel', 'Talon',
    'Undertow', 'Vertex', 'Wraith', 'Ascend', 'Bedrock', 'Cinder', 'Drifter', 'Echelon', 'Fracture'];
  var ORG_TAILS = ['Esports', 'Gaming', 'Collective', 'Project', 'Club', 'Legion', 'Syndicate', 'Union',
    'Division', 'Athletic', 'Squad', 'Initiative', 'Order', 'Circuit'];

  /* --- nombres reales de NPC por región ---------------------- */
  var FIRST_NAMES = {
    eeu: ['Ivan', 'Dmitri', 'Anton', 'Yaroslav', 'Oleg', 'Vadim', 'Roman', 'Artem', 'Kirill', 'Bohdan', 'Taras', 'Miron'],
    weu: ['Lucas', 'Mattias', 'Jonas', 'Pierre', 'Aleix', 'Tobias', 'Niklas', 'Ruben', 'Emil', 'Callum', 'Stefan', 'Ivo'],
    cn: ['Wei', 'Hao', 'Jun', 'Lei', 'Cheng', 'Yifan', 'Zhen', 'Bo', 'Kun', 'Tian', 'Ming', 'Rui'],
    sea: ['Rafael', 'Arjun', 'Wira', 'Danny', 'Nathaniel', 'Adi', 'Kiet', 'Marcus', 'Rendy', 'Paolo', 'Zul', 'Ian'],
    na: ['Tyler', 'Aaron', 'Miguel', 'Jordan', 'Devin', 'Cole', 'Elliot', 'Marcus', 'Owen', 'Diego', 'Grant', 'Shea'],
    sa: ['Mateo', 'Bruno', 'Thiago', 'Nicolás', 'Facundo', 'Renzo', 'Emiliano', 'Joaquín', 'Luan', 'Ivan', 'Gabriel', 'Ariel']
  };
  var LAST_NAMES = {
    eeu: ['Volkov', 'Petrenko', 'Sokolov', 'Iashvili', 'Kravets', 'Zaytsev', 'Novak', 'Bondar', 'Orlov', 'Melnyk'],
    weu: ['Lindqvist', 'Berger', 'Moreau', 'Vidal', 'Hansen', 'Keller', 'Ferreira', 'Blomqvist', 'Novak', 'Dumont'],
    cn: ['Chen', 'Wang', 'Liu', 'Zhao', 'Xu', 'Huang', 'Sun', 'Zhou', 'Lin', 'Guo'],
    sea: ['Santos', 'Rahman', 'Tan', 'Nguyen', 'Pratama', 'Lim', 'Reyes', 'Chua', 'Kaur', 'Wijaya'],
    na: ['Whitaker', 'Brooks', 'Delgado', 'Fischer', 'Nolan', 'Reyes', 'Sutton', 'Hayes', 'Mercer', 'Doyle'],
    sa: ['Rojas', 'Almeida', 'Quispe', 'Ferreira', 'Cabrera', 'Da Silva', 'Vargas', 'Ibarra', 'Moreno', 'Salazar']
  };

  DCS.data = DCS.data || {};
  DCS.data.REGIONS = REGIONS;
  DCS.data.REGION_LIST = REGION_LIST;
  DCS.data.NATIONALITIES = NATIONALITIES;
  DCS.data.NICK_HEADS = NICK_HEADS;
  DCS.data.NICK_TAILS = NICK_TAILS;
  DCS.data.NICK_SOLO = NICK_SOLO;
  DCS.data.ORG_HEADS = ORG_HEADS;
  DCS.data.ORG_TAILS = ORG_TAILS;
  DCS.data.FIRST_NAMES = FIRST_NAMES;
  DCS.data.LAST_NAMES = LAST_NAMES;
})(window.DCS = window.DCS || {});
