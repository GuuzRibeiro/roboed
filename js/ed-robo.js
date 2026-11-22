/* =========================================================
   Robô Ed — o desenho (SVG) e as expressões do robô
   Arte refeita do zero, inspirada no personagem original.
   ========================================================= */
(function () {
  'use strict';

  var CENARIOS = ['clássico', 'espaço sideral', 'energia solar', 'parque eólico', 'sala de aula', 'noite na cidade'];
  var HUMORES = ['feliz', 'pensando', 'surpreso', 'triste', 'bravo', 'piscando', 'encabulado', 'travado'];

  function estrelasCenario() {
    var s = '';
    var pts = [[14, 20], [40, 12], [62, 30], [150, 90], [186, 120], [12, 120], [24, 160], [176, 150], [88, 8], [128, 18], [190, 30], [8, 70], [192, 76]];
    for (var i = 0; i < pts.length; i++) {
      s += '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="' + (i % 3 === 0 ? 1.6 : 1) + '" fill="#fff" opacity="' + (i % 2 ? 0.9 : 0.6) + '"/>';
    }
    return s;
  }

  function janelasCidade() {
    var s = '';
    var predios = [[0, 150, 34], [30, 135, 30], [58, 160, 26], [140, 145, 28], [166, 128, 34]];
    for (var p = 0; p < predios.length; p++) {
      var x = predios[p][0], y = predios[p][1], w = predios[p][2];
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (210 - y) + '" fill="#0d1733"/>';
      for (var jy = y + 8; jy < 205; jy += 12) {
        for (var jx = x + 5; jx < x + w - 6; jx += 9) {
          var acesa = ((jx * 7 + jy * 3) % 5) === 0;
          s += '<rect x="' + jx + '" y="' + jy + '" width="4" height="5" fill="' + (acesa ? '#ffd84a' : '#24345e') + '"/>';
        }
      }
    }
    return s;
  }

  function desenho() {
    return '' +
'<svg class="ed-svg humor-feliz" viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robô Ed">' +
' <defs>' +
'  <radialGradient id="g-cabeca" cx="36%" cy="28%" r="78%">' +
'   <stop offset="0" stop-color="#ffffff"/><stop offset=".32" stop-color="#dbe3ee"/>' +
'   <stop offset=".72" stop-color="#8d9fb7"/><stop offset="1" stop-color="#52627b"/>' +
'  </radialGradient>' +
'  <linearGradient id="g-metal" x1="0" y1="0" x2="0" y2="1">' +
'   <stop offset="0" stop-color="#edf2f7"/><stop offset=".5" stop-color="#a9b7c9"/><stop offset="1" stop-color="#66768e"/>' +
'  </linearGradient>' +
'  <linearGradient id="g-azul" x1="0" y1="0" x2="0" y2="1">' +
'   <stop offset="0" stop-color="#8fb3f5"/><stop offset="1" stop-color="#2346a8"/>' +
'  </linearGradient>' +
'  <radialGradient id="g-iris" cx="40%" cy="35%" r="70%">' +
'   <stop offset="0" stop-color="#9fd8ff"/><stop offset=".6" stop-color="#2f86e0"/><stop offset="1" stop-color="#174a9c"/>' +
'  </radialGradient>' +
'  <radialGradient id="g-luz" cx="50%" cy="40%" r="60%">' +
'   <stop offset="0" stop-color="#fffbd1"/><stop offset=".5" stop-color="#ffd84a"/><stop offset="1" stop-color="#e09a12"/>' +
'  </radialGradient>' +
'  <radialGradient id="g-cen0" cx="50%" cy="38%" r="75%">' +
'   <stop offset="0" stop-color="#fff6b8"/><stop offset=".45" stop-color="#ffd54f"/><stop offset="1" stop-color="#f39a1e"/>' +
'  </radialGradient>' +
'  <linearGradient id="g-cen1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070f33"/><stop offset="1" stop-color="#1f3488"/></linearGradient>' +
'  <linearGradient id="g-cen2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc4ff"/><stop offset="1" stop-color="#dff4ff"/></linearGradient>' +
'  <linearGradient id="g-cen3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dcff"/><stop offset="1" stop-color="#f4fbff"/></linearGradient>' +
'  <linearGradient id="g-cen5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1240"/><stop offset="1" stop-color="#3a2f78"/></linearGradient>' +
'  <clipPath id="clip-boca"><path d="M68,122 Q100,130 132,122 Q129,157 100,159 Q71,157 68,122 Z"/></clipPath>' +
'  <clipPath id="clip-olho-e"><ellipse cx="81" cy="96" rx="17" ry="21"/></clipPath>' +
'  <clipPath id="clip-olho-d"><ellipse cx="119" cy="96" rx="17" ry="21"/></clipPath>' +
' </defs>' +

/* ---------------- cenários ---------------- */
' <g class="cen">' +
'  <rect width="200" height="210" fill="url(#g-cen0)"/>' +
'  <circle cx="100" cy="90" r="88" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="10"/>' +
' </g>' +
' <g class="cen" style="display:none">' +
'  <rect width="200" height="210" fill="url(#g-cen1)"/>' + estrelasCenario() +
'  <circle cx="168" cy="44" r="15" fill="#f08a4b"/><circle cx="163" cy="40" r="5" fill="#f7b27c" opacity=".7"/>' +
'  <ellipse cx="168" cy="44" rx="27" ry="6" fill="none" stroke="#ffd9a0" stroke-width="2.5" transform="rotate(-18 168 44)"/>' +
'  <circle cx="24" cy="44" r="7" fill="#8fd0ff" opacity=".85"/>' +
' </g>' +
' <g class="cen" style="display:none">' +
'  <rect width="200" height="210" fill="url(#g-cen2)"/>' +
'  <g stroke="#ffc928" stroke-width="3" stroke-linecap="round" class="raios-sol">' +
'   <line x1="30" y1="8" x2="30" y2="0"/><line x1="30" y1="52" x2="30" y2="62"/><line x1="8" y1="30" x2="0" y2="30"/><line x1="52" y1="30" x2="62" y2="30"/>' +
'   <line x1="14" y1="14" x2="8" y2="8"/><line x1="46" y1="46" x2="53" y2="53"/><line x1="46" y1="14" x2="53" y2="7"/><line x1="14" y1="46" x2="7" y2="53"/>' +
'  </g>' +
'  <circle cx="30" cy="30" r="16" fill="#ffd84a" stroke="#f5a623" stroke-width="2"/>' +
'  <path d="M0,170 Q60,140 120,165 T200,150 V210 H0 Z" fill="#7cc443"/>' +
'  <g transform="translate(160 112)"><rect x="12" y="20" width="3" height="40" fill="#5d6d84"/>' +
'   <path d="M-4,22 L30,22 L36,0 L2,0 Z" fill="#1f4fa8" stroke="#dfe8f5" stroke-width="1.5"/>' +
'   <path d="M10,0 L4,22 M22,0 L16,22 M0,11 L33,11" stroke="#dfe8f5" stroke-width="1"/></g>' +
' </g>' +
' <g class="cen" style="display:none">' +
'  <rect width="200" height="210" fill="url(#g-cen3)"/>' +
'  <ellipse cx="40" cy="30" rx="22" ry="8" fill="#fff" opacity=".9"/><ellipse cx="150" cy="20" rx="18" ry="6" fill="#fff" opacity=".8"/>' +
'  <path d="M0,175 Q100,150 200,172 V210 H0 Z" fill="#8bcf55"/>' +
'  <g><line x1="176" y1="200" x2="176" y2="78" stroke="#e7edf4" stroke-width="5"/>' +
'   <g class="helice" style="transform-origin:176px 76px"><path d="M176,76 L172,36 L180,36 Z M176,76 L211,96 L207,102 Z M176,76 L141,96 L145,102 Z" fill="#f4f7fb" stroke="#9fb0c4" stroke-width="1"/></g>' +
'   <circle cx="176" cy="76" r="4" fill="#9fb0c4"/></g>' +
'  <g><line x1="22" y1="200" x2="22" y2="110" stroke="#e7edf4" stroke-width="4"/>' +
'   <g class="helice lenta" style="transform-origin:22px 108px"><path d="M22,108 L19,80 L25,80 Z M22,108 L47,122 L44,127 Z M22,108 L-3,122 L0,127 Z" fill="#f4f7fb" stroke="#9fb0c4" stroke-width="1"/></g>' +
'   <circle cx="22" cy="108" r="3" fill="#9fb0c4"/></g>' +
' </g>' +
' <g class="cen" style="display:none">' +
'  <rect width="200" height="210" fill="#f1dfae"/>' +
'  <rect x="6" y="8" width="188" height="104" rx="4" fill="#8a5a2b"/><rect x="11" y="13" width="178" height="94" fill="#2f5d3a"/>' +
'  <text x="16" y="34" fill="#f4f4f4" font-family="Comic Sans MS, cursive" font-size="13">E = mc²</text>' +
'  <text x="150" y="40" fill="#f4f4f4" font-family="Comic Sans MS, cursive" font-size="11">1 kWh</text>' +
'  <text x="150" y="96" fill="#ffe680" font-family="Comic Sans MS, cursive" font-size="11">☀ ⚡</text>' +
'  <text x="16" y="96" fill="#f4f4f4" font-family="Comic Sans MS, cursive" font-size="10">2+2=4</text>' +
'  <rect x="6" y="112" width="188" height="5" fill="#6b4420"/>' +
' </g>' +
' <g class="cen" style="display:none">' +
'  <rect width="200" height="210" fill="url(#g-cen5)"/>' + estrelasCenario() +
'  <circle cx="166" cy="38" r="15" fill="#fff4c2"/><circle cx="173" cy="33" r="14" fill="#1a1d52"/>' +
   janelasCidade() +
' </g>' +

/* ---------------- o robô ---------------- */
' <g class="ed-corpo">' +
'  <path d="M28,212 C30,190 44,177 66,173 L134,173 C156,177 170,190 172,212 Z" fill="url(#g-metal)" stroke="#4d5c72" stroke-width="2"/>' +
'  <path d="M40,212 L48,184 L64,184 L58,212 Z M160,212 L152,184 L136,184 L142,212 Z" fill="url(#g-azul)" stroke="#1d3577" stroke-width="2" stroke-linejoin="round"/>' +
'  <rect x="72" y="180" width="56" height="34" rx="10" fill="#cbd5e2" stroke="#5d6d84" stroke-width="2"/>' +
'  <circle class="ed-peito" cx="100" cy="196" r="12" fill="url(#g-luz)" stroke="#a36d06" stroke-width="1.5"/>' +
'  <path d="M102,186 L93,198 L99,198 L97,207 L107,194 L101,194 Z" fill="#fff" stroke="#a36d06" stroke-width="1" stroke-linejoin="round"/>' +
'  <circle cx="80" cy="188" r="2.5" fill="#4ad06a"/><circle cx="120" cy="188" r="2.5" fill="#ff5a5a"/>' +
'  <rect x="86" y="148" width="28" height="28" rx="4" fill="url(#g-metal)" stroke="#4d5c72" stroke-width="2"/>' +
'  <line x1="86" y1="157" x2="114" y2="157" stroke="#5d6d84" stroke-width="2"/>' +
'  <line x1="86" y1="166" x2="114" y2="166" stroke="#5d6d84" stroke-width="2"/>' +

'  <g class="ed-cabeca">' +
    /* orelhas em forma de plugue */
'   <g fill="#dfe6ef" stroke="#45546b" stroke-width="1.5">' +
'    <rect x="12" y="92" width="14" height="5" rx="1.5"/><rect x="12" y="107" width="14" height="5" rx="1.5"/>' +
'    <rect x="174" y="92" width="14" height="5" rx="1.5"/><rect x="174" y="107" width="14" height="5" rx="1.5"/>' +
'   </g>' +
'   <rect x="22" y="82" width="20" height="40" rx="6" fill="url(#g-azul)" stroke="#1d3577" stroke-width="2"/>' +
'   <rect x="158" y="82" width="20" height="40" rx="6" fill="url(#g-azul)" stroke="#1d3577" stroke-width="2"/>' +
    /* lâmpada no topo */
'   <line x1="100" y1="42" x2="100" y2="32" stroke="#6b7b92" stroke-width="5"/>' +
'   <rect x="91" y="24" width="18" height="10" rx="2" fill="#9aa9bd" stroke="#45546b" stroke-width="1.5"/>' +
'   <path d="M91,28 H109 M91,31 H109" stroke="#45546b" stroke-width="1"/>' +
'   <circle class="ed-antena" cx="100" cy="13" r="11" fill="#ffd84a" stroke="#a36d06" stroke-width="1.5"/>' +
'   <path d="M95,20 L95,13 Q100,6 105,13 L105,20" fill="none" stroke="#a36d06" stroke-width="1.3"/>' +
    /* cabeça arredondada-quadrada */
'   <rect x="36" y="40" width="128" height="126" rx="40" fill="url(#g-cabeca)" stroke="#45546b" stroke-width="2.5"/>' +
'   <rect x="48" y="56" width="104" height="102" rx="32" fill="#f3f7fb" opacity=".45"/>' +
'   <g fill="#6d7f99"><circle cx="54" cy="54" r="2.6"/><circle cx="146" cy="54" r="2.6"/><circle cx="54" cy="152" r="2.6"/><circle cx="146" cy="152" r="2.6"/></g>' +
'   <path d="M52,74 Q56,52 80,48" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/>' +

'   <ellipse class="ed-bochecha" cx="62" cy="124" rx="9" ry="5" fill="#ff7b9c"/>' +
'   <ellipse class="ed-bochecha" cx="138" cy="124" rx="9" ry="5" fill="#ff7b9c"/>' +

    /* olhos */
'   <g class="ed-olho ed-olho-e">' +
'    <ellipse cx="81" cy="96" rx="17" ry="21" fill="#fff" stroke="#3b4757" stroke-width="2"/>' +
'    <g class="ed-iris"><circle cx="85" cy="100" r="9.5" fill="url(#g-iris)"/><circle cx="85" cy="100" r="4.5" fill="#0b1b33"/><circle cx="88" cy="96" r="2.6" fill="#fff"/></g>' +
'    <g clip-path="url(#clip-olho-e)"><rect class="ed-meia" x="60" y="72" width="44" height="48" fill="#9fb0c6"/></g>' +
'    <ellipse class="ed-palpebra" cx="81" cy="96" rx="17.5" ry="21.5" fill="#aebbcc" stroke="#3b4757" stroke-width="2"/>' +
'   </g>' +
'   <g class="ed-olho ed-olho-d">' +
'    <ellipse cx="119" cy="96" rx="17" ry="21" fill="#fff" stroke="#3b4757" stroke-width="2"/>' +
'    <g class="ed-iris"><circle cx="115" cy="100" r="9.5" fill="url(#g-iris)"/><circle cx="115" cy="100" r="4.5" fill="#0b1b33"/><circle cx="118" cy="96" r="2.6" fill="#fff"/></g>' +
'    <g clip-path="url(#clip-olho-d)"><rect class="ed-meia" x="96" y="72" width="44" height="48" fill="#9fb0c6"/></g>' +
'    <ellipse class="ed-palpebra" cx="119" cy="96" rx="17.5" ry="21.5" fill="#aebbcc" stroke="#3b4757" stroke-width="2"/>' +
'   </g>' +
'   <g class="ed-x" stroke="#c0392b" stroke-width="5" stroke-linecap="round">' +
'    <path d="M71,86 L91,106 M91,86 L71,106"/><path d="M109,86 L129,106 M129,86 L109,106"/>' +
'   </g>' +

    /* sobrancelhas */
'   <path class="ed-sobrancelha ed-sob-e" d="M64,70 Q80,62 96,68" fill="none" stroke="#3b4757" stroke-width="5" stroke-linecap="round"/>' +
'   <path class="ed-sobrancelha ed-sob-d" d="M104,68 Q120,62 136,70" fill="none" stroke="#3b4757" stroke-width="5" stroke-linecap="round"/>' +

    /* bocas */
'   <g class="ed-boca ed-boca-feliz"><g class="ed-boca-anim">' +
'    <path d="M68,122 Q100,130 132,122 Q129,157 100,159 Q71,157 68,122 Z" fill="#5b0f1f" stroke="#3b0a14" stroke-width="2"/>' +
'    <g clip-path="url(#clip-boca)">' +
'     <path d="M64,118 Q100,128 136,118 L136,131 Q100,140 64,131 Z" fill="#fff"/>' +
'     <ellipse cx="100" cy="154" rx="21" ry="10" fill="#ef4f66"/>' +
'    </g>' +
'    <path d="M68,122 Q100,130 132,122" fill="none" stroke="#3b0a14" stroke-width="2"/>' +
'   </g></g>' +
'   <g class="ed-boca ed-boca-pensando"><path d="M88,138 Q104,131 118,139" fill="none" stroke="#3b0a14" stroke-width="4.5" stroke-linecap="round"/></g>' +
'   <g class="ed-boca ed-boca-surpreso"><ellipse cx="100" cy="140" rx="11" ry="14" fill="#5b0f1f" stroke="#3b0a14" stroke-width="2"/><ellipse cx="100" cy="148" rx="7" ry="4" fill="#ef4f66"/></g>' +
'   <g class="ed-boca ed-boca-triste"><path d="M80,146 Q100,130 120,146" fill="none" stroke="#3b0a14" stroke-width="5" stroke-linecap="round"/></g>' +
'   <g class="ed-boca ed-boca-bravo"><path d="M82,142 Q100,136 118,142" fill="none" stroke="#3b0a14" stroke-width="5" stroke-linecap="round"/></g>' +
'   <g class="ed-boca ed-boca-piscando"><path d="M76,126 Q104,154 128,121 Q104,138 76,126 Z" fill="#5b0f1f" stroke="#3b0a14" stroke-width="2" stroke-linejoin="round"/></g>' +
'   <g class="ed-boca ed-boca-encabulado"><path d="M85,132 Q100,145 115,132" fill="none" stroke="#3b0a14" stroke-width="4.5" stroke-linecap="round"/></g>' +
'   <g class="ed-boca ed-boca-travado"><path d="M78,142 l7,-6 l7,6 l7,-6 l7,6 l7,-6 l7,6" fill="none" stroke="#3b0a14" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></g>' +

'   <g class="ed-pensamento" fill="#fff" stroke="#9fb0c4" stroke-width="1.5">' +
'    <circle cx="150" cy="40" r="4"/><circle cx="162" cy="28" r="6"/><circle cx="178" cy="14" r="9"/>' +
'   </g>' +
'  </g>' +
' </g>' +
'</svg>';
  }

  /* Cada Ed desenhado na página é independente (o do retrato e o das
     "caras" em Quem sou eu). Os ids do SVG ganham um prefixo próprio
     para os degradês de um não dependerem do outro. */
  var contador = 0;

  function criar(el) {
    var p = 'ed' + (contador++) + '-';
    el.innerHTML = desenho().replace(/id="/g, 'id="' + p).replace(/url\(#/g, 'url(#' + p);
    var svg = el.querySelector('svg');
    var cenario = 0, humorAtual = 'feliz';
    var timerFala = null, timerVolta = null;

    function humor(h, segurarMs) {
      if (HUMORES.indexOf(h) < 0) h = 'feliz';
      humorAtual = h;
      for (var i = 0; i < HUMORES.length; i++) svg.classList.remove('humor-' + HUMORES[i]);
      svg.classList.add('humor-' + h);
      clearTimeout(timerVolta);
      if (h !== 'feliz') {
        timerVolta = setTimeout(function () { humor('feliz'); }, segurarMs || 7000);
      }
    }

    function falar(ms, humorDurante) {
      if (humorDurante) humor(humorDurante, ms + 5000);
      if (humorDurante === 'travado') return; // travado não mexe a boca
      clearTimeout(timerFala);
      svg.classList.add('falando');
      timerFala = setTimeout(function () { svg.classList.remove('falando'); }, ms);
    }

    function calar() {
      clearTimeout(timerFala);
      svg.classList.remove('falando');
    }

    function aplicarCenario() {
      var gs = svg.querySelectorAll('.cen');
      for (var i = 0; i < gs.length; i++) gs[i].style.display = (i === cenario) ? '' : 'none';
    }

    function irParaCenario(i) {
      cenario = ((i % CENARIOS.length) + CENARIOS.length) % CENARIOS.length;
      aplicarCenario();
      return CENARIOS[cenario];
    }

    return {
      humor: humor,
      falar: falar,
      calar: calar,
      irParaCenario: irParaCenario,
      proximoCenario: function () { return irParaCenario(cenario + 1); },
      get humorAtual() { return humorAtual; }
    };
  }

  // o Ed "principal" é o do retrato; Ed.humor(), Ed.falar() etc. mexem nele
  var principal = null;
  function noPrincipal(nome) {
    return function () { if (principal) return principal[nome].apply(null, arguments); };
  }

  window.Ed = {
    cenarios: CENARIOS.slice(),
    criar: criar,
    montar: function (el) { principal = criar(el); return principal; },
    humor: noPrincipal('humor'),
    falar: noPrincipal('falar'),
    calar: noPrincipal('calar'),
    proximoCenario: noPrincipal('proximoCenario'),
    irParaCenario: noPrincipal('irParaCenario'),
    get humorAtual() { return principal ? principal.humorAtual : 'feliz'; }
  };
})();
