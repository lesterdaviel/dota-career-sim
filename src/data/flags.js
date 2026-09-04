/* ISO 3166-1 alpha-2 para banderas emoji. No altera la simulación. */
(function (DCS) {
  'use strict';

  var NAT_ISO = {
    'Afganistán': 'AF', 'Albania': 'AL', 'Alemania': 'DE', 'Andorra': 'AD', 'Angola': 'AO',
    'Antigua y Barbuda': 'AG', 'Arabia Saudita': 'SA', 'Argelia': 'DZ', 'Argentina': 'AR',
    'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT', 'Azerbaiyán': 'AZ', 'Bahamas': 'BS',
    'Bangladés': 'BD', 'Barbados': 'BB', 'Baréin': 'BH', 'Bélgica': 'BE', 'Belice': 'BZ',
    'Benín': 'BJ', 'Bielorrusia': 'BY', 'Birmania': 'MM', 'Bolivia': 'BO',
    'Bosnia y Herzegovina': 'BA', 'Botsuana': 'BW', 'Brasil': 'BR', 'Brunéi': 'BN',
    'Bulgaria': 'BG', 'Burkina Faso': 'BF', 'Burundi': 'BI', 'Bután': 'BT', 'Cabo Verde': 'CV',
    'Camboya': 'KH', 'Camerún': 'CM', 'Canadá': 'CA', 'Catar': 'QA', 'Chad': 'TD', 'Chile': 'CL',
    'China': 'CN', 'Chipre': 'CY', 'Colombia': 'CO', 'Comoras': 'KM', 'Congo': 'CG',
    'Corea del Norte': 'KP', 'Corea del Sur': 'KR', 'Costa de Marfil': 'CI', 'Costa Rica': 'CR',
    'Croacia': 'HR', 'Cuba': 'CU', 'Dinamarca': 'DK', 'Dominica': 'DM', 'Ecuador': 'EC',
    'Egipto': 'EG', 'El Salvador': 'SV', 'Emiratos Árabes Unidos': 'AE', 'Eritrea': 'ER',
    'Eslovaquia': 'SK', 'Eslovenia': 'SI', 'España': 'ES', 'Estados Unidos': 'US', 'Estonia': 'EE',
    'Etiopía': 'ET', 'Filipinas': 'PH', 'Finlandia': 'FI', 'Fiyi': 'FJ', 'Francia': 'FR',
    'Gabón': 'GA', 'Gambia': 'GM', 'Georgia': 'GE', 'Ghana': 'GH', 'Granada': 'GD', 'Grecia': 'GR',
    'Guatemala': 'GT', 'Guinea': 'GN', 'Guinea-Bisáu': 'GW', 'Guinea Ecuatorial': 'GQ',
    'Guyana': 'GY', 'Haití': 'HT', 'Honduras': 'HN', 'Hungría': 'HU', 'India': 'IN',
    'Indonesia': 'ID', 'Irak': 'IQ', 'Irán': 'IR', 'Irlanda': 'IE', 'Islandia': 'IS',
    'Islas Marshall': 'MH', 'Islas Salomón': 'SB', 'Israel': 'IL', 'Italia': 'IT', 'Jamaica': 'JM',
    'Japón': 'JP', 'Jordania': 'JO', 'Kazajistán': 'KZ', 'Kenia': 'KE', 'Kirguistán': 'KG',
    'Kiribati': 'KI', 'Kosovo': 'XK', 'Kuwait': 'KW', 'Laos': 'LA', 'Lesoto': 'LS', 'Letonia': 'LV',
    'Líbano': 'LB', 'Liberia': 'LR', 'Libia': 'LY', 'Liechtenstein': 'LI', 'Lituania': 'LT',
    'Luxemburgo': 'LU', 'Macedonia del Norte': 'MK', 'Madagascar': 'MG', 'Malasia': 'MY',
    'Malaui': 'MW', 'Maldivas': 'MV', 'Malí': 'ML', 'Malta': 'MT', 'Marruecos': 'MA',
    'Mauricio': 'MU', 'Mauritania': 'MR', 'México': 'MX', 'Micronesia': 'FM', 'Moldavia': 'MD',
    'Mónaco': 'MC', 'Mongolia': 'MN', 'Montenegro': 'ME', 'Mozambique': 'MZ', 'Namibia': 'NA',
    'Nauru': 'NR', 'Nepal': 'NP', 'Nicaragua': 'NI', 'Níger': 'NE', 'Nigeria': 'NG',
    'Noruega': 'NO', 'Nueva Zelanda': 'NZ', 'Omán': 'OM', 'Países Bajos': 'NL', 'Pakistán': 'PK',
    'Palaos': 'PW', 'Palestina': 'PS', 'Panamá': 'PA', 'Papúa Nueva Guinea': 'PG', 'Paraguay': 'PY',
    'Perú': 'PE', 'Polonia': 'PL', 'Portugal': 'PT', 'Reino Unido': 'GB',
    'República Centroafricana': 'CF', 'República Checa': 'CZ',
    'República Democrática del Congo': 'CD', 'República Dominicana': 'DO', 'Ruanda': 'RW',
    'Rumanía': 'RO', 'Rusia': 'RU', 'Samoa': 'WS', 'San Cristóbal y Nieves': 'KN',
    'San Marino': 'SM', 'San Vicente y las Granadinas': 'VC', 'Santa Lucía': 'LC',
    'Santo Tomé y Príncipe': 'ST', 'Senegal': 'SN', 'Serbia': 'RS', 'Seychelles': 'SC',
    'Sierra Leona': 'SL', 'Singapur': 'SG', 'Siria': 'SY', 'Somalia': 'SO', 'Sri Lanka': 'LK',
    'Suazilandia': 'SZ', 'Sudáfrica': 'ZA', 'Sudán': 'SD', 'Sudán del Sur': 'SS', 'Suecia': 'SE',
    'Suiza': 'CH', 'Surinam': 'SR', 'Tailandia': 'TH', 'Taiwán': 'TW', 'Tanzania': 'TZ',
    'Tayikistán': 'TJ', 'Timor Oriental': 'TL', 'Togo': 'TG', 'Tonga': 'TO',
    'Trinidad y Tobago': 'TT', 'Túnez': 'TN', 'Turkmenistán': 'TM', 'Turquía': 'TR',
    'Tuvalu': 'TV', 'Ucrania': 'UA', 'Uganda': 'UG', 'Uruguay': 'UY', 'Uzbekistán': 'UZ',
    'Vanuatu': 'VU', 'Vaticano': 'VA', 'Venezuela': 'VE', 'Vietnam': 'VN', 'Yemen': 'YE',
    'Yibuti': 'DJ', 'Zambia': 'ZM', 'Zimbabue': 'ZW'
  };

  function flagFor(name) {
    var iso = NAT_ISO[name];
    if (!iso || iso.length !== 2) return '🏳️';
    var a = iso.toUpperCase().charCodeAt(0) - 65;
    var b = iso.toUpperCase().charCodeAt(1) - 65;
    return String.fromCodePoint(0x1F1E6 + a, 0x1F1E6 + b);
  }

  function flagMark(name, size) {
    var iso = NAT_ISO[name];
    var lg = size === 'lg';
    if (!iso || iso.length !== 2) {
      return '<span class="flag-fallback">' + flagFor(name) + '</span>';
    }
    return '<img class="' + (lg ? 'flag-lg' : 'flag-sm') + '" alt="" width="' + (lg ? 40 : 22) +
      '" height="' + (lg ? 28 : 15) + '" src="https://flagcdn.com/w40/' + iso.toLowerCase() + '.png">';
  }

  DCS.data = DCS.data || {};
  DCS.data.NAT_ISO = NAT_ISO;
  DCS.data.flagFor = flagFor;
  DCS.data.flagMark = flagMark;
})(window.DCS = window.DCS || {});
