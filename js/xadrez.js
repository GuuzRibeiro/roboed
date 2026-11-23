/* =========================================================
   Robô Ed — xadrez contra o Ed

   O Ed tem dois "cérebros" de xadrez:
   - Stockfish, um dos motores de xadrez mais fortes do mundo (o mesmo
     tipo de motor que os sites de xadrez usam nos bots deles). Ele é
     carregado de um CDN e roda num Web Worker, sem travar a página.
     O nível é regulado pelo "Skill Level", do mesmo jeito que os bots
     fazem para jogar mais fraco ou mais forte.
   - Um motor próprio, mais simples, escrito aqui embaixo. Ele entra em
     campo quando o Stockfish não carrega (sem internet, por exemplo).

   As regras são completas: roque, en passant, promoção, xeque-mate,
   afogamento, regra dos 50 lances, tripla repetição e material
   insuficiente.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------
     Núcleo: regras + motor reserva.
     Tudo fica dentro desta função porque ela também é copiada para
     dentro de um Web Worker (o motor reserva pensa lá, sem travar a
     página). Por isso ela não pode usar nada de fora dela.
     --------------------------------------------------------- */
  function nucleo(G) {
    // tabuleiro 0x88: casa = linha * 16 + coluna (a1 = 0, h1 = 7, a8 = 112, h8 = 119)
    var PEAO = 1, CAVALO = 2, BISPO = 3, TORRE = 4, DAMA = 5, REI = 6, PRETA = 8;
    var CAPTURA = 1, DUPLO = 2, EP = 4, ROQUE = 8, PROMO = 16;
    var INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    var D_CAVALO = [-33, -31, -18, -14, 14, 18, 31, 33];
    var D_BISPO = [-17, -15, 15, 17];
    var D_TORRE = [-16, -1, 1, 16];
    var D_REI = [-17, -16, -15, -1, 1, 15, 16, 17];
    var LETRA = { p: PEAO, n: CAVALO, b: BISPO, r: TORRE, q: DAMA, k: REI };
    var FEN_LETRA = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

    // direitos de roque: 1 = branco pequeno, 2 = branco grande, 4 = preto pequeno, 8 = preto grande
    var DIREITOS = [];
    for (var i = 0; i < 128; i++) DIREITOS[i] = 15;
    DIREITOS[0] = 13; DIREITOS[7] = 14; DIREITOS[4] = 12;
    DIREITOS[112] = 7; DIREITOS[119] = 11; DIREITOS[116] = 3;

    // números aleatórios fixos para o "hash" (Zobrist) de cada posição
    var semente = 0x2f6b1d3;
    function aleat() {
      semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5;
      return semente | 0;
    }
    var Z = [], ZC = [], ZE = [], ZL = aleat();
    for (var p = 0; p < 16; p++) { Z[p] = []; for (var c = 0; c < 128; c++) Z[p][c] = aleat(); }
    for (i = 0; i < 16; i++) ZC[i] = aleat();
    for (i = 0; i < 8; i++) ZE[i] = aleat();

    function nomeCasa(c) { return 'abcdefgh'.charAt(c & 7) + ((c >> 4) + 1); }
    function casaDoNome(n) { return (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97); }

    function calcularHash(s) {
      var h = 0;
      for (var c = 0; c < 128; c++) {
        if (c & 0x88) { c += 7; continue; }
        if (s.b[c]) h ^= Z[s.b[c]][c];
      }
      h ^= ZC[s.roque];
      if (s.ep >= 0) h ^= ZE[s.ep & 7];
      if (s.lado) h ^= ZL;
      return h | 0;
    }

    function daFEN(fen) {
      var partes = String(fen || INICIAL).trim().split(/\s+/);
      var s = { b: new Array(128), lado: 0, roque: 0, ep: -1, meio: 0, lance: 1, rei: [-1, -1], hist: [], hash: 0 };
      for (var c = 0; c < 128; c++) s.b[c] = 0;
      var linha = 7, col = 0;
      for (var k = 0; k < partes[0].length; k++) {
        var ch = partes[0].charAt(k);
        if (ch === '/') { linha--; col = 0; continue; }
        if (ch >= '1' && ch <= '8') { col += +ch; continue; }
        var tipo = LETRA[ch.toLowerCase()];
        if (!tipo) throw new Error('FEN inválido');
        var cor = ch === ch.toLowerCase() ? PRETA : 0;
        var casa = linha * 16 + col;
        s.b[casa] = tipo | cor;
        if (tipo === REI) s.rei[cor >> 3] = casa;
        col++;
      }
      s.lado = partes[1] === 'b' ? PRETA : 0;
      var r = partes[2] || '-';
      if (r.indexOf('K') >= 0) s.roque |= 1;
      if (r.indexOf('Q') >= 0) s.roque |= 2;
      if (r.indexOf('k') >= 0) s.roque |= 4;
      if (r.indexOf('q') >= 0) s.roque |= 8;
      s.ep = partes[3] && partes[3] !== '-' ? casaDoNome(partes[3]) : -1;
      s.meio = parseInt(partes[4] || '0', 10) || 0;
      s.lance = parseInt(partes[5] || '1', 10) || 1;
      s.hash = calcularHash(s);
      return s;
    }

    function paraFEN(s) {
      var out = '';
      for (var linha = 7; linha >= 0; linha--) {
        var vazias = 0;
        for (var col = 0; col < 8; col++) {
          var p = s.b[linha * 16 + col];
          if (!p) { vazias++; continue; }
          if (vazias) { out += vazias; vazias = 0; }
          var l = FEN_LETRA[p & 7];
          out += p & PRETA ? l : l.toUpperCase();
        }
        if (vazias) out += vazias;
        if (linha) out += '/';
      }
      var r = (s.roque & 1 ? 'K' : '') + (s.roque & 2 ? 'Q' : '') + (s.roque & 4 ? 'k' : '') + (s.roque & 8 ? 'q' : '');
      return out + ' ' + (s.lado ? 'b' : 'w') + ' ' + (r || '-') + ' ' + (s.ep >= 0 ? nomeCasa(s.ep) : '-') + ' ' + s.meio + ' ' + s.lance;
    }

    // a casa c é atacada por alguma peça da cor "por" (0 = brancas, 8 = pretas)?
    function atacada(s, c, por) {
      var b = s.b, x, k, d, p;
      if (por === 0) {
        x = c - 15; if (!(x & 0x88) && b[x] === PEAO) return true;
        x = c - 17; if (!(x & 0x88) && b[x] === PEAO) return true;
      } else {
        x = c + 15; if (!(x & 0x88) && b[x] === (PEAO | PRETA)) return true;
        x = c + 17; if (!(x & 0x88) && b[x] === (PEAO | PRETA)) return true;
      }
      for (k = 0; k < 8; k++) {
        x = c + D_CAVALO[k]; if (!(x & 0x88) && b[x] === (CAVALO | por)) return true;
        x = c + D_REI[k]; if (!(x & 0x88) && b[x] === (REI | por)) return true;
      }
      for (k = 0; k < 4; k++) {
        d = D_BISPO[k]; x = c + d;
        while (!(x & 0x88)) {
          p = b[x];
          if (p) { if (p === (BISPO | por) || p === (DAMA | por)) return true; break; }
          x += d;
        }
        d = D_TORRE[k]; x = c + d;
        while (!(x & 0x88)) {
          p = b[x];
          if (p) { if (p === (TORRE | por) || p === (DAMA | por)) return true; break; }
          x += d;
        }
      }
      return false;
    }

    function emXeque(s) { return atacada(s, s.rei[s.lado >> 3], s.lado ^ PRETA); }

    function lance(de, para, peca, capt, promo, flags) {
      return { de: de, para: para, p: peca, c: capt, pr: promo, fl: flags };
    }

    function addPeao(lista, de, para, peca, capt, ultima, lado, soDama) {
      var fl = capt ? CAPTURA : 0;
      if ((para >> 4) === ultima) {
        lista.push(lance(de, para, peca, capt, DAMA, fl | PROMO));
        if (soDama) return;
        lista.push(lance(de, para, peca, capt, CAVALO, fl | PROMO));
        lista.push(lance(de, para, peca, capt, TORRE, fl | PROMO));
        lista.push(lance(de, para, peca, capt, BISPO, fl | PROMO));
      } else lista.push(lance(de, para, peca, capt, 0, fl));
    }

    // lances "pseudo-legais" (ainda podem deixar o próprio rei em xeque)
    function gerar(s, soCapturas) {
      var lista = [], b = s.b, lado = s.lado, inim = lado ^ PRETA;
      for (var c = 0; c < 128; c++) {
        if (c & 0x88) { c += 7; continue; }
        var p = b[c];
        if (!p || (p & PRETA) !== lado) continue;
        var t = p & 7, k, x, d;
        if (t === PEAO) {
          var dir = lado ? -16 : 16, ini = lado ? 6 : 1, ult = lado ? 0 : 7;
          x = c + dir;
          if (!(x & 0x88) && !b[x]) {
            if (!soCapturas || (x >> 4) === ult) addPeao(lista, c, x, p, 0, ult, lado, soCapturas);
            if (!soCapturas && (c >> 4) === ini && !b[x + dir]) lista.push(lance(c, x + dir, p, 0, 0, DUPLO));
          }
          for (k = 0; k < 2; k++) {
            x = c + dir + (k ? 1 : -1);
            if (x & 0x88) continue;
            if (b[x] && (b[x] & PRETA) === inim) addPeao(lista, c, x, p, b[x], ult, lado, soCapturas);
            else if (x === s.ep) lista.push(lance(c, x, p, PEAO | inim, 0, CAPTURA | EP));
          }
        } else if (t === CAVALO || t === REI) {
          var ds = t === CAVALO ? D_CAVALO : D_REI;
          for (k = 0; k < 8; k++) {
            x = c + ds[k];
            if (x & 0x88) continue;
            if (!b[x]) { if (!soCapturas) lista.push(lance(c, x, p, 0, 0, 0)); }
            else if ((b[x] & PRETA) === inim) lista.push(lance(c, x, p, b[x], 0, CAPTURA));
          }
          if (t === REI && !soCapturas) roques(s, lista, c, p);
        } else {
          var dirs = t === BISPO ? D_BISPO : t === TORRE ? D_TORRE : D_REI;
          for (k = 0; k < dirs.length; k++) {
            d = dirs[k]; x = c + d;
            while (!(x & 0x88)) {
              if (!b[x]) { if (!soCapturas) lista.push(lance(c, x, p, 0, 0, 0)); }
              else { if ((b[x] & PRETA) === inim) lista.push(lance(c, x, p, b[x], 0, CAPTURA)); break; }
              x += d;
            }
          }
        }
      }
      return lista;
    }

    function roques(s, lista, c, p) {
      var b = s.b, lado = s.lado, inim = lado ^ PRETA;
      if (lado === 0 && c === 4) {
        if ((s.roque & 1) && !b[5] && !b[6] && b[7] === TORRE && !atacada(s, 4, inim) && !atacada(s, 5, inim) && !atacada(s, 6, inim))
          lista.push(lance(4, 6, p, 0, 0, ROQUE));
        if ((s.roque & 2) && !b[3] && !b[2] && !b[1] && b[0] === TORRE && !atacada(s, 4, inim) && !atacada(s, 3, inim) && !atacada(s, 2, inim))
          lista.push(lance(4, 2, p, 0, 0, ROQUE));
      } else if (lado === PRETA && c === 116) {
        if ((s.roque & 4) && !b[117] && !b[118] && b[119] === (TORRE | PRETA) && !atacada(s, 116, inim) && !atacada(s, 117, inim) && !atacada(s, 118, inim))
          lista.push(lance(116, 118, p, 0, 0, ROQUE));
        if ((s.roque & 8) && !b[115] && !b[114] && !b[113] && b[112] === (TORRE | PRETA) && !atacada(s, 116, inim) && !atacada(s, 115, inim) && !atacada(s, 114, inim))
          lista.push(lance(116, 114, p, 0, 0, ROQUE));
      }
    }

    function torreDoRoque(para) {
      if (para === 6) return [7, 5];
      if (para === 2) return [0, 3];
      if (para === 118) return [119, 117];
      return [112, 115];
    }

    // faz o lance; devolve false (e desfaz) se ele deixar o próprio rei em xeque
    function fazer(s, m) {
      var b = s.b, lado = s.lado, h = s.hash;
      s.hist.push({ m: m, roque: s.roque, ep: s.ep, meio: s.meio, lance: s.lance, hash: h });
      h ^= Z[m.p][m.de];
      b[m.de] = 0;
      if (m.fl & EP) {
        var cc = m.para + (lado ? 16 : -16);
        h ^= Z[b[cc]][cc]; b[cc] = 0;
      } else if (m.c) h ^= Z[m.c][m.para];
      var nova = m.pr ? (m.pr | lado) : m.p;
      b[m.para] = nova; h ^= Z[nova][m.para];
      if (m.fl & ROQUE) {
        var tr = torreDoRoque(m.para), torre = b[tr[0]];
        b[tr[0]] = 0; b[tr[1]] = torre;
        h ^= Z[torre][tr[0]] ^ Z[torre][tr[1]];
      }
      if ((m.p & 7) === REI) s.rei[lado >> 3] = m.para;
      h ^= ZC[s.roque];
      s.roque &= DIREITOS[m.de] & DIREITOS[m.para];
      h ^= ZC[s.roque];
      if (s.ep >= 0) h ^= ZE[s.ep & 7];
      s.ep = (m.fl & DUPLO) ? (m.de + m.para) >> 1 : -1;
      if (s.ep >= 0) h ^= ZE[s.ep & 7];
      s.meio = ((m.p & 7) === PEAO || m.c) ? 0 : s.meio + 1;
      if (lado) s.lance++;
      s.lado ^= PRETA; h ^= ZL;
      s.hash = h | 0;
      if (atacada(s, s.rei[lado >> 3], s.lado)) { desfazer(s); return false; }
      return true;
    }

    function desfazer(s) {
      var u = s.hist.pop(), m = u.m, b = s.b;
      s.lado ^= PRETA;
      if (m) {
        var lado = s.lado;
        b[m.de] = m.p;
        if (m.fl & EP) { b[m.para] = 0; b[m.para + (lado ? 16 : -16)] = m.c; }
        else b[m.para] = m.c;
        if (m.fl & ROQUE) {
          var tr = torreDoRoque(m.para);
          b[tr[0]] = b[tr[1]]; b[tr[1]] = 0;
        }
        if ((m.p & 7) === REI) s.rei[lado >> 3] = m.de;
      }
      s.roque = u.roque; s.ep = u.ep; s.meio = u.meio; s.lance = u.lance; s.hash = u.hash;
    }

    // "lance nulo": passa a vez (só usado pelo motor para podar a busca)
    function fazerNulo(s) {
      s.hist.push({ m: null, roque: s.roque, ep: s.ep, meio: s.meio, lance: s.lance, hash: s.hash });
      var h = s.hash;
      if (s.ep >= 0) h ^= ZE[s.ep & 7];
      s.ep = -1; s.meio++;
      s.lado ^= PRETA; h ^= ZL;
      s.hash = h | 0;
    }

    function legais(s) {
      var lista = gerar(s, false), ok = [];
      for (var k = 0; k < lista.length; k++) if (fazer(s, lista[k])) { desfazer(s); ok.push(lista[k]); }
      return ok;
    }

    function paraUCI(m) {
      return nomeCasa(m.de) + nomeCasa(m.para) + (m.pr ? FEN_LETRA[m.pr] : '');
    }

    function acharUCI(s, uci) {
      var lista = legais(s);
      for (var k = 0; k < lista.length; k++) if (paraUCI(lista[k]) === uci) return lista[k];
      // promoção sem letra: assume dama
      for (k = 0; k < lista.length; k++) if (paraUCI(lista[k]) === uci + 'q') return lista[k];
      return null;
    }

    // notação em português: R rei, D dama, T torre, B bispo, C cavalo
    var LETRA_PT = ['', '', 'C', 'B', 'T', 'D', 'R'];
    function notacao(s, m) {
      var t = m.p & 7, txt;
      if (m.fl & ROQUE) txt = (m.para & 7) === 6 ? 'O-O' : 'O-O-O';
      else {
        txt = LETRA_PT[t];
        if (t === PEAO) {
          if (m.c) txt = nomeCasa(m.de).charAt(0);
        } else {
          var lista = legais(s), mesmaCol = false, mesmaLin = false, outro = false;
          for (var k = 0; k < lista.length; k++) {
            var o = lista[k];
            if (o.para !== m.para || o.de === m.de || o.p !== m.p) continue;
            outro = true;
            if ((o.de & 7) === (m.de & 7)) mesmaCol = true;
            if ((o.de >> 4) === (m.de >> 4)) mesmaLin = true;
          }
          if (outro) {
            if (!mesmaCol) txt += nomeCasa(m.de).charAt(0);
            else if (!mesmaLin) txt += nomeCasa(m.de).charAt(1);
            else txt += nomeCasa(m.de);
          }
        }
        if (m.c) txt += 'x';
        txt += nomeCasa(m.para);
        if (m.pr) txt += '=' + LETRA_PT[m.pr];
      }
      if (fazer(s, m)) {
        if (emXeque(s)) txt += legais(s).length ? '+' : '#';
        desfazer(s);
      }
      return txt;
    }

    function materialInsuficiente(s) {
      var menores = 0, cores = [0, 0];
      for (var c = 0; c < 128; c++) {
        if (c & 0x88) { c += 7; continue; }
        var t = s.b[c] & 7;
        if (!t || t === REI) continue;
        if (t === PEAO || t === TORRE || t === DAMA) return false;
        menores++;
        if (t === BISPO) cores[((c >> 4) + (c & 7)) & 1]++;
        else cores[0] = cores[1] = 99;   // cavalo
      }
      if (menores <= 1) return true;
      // só bispos, todos em casas da mesma cor
      return (cores[0] === 0 || cores[1] === 0) && cores[0] + cores[1] === menores;
    }

    // quantas vezes a posição atual já apareceu (contando a atual)
    function vezesNaPartida(s) {
      var n = 1, h = s.hist;
      for (var k = h.length - 2, lim = Math.max(0, h.length - s.meio); k >= lim; k -= 2) if (h[k].hash === s.hash) n++;
      return n;
    }

    // como está a partida: null (seguindo), 'mate', 'afogado', '50', 'repeticao', 'material'
    function situacao(s) {
      if (!legais(s).length) return emXeque(s) ? 'mate' : 'afogado';
      if (s.meio >= 100) return '50';
      if (materialInsuficiente(s)) return 'material';
      if (vezesNaPartida(s) >= 3) return 'repeticao';
      return null;
    }

    function perft(s, prof) {
      if (!prof) return 1;
      var lista = gerar(s, false), n = 0;
      for (var k = 0; k < lista.length; k++) if (fazer(s, lista[k])) { n += perft(s, prof - 1); desfazer(s); }
      return n;
    }

    /* ---------------- motor reserva ----------------
       Busca alfa-beta com aprofundamento iterativo, tabela de
       transposição, lance nulo, redução de lances tardios e busca de
       quietude. Avaliação: material + tabelas de posição (as clássicas
       "simplified evaluation" de Tomasz Michniewski). */
    var VALOR = [0, 100, 320, 330, 500, 900, 0];
    // tabelas do ponto de vista das brancas, linha 8 primeiro
    var TAB = [null,
      [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
       0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
       -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
       -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
      [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
       -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
      [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
       0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
      [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
       -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
    ];
    var REI_FINAL = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
    var FASE = [0, 0, 1, 1, 2, 4, 0];

    // nota da posição, do ponto de vista de quem joga
    function avaliar(s) {
      var b = s.b, mg = [0, 0], fase = 0, bispos = [0, 0], reiIdx = [0, 0];
      for (var c = 0; c < 128; c++) {
        if (c & 0x88) { c += 7; continue; }
        var p = b[c];
        if (!p) continue;
        var t = p & 7, cor = p >> 3, linha = c >> 4, col = c & 7;
        var idx = cor ? linha * 8 + col : (7 - linha) * 8 + col;
        fase += FASE[t];
        if (t === REI) { reiIdx[cor] = idx; continue; }
        if (t === BISPO) bispos[cor]++;
        mg[cor] += VALOR[t] + TAB[t][idx];
      }
      if (fase > 24) fase = 24;
      for (var k = 0; k < 2; k++) {
        mg[k] += Math.round((TAB[REI][reiIdx[k]] * fase + REI_FINAL[reiIdx[k]] * (24 - fase)) / 24);
        if (bispos[k] >= 2) mg[k] += 30;
      }
      var v = mg[0] - mg[1];
      return s.lado ? -v : v;
    }

    function temPecas(s, lado) {
      for (var c = 0; c < 128; c++) {
        if (c & 0x88) { c += 7; continue; }
        var p = s.b[c];
        if (p && (p & PRETA) === lado && (p & 7) !== PEAO && (p & 7) !== REI) return true;
      }
      return false;
    }

    function repetidaNaBusca(s) {
      var h = s.hist;
      for (var k = h.length - 2, lim = Math.max(0, h.length - s.meio); k >= lim; k -= 2) if (h[k].hash === s.hash) return true;
      return false;
    }

    var MATE = 100000, INF = 1000000;
    var TT_TAM = 1 << 18, TT_MASK = TT_TAM - 1;
    var ttChave = new Int32Array(TT_TAM), ttLance = new Int32Array(TT_TAM), ttNota = new Int32Array(TT_TAM);
    var ttProf = new Int8Array(TT_TAM), ttTipo = new Int8Array(TT_TAM);   // 1 exato, 2 mínimo, 3 máximo
    var killers = [], historia = [], nos = 0, limite = 0, parado = false, melhorRaiz = null;

    function codigo(m) { return m.de | (m.para << 7) | (m.pr << 14); }

    function ordenar(lista, ttM, ply) {
      var k1 = killers[ply] && killers[ply][0], k2 = killers[ply] && killers[ply][1];
      for (var k = 0; k < lista.length; k++) {
        var m = lista[k], cod = codigo(m), n;
        if (cod === ttM) n = 1e7;
        else if (m.c) n = 1e6 + VALOR[m.c & 7] * 10 - VALOR[m.p & 7] / 10;
        else if (m.pr) n = 9e5 + VALOR[m.pr];
        else if (cod === k1) n = 8e5;
        else if (cod === k2) n = 7e5;
        else n = historia[(m.p << 7) | m.para] || 0;
        m.n = n;
      }
      lista.sort(function (a, b) { return b.n - a.n; });
    }

    function quietude(s, alfa, beta, ply) {
      if ((++nos & 2047) === 0 && Date.now() > limite) parado = true;
      if (parado) return 0;
      var parada = avaliar(s);
      if (parada >= beta) return parada;
      if (parada > alfa) alfa = parada;
      if (ply > 60) return parada;
      var lista = gerar(s, true);
      ordenar(lista, 0, 63);
      for (var k = 0; k < lista.length; k++) {
        var m = lista[k];
        if (!m.pr && parada + VALOR[m.c & 7] + 200 < alfa) continue;   // nem ganhando a peça adianta
        if (!fazer(s, m)) continue;
        var v = -quietude(s, -beta, -alfa, ply + 1);
        desfazer(s);
        if (parado) return 0;
        if (v >= beta) return v;
        if (v > alfa) alfa = v;
      }
      return alfa;
    }

    function busca(s, prof, alfa, beta, ply, podeNulo) {
      if ((++nos & 2047) === 0 && Date.now() > limite) parado = true;
      if (parado) return 0;
      if (ply && (s.meio >= 100 || repetidaNaBusca(s))) return 0;
      var xeque = emXeque(s);
      if (xeque) prof++;
      if (prof <= 0) return quietude(s, alfa, beta, ply);

      var i = s.hash & TT_MASK, ttM = 0;
      if (ttChave[i] === s.hash) {
        ttM = ttLance[i];
        if (ply && ttProf[i] >= prof) {
          var nt = ttNota[i];
          if (nt > MATE - 500) nt -= ply; else if (nt < -MATE + 500) nt += ply;
          if (ttTipo[i] === 1 || (ttTipo[i] === 2 && nt >= beta) || (ttTipo[i] === 3 && nt <= alfa)) return nt;
        }
      }

      if (podeNulo && !xeque && ply && prof >= 3 && beta < MATE - 500 && temPecas(s, s.lado) && avaliar(s) >= beta) {
        fazerNulo(s);
        var vn = -busca(s, prof - 3, -beta, -beta + 1, ply + 1, false);
        desfazer(s);
        if (parado) return 0;
        if (vn >= beta) return beta;
      }

      var lista = gerar(s, false);
      ordenar(lista, ttM, ply);
      var melhor = -INF, melhorM = null, jogados = 0, alfaIni = alfa;
      for (var k = 0; k < lista.length; k++) {
        var m = lista[k];
        if (!fazer(s, m)) continue;
        jogados++;
        var v;
        if (jogados === 1) v = -busca(s, prof - 1, -beta, -alfa, ply + 1, true);
        else {
          var red = (jogados > 4 && prof >= 3 && !xeque && !m.c && !m.pr && !emXeque(s)) ? 1 : 0;
          v = -busca(s, prof - 1 - red, -alfa - 1, -alfa, ply + 1, true);
          if (!parado && v > alfa && (red || v < beta)) v = -busca(s, prof - 1, -beta, -alfa, ply + 1, true);
        }
        desfazer(s);
        if (parado) return 0;
        if (v > melhor) {
          melhor = v; melhorM = m;
          if (!ply) melhorRaiz = { m: m, nota: v };
        }
        if (v > alfa) alfa = v;
        if (alfa >= beta) {
          if (!m.c) {
            var cod = codigo(m);
            killers[ply] = killers[ply] || [0, 0];
            if (killers[ply][0] !== cod) { killers[ply][1] = killers[ply][0]; killers[ply][0] = cod; }
            var hk = (m.p << 7) | m.para;
            historia[hk] = (historia[hk] || 0) + prof * prof;
          }
          break;
        }
      }
      if (!jogados) return xeque ? -MATE + ply : 0;

      var guardar = melhor;
      if (guardar > MATE - 500) guardar += ply; else if (guardar < -MATE + 500) guardar -= ply;
      ttChave[i] = s.hash; ttLance[i] = melhorM ? codigo(melhorM) : 0; ttNota[i] = guardar;
      ttProf[i] = prof; ttTipo[i] = melhor <= alfaIni ? 3 : melhor >= beta ? 2 : 1;
      return melhor;
    }

    // escolhe um lance. opcoes: { tempo: ms, prof: profundidade máxima, folga: margem para errar de propósito }
    function pensar(s, opcoes) {
      opcoes = opcoes || {};
      var tempo = opcoes.tempo || 1000, profMax = opcoes.prof || 64;
      var lista = legais(s);
      if (!lista.length) return null;
      nos = 0; parado = false; limite = Date.now() + tempo; killers = []; historia = [];
      var escolhido = { m: lista[0], nota: 0 }, profFeita = 0;

      if (opcoes.folga) {
        // níveis fáceis: avalia todos os lances e sorteia entre os "bons o bastante"
        var notas = [], profRasa = Math.min(profMax, 4);
        for (var k = 0; k < lista.length; k++) {
          fazer(s, lista[k]);
          var v = -busca(s, profRasa - 1, -INF, INF, 1, true);
          desfazer(s);
          notas.push({ m: lista[k], nota: v });
        }
        var top = Math.max.apply(null, notas.map(function (n) { return n.nota; }));
        var bons = notas.filter(function (n) { return n.nota >= top - opcoes.folga; });
        var sorteado = bons[Math.floor(Math.random() * bons.length)];
        return { uci: paraUCI(sorteado.m), nota: sorteado.nota, prof: profMax, nos: nos };
      }

      for (var prof = 1; prof <= profMax; prof++) {
        melhorRaiz = null;
        var nota = busca(s, prof, -INF, INF, 0, false);
        if (melhorRaiz) escolhido = melhorRaiz;   // mesmo se o tempo acabou no meio, o melhor achado vale
        if (parado) break;
        profFeita = prof;
        escolhido = { m: escolhido.m, nota: nota };
        if (Math.abs(nota) > MATE - 500) break;   // achou mate, não precisa pensar mais
        if (Date.now() > limite - tempo * 0.45) break;   // a próxima rodada não terminaria a tempo
      }
      return { uci: paraUCI(escolhido.m), nota: escolhido.nota, prof: profFeita, nos: nos };
    }

    G.XadrezNucleo = {
      INICIAL: INICIAL, PRETA: PRETA, PEAO: PEAO, CAVALO: CAVALO, BISPO: BISPO, TORRE: TORRE, DAMA: DAMA, REI: REI,
      CAPTURA: CAPTURA, ROQUE: ROQUE, PROMO: PROMO, EP: EP,
      daFEN: daFEN, paraFEN: paraFEN, legais: legais, fazer: fazer, desfazer: desfazer, emXeque: emXeque,
      paraUCI: paraUCI, acharUCI: acharUCI, notacao: notacao, situacao: situacao, nomeCasa: nomeCasa,
      casaDoNome: casaDoNome, perft: perft, pensar: pensar, avaliar: avaliar
    };
  }

  nucleo(global);
  var X = global.XadrezNucleo;
  X.codigoNucleo = nucleo.toString();
  if (typeof module !== 'undefined' && module.exports) module.exports = X;

  /* =========================================================
     Os cérebros do Ed
     ========================================================= */
  var SF_PASTA = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/';
  var MATE = 100000;

  // Código do Worker do Stockfish. A versão WebAssembly é umas 25 vezes
  // mais rápida que a asm.js, mas procura o arquivo "stockfish.wasm" ao lado
  // do Worker; como o Worker é criado aqui mesmo (blob), o fetch é desviado
  // para o CDN.
  var SF_WASM =
    'var P = "' + SF_PASTA + '", f0 = self.fetch.bind(self);\n' +
    'self.fetch = function (u, o) { return /stockfish\\.wasm$/.test(String(u)) ? f0(P + "stockfish.wasm") : f0(u, o); };\n' +
    'importScripts(P + "stockfish.wasm.js");';
  var SF_ASM = 'importScripts("' + SF_PASTA + 'stockfish.js");';

  // Níveis, do mais fraco ao mais forte. Os bots dos sites de xadrez
  // ficam mais fracos do mesmo jeito: o motor pensa menos e, de propósito,
  // às vezes escolhe um lance pior que o melhor ("Skill Level" do Stockfish,
  // de 0 a 20). O motor reserva imita isso sorteando entre lances quase tão
  // bons quanto o melhor ("folga", em centésimos de peão).
  var NIVEIS = [
    { id: 'iniciante', nome: 'Iniciante', desc: 'Pra quem está aprendendo. O Ed vacila bastante.', sf: { skill: 0, prof: 1 }, reserva: { prof: 1, folga: 250, tempo: 500 } },
    { id: 'facil', nome: 'Fácil', desc: 'Joga direitinho, mas deixa passar umas coisas.', sf: { skill: 3, tempo: 300 }, reserva: { prof: 2, folga: 90, tempo: 700 } },
    { id: 'medio', nome: 'Médio', desc: 'Um adversário de respeito. Pensa antes de mexer.', sf: { skill: 8, tempo: 600 }, reserva: { prof: 3, folga: 30, tempo: 1000 } },
    { id: 'dificil', nome: 'Difícil', desc: 'Difícil de bater. Quase não erra.', sf: { skill: 14, tempo: 1200 }, reserva: { tempo: 1500 } },
    { id: 'impossivel', nome: 'Impossível', desc: 'Força total do Stockfish. Boa sorte!', sf: { skill: 20, tempo: 2500 }, reserva: { tempo: 3500 } }
  ];
  function nivelPorId(id) {
    for (var i = 0; i < NIVEIS.length; i++) if (NIVEIS[i].id === id) return NIVEIS[i];
    return NIVEIS[3];
  }

  function Motor(aoMudar) {
    this.estado = 'parado';   // parado, carregando, stockfish, reserva
    this.aoMudar = aoMudar || function () {};
    this.sf = null;           // o Worker do Stockfish, quando pronto
    this.sfPronto = null;
    this.atual = null;        // busca em andamento no Stockfish
    this.fila = null;         // busca esperando a anterior terminar
    this.skill = -1;
    this.reserva = null;      // Worker do motor reserva (false se não deu pra criar)
    this.idReserva = 0;
    this.esperaReserva = {};
  }

  Motor.prototype.mudar = function (e) { this.estado = e; this.aoMudar(e); };

  // carrega o Stockfish (uma vez só): tenta o WebAssembly, depois o asm.js
  Motor.prototype.aquecer = function () {
    if (this.sfPronto) return this.sfPronto;
    var self = this;
    this.mudar('carregando');
    var wasm = typeof WebAssembly === 'object';
    this.sfPronto = (wasm ? this.abrirStockfish(SF_WASM, 15000) : Promise.reject(new Error('sem WebAssembly')))
      .catch(function () { return self.abrirStockfish(SF_ASM, 20000); });
    this.sfPronto.then(function () { self.mudar('stockfish'); }, function () { self.mudar('reserva'); });
    return this.sfPronto;
  };

  Motor.prototype.abrirStockfish = function (codigo, prazo) {
    var self = this;
    return new Promise(function (ok, falha) {
      var w = null, relogio, carregou = false;
      function falhou(e) {
        clearTimeout(relogio);
        try { if (w) w.terminate(); } catch (x) { /* nada */ }
        if (!carregou) { falha(e || new Error('stockfish')); return; }
        // quebrou no meio do jogo: o motor reserva assume
        self.sf = null;
        self.mudar('reserva');
        if (self.atual) { var p = self.atual; self.atual = null; clearTimeout(p.relogio); p.ok(null); }
        if (self.fila) { self.fila.ok(null); self.fila = null; }
      }
      try {
        if (typeof Worker === 'undefined' || typeof Blob === 'undefined') throw new Error('sem Web Worker');
        w = new Worker(URL.createObjectURL(new Blob([codigo], { type: 'application/javascript' })));
      } catch (e) { falhou(e); return; }
      relogio = setTimeout(function () { falhou(new Error('o Stockfish demorou demais')); }, prazo);
      w.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); falhou(e); };
      w.onmessage = function (e) {
        var linha = String(e.data == null ? '' : e.data);
        if (!carregou) {
          if (linha === 'uciok') {
            carregou = true;
            clearTimeout(relogio);
            self.sf = w;
            ok();
          }
          return;
        }
        self.lerLinha(linha);
      };
      w.postMessage('uci');
    });
  };

  // pede um lance. Responde { uci, nota: { cp, mate } } ou { cancelado: true }
  Motor.prototype.jogar = function (lances, nivel) {
    var self = this;
    return this.aquecer().then(
      function () { return self.sf ? self.sfPensar(lances, nivel) : null; },
      function () { return null; }
    ).then(function (r) { return r || self.reservaPensar(lances, nivel); });
  };

  // larga a busca atual (voltar lance, novo jogo, desistir...)
  Motor.prototype.cancelar = function () {
    if (this.fila) { this.fila.ok({ cancelado: true }); this.fila = null; }
    if (this.atual && this.sf) { this.atual.cancelado = true; this.sf.postMessage('stop'); }
  };

  Motor.prototype.sfPensar = function (lances, nivel) {
    var self = this;
    return new Promise(function (ok) {
      var pedido = { lances: lances, nivel: nivel, ok: ok, nota: null };
      if (self.atual) {
        if (self.fila) self.fila.ok({ cancelado: true });
        self.fila = pedido;
        self.atual.cancelado = true;
        self.sf.postMessage('stop');
      } else self.sfComecar(pedido);
    });
  };

  Motor.prototype.sfComecar = function (p) {
    var self = this, w = this.sf, n = p.nivel.sf;
    if (!w) { p.ok(null); return; }
    this.atual = p;
    if (this.skill !== n.skill) { w.postMessage('setoption name Skill Level value ' + n.skill); this.skill = n.skill; }
    w.postMessage('position startpos' + (p.lances.length ? ' moves ' + p.lances.join(' ') : ''));
    w.postMessage(n.prof ? 'go depth ' + n.prof : 'go movetime ' + n.tempo);
    // se o Stockfish travar, o motor reserva assume este lance
    p.relogio = setTimeout(function () {
      if (self.atual !== p) return;
      self.atual = null;
      p.ok(p.cancelado ? { cancelado: true } : null);
      if (self.fila) { var f = self.fila; self.fila = null; self.sfComecar(f); }
    }, (n.tempo || 1000) + 10000);
  };

  Motor.prototype.lerLinha = function (linha) {
    var p = this.atual;
    if (!p) return;
    if (linha.indexOf('info') === 0 && linha.indexOf(' score ') > 0) {
      var mpv = /\bmultipv (\d+)/.exec(linha);
      if (mpv && mpv[1] !== '1') return;
      var sc = /\bscore (cp|mate) (-?\d+)/.exec(linha);
      if (sc) {
        var v = parseInt(sc[2], 10);
        p.nota = sc[1] === 'cp' ? { cp: v, mate: 0 } : { cp: v > 0 ? MATE : -MATE, mate: v };
      }
      return;
    }
    if (linha.indexOf('bestmove') === 0) {
      clearTimeout(p.relogio);
      this.atual = null;
      var uci = linha.split(/\s+/)[1];
      if (p.cancelado) p.ok({ cancelado: true });
      else p.ok(uci && uci !== '(none)' ? { uci: uci, nota: p.nota || { cp: 0, mate: 0 } } : null);
      if (this.fila) { var f = this.fila; this.fila = null; this.sfComecar(f); }
    }
  };

  function pensarAqui(lances, op) {
    var s = X.daFEN(X.INICIAL);
    for (var i = 0; i < lances.length; i++) X.fazer(s, X.acharUCI(s, lances[i]));
    return X.pensar(s, op);
  }

  // motor reserva: roda num Worker feito com o próprio código do núcleo
  Motor.prototype.workerReserva = function () {
    if (this.reserva !== null) return this.reserva;
    var self = this;
    try {
      var cod = '(' + X.codigoNucleo + ')(self);\n' +
        'onmessage = function (e) {\n' +
        '  var d = e.data, N = self.XadrezNucleo, s = N.daFEN(N.INICIAL);\n' +
        '  for (var i = 0; i < d.lances.length; i++) N.fazer(s, N.acharUCI(s, d.lances[i]));\n' +
        '  postMessage({ id: d.id, r: N.pensar(s, d.opcoes) });\n' +
        '};';
      var w = new Worker(URL.createObjectURL(new Blob([cod], { type: 'application/javascript' })));
      w.onmessage = function (e) {
        var f = self.esperaReserva[e.data.id];
        delete self.esperaReserva[e.data.id];
        if (f) f(e.data.r);
      };
      w.onerror = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        self.reserva = false;
        var pend = self.esperaReserva;
        self.esperaReserva = {};
        Object.keys(pend).forEach(function (k) { pend[k](null); });
      };
      this.reserva = w;
    } catch (e) { this.reserva = false; }
    return this.reserva;
  };

  Motor.prototype.reservaPensar = function (lances, nivel) {
    var self = this, op = nivel.reserva;
    return new Promise(function (ok) {
      function pronto(r) {
        if (!r) r = pensarAqui(lances, op);
        var n = r.nota, abs = Math.abs(n), mate = 0;
        if (abs > MATE - 500) mate = (n > 0 ? 1 : -1) * Math.ceil((MATE - abs) / 2);
        ok({ uci: r.uci, nota: { cp: n, mate: mate } });
      }
      var w = self.workerReserva();
      if (w) {
        var id = ++self.idReserva;
        self.esperaReserva[id] = pronto;
        w.postMessage({ id: id, lances: lances, opcoes: op });
      } else setTimeout(function () { pronto(null); }, 30);
    });
  };

  /* =========================================================
     O que o Ed fala durante a partida
     ========================================================= */
  var FALAS = {
    inicioBrancas: [
      'Valendo! Você está de brancas, então começa. Capricha!',
      'Você joga de brancas e sai na frente. Boa sorte... vai precisar!',
      'Tabuleiro arrumado! As brancas são suas, pode começar.'
    ],
    inicioPretas: [
      'Eu fico com as brancas e começo. Preparado?',
      'Minhas peças brancas estão prontinhas. Lá vou eu!',
      'Hoje eu começo! Você está de pretas.'
    ],
    lance: ['Joguei {l}.', 'Meu lance: {l}.', 'Vou de {l}.', '{l}. Sua vez!', 'Pronto: {l}.', 'Hmm... {l}!'],
    xequeDado: ['Xeque!', 'Xeque! Cuida desse rei aí.', 'Xeque! Seu rei está meio desprotegido, hein?'],
    xequeLevado: ['Ui! Xeque em mim.', 'Xeque? Calma que eu resolvo.', 'Opa, xeque! Meu rei vai ter que se mexer.'],
    perdeuDama: ['Minha dama!! Isso não estava nos meus cálculos.', 'Ai, a minha dama! Vou ter que me virar sem ela.', 'Levou minha dama?! Meus circuitos deram uma piscada agora.'],
    pegouDama: ['Peguei sua dama! Agora a coisa ficou séria.', 'Sua dama é minha! Desculpa, não resisti.'],
    captura: ['Essa peça agora é minha!', 'Capturada! Vou guardar na minha caixinha.', 'Obrigado pelo presente!', 'Nhac!'],
    roque: [
      'Roque! Rei guardadinho no canto, seguro que nem casa com a luz apagada.',
      'Rocar é importante: rei protegido, torre trabalhando.'
    ],
    promocao: 'Meu peão chegou do outro lado e virou {p}! Reciclagem de peças.',
    mateVisto: ['Hmm... estou vendo um xeque-mate em {n}. Mas não conto onde!', 'Meus sensores detectam um xeque-mate chegando...'],
    erroUsuario: ['Opa! Esse lance aí eu não teria feito...', 'Hmm, tem certeza desse lance? Agora já foi!', 'Eita, acho que você deixou uma porta aberta.'],
    vantagemVoce: ['Você está jogando bem! Meus circuitos estão esquentando.', 'Ih, acho que estou encrencado...', 'Que lance! Você treinou escondido?'],
    vantagemEd: ['Estou gostando dessa partida... pra mim!', 'Acho que a balança está pendendo pro meu lado.', 'Meus cálculos dizem que estou na frente. Meus cálculos quase nunca erram.'],
    papo: [
      'Pensar em xadrez gasta bem menos energia que deixar a TV ligada sem ninguém assistindo.',
      'Sabia que o cavalo é a minha peça predileta? Ele pula por cima de tudo!',
      'Meus circuitos estão adorando essa partida.',
      'Enquanto você pensa, que tal apagar a luz de algum cômodo vazio?',
      'Esse tabuleiro parece um painel solar: um monte de quadradinhos trabalhando juntos.',
      'Pode pensar com calma. Aqui ninguém cobra por minuto.'
    ],
    edVenceu: ['Xeque-mate! Boa partida. Bora uma revanche?', 'Xeque-mate! Não fica triste, perder pra um robô faz parte.', 'Xeque-mate! Meus circuitos agradecem a partida.'],
    voceVenceu: ['Xeque-mate... em mim?! Você me venceu! Parabéns, de verdade!', 'Não acredito, perdi! Você manda muito no xadrez. Revanche?'],
    desistiu: ['Desistiu? Tudo bem, faz parte. Bora outra?', 'Abandonou a partida... Quando quiser a revanche, é só clicar em NOVO JOGO.'],
    empate: {
      afogado: 'Afogamento! Seu rei... ou o meu... não está em xeque, mas não tem lance nenhum. Empate!',
      '50': 'Cinquenta lances sem captura nem lance de peão: empate!',
      repeticao: 'A mesma posição apareceu três vezes. Empate por repetição!',
      material: 'Não sobrou peça suficiente pra dar xeque-mate. Empate!'
    },
    voltou: ['Voltando no tempo... só dessa vez, hein!', 'Tá bom, pode voltar. Eu finjo que não vi.'],
    nivel: 'Beleza, a partir de agora eu jogo no nível {n}.'
  };

  /* =========================================================
     O tabuleiro na página
     ========================================================= */
  var CHEIA = ['', '♟', '♞', '♝', '♜', '♛', '♚'];
  var VAZADA = ['', '♙', '♘', '♗', '♖', '♕', '♔'];
  var VS = '︎';   // pede o desenho de texto (sem virar emoji no celular)
  var NOME = ['', 'peão', 'cavalo', 'bispo', 'torre', 'dama', 'rei'];
  var FEM = [false, false, false, false, true, true, false];

  function sorteia(l) { return l[Math.floor(Math.random() * l.length)]; }
  function lerJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function guardarJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem problema */ } }
  function nomeDaPeca(p) {
    var t = p & 7, preta = p & X.PRETA;
    return NOME[t] + ' ' + (preta ? (FEM[t] ? 'preta' : 'preto') : (FEM[t] ? 'branca' : 'branco'));
  }

  // peça branca = desenho vazado por cima de um desenho cheio branco
  function pintarPeca(el, p) {
    if (!p) { el.className = 'xz-peca'; el.textContent = ''; el.removeAttribute('data-f'); return; }
    var t = p & 7;
    if (p & X.PRETA) { el.className = 'xz-peca p'; el.textContent = CHEIA[t] + VS; el.removeAttribute('data-f'); }
    else { el.className = 'xz-peca b'; el.textContent = VAZADA[t] + VS; el.setAttribute('data-f', CHEIA[t] + VS); }
  }

  var HTML =
    '<div class="xz-palco">' +
      '<div class="xz-fala"><img class="xz-avatar" alt="" width="46" height="46"><p class="xz-balao" aria-live="polite"></p></div>' +
      '<div class="xz-moldura">' +
        '<div class="xz-tabuleiro" aria-label="Tabuleiro de xadrez"></div>' +
        '<div class="xz-promo" hidden></div>' +
      '</div>' +
      '<p class="xz-status" aria-live="polite"></p>' +
    '</div>' +
    '<div class="xz-lado">' +
      '<div class="xz-placar" title="Placar guardado neste navegador">' +
        '<span>VOCÊ<b class="xz-p-voce">0</b></span><span class="xz-x">×</span><span>ED<b class="xz-p-ed">0</b></span>' +
        '<small>empates: <b class="xz-p-empates">0</b></small>' +
      '</div>' +
      '<label class="xz-campo">Nível do Ed<select class="xz-nivel"></select></label>' +
      '<p class="nota xz-nivel-desc"></p>' +
      '<label class="xz-campo">Suas peças<select class="xz-cor">' +
        '<option value="b">Brancas</option><option value="p">Pretas</option><option value="s">Sortear</option>' +
      '</select></label>' +
      '<button type="button" class="btn-retro xz-novo">NOVO JOGO</button>' +
      '<div class="xz-btns">' +
        '<button type="button" class="xz-btn xz-voltar">↶ Voltar lance</button>' +
        '<button type="button" class="xz-btn xz-desistir">⚑ Desistir</button>' +
      '</div>' +
      '<div class="xz-lances-caixa"><div class="xz-lances-titulo">LANCES</div><ol class="xz-lances"></ol></div>' +
      '<p class="nota xz-motor"></p>' +
    '</div>';

  function montar(raiz, opcoes) {
    opcoes = opcoes || {};
    var somar = opcoes.bip || function () {};
    var doc = raiz.ownerDocument || document;
    var calmo = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

    raiz.classList.add('xadrez');
    raiz.innerHTML = HTML;
    function q(sel) { return raiz.querySelector(sel); }
    var tab = q('.xz-tabuleiro'), balao = q('.xz-balao'), status = q('.xz-status'), promo = q('.xz-promo');
    var selNivel = q('.xz-nivel'), selCor = q('.xz-cor'), descNivel = q('.xz-nivel-desc');
    var btnNovo = q('.xz-novo'), btnVoltar = q('.xz-voltar'), btnDesistir = q('.xz-desistir');
    var lista = q('.xz-lances'), elMotor = q('.xz-motor'), avatar = q('.xz-avatar');
    var elVoce = q('.xz-p-voce'), elEd = q('.xz-p-ed'), elEmpates = q('.xz-p-empates');

    if (opcoes.foto) {
      avatar.onerror = function () { avatar.hidden = true; };
      avatar.src = opcoes.foto;
    } else avatar.hidden = true;

    NIVEIS.forEach(function (n) {
      var o = doc.createElement('option');
      o.value = n.id;
      o.textContent = n.nome;
      selNivel.appendChild(o);
    });

    // estado da partida
    var s = null, lances = [], sans = [], cor = 0, nivel = NIVEIS[3], fim = null, contado = false;
    var pensando = false, token = 0, visto = false, silencio = false;
    var sel = null, legais = [], reacao = '', notaAnterior = null, ultComentario = -99, mateAvisado = false, rocou = false;
    var botoes = [], casaDoBotao = [], botaoDaCasa = {};
    var placar = lerJSON('ed-xadrez-placar') || { voce: 0, ed: 0, empates: 0 };
    var motor = new Motor(mostrarMotor);

    function bip(t) { if (!silencio) somar(t); }
    function falar(html) { balao.innerHTML = html; }

    for (var i = 0; i < 64; i++) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'xz-casa';
      b.appendChild(doc.createElement('span')).className = 'xz-peca';
      tab.appendChild(b);
      botoes.push(b);
    }

    // liga cada botão a uma casa (o tabuleiro vira quando você joga de pretas)
    function orientar() {
      botaoDaCasa = {};
      for (var i = 0; i < 64; i++) {
        var lin = i >> 3, col = i & 7;
        var casa = cor ? lin * 16 + (7 - col) : (7 - lin) * 16 + col;
        var b = botoes[i];
        casaDoBotao[i] = casa;
        botaoDaCasa[casa] = b;
        b.setAttribute('data-casa', casa);
        var escura = ((casa >> 4) + (casa & 7)) % 2 === 0;
        b.classList.toggle('escura', escura);
        b.classList.toggle('clara', !escura);
        while (b.childNodes.length > 1) b.removeChild(b.lastChild);
        if (lin === 7) b.appendChild(doc.createElement('span')).className = 'xz-coord l';
        if (col === 0) b.appendChild(doc.createElement('span')).className = 'xz-coord n';
        if (lin === 7) b.querySelector('.l').textContent = 'abcdefgh'.charAt(casa & 7);
        if (col === 0) b.querySelector('.n').textContent = (casa >> 4) + 1;
      }
    }

    function podeMexer() { return !!s && !fim && !pensando && s.lado === cor && promo.hidden; }
    function minhaPeca(casa) { var p = s.b[casa]; return !!p && (p & X.PRETA) === cor; }
    function lancesDoUsuario() { return cor ? Math.floor(lances.length / 2) : Math.ceil(lances.length / 2); }

    function render() {
      if (!s) return;
      var ult = s.hist.length ? s.hist[s.hist.length - 1].m : null;
      var xeque = X.emXeque(s);
      var casaXeque = xeque ? s.rei[s.lado >> 3] : -1;
      var destinos = {};
      if (sel !== null) legais.forEach(function (m) { if (m.de === sel) destinos[m.para] = true; });
      var vez = podeMexer();
      for (var i = 0; i < 64; i++) {
        var casa = casaDoBotao[i], b = botoes[i], p = s.b[casa];
        pintarPeca(b.firstChild, p);
        b.classList.toggle('ult', !!ult && (ult.de === casa || ult.para === casa));
        b.classList.toggle('sel', sel === casa);
        b.classList.toggle('xeque', casa === casaXeque);
        b.classList.toggle('alvo', !!destinos[casa]);
        b.classList.toggle('captura', !!destinos[casa] && !!p);
        b.classList.toggle('minha', vez && !!p && (p & X.PRETA) === cor);
        b.setAttribute('aria-label', X.nomeCasa(casa) + (p ? ', ' + nomeDaPeca(p) : ''));
      }
      tab.classList.toggle('travado', !vez);

      status.classList.toggle('pensando', pensando);
      status.classList.toggle('acabou', !!fim);
      if (fim) status.textContent = fim.texto;
      else if (pensando) status.textContent = motor.estado === 'carregando' ? 'Ed está ligando o cérebro de xadrez' : 'Ed está pensando';
      else if (s.lado !== cor) status.textContent = 'Vez do Ed';
      else status.textContent = 'Sua vez (' + (cor ? 'pretas' : 'brancas') + ')' + (xeque ? ' · você está em xeque!' : '');

      btnVoltar.disabled = !lancesDoUsuario() || (!!fim && fim.tipo === 'desistiu');
      btnDesistir.disabled = !!fim || !lancesDoUsuario();
      if (btnDesistir.disabled) desarmarDesistir();

      var html = '';
      for (var k = 0; k < sans.length; k += 2) {
        html += '<li><span class="n">' + (k / 2 + 1) + '.</span>' +
          '<span' + (k === sans.length - 1 ? ' class="atual"' : '') + '>' + sans[k] + '</span>' +
          '<span' + (k + 1 === sans.length - 1 ? ' class="atual"' : '') + '>' + (sans[k + 1] || '') + '</span></li>';
      }
      if (!html) html = '<li class="vazio">Nenhum lance ainda.</li>';
      if (lista.innerHTML !== html) { lista.innerHTML = html; lista.scrollTop = lista.scrollHeight; }

      elVoce.textContent = placar.voce;
      elEd.textContent = placar.ed;
      elEmpates.textContent = placar.empates;
    }

    function mostrarMotor() {
      var e = motor.estado;
      elMotor.innerHTML =
        e === 'stockfish' ? 'Cérebro do Ed: <b>Stockfish</b>, um dos motores de xadrez mais fortes do mundo.' :
        e === 'reserva' ? 'Cérebro do Ed: <b>motor reserva</b>. O Stockfish não carregou (sem internet?), então o Ed está jogando com um cérebro mais simples.' :
        e === 'carregando' ? 'Cérebro do Ed: carregando o Stockfish…' :
        'Cérebro do Ed: Stockfish, um dos motores de xadrez mais fortes do mundo.';
      render();
    }

    function salvar() {
      guardarJSON('ed-xadrez-partida', {
        lances: lances, cor: cor, nivel: nivel.id, contado: contado,
        fim: fim && fim.tipo === 'desistiu' ? 'desistiu' : null
      });
    }

    function finalizar(tipo) {
      var venc = tipo === 'mate' ? s.lado ^ X.PRETA : tipo === 'desistiu' ? cor ^ X.PRETA : null;
      var fala;
      fim = { tipo: tipo, venc: venc };
      if (venc === null) {
        fim.texto = 'Empate!';
        fala = FALAS.empate[tipo];
        bip();
      } else if (venc === cor) {
        fim.texto = 'Xeque-mate! Você venceu!';
        fala = sorteia(FALAS.voceVenceu);
        bip('vitoria');
      } else {
        fim.texto = tipo === 'desistiu' ? 'Você desistiu. O Ed venceu.' : 'Xeque-mate! O Ed venceu.';
        fala = sorteia(tipo === 'desistiu' ? FALAS.desistiu : FALAS.edVenceu);
        bip('erro');
      }
      if (!contado) {
        contado = true;
        if (venc === null) placar.empates++;
        else if (venc === cor) placar.voce++;
        else placar.ed++;
        guardarJSON('ed-xadrez-placar', placar);
      }
      return fala;
    }

    // depois de cada lance: recalcula, vê se acabou, guarda e desenha
    function atualizar() {
      legais = X.legais(s);
      var fala = null;
      if (!fim) {
        var sit = X.situacao(s);
        if (sit) fala = finalizar(sit);
      }
      salvar();
      render();
      return fala;
    }

    function aplicarLance(m) {
      var san = X.notacao(s, m);
      X.fazer(s, m);
      lances.push(X.paraUCI(m));
      sans.push(san);
      sel = null;
      return san;
    }

    function animar(m) {
      if (calmo) return;
      var bDe = botaoDaCasa[m.de], bPara = botaoDaCasa[m.para];
      if (!bDe || !bPara) return;
      var peca = bPara.firstChild, r1 = bDe.getBoundingClientRect(), r2 = bPara.getBoundingClientRect();
      peca.style.transition = 'none';
      peca.style.transform = 'translate(' + (r1.left - r2.left) + 'px,' + (r1.top - r2.top) + 'px)';
      bPara.classList.add('voando');
      void peca.offsetWidth;
      peca.style.transition = 'transform .2s ease-out';
      peca.style.transform = '';
      setTimeout(function () { bPara.classList.remove('voando'); peca.style.transition = ''; }, 260);
    }

    function jogarUsuario(m, arrastou) {
      aplicarLance(m);
      bip(m.c ? undefined : 'clique');
      reacao = '';
      if (m.c && (m.c & 7) === X.DAMA) reacao = sorteia(FALAS.perdeuDama);
      else if (X.emXeque(s)) reacao = sorteia(FALAS.xequeLevado);
      var falaFim = atualizar();
      if (!arrastou) animar(m);
      if (falaFim) { falar(falaFim); return; }
      if (reacao) falar(reacao);
      vezDoEd();
    }

    function vezDoEd() {
      if (!visto || fim || s.lado === cor) { render(); return; }
      var meu = ++token, t0 = Date.now();
      pensando = true;
      render();
      motor.jogar(lances.slice(), nivel).then(function (r) {
        if (meu !== token) return;
        if (r && r.cancelado) return;
        setTimeout(function () { if (meu === token) jogadaDoEd(r); }, Math.max(0, 450 - (Date.now() - t0)));
      });
    }

    function jogadaDoEd(r) {
      pensando = false;
      var m = r && r.uci ? X.acharUCI(s, r.uci) : null;
      if (!m) { m = legais[Math.floor(Math.random() * legais.length)]; r = null; }   // nunca deveria acontecer
      var san = aplicarLance(m);
      var xeque = X.emXeque(s);
      bip(m.c ? undefined : 'clique');
      var falaFim = atualizar();
      animar(m);
      var txt = (reacao ? reacao + ' ' : '') + sorteia(FALAS.lance).replace('{l}', '<b>' + san + '</b>');
      reacao = '';
      if (falaFim) { falar(txt + ' ' + falaFim); return; }
      var extra = comentario(m, xeque, r && r.nota);
      falar(txt + (extra ? ' ' + extra : ''));
    }

    // o Ed comenta a partida de vez em quando, olhando a própria avaliação
    function comentario(m, xeque, nota) {
      var n = lances.length, cp = nota ? nota.cp : null, txt = '';
      var podeAvaliar = !!nota && n - ultComentario >= 6;
      if (m.pr) txt = FALAS.promocao.replace('{p}', NOME[m.pr]);
      else if (m.c && (m.c & 7) === X.DAMA) txt = sorteia(FALAS.pegouDama);
      else if (xeque) txt = sorteia(FALAS.xequeDado);
      else if (nota && nota.mate > 0 && nota.mate <= 6 && !mateAvisado) {
        mateAvisado = true;
        txt = sorteia(FALAS.mateVisto).replace('{n}', nota.mate === 1 ? '1 lance' : nota.mate + ' lances');
      } else if (podeAvaliar && notaAnterior !== null && cp - notaAnterior >= 250 && cp >= 150) {
        txt = sorteia(FALAS.erroUsuario); ultComentario = n;
      } else if (podeAvaliar && cp <= -250) {
        txt = sorteia(FALAS.vantagemVoce); ultComentario = n;
      } else if (podeAvaliar && cp >= 450) {
        txt = sorteia(FALAS.vantagemEd); ultComentario = n;
      } else if ((m.fl & X.ROQUE) && !rocou) {
        rocou = true;
        txt = sorteia(FALAS.roque);
      } else if (m.c && Math.random() < 0.35) txt = sorteia(FALAS.captura);
      else if (Math.random() < 0.12) txt = sorteia(FALAS.papo);
      if (nota) notaAnterior = cp;
      return txt;
    }

    /* ---------- cliques e arrastos ---------- */
    function tentar(de, para, arrastou) {
      var ops = legais.filter(function (m) { return m.de === de && m.para === para; });
      if (!ops.length) {
        sel = minhaPeca(para) ? para : (arrastou ? de : null);
        render();
        return;
      }
      if (ops.length > 1) { abrirPromo(ops); return; }
      jogarUsuario(ops[0], arrastou);
    }

    function clicar(casa) {
      if (!podeMexer()) return;
      if (sel !== null && sel !== casa && legais.some(function (m) { return m.de === sel && m.para === casa; })) {
        tentar(sel, casa, false);
        return;
      }
      sel = minhaPeca(casa) && sel !== casa ? casa : null;
      render();
    }

    var arrasto = null, fantasma = null;
    function casaDoEvento(e) {
      var b = e.target && e.target.closest ? e.target.closest('.xz-casa') : null;
      return b ? parseInt(b.getAttribute('data-casa'), 10) : null;
    }
    function casaNoPonto(x, y) {
      var el = doc.elementFromPoint(x, y);
      var b = el && el.closest ? el.closest('.xz-casa') : null;
      return b && tab.contains(b) ? parseInt(b.getAttribute('data-casa'), 10) : null;
    }
    function tirarFantasma() {
      if (fantasma) { fantasma.parentNode.removeChild(fantasma); fantasma = null; }
      botoes.forEach(function (b) { b.classList.remove('arrastando', 'mira'); });
    }

    tab.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var casa = casaDoEvento(e);
      if (casa === null || !podeMexer()) return;
      if (minhaPeca(casa)) {
        e.preventDefault();
        arrasto = { de: casa, x: e.clientX, y: e.clientY, ativo: false, jaSel: sel === casa, id: e.pointerId, mira: null };
        sel = casa;
        render();
        try { tab.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
      } else clicar(casa);
    });

    tab.addEventListener('pointermove', function (e) {
      if (!arrasto || e.pointerId !== arrasto.id) return;
      if (!arrasto.ativo) {
        if (Math.abs(e.clientX - arrasto.x) + Math.abs(e.clientY - arrasto.y) < 6) return;
        arrasto.ativo = true;
        var b = botaoDaCasa[arrasto.de], r = b.getBoundingClientRect();
        fantasma = doc.createElement('span');
        pintarPeca(fantasma, s.b[arrasto.de]);
        fantasma.classList.add('xz-fantasma');
        fantasma.style.fontSize = (r.width * 0.82) + 'px';
        doc.body.appendChild(fantasma);
        b.classList.add('arrastando');
      }
      fantasma.style.left = e.clientX + 'px';
      fantasma.style.top = e.clientY + 'px';
      var alvo = casaNoPonto(e.clientX, e.clientY);
      if (alvo !== arrasto.mira) {
        if (arrasto.mira !== null && botaoDaCasa[arrasto.mira]) botaoDaCasa[arrasto.mira].classList.remove('mira');
        arrasto.mira = alvo;
        if (alvo !== null) botaoDaCasa[alvo].classList.add('mira');
      }
    });

    function soltar(e, cancelou) {
      if (!arrasto || e.pointerId !== arrasto.id) return;
      var a = arrasto;
      arrasto = null;
      tirarFantasma();
      if (cancelou) { render(); return; }
      if (a.ativo) {
        var alvo = casaNoPonto(e.clientX, e.clientY);
        if (alvo !== null && alvo !== a.de) tentar(a.de, alvo, true);
        else render();
      } else if (a.jaSel) { sel = null; render(); }
    }
    tab.addEventListener('pointerup', function (e) { soltar(e, false); });
    tab.addEventListener('pointercancel', function (e) { soltar(e, true); });
    // teclado: Enter/Espaço num botão dispara "click" sem ponteiro
    tab.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      var casa = casaDoEvento(e);
      if (casa !== null) clicar(casa);
    });
    raiz.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!promo.hidden) fecharPromo();
      sel = null;
      render();
    });

    /* ---------- promoção ---------- */
    function abrirPromo(ops) {
      promo.innerHTML = '';
      var p = doc.createElement('p');
      p.textContent = 'Seu peão chegou lá! Ele vira o quê?';
      promo.appendChild(p);
      var caixa = doc.createElement('div');
      caixa.className = 'xz-promo-ops';
      [X.DAMA, X.TORRE, X.BISPO, X.CAVALO].forEach(function (t) {
        var m = ops.filter(function (o) { return o.pr === t; })[0];
        if (!m) return;
        var b = doc.createElement('button');
        b.type = 'button';
        b.title = NOME[t];
        b.setAttribute('aria-label', NOME[t]);
        pintarPeca(b.appendChild(doc.createElement('span')), t | cor);
        b.addEventListener('click', function () { fecharPromo(); jogarUsuario(m, false); });
        caixa.appendChild(b);
      });
      promo.appendChild(caixa);
      var cancelar = doc.createElement('button');
      cancelar.type = 'button';
      cancelar.className = 'xz-btn';
      cancelar.textContent = 'Cancelar';
      cancelar.addEventListener('click', function () { fecharPromo(); sel = null; render(); });
      promo.appendChild(cancelar);
      promo.hidden = false;
      render();
      caixa.firstChild.focus({ preventScroll: true });
    }
    function fecharPromo() { promo.hidden = true; promo.innerHTML = ''; }

    /* ---------- botões ---------- */
    function novoJogo(c) {
      token++;
      pensando = false;
      motor.cancelar();
      fecharPromo();
      cor = c;
      s = X.daFEN(X.INICIAL);
      lances = []; sans = []; fim = null; contado = false; sel = null;
      reacao = ''; notaAnterior = null; ultComentario = -99; mateAvisado = false; rocou = false;
      orientar();
      atualizar();
      falar(sorteia(cor ? FALAS.inicioPretas : FALAS.inicioBrancas));
      vezDoEd();
    }

    function voltar() {
      if (!lancesDoUsuario() || (fim && fim.tipo === 'desistiu')) return;
      token++;
      pensando = false;
      motor.cancelar();
      fecharPromo();
      do {
        X.desfazer(s);
        lances.pop();
        sans.pop();
      } while (lances.length && s.lado !== cor);
      fim = null; sel = null; reacao = ''; notaAnterior = null; mateAvisado = false;
      atualizar();
      falar(sorteia(FALAS.voltou));
      bip('clique');
    }

    function desarmarDesistir() {
      clearTimeout(btnDesistir._t);
      btnDesistir.classList.remove('armado');
      btnDesistir.textContent = '⚑ Desistir';
    }
    function desistir() {
      if (fim || !lancesDoUsuario()) return;
      if (!btnDesistir.classList.contains('armado')) {
        btnDesistir.classList.add('armado');
        btnDesistir.textContent = 'Certeza?';
        btnDesistir._t = setTimeout(desarmarDesistir, 3000);
        return;
      }
      desarmarDesistir();
      token++;
      pensando = false;
      motor.cancelar();
      fecharPromo();
      var fala = finalizar('desistiu');
      salvar();
      render();
      falar(fala);
    }

    btnNovo.addEventListener('click', function () {
      var v = selCor.value;
      bip('clique');
      novoJogo(v === 'p' ? X.PRETA : v === 's' ? (Math.random() < 0.5 ? 0 : X.PRETA) : 0);
    });
    btnVoltar.addEventListener('click', voltar);
    btnDesistir.addEventListener('click', desistir);
    selNivel.addEventListener('change', function () {
      nivel = nivelPorId(selNivel.value);
      descNivel.textContent = nivel.desc;
      salvar();
      if (!fim && lances.length) falar(FALAS.nivel.replace('{n}', '<b>' + nivel.nome + '</b>'));
    });

    /* ---------- começo: continua a partida guardada, se tiver ---------- */
    var salvo = lerJSON('ed-xadrez-partida');
    nivel = nivelPorId(salvo && salvo.nivel);
    selNivel.value = nivel.id;
    descNivel.textContent = nivel.desc;
    mostrarMotor();
    var restaurou = false;
    if (salvo && salvo.lances && salvo.lances.length) {
      try {
        cor = salvo.cor ? X.PRETA : 0;
        s = X.daFEN(X.INICIAL);
        lances = []; sans = [];
        salvo.lances.forEach(function (u) {
          var m = X.acharUCI(s, u);
          if (!m) throw new Error('lance inválido');
          aplicarLance(m);
        });
        contado = !!salvo.contado;
        selCor.value = cor ? 'p' : 'b';
        orientar();
        silencio = true;
        var falaFim = salvo.fim === 'desistiu' ? finalizar('desistiu') : null;
        falaFim = atualizar() || falaFim;
        silencio = false;
        falar(fim ? (falaFim || '') + ' Clique em <b>NOVO JOGO</b> pra jogar de novo!' :
          'Vamos continuar de onde paramos? ' + (s.lado === cor ? 'É a sua vez.' : 'É a minha vez.'));
        restaurou = true;
      } catch (e) { silencio = false; restaurou = false; }
    }
    if (!restaurou) novoJogo(0);

    return {
      // chamado quando a seção Diversões aparece: carrega o Stockfish e,
      // se for a vez do Ed, ele joga
      aquecer: function () {
        if (visto) return;
        visto = true;
        motor.aquecer();
        vezDoEd();
      }
    };
  }

  global.Xadrez = { montar: montar, NIVEIS: NIVEIS };
})(typeof window !== 'undefined' ? window : globalThis);
