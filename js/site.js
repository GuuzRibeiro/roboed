/* =========================================================
   Robô Ed — liga tudo: chat, menu, joguinho, quiz e enfeites
   ========================================================= */
(function () {
  'use strict';

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* sem problema */ } }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function embaralhar(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------------- o Ed ---------------- */
  Ed.montar($('#ed-retrato'));
  var moldura = $('.moldura');

  /* ---------------- céu estrelado ---------------- */
  (function () {
    var ceu = $('#estrelas'), frag = document.createDocumentFragment();
    for (var i = 0; i < 70; i++) {
      var s = document.createElement('span');
      s.className = 'estrela' + (Math.random() < 0.16 ? ' grande' : '');
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 100).toFixed(2) + '%';
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      frag.appendChild(s);
    }
    ceu.appendChild(frag);
  })();

  /* ---------------- letreiro de dicas ---------------- */
  (function () {
    var t = embaralhar(Cerebro.todasAsDicas()).join('   ★   ');
    var el = $('#ticker');
    el.textContent = t;
    el.style.setProperty('--dur', Math.max(60, Math.round(t.length / 9)) + 's');
  })();

  /* ---------------- som (bipes de robô) ---------------- */
  var somLigado = ler('ed-som') === '1';
  var actx = null;
  var btnSom = $('#btn-som');
  function pintarBtnSom() {
    btnSom.setAttribute('aria-pressed', somLigado ? 'true' : 'false');
    btnSom.textContent = '♪ som: ' + (somLigado ? 'lig.' : 'desl.');
  }
  function tom(freq, inicio, dur, vol) {
    var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + inicio;
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.04, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function bip(tipo) {
    if (!somLigado) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (tipo === 'erro') { tom(220, 0, 0.18, 0.05); tom(160, 0.2, 0.3, 0.05); }
      else if (tipo === 'clique') { tom(1400, 0, 0.04, 0.03); }
      else if (tipo === 'vitoria') { tom(660, 0, 0.1); tom(880, 0.11, 0.1); tom(1320, 0.22, 0.2); }
      else { tom(880, 0, 0.06); tom(1320, 0.07, 0.07); }
    } catch (e) { /* navegador sem áudio */ }
  }
  pintarBtnSom();
  btnSom.addEventListener('click', function () {
    somLigado = !somLigado;
    guardar('ed-som', somLigado ? '1' : '0');
    pintarBtnSom();
    bip();
  });

  /* ---------------- navegação por seções ---------------- */
  var SECOES = ['converse', 'quem-sou-eu', 'diversoes', 'blog', 'aprender', 'sobre', 'links'];
  var secaoAtual = null;
  var entrada = $('#chat-entrada');

  function irPara(hash, focar) {
    var id = String(hash || '').replace(/^#/, '');
    if (SECOES.indexOf(id) < 0) id = 'converse';
    if (secaoAtual === 'diversoes' && id !== 'diversoes') jogo.interromper();
    secaoAtual = id;
    $$('.secao').forEach(function (s) { s.classList.toggle('ativa', s.id === 'secao-' + id); });
    var sec = $('#secao-' + id);
    var titulo = sec.getAttribute('data-titulo');
    $('#titulo-pagina').textContent = titulo;
    document.title = id === 'converse' ? 'Robô Ed - Converse comigo!' : 'Robô Ed - ' + titulo;
    $$('.menu a').forEach(function (a) {
      var ativo = a.getAttribute('href') === '#' + id;
      a.classList.toggle('ativo', ativo);
      if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (id === 'converse' && focar) setTimeout(function () { entrada.focus({ preventScroll: true }); }, 30);
  }

  /* ---------------- chat ---------------- */
  var log = $('#chat-log');
  var fila = Promise.resolve();
  var historico = [];

  function formatarEd(t) {
    return esc(t)
      .replace(/\{\{([^|}]+)\|([^}]+)\}\}/g, function (_, rotulo, q) {
        return '<a href="#" class="expr" data-q="' + q + '">' + rotulo + '</a>';
      })
      .replace(/\n/g, '<br>');
  }

  function addLinha(tipo, html) {
    var d = document.createElement('div');
    d.className = 'linha linha-' + tipo;
    if (tipo === 'sistema') d.innerHTML = html;
    else d.innerHTML = '<span class="quem">' + (tipo === 'ed' ? 'Robô Ed:' : 'Você:') + '</span><span class="fala">' + html + '</span>';
    log.appendChild(d);
    while (log.children.length > 240) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function mostrarEd(texto, humor) {
    addLinha('ed', formatarEd(texto));
    bip();
    Ed.falar(Math.max(900, Math.min(3500, texto.length * 35)), humor || 'feliz');
  }

  function digitando() {
    var d = addLinha('ed', 'digitando...');
    d.classList.add('digitando');
    Ed.humor('pensando', 4000);
    return d;
  }

  function travar() {
    Ed.calar();
    Ed.humor('travado', 7000);
    bip('erro');
    moldura.classList.add('tremendo');
    setTimeout(function () { moldura.classList.remove('tremendo'); }, 2600);
    addLinha('sistema', '*** ERRO 0x0ED: grosseria demais para um robô só. Reiniciando o chip de paciência... ***');
    return esperar(2600).then(function () {
      addLinha('sistema', '*** sistema reiniciado ***');
      return esperar(500);
    }).then(function () {
      mostrarEd('Ufa! Pronto, reiniciei. Onde é que a gente estava? Ah, é: sobre o que você quer conversar?', 'feliz');
    });
  }

  function perguntar(texto) {
    texto = String(texto || '').trim();
    if (!texto) return;
    addLinha('voce', esc(texto));
    historico.push(texto);
    if (historico.length > 30) historico.shift();
    fila = fila.then(function () {
      var dig = digitando();
      var res = Cerebro.responder(texto);
      var atraso = 450 + Math.min(700, res.texto.length * 4) + Math.random() * 250;
      return esperar(atraso).then(function () {
        dig.remove();
        if (res.acao === 'travar') return travar();
        mostrarEd(res.texto, res.humor);
      });
    }).catch(function (e) {
      console.error(e);
      addLinha('sistema', '*** curto-circuito inesperado. Tente de novo! ***');
    });
  }

  $('#chat-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = entrada.value;
    entrada.value = '';
    perguntar(t);
  });

  entrada.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && !entrada.value && historico.length) {
      entrada.value = historico[historico.length - 1];
      e.preventDefault();
    }
  });

  // expressões clicáveis dentro das respostas do Ed
  log.addEventListener('click', function (e) {
    var a = e.target.closest('a.expr');
    if (!a) return;
    e.preventDefault();
    var q = a.getAttribute('data-q');
    if (q === '#mudar-imagem') { mudarImagem(); return; }
    if (q.charAt(0) === '#') { location.hash = q; return; }
    perguntar(q.charAt(0).toUpperCase() + q.slice(1));
  });

  // "Pergunte ao Ed" espalhados pelo site
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-perguntar]');
    if (!a) return;
    e.preventDefault();
    if (secaoAtual !== 'converse') location.hash = '#converse';
    perguntar(a.getAttribute('data-perguntar'));
  });

  /* ---------------- mudar imagem do Ed ----------------
     O retrato começa com fotos do Ed original e depois passa pelos
     cenários desenhados.
     - As fotos vêm direto do site da InBot (empresa que criou o Ed).
       Elas não ficam guardadas neste repositório.
     - Rodando no seu computador, se a pasta fotos/ tiver ed-1.jpg,
       ed-2.jpg..., essas fotos são usadas no lugar (a pasta está no
       .gitignore e não vai para o GitHub).
     - Se nenhuma foto carregar (sem internet, por exemplo), fica só
       o desenho. */
  var FOTOS_INBOT = [
    'https://in.bot/cases/roboed/fotos/ed-foto-2.jpg',
    'https://in.bot/assets/images/ed-orange-sm-147x196.jpg',
    'https://in.bot/cases/roboed/fotos/ed-dia-da-arvore.jpg',
    'https://in.bot/cases/roboed/fotos/ed-capacete-da-petrobras.jpg',
    'https://in.bot/cases/roboed/fotos/ed-independencia-420.jpg'
  ];
  var btnMudar = $('#btn-mudar');
  var fotoEd = $('#ed-foto');
  var imagens = Ed.cenarios.map(function (nome, i) {
    return { tipo: 'desenho', i: i, nome: 'cenário: ' + nome };
  });
  var imgAtual = 0;

  function mostrarImagem(k) {
    imgAtual = (k + imagens.length) % imagens.length;
    var im = imagens[imgAtual];
    if (im.tipo === 'foto') {
      fotoEd.src = im.src;
      moldura.classList.add('com-foto');
    } else {
      moldura.classList.remove('com-foto');
      Ed.irParaCenario(im.i);
    }
    $('#cenario-nome').textContent = im.nome;
  }

  function mudarImagem() {
    mostrarImagem(imgAtual + 1);
    Ed.humor('surpreso', 1400);
    bip('clique');
    btnMudar.classList.remove('girou');
    void btnMudar.offsetWidth;
    btnMudar.classList.add('girou');
  }
  btnMudar.addEventListener('click', mudarImagem);

  (function procurarFotos() {
    function carregar(src) {
      return new Promise(function (ok) {
        var im = new Image();
        im.onload = function () { ok(src); };
        im.onerror = function () { ok(null); };
        im.src = src;
      });
    }

    // fotos da pasta fotos/ (só quando o site roda no seu computador)
    function fotosLocais() {
      var local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      var achadas = [];
      if (!local) return Promise.resolve(achadas);
      function proxima(n) {
        if (n > 12) return Promise.resolve(achadas);
        return carregar('fotos/ed-' + n + '.jpg')
          .then(function (s) { return s || carregar('fotos/ed-' + n + '.png'); })
          .then(function (s) {
            if (!s) return achadas;
            achadas.push(s);
            return proxima(n + 1);
          });
      }
      return proxima(1);
    }

    // fotos do site da InBot (as que carregarem, na ordem da lista)
    function fotosInbot() {
      return Promise.all(FOTOS_INBOT.map(carregar)).then(function (r) {
        return r.filter(Boolean);
      });
    }

    // favicon: a foto do Ed (a primeira da InBot é quase quadrada).
    // Se não carregar, fica o desenho que está no index.html.
    carregar(FOTOS_INBOT[0]).then(function (src) {
      var icone = document.querySelector('link[rel="icon"]');
      if (src && icone) { icone.removeAttribute('type'); icone.href = src; }
    });

    fotosLocais().then(function (locais) {
      if (locais.length) return { lista: locais, credito: '' };
      return fotosInbot().then(function (l) { return { lista: l, credito: ' · InBot' }; });
    }).then(function (r) {
      if (!r.lista.length) return;
      var fotos = r.lista.map(function (src, i) {
        return { tipo: 'foto', src: src, nome: 'foto ' + (i + 1) + '/' + r.lista.length + r.credito };
      });
      var noComeco = imgAtual === 0;
      imagens = fotos.concat(imagens);
      if (noComeco) mostrarImagem(0);
      else imgAtual += fotos.length;
    });
  })();

  /* ---------------- caras do Ed (Quem sou eu) ---------------- */
  // um Ed desenhado só pra esta seção, assim o retrato do lado não muda
  var edCaras = Ed.criar($('#caras-retrato'));
  $('#caras').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-humor]');
    if (!b) return;
    var h = b.getAttribute('data-humor');
    if (h === 'falando') edCaras.falar(2600, 'feliz');
    else { edCaras.calar(); edCaras.humor(h, 5000); }
    $$('#caras button').forEach(function (x) { x.classList.toggle('ativo', x === b); });
    bip('clique');
  });

  /* ---------------- abas (Venha aprender) ---------------- */
  var abas = $$('.abas .aba');
  abas.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-aba');
      abas.forEach(function (x) { x.classList.toggle('ativa', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      $$('.aba-conteudo').forEach(function (c) { c.classList.toggle('ativa', c.getAttribute('data-conteudo') === k); });
    });
  });

  /* ---------------- indique para um amigo ---------------- */
  $('#indique').addEventListener('click', function (e) {
    e.preventDefault();
    var url = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
    var corpo = 'Lembra do Robô Ed, aquele robozinho que conversava com a gente na internet? Fizeram uma homenagem!' + (url ? '\n\n' + url : '');
    location.href = 'mailto:?subject=' + encodeURIComponent('Converse com o Robô Ed!') + '&body=' + encodeURIComponent(corpo);
  });

  /* ---------------- contador de visitas ----------------
     Conta de verdade, usando o Abacus (contador gratuito e aberto,
     sem cadastro). Cada visita conta uma vez por sessão: recarregar a
     página não aumenta o número. Rodando no seu computador, o contador
     só lê o total, para os testes não contarem como visita. */
  (function () {
    var CONTADOR = 'https://abacus.jasoncameron.dev/';
    var CHAVE = 'roboed-homenagem/visitas';
    var el = $('#contador'), caixa = el.parentNode;
    var local = location.protocol === 'file:' || /^(localhost|127\.|\[::1\])/.test(location.hostname);

    function mostrar(v) {
      var n = String(v);
      while (n.length < 6) n = '0' + n;
      el.setAttribute('aria-label', typeof v === 'number' ? String(v) : 'carregando');
      el.innerHTML = n.split('').map(function (d) { return '<span class="digito" aria-hidden="true">' + d + '</span>'; }).join('');
      caixa.hidden = false;
    }
    function sessao(k, v) {
      try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; }
    }

    var meu = parseInt(sessao('ed-visitante') || '', 10);
    if (meu > 0) { mostrar(meu); return; }   // já contou nesta sessão

    mostrar('------');   // enquanto carrega
    var rota = (local ? 'get/' : 'hit/') + CHAVE;
    var pare = window.AbortController ? new AbortController() : null;
    var relogio = setTimeout(function () { if (pare) pare.abort(); }, 7000);
    fetch(CONTADOR + rota, { cache: 'no-store', signal: pare ? pare.signal : undefined })
      .then(function (r) {
        if (r.status === 404) return { value: 0 };   // ninguém contou ainda
        if (!r.ok) throw new Error('contador ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var v = parseInt(d && d.value, 10);
        if (!(v >= 0)) throw new Error('contador sem número');
        if (!local) { sessao('ed-visitante', String(v)); guardar('ed-contador', v); }
        mostrar(v);
      })
      .catch(function () {
        // sem internet ou serviço fora do ar: mostra o último número visto, se tiver
        var ultimo = parseInt(ler('ed-contador') || '', 10);
        if (!local && ultimo > 0) mostrar(ultimo); else caixa.hidden = true;
      })
      .then(function () { clearTimeout(relogio); });
  })();

  /* =========================================================
     Diversões 1: Apague as luzes!
     ========================================================= */
  var jogo = (function () {
    var TOTAL = 20, LIMITE = 10, DURACAO = 40;
    var predio = $('#predio'), msg = $('#jogo-msg'), msgTexto = $('#jogo-msg-texto'), btn = $('#jogo-iniciar');
    var elPontos = $('#jogo-pontos'), elTempo = $('#jogo-tempo'), elAcesas = $('#jogo-acesas'), elRecorde = $('#jogo-recorde'), elKwh = $('#jogo-kwh');
    var janelas = [], rodando = false, pontos = 0, tempo = DURACAO, acesas = 0, kwh = 0;
    var tAcender = null, tRelogio = null;
    var recorde = parseInt(ler('ed-recorde') || '0', 10) || 0;
    elRecorde.textContent = recorde;

    for (var i = 0; i < TOTAL; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'janela';
      b.setAttribute('aria-label', 'Janela ' + (i + 1));
      b.addEventListener('click', apagar.bind(null, i));
      predio.appendChild(b);
      janelas.push(b);
    }

    function hud() {
      elPontos.textContent = pontos;
      elTempo.textContent = tempo;
      elAcesas.textContent = acesas;
      elKwh.textContent = 'Energia economizada: ' + kwh.toFixed(1).replace('.', ',') + ' kWh';
    }

    function acenderUma() {
      var apagadas = janelas.filter(function (j) { return !j.classList.contains('acesa'); });
      if (!apagadas.length) return;
      apagadas[Math.floor(Math.random() * apagadas.length)].classList.add('acesa');
      acesas++;
      hud();
      if (acesas >= LIMITE) { fim(false); return; }
      if (acesas >= 7) Ed.humor('surpreso', 1200);
    }

    function agendar() {
      var intervalo = Math.max(380, 900 - (DURACAO - tempo) * 13);
      tAcender = setTimeout(function () {
        if (!rodando) return;
        acenderUma();
        if (rodando) agendar();
      }, intervalo);
    }

    function apagar(i) {
      var j = janelas[i];
      if (!rodando || !j.classList.contains('acesa')) return;
      j.classList.remove('acesa');
      acesas--;
      pontos += 10;
      kwh += 0.1;
      bip('clique');
      hud();
    }

    function iniciar() {
      janelas.forEach(function (j) { j.classList.remove('acesa'); });
      pontos = 0; tempo = DURACAO; acesas = 0; kwh = 0;
      rodando = true;
      msg.hidden = true;
      hud();
      acenderUma(); acenderUma();
      agendar();
      tRelogio = setInterval(function () {
        tempo--;
        hud();
        if (tempo <= 0) fim(true);
      }, 1000);
      Ed.humor('feliz');
      if (janelas[0]) janelas[0].focus({ preventScroll: true });
    }

    function parar() {
      rodando = false;
      clearTimeout(tAcender);
      clearInterval(tRelogio);
    }

    function fim(venceu) {
      parar();
      var novo = pontos > recorde;
      if (novo) { recorde = pontos; guardar('ed-recorde', recorde); elRecorde.textContent = recorde; }
      var kwhTxt = kwh.toFixed(1).replace('.', ',');
      if (venceu) {
        msgTexto.innerHTML = '<b>Parabéns, Guardião da Energia!</b><br>Você aguentou os 40 segundos, fez ' + pontos + ' pontos e economizou ' + kwhTxt + ' kWh.' + (novo ? '<br>★ NOVO RECORDE! ★' : '');
        Ed.falar(2400, 'feliz');
        bip('vitoria');
      } else {
        msgTexto.innerHTML = '<b>Ih, desperdício total!</b><br>Dez luzes acesas ao mesmo tempo. Você fez ' + pontos + ' pontos.' + (novo ? '<br>★ Mas é um NOVO RECORDE! ★' : '');
        Ed.humor('triste', 3500);
        bip('erro');
      }
      btn.textContent = 'JOGAR DE NOVO';
      msg.hidden = false;
      btn.focus({ preventScroll: true });
    }

    function interromper() {
      if (!rodando) return;
      parar();
      msgTexto.textContent = 'Jogo pausado enquanto você passeava pelo site. Bora de novo?';
      btn.textContent = 'RECOMEÇAR';
      msg.hidden = false;
    }

    btn.addEventListener('click', iniciar);
    hud();
    return { interromper: interromper };
  })();

  /* =========================================================
     Diversões 2: Quiz do Guardião da Energia
     ========================================================= */
  (function () {
    var PERGUNTAS = [
      { p: 'Qual destes costuma ser um dos aparelhos que mais gastam energia numa casa brasileira?',
        ops: ['Chuveiro elétrico', 'Rádio-relógio', 'Carregador de celular', 'Lâmpada LED'],
        e: 'O chuveiro elétrico é um dos campeões de consumo. Banho curto e posição "verão" nos dias quentes fazem diferença!' },
      { p: 'Um aparelho desligado no controle, com a luzinha vermelha acesa (stand-by)...',
        ops: ['continua gastando um pouco de energia', 'não gasta nada', 'gera energia', 'só gasta durante o dia'],
        e: 'A luzinha não é enfeite: o aparelho continua consumindo. Se vai ficar muito tempo sem usar, tire da tomada.' },
      { p: 'A energia eólica vem...',
        ops: ['do vento', 'do petróleo', 'do carvão mineral', 'das ondas do rádio'],
        e: 'O vento gira as pás dos aerogeradores. É uma fonte renovável, e o Nordeste brasileiro tem ventos excelentes.' },
      { p: 'Qual é o jeito certo de usar a geladeira?',
        ops: ['Abrir só quando precisar e fechar logo', 'Guardar a comida ainda quente', 'Secar roupa atrás dela', 'Deixar a porta só encostada'],
        e: 'Porta aberta deixa o frio fugir, e comida quente faz o motor trabalhar dobrado.' },
      { p: 'Em que unidade vem medida a energia na sua conta de luz?',
        ops: ['kWh (quilowatt-hora)', 'km/h', 'Litros', 'Graus Celsius'],
        e: '1 kWh é a energia que um aparelho de 1.000 watts gasta ligado durante uma hora.' },
      { p: 'Qual destas lâmpadas gasta menos energia para iluminar o mesmo tanto?',
        ops: ['LED', 'Incandescente', 'Halógena', 'Todas gastam igual'],
        e: 'A LED ilumina o mesmo gastando bem menos energia, e ainda dura muito mais.' },
      { p: 'O etanol usado nos carros brasileiros é feito principalmente de...',
        ops: ['cana-de-açúcar', 'petróleo', 'carvão mineral', 'areia da praia'],
        e: 'O Brasil usa etanol de cana como combustível desde os anos 1970, com o Proálcool.' },
      { p: 'Na cozinha, qual destas atitudes economiza gás?',
        ops: ['Cozinhar com a panela tampada', 'Deixar a chama passar do fundo da panela', 'Abrir o forno toda hora para espiar', 'Usar panela pequena na boca grande'],
        e: 'Com a tampa, o alimento fica pronto mais rápido. E chama passando do fundo da panela é gás jogado fora!' },
      { p: 'Lá no fundo, de onde vem a energia dos ventos?',
        ops: ['Do Sol, que esquenta o ar de forma desigual', 'Da Lua', 'Dos aviões passando', 'Das árvores balançando'],
        e: 'O Sol aquece partes da Terra de jeitos diferentes, o ar se movimenta, e pronto: vento! Quase toda energia da Terra vem do Sol.' }
    ];
    var caixa = $('#quiz');
    var ordem, n, acertos;

    function titulo(a) {
      if (a <= 3) return 'Lâmpada queimada';
      if (a <= 6) return 'Aprendiz de Guardião';
      if (a <= 8) return 'Guardião da Energia!';
      return 'Guardião Supremo';
    }

    function comecar() {
      ordem = embaralhar(PERGUNTAS.slice());
      n = 0; acertos = 0;
      mostrar();
    }

    function mostrar() {
      var q = ordem[n];
      var ops = embaralhar(q.ops.map(function (t, i) { return { t: t, certa: i === 0 }; }));
      caixa.innerHTML =
        '<div class="quiz-progresso">PERGUNTA ' + (n + 1) + '/' + ordem.length + ' · ACERTOS: ' + acertos + '</div>' +
        '<div class="quiz-pergunta">' + esc(q.p) + '</div>' +
        '<div class="quiz-ops">' + ops.map(function (o, i) {
          return '<button type="button" class="quiz-op" data-i="' + i + '">' + String.fromCharCode(65 + i) + ') ' + esc(o.t) + '</button>';
        }).join('') + '</div>';
      $$('.quiz-op', caixa).forEach(function (b) {
        b.addEventListener('click', function () { responder(b, ops); });
      });
    }

    function responder(b, ops) {
      var escolhida = ops[+b.getAttribute('data-i')];
      var botoes = $$('.quiz-op', caixa);
      botoes.forEach(function (x, i) {
        x.disabled = true;
        if (ops[i].certa) x.classList.add('certa');
      });
      if (escolhida.certa) { acertos++; Ed.humor('feliz'); bip(); }
      else { b.classList.add('errada'); Ed.humor('triste', 2500); bip('erro'); }
      var ultima = n === ordem.length - 1;
      var expl = document.createElement('div');
      expl.className = 'quiz-expl';
      expl.innerHTML = '<b>' + (escolhida.certa ? 'Acertou!' : 'Quase!') + '</b> ' + esc(ordem[n].e);
      var rod = document.createElement('div');
      rod.className = 'quiz-rodape';
      rod.innerHTML = '<button type="button" class="btn-retro">' + (ultima ? 'VER RESULTADO »' : 'PRÓXIMA »') + '</button>';
      caixa.appendChild(expl);
      caixa.appendChild(rod);
      $('.quiz-progresso', caixa).textContent = 'PERGUNTA ' + (n + 1) + '/' + ordem.length + ' · ACERTOS: ' + acertos;
      var prox = $('button', rod);
      prox.addEventListener('click', function () {
        if (ultima) final(); else { n++; mostrar(); }
      });
      prox.focus({ preventScroll: true });
    }

    function final() {
      var t = titulo(acertos);
      caixa.innerHTML =
        '<div class="quiz-final">' +
        '<div class="placar">' + acertos + '/' + ordem.length + '</div>' +
        '<div class="titulo">' + t + '</div>' +
        '<p>' + (acertos === ordem.length ? 'Gabaritou! Até eu fiquei com inveja.' :
                 acertos >= 7 ? 'Mandou muito bem! Sua casa deve ser a mais econômica da rua.' :
                 acertos >= 4 ? 'Bom começo! Dá uma passada em "Venha aprender" e tenta de novo.' :
                 'Ih, deu curto-circuito! Mas todo Guardião começa assim. Tenta de novo!') + '</p>' +
        '<button type="button" class="btn-retro">JOGAR DE NOVO</button>' +
        '</div>';
      if (acertos >= 7) { Ed.falar(2200, 'feliz'); bip('vitoria'); } else Ed.humor('piscando', 2500);
      $('button', caixa).addEventListener('click', comecar);
    }

    comecar();
  })();

  /* ---------------- partida ---------------- */
  window.addEventListener('hashchange', function () { irPara(location.hash, true); });
  irPara(location.hash, false);

  fila = fila.then(function () {
    return esperar(500).then(function () {
      var d = digitando();
      return esperar(900).then(function () {
        d.remove();
        mostrarEd(Cerebro.saudacaoInicial, 'feliz');
      });
    });
  });
})();
