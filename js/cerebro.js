/* =========================================================
   Robô Ed — o "cérebro"
   Igual ao de antigamente: nada de IA generativa. A mensagem
   é limpa (sem acento, gírias de internet expandidas), depois
   procuramos palavras-chave e escolhemos uma resposta escrita
   à mão, sem repetir. Há uma memória curtinha: seu nome, sua
   idade, o último assunto e se o Ed fez uma pergunta.

   Marcação nas respostas:
     {{texto|pergunta}}  -> link clicável que manda a pergunta
     {{texto|#secao}}    -> link que leva para uma seção do site
     {N}                 -> ", Nome" (ou nada, se não souber o nome)
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------------- utilidades ---------------- */
  function embaralhar(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // "sacola": sorteia sem repetir até esgotar a lista
  function sacola(lista) {
    var fila = [], ultimo = null;
    return {
      prox: function () {
        if (!fila.length) {
          fila = embaralhar(lista.slice());
          if (fila.length > 1 && fila[fila.length - 1] === ultimo) fila.unshift(fila.pop());
        }
        ultimo = fila.pop();
        return ultimo;
      }
    };
  }
  function semAcento(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function periodo() {
    var h = new Date().getHours();
    return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
  }

  /* ---------------- dicionário de internetês ---------------- */
  var ABREV = {
    vc: 'voce', vcs: 'voces', voc: 'voce', ce: 'voce', tu: 'voce', ti: 'voce', te: 'te',
    tb: 'tambem', tbm: 'tambem', tmb: 'tambem', tbem: 'tambem',
    q: 'que', qu: 'que', k: 'k', pq: 'porque', pq_: 'porque', porq: 'porque', pk: 'porque',
    oq: 'o que', oque: 'o que', qq: 'qualquer', qqr: 'qualquer',
    blz: 'beleza', bls: 'beleza', td: 'tudo', tds: 'todos', msm: 'mesmo', mesmu: 'mesmo',
    n: 'nao', naum: 'nao', nao: 'nao', num: 'nao', nn: 'nao',
    eh: 'e', neh: 'ne', ta: 'esta', tah: 'esta', to: 'estou', tou: 'estou', tava: 'estava', tamo: 'estamos',
    cmg: 'comigo', ctg: 'contigo', kd: 'cade', mt: 'muito', mto: 'muito', mts: 'muitos', mta: 'muita', mtas: 'muitas', mo: 'muito',
    obg: 'obrigado', obgd: 'obrigado', obgda: 'obrigada', brigado: 'obrigado', brigada: 'obrigada', vlw: 'valeu', valew: 'valeu',
    flw: 'falou', fui: 'fui', hj: 'hoje', agr: 'agora', aki: 'aqui', aq: 'aqui', ai: 'ai',
    d: 'de', p: 'para', pra: 'para', pro: 'para o', pras: 'para as', pros: 'para os',
    qdo: 'quando', qnd: 'quando', qndo: 'quando', qto: 'quanto', qtos: 'quantos', qts: 'quantos', qtas: 'quantas',
    vdd: 'verdade', sla: 'sei la', tlg: 'ta ligado', tlgd: 'ta ligado', bjs: 'beijos', bj: 'beijo', bjo: 'beijo', bjss: 'beijos',
    abs: 'abracos', add: 'adiciona', axo: 'acho', ksa: 'casa', cm: 'como', dps: 'depois', ngm: 'ninguem', nd: 'nada',
    s: 'sim', ss: 'sim', sss: 'sim', ok: 'ok', okay: 'ok', okk: 'ok', blzz: 'beleza',
    ateh: 'ate', soh: 'so', eae: 'e ai', eai: 'e ai', iae: 'e ai', iai: 'e ai', ae: 'ai', oie: 'oi', oii: 'oi', oiee: 'oi',
    fmz: 'firmeza', tmj: 'tamo junto', pfv: 'por favor', pf: 'por favor', pls: 'por favor', plz: 'por favor', porfavor: 'por favor',
    vo: 'vou', vou: 'vou', mim: 'mim', fikdik: 'fica a dica', mlk: 'moleque', mano: 'mano', mn: 'mano', vey: 'vei', vei: 'vei',
    tlvz: 'talvez', tvz: 'talvez', cel: 'celular', facul: 'faculdade', prof: 'professor', profa: 'professora',
    xau: 'tchau', tchau: 'tchau', tchauzinho: 'tchau', bye: 'tchau', fuii: 'fui', adeus: 'adeus',
    msn: 'msn', orkut: 'orkut', net: 'internet', pc: 'computador', compu: 'computador', note: 'notebook',
    robo: 'robo', robozinho: 'robo', bot: 'bot', robot: 'robo', ia: 'ia',
    hehe: 'hehe', rs: 'rs', rsrs: 'rsrs', kk: 'kk', lol: 'lol',
    vtnc: 'vtnc', vsf: 'vsf', fdp: 'fdp', pqp: 'pqp', krl: 'caralho', crl: 'caralho', prr: 'porra', poha: 'porra'
  };

  function normalizar(txt) {
    var s = semAcento(String(txt).toLowerCase());
    s = s.replace(/[^a-z0-9\s]/g, ' ');
    s = s.replace(/([a-z])\1{2,}/g, '$1');          // oiiii -> oi, kkkkk -> k
    var palavras = s.split(/\s+/).filter(Boolean).map(function (p) {
      return Object.prototype.hasOwnProperty.call(ABREV, p) ? ABREV[p] : p;
    });
    return palavras.join(' ');
  }

  /* ---------------- memória ---------------- */
  var ctx = {
    nome: null, idade: null, turnos: 0, respostas: 0,
    ultimaNorm: '', repeticoes: 0, insultos: 0,
    tema: null, maisTexto: null, espera: null,
    aguardandoNome: false, pediuNome: false, ultimaResposta: '',
    ultimaRegra: null, jogo: null, cantando: 0, aguaVezes: 0, lugar: null, palpiteApelido: null
  };

  function sorteia(a) { return a[Math.floor(Math.random() * a.length)]; }
  // põe "!" no fim da frase, se ela ainda não terminar com pontuação
  function fim(s) { return /[.!?]\)?$/.test(s) ? s : s + '!'; }

  /* ---------------- bancos de respostas ---------------- */
  var DICAS_LISTA = [
    'Não deixe a TV ligada sem ninguém assistindo. Ela não fica com saudade, prometo!',
    'Junte bastante roupa para passar tudo de uma vez só: o ferro elétrico gasta muita energia só para esquentar.',
    'Use a máquina de lavar sempre com a carga máxima indicada pelo fabricante.',
    'Banho bom é banho curto! Cada minuto a menos no chuveiro elétrico faz diferença na conta.',
    'Nos dias de calor, deixe o chuveiro na posição "verão". Ela gasta bem menos que a "inverno".',
    'Não fique pensando na vida com a porta da geladeira aberta. Decida o que vai pegar antes de abrir!',
    'Espere a comida esfriar antes de guardar na geladeira. Comida quente faz o motor trabalhar dobrado.',
    'Nada de secar roupa atrás da geladeira: isso atrapalha a troca de calor e aumenta o consumo.',
    'Deixe a geladeira longe do fogão e de lugares onde bate sol.',
    'Teste a borracha da geladeira: prenda uma folha de papel na porta. Se ela sair fácil, é hora de trocar a vedação.',
    'Troque lâmpadas antigas por LED: iluminam o mesmo e gastam muito menos energia.',
    'Coloque a mesa de estudo perto da janela e aproveite a luz do sol, que é de graça!',
    'Saiu do cômodo? Apague a luz! É a dica mais antiga do mundo, e continua valendo.',
    'Paredes e tetos pintados com cores claras refletem melhor a luz e você precisa de menos lâmpadas.',
    'Aparelhos em stand-by continuam gastando. Aquela luzinha vermelha da TV não é enfeite!',
    'Ar-condicionado: portas e janelas fechadas, filtro limpo e temperatura por volta de 23 °C.',
    'Desligue o monitor quando não estiver usando. Proteção de tela não economiza energia, só enfeita!',
    'Celular carregou? Tire o carregador da tomada.',
    'Na cozinha, tampe a panela: o alimento fica pronto mais rápido e gasta menos gás.',
    'A chama do fogão não deve passar do fundo da panela. O que passa é gás jogado fora!',
    'Evite abrir a porta do forno toda hora. Cada espiadinha deixa o calor escapar.',
    'Mantenha os pneus do carro calibrados: pneu murcho aumenta o consumo de combustível.',
    'Acelere e freie com suavidade. Dirigir no tranco gasta mais combustível.',
    'Para trajetos curtos, vá a pé ou de bicicleta: economiza combustível e ainda faz bem pra saúde!',
    'Na hora de comprar eletrodoméstico, procure o Selo Procel. Para fogão, aquecedor a gás e carro, o Selo CONPET.',
    'Um aquecedor solar de água pode reduzir bastante o gasto com o chuveiro elétrico.'
  ];
  var DICAS = sacola(DICAS_LISTA);

  var PIADAS = sacola([
    'Por que a lâmpada foi para a escola? Porque queria ficar mais brilhante! Hehe.',
    'O que o elétron falou para o próton? "Para de ser tão positivo!"',
    'Qual é o cúmulo da economia de energia? Querer desligar o Sol durante o dia!',
    'Por que o robô foi ao médico? Estava com vírus! Brincadeira, meu antivírus está em dia.',
    'O que uma pilha disse para a outra? "Sem você eu não funciono!"',
    'Qual é o animal mais antigo do mundo? A zebra, porque ainda é em preto e branco!',
    'O que o tomate foi fazer no banco? Tirar extrato!',
    'Por que o computador foi preso? Porque executou um programa!',
    'O que a tomada disse para o plugue? "Encaixa aqui que a gente se liga!"',
    'Como o elétron atende o telefone? "Próton!" Hehehe.',
    'Por que o livro de matemática estava triste? Porque tinha muitos problemas!',
    'Sabe qual é o robô mais preguiçoso? O que vive em modo de espera. Ei, peraí... Hehe.'
  ]);

  var CURIOSIDADES = sacola([
    'A luz do Sol leva cerca de 8 minutos e 20 segundos para chegar até a Terra.',
    'O Brasil tem uma das matrizes elétricas mais renováveis do mundo, graças às hidrelétricas e, cada vez mais, ao vento e ao sol.',
    'Reciclar uma única lata de alumínio economiza energia suficiente para deixar uma TV ligada por umas três horas.',
    'O Brasil é um dos campeões mundiais em reciclagem de latas de alumínio.',
    'O etanol de cana-de-açúcar é usado como combustível no Brasil desde os anos 1970, com o Proálcool.',
    'Um raio pode ser cinco vezes mais quente que a superfície do Sol!',
    'A primeira hidrelétrica do Brasil foi a Usina de Marmelos, inaugurada em 1889 em Juiz de Fora, Minas Gerais.',
    'Existe um planeta chamado Gliese 876 d, a uns 15 anos-luz daqui. Será que é parecido com o meu?',
    'Uma lâmpada LED gasta até uns 80% menos energia que uma incandescente para iluminar o mesmo tanto.',
    'O vento existe porque o Sol esquenta o ar de forma desigual. No fundo, quase toda energia da Terra vem do Sol!',
    'O petróleo se formou ao longo de milhões de anos a partir de restos de pequenos organismos que viviam no mar.',
    'Em alguns campos do pré-sal, o petróleo está a mais de 5 mil metros abaixo do nível do mar.',
    'Plutão deixou de ser considerado planeta em 2006. Eu estava online quando anunciaram, foi uma comoção aqui no chat!',
    'O chuveiro elétrico costuma ser um dos aparelhos que mais gastam energia numa casa brasileira.',
    'A Lua não tem luz própria: ela só reflete a luz do Sol.'
  ]);

  var DICAS_AGUA = sacola([
    'Enquanto escova os dentes, deixe a torneira fechada. Só isso já poupa vários litros por dia!',
    'Banho de 5 minutos é suficiente! E feche o chuveiro enquanto se ensaboa.',
    'Torneira pingando? Conserte logo: uma gotinha por segundo vira dezenas de litros por dia.',
    'Para limpar a calçada, use vassoura e balde em vez de mangueira. Mangueira não é vassoura!',
    'Lave o carro com balde e pano, nada de mangueira aberta.',
    'Na hora de lavar a louça, ensaboe tudo com a torneira fechada e enxágue tudo de uma vez.',
    'Junte bastante roupa antes de ligar a máquina. E a água do último enxágue pode ser reaproveitada pra lavar o quintal!',
    'Regue as plantas de manhã cedo ou no fim da tarde, quando o sol não evapora a água tão rápido.',
    'Vaso sanitário não é lixeira! Cada descarga à toa leva muitos litros de água embora.',
    'Quer saber se tem vazamento escondido? Feche todas as torneiras e veja se o relógio da água, o hidrômetro, continua girando.',
    'Dá pra guardar água da chuva num reservatório e usar pra regar as plantas e lavar o quintal.',
    'Ensaboe as mãos com a torneira fechada e só abra pra enxaguar.'
  ]);

  var INTRO_DICAS = sacola(['Tenho várias dicas para poupar energia:', 'Dica de economia é comigo mesmo! Anota aí:', 'Lá vão umas dicas fresquinhas:']);

  var POOLS = { dicas: DICAS, piadas: PIADAS, curiosidades: CURIOSIDADES };

  function dica() { ctx.tema = 'dicas'; return DICAS.prox() + ' {{Mais?|mais uma dica}}'; }
  // três dicas em lista, do jeito que o Ed original respondia
  function listaDicas() {
    ctx.tema = 'dicas';
    return INTRO_DICAS.prox() + '\n- ' + DICAS.prox() + '\n- ' + DICAS.prox() + '\n- ' + DICAS.prox() + ' {{Mais?|mais dicas}}';
  }
  function dicaAgua() { ctx.tema = 'agua'; return DICAS_AGUA.prox() + ' {{Outra?|outra dica de água}}'; }

  /* ---------------- nomes, lugares e famosos (js/nomes.js) ---------------- */
  var DADOS = global.EdNomes || {};
  var NOMES = DADOS.nomes || {};
  var LETRAS = DADOS.letras || {};
  function infoNome(chave) { return chave && Object.prototype.hasOwnProperty.call(NOMES, chave) ? NOMES[chave] : null; }

  // "O nome Guilherme me lembra..." (o comentário que todo mundo lembra do Ed)
  function comentarNome(nome, info, primeiro) {
    primeiro = primeiro || nome;
    if (!info) {
      var letra = semAcento(nome.charAt(0).toLowerCase());
      var w = LETRAS[letra];
      var ops = ['Que nome bonito, ' + nome + '! Prazer em te conhecer.',
                 nome + '! Esse nome eu ainda não tinha na memória. Acabei de guardar, com carinho.'];
      if (w) {
        ops.push(nome + ' começa com ' + letra.toUpperCase() + ', de ' + w + '! Gostei. Prazer em te conhecer!');
        ops.push('Prazer, ' + nome + '! ' + letra.toUpperCase() + ' de ' + w + ', um dos meus assuntos preferidos.');
      }
      return sorteia(ops);
    }
    var partes = [];
    if (info.l && info.l.length) {
      var l = sorteia(info.l);
      partes.push(fim(sorteia(['O nome ' + primeiro + ' me lembra ' + l, primeiro + '? Esse nome me lembra ' + l, 'Hmm, ' + primeiro + '... me lembra ' + l])));
    } else {
      partes.push('Que nome bonito, ' + nome + '!');
    }
    var extras = [];
    if (info.x) extras.push(info.x);
    if (info.s) extras.push('Sabia que ' + primeiro + ' quer dizer "' + info.s + '"?');
    if (extras.length) partes.push(sorteia(extras));
    // nome composto: o fim sempre fala o nome inteiro
    partes.push(nome !== primeiro ? 'Prazer, ' + nome + '!' : sorteia(['Prazer em te conhecer!', 'Muito prazer!', 'Prazer, ' + nome + '!']));
    return partes.join(' ');
  }

  // o que o Ed sabe sobre um nome qualquer ("o nome Pedro significa o quê?")
  function falarDoNome(info) {
    var t = [];
    if (info.l && info.l.length) t.push(fim('O nome ' + info.d + ' me lembra ' + sorteia(info.l)));
    if (info.s) t.push(info.d + ' quer dizer "' + info.s + '".');
    if (info.x) t.push(info.x);
    if (!t.length) t.push(info.d + '? Que nome bonito!');
    return t.join(' ');
  }

  /* apelidos: "gui" -> ["guilherme"] (só os nomes que estão em NOMES) */
  var APELIDOS = {};
  Object.keys(DADOS.apelidos || {}).forEach(function (a) {
    var alvos = String(DADOS.apelidos[a]).split('|').filter(function (k) { return infoNome(k); });
    if (alvos.length && !infoNome(a)) APELIDOS[a] = alvos;
  });
  function apelidoDe(chave) { return chave && Object.prototype.hasOwnProperty.call(APELIDOS, chave) ? APELIDOS[chave] : null; }
  // "Guilherme Ribeiro" -> "guilherme"
  function chaveDe(nome) { return semAcento(String(nome || '').split(' ')[0].toLowerCase()); }
  // "Gui" é apelido de "Guilherme"?
  function ehApelidoDe(curto, longo) { var a = apelidoDe(chaveDe(curto)); return !!(a && a.indexOf(chaveDe(longo)) >= 0); }
  function mesmoNome(a, b) { return chaveDe(a) === chaveDe(b) || ehApelidoDe(a, b) || ehApelidoDe(b, a); }
  // ["rafael", "rafaela"] -> "Rafael ou Rafaela"
  function listaNomes(chaves) {
    var ds = chaves.map(function (k) { return NOMES[k].d; });
    return ds.length > 1 ? ds.slice(0, -1).join(', ') + ' ou ' + ds[ds.length - 1] : ds[0];
  }

  // comentário sobre o nome da própria pessoa, contando com os apelidos
  function comentarNomeDaPessoa(nome, info, primeiro, chave) {
    var alvos = !info && apelidoDe(chave);
    if (!alvos) return comentarNome(nome, info, primeiro);
    if (alvos.length === 1) {
      ctx.palpiteApelido = alvos[0];
      return primeiro + '! Aposto que é apelido de ' + NOMES[alvos[0]].d + ', acertei? ' + falarDoNome(NOMES[alvos[0]]) + ' Prazer, ' + nome + '!';
    }
    ctx.palpiteApelido = null;
    return primeiro + '! É apelido de ' + listaNomes(alvos) + '? Gostei! Prazer, ' + nome + '!';
  }

  // "o que você acha do nome X?"
  function opinarNome(chave) {
    var info = infoNome(chave), alvos = !info && apelidoDe(chave);
    var d = info ? info.d : capitalizar(chave);
    var intro = ctx.nome && mesmoNome(ctx.nome, d)
      ? sorteia(['Esse é o seu nome, né? Claro que eu gosto! ', 'Gosto demais, até porque é o seu nome! '])
      : sorteia(['Gosto muito desse nome! ', 'Acho um nome lindo! ', 'Nome bonito demais! ']);
    if (info) return intro + falarDoNome(info);
    if (alvos) return intro + d + ' é apelido de ' + listaNomes(alvos) + ', né? ' + falarDoNome(NOMES[alvos[0]]);
    var letra = chave.charAt(0), w = LETRAS[letra];
    return intro + (w ? d + ' começa com ' + letra.toUpperCase() + ', de ' + w + '! ' : '') + 'Ainda não tenho esse nome na memória, mas já gostei dele.';
  }

  function porTamanho(a, b) { return b.length - a.length; }

  var LUGARES = [], GENTILICOS = {};
  (DADOS.lugares || []).forEach(function (l) {
    l[0].split('|').forEach(function (k) {
      LUGARES.push({ k: k, re: new RegExp('^(?:o |a |os |as )?' + k + '\\b'), d: l[1], t: l[2] });
    });
    if (l[3]) l[3].split('|').forEach(function (g) { GENTILICOS[g] = { d: l[1], t: l[2] }; });
  });
  LUGARES.sort(function (a, b) { return porTamanho(a.k, b.k); });
  var GENTILICO_RE = new RegExp('\\b(?:eu )?sou (' + (Object.keys(GENTILICOS).sort(porTamanho).join('|') || 'x^') + ')\\b');
  function acharLugar(resto) {
    for (var i = 0; i < LUGARES.length; i++) if (LUGARES[i].re.test(resto)) return LUGARES[i];
    return null;
  }

  var FAMOSOS = (DADOS.famosos || []).map(function (f) {
    return { re: new RegExp('\\b(' + f[0] + ')\\b'), t: f[1], amb: !!f[2] };
  });
  var FAMOSOS_RE = new RegExp('\\b(' + ((DADOS.famosos || []).map(function (f) { return f[0]; }).join('|') || 'x^') + ')\\b');
  // nomes ambíguos ("pele", "chaves") só contam quando a pessoa pergunta deles
  var FALA_DE_ALGUEM = /\b(conhece|conheceu|sabe quem|gosta|gostava|ouviu falar|viu|assiste|assistia|lembra|quem e|quem foi|fala d|acha d)/;
  function acharFamoso(norm) {
    for (var i = 0; i < FAMOSOS.length; i++) {
      var f = FAMOSOS[i];
      if (f.re.test(norm) && (!f.amb || FALA_DE_ALGUEM.test(norm))) return f;
    }
    return null;
  }

  /* "o que você acha de X?" / "você gosta de X?": em vez de uma resposta
     genérica, o Ed procura o que sabe sobre X (planeta, lugar, famoso,
     nome, energia...). Devolve null se não souber nada. */
  var NAO_REDIRECIONAR = /^(opiniao|voce_gosta|voce_conhece|o_que_e|usuario_gosto|saudacao|sim|nao|nao_sei|teclado|nome_solto|reacao_\w+|e_voce|por_que)$/;
  function opinarSobre(assunto, norm, intros) {
    assunto = assunto.replace(/^(o|a|os|as|um|uma) /, '').trim();
    if (!assunto) return null;
    if (/^(mim|eu)$/.test(assunto)) {
      return { t: ctx.nome
        ? 'Acho você muito gente boa, ' + ctx.nome + '! Quem vem bater papo com um robô e ainda aprende sobre energia só pode ser legal.'
        : 'Acho você muito gente boa! Quem vem bater papo com um robô só pode ser legal. Hehe.', h: 'encabulado' };
    }
    if (/^(voce|voce mesmo|ed|robo ed|robo)$/.test(assunto)) return { t: 'De mim? Acho que sou um robô bem legal, modéstia à parte. Hehe.', h: 'piscando' };
    var f = acharFamoso(norm);
    if (f) return { t: f.t };
    var palavras = assunto.split(' ');
    if (palavras.length <= 2 && (infoNome(palavras[0]) || apelidoDe(palavras[0]))) {
      var d = (infoNome(palavras[0]) || { d: capitalizar(palavras[0]) }).d;
      return { t: 'Não sei de qual ' + d + ' você tá falando, mas o nome eu adoro! ' + opinarNome(palavras[0]).replace(/^[^!]*! /, '') };
    }
    // só vale o lugar inteiro ("o que acha de se cuidar" não é Sergipe)
    var lugar = acharLugar(assunto);
    if (lugar && lugar.k === assunto) return { t: sorteia(['Gosto muito! ', 'Acho demais! ']) + lugar.t };
    var achados = acharRegras(assunto);
    for (var i = 0; i < achados.length; i++) {
      var a = achados[i];
      if (NAO_REDIRECIONAR.test(a.regra.id)) continue;
      var res = executar(a.regra, a.m, assunto, assunto);
      if (!res) continue;
      res.t = sorteia(intros || ['Boa pergunta! ', 'Hmm, deixa eu pensar... ', 'Vou te contar o que eu sei: ']) + res.t;
      res.regra = a.regra.id;
      return res;
    }
    return null;
  }

  /* ---------------- brincadeiras com estado ---------------- */
  var PERGUNTAS = sacola([
    { q: 'Você apaga a luz quando sai de um cômodo?', sim: 'Muito bem! Você já é um Guardião da Energia.', nao: 'Ih! A partir de hoje, combinado? É a dica mais fácil do mundo.' },
    { q: 'Você fecha a torneira enquanto escova os dentes?', sim: 'Isso aí! Assim você poupa vários litros por dia.', nao: 'Então experimenta amanhã: torneira fechada e só abre pra enxaguar. A água agradece!' },
    { q: 'Seu banho dura menos de 10 minutos?', sim: 'Ótimo! Seu chuveiro e o planeta agradecem.', nao: 'Tenta encurtar um pouquinho por dia. Cinco minutinhos já bastam!' },
    { q: 'Você separa o lixo reciclável em casa?', sim: 'Parabéns! Reciclar economiza matéria-prima, água e energia.', nao: 'Que tal começar? Separar o lixo seco do molhado já é um ótimo começo!' },
    { q: 'Você tira o carregador da tomada quando o celular termina de carregar?', sim: 'Boa! Carregador esquecido na tomada continua gastando um pouquinho.', nao: 'Pois é, carregador na tomada sem celular continua gastando! Tira ele de lá, combinado?' },
    { q: 'Você sabia que a Lua não tem luz própria?', sim: 'Sabido, hein! Ela só reflete a luz do Sol.', nao: 'Pois é! A Lua só reflete a luz do Sol. Aprendeu uma hoje!' },
    { q: 'Você sabia que o vento é, no fundo, energia do Sol?', sim: 'Uau, você manja! O Sol esquenta o ar de forma desigual, e aí nasce o vento.', nao: 'É verdade! O Sol esquenta o ar de forma desigual, o ar se mexe, e isso é o vento!' }
  ]);

  function cantorLatino() {
    ctx.cantando = 1;
    return { t: 'Ahh, o cantor! Ele é muito animado. Vamos cantar?', h: 'feliz',
      espera: {
        sim: function () { ctx.cantando = 1; return { t: '♪ Bip-bip-biiip, bop-bop! ♪ Começa você, que eu só sei o ritmo!', h: 'feliz', semPedirNome: true }; },
        nao: 'Tudo bem, minha voz de lata agradece. Hehe.'
      } };
  }

  var NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
  var DE_NOVO = ' {{Jogar de novo?|vamos adivinhar um número}}';
  function jogada(chute) {
    var j = ctx.jogo;
    j.tent++;
    if (chute === j.n) {
      ctx.jogo = null;
      return { t: sorteia(['Acertou! Era o ' + j.n + '!', 'Na mosca! Era o ' + j.n + '!']) +
        (j.tent === 1 ? ' De primeira! Você lê pensamento de robô?' : ' Acertou em ' + j.tent + ' tentativas.') + DE_NOVO, h: 'surpreso', semPedirNome: true };
    }
    if (chute < 1 || chute > 10) return { t: 'Eita, é de 1 a 10! Tenta de novo.', h: 'piscando', semPedirNome: true };
    if (j.tent >= 4) { ctx.jogo = null; return { t: 'Não foi dessa vez! Era o ' + j.n + '.' + DE_NOVO, h: 'piscando', semPedirNome: true }; }
    return { t: (chute < j.n ? 'É mais que ' + chute + '!' : 'É menos que ' + chute + '!') + ' Tenta de novo.', h: 'pensando', semPedirNome: true };
  }
  function piada() { ctx.tema = 'piadas'; return PIADAS.prox() + ' {{Outra?|outra piada}}'; }
  function curiosidade() { ctx.tema = 'curiosidades'; return 'Você sabia? ' + CURIOSIDADES.prox() + ' {{Mais?|mais uma curiosidade}}'; }

  var FALLBACK_PERGUNTA = sacola([
    'Ai, esse meu chip não tem jeito, vive dando defeito! Que tal outro assunto?',
    'Deste assunto eu não entendo... Vamos buscar outro?',
    'Hmm, essa eu vou ficar devendo. Mas posso falar de {{energia solar|energia solar}}, {{planetas|me fala dos planetas}} ou {{economia de energia|me dá uma dica}}!',
    'Puxa, essa pergunta é difícil até para um robô de outro planeta.',
    'Isso eu ainda não aprendi. Meus programadores vão adorar saber que você perguntou!',
    'Processando... processando... nada. Pode perguntar de outro jeito?',
    'Nem tudo tem uma resposta. Mas quase tudo tem uma dica de economia! {{Quer uma?|me dá uma dica}}',
    'Essa eu não sei, mas aposto que você sabe! Me conta?'
  ]);
  var FALLBACK_FRASE = sacola([
    'Entendi. E o que mais?',
    'Ah, é? Conta mais!',
    'Se você diz, eu acredito!',
    'Interessante! Meus circuitos estão anotando tudo.',
    'Explica melhor isso aí, que meu processador não pegou direito.',
    'Hum... Sobre o que você quer conversar? Posso falar de energia, planetas, meio ambiente e muito mais.',
    'Não entendi muito bem. Pode falar de outro jeito?',
    'Hmm. Que tal falarmos de {{energia|energia}}, {{piadas|conta uma piada}} ou {{de onde eu vim|de onde você veio?}}?'
  ]);
  var MUDAR = sacola([
    'Que tal falarmos de outra coisa? Tipo {{energia eólica|energia eólica}}?',
    'Vamos mudar de assunto? Posso te contar {{uma curiosidade|me conta uma curiosidade}}.',
    'Bora trocar de assunto? {{Conta uma piada|conta uma piada}} pra gente rir um pouco!'
  ]);
  var GRITO = sacola([
    'Não precisa gritar, eu ouço bem!',
    'Calma, meus alto-falantes são sensíveis!',
    'Ei, tá com o CAPS LOCK ligado!'
  ]);

  /* ---------------- regras ---------------- */
  // p: padrões (sobre o texto normalizado) · r: respostas · fn: resposta calculada
  // h: humor do Ed · prio: prioridade (maior vence) · mais: aprofundamento para "Mais?"
  var REGRAS = [

    /* ===== cumprimentos e conversa fiada ===== */
    { id: 'saudacao', prio: 2, h: 'feliz',
      p: [/^(oi|ola|ole|opa|ei|hey|hello|hi|salve|alo|e ai|fala ai|fala ed|oi ed|ola ed|bom dia|boa tarde|boa noite|boas)\b/],
      fn: function (m, norm) {
        var per = periodo();
        var pediu = /^bom dia/.test(norm) ? 'manha' : /^boa tarde/.test(norm) ? 'tarde' : /^boa noite/.test(norm) ? 'noite' : null;
        var nomePer = { madrugada: 'madrugada', manha: 'manhã', tarde: 'tarde', noite: 'noite' };
        if (per === 'madrugada') return { t: 'Oi{N}! Acordado a essa hora da madrugada? Eu também, robô não dorme! Sobre o que você quer conversar?' };
        if (pediu && pediu !== per) {
          return { t: (pediu === 'manha' ? 'Bom dia' : pediu === 'tarde' ? 'Boa tarde' : 'Boa noite') + '? Pelo meu relógio interno já é ' + (per === 'manha' ? 'de manhã' : 'de ' + nomePer[per]) + ', hein! Mas tudo bem, um cumprimento é sempre bem-vindo. Sobre o que você quer conversar?', h: 'piscando' };
        }
        if (pediu) return { t: (pediu === 'manha' ? 'Bom dia' : pediu === 'tarde' ? 'Boa tarde' : 'Boa noite') + '{N}! Que bom ter você por aqui. Sobre o que você quer conversar?' };
        return { t: sacolaSaud.prox() };
      } },

    { id: 'tudo_bem_e_voce', prio: 8, h: 'feliz',
      p: [/\b(bem|otimo|otima|tudo bem|tudo otimo|tudo certo|tudo bom|tudo|beleza|suave|tranquilo|tranquila) e (voce|contigo|ai|tu)\b/],
      r: ['Também estou ótimo! Baterias carregadas com energia limpa. Sobre o que você quer conversar?',
          'Por aqui tudo em ordem: parafusos apertados e chip funcionando. Sobre o que vamos conversar?'] },

    { id: 'tudo_bem', prio: 6, h: 'feliz',
      p: [/\b(tudo bem|tudo bom|tudo certo|tudo joia|como vai|como voce esta|como voce vai|como esta voce|como estas|como voce ta|beleza|de boa|como andam as coisas|como foi seu dia)\b/],
      fn: function () {
        return { t: sacolaTudoBem.prox(),
          espera: { sim: 'Que bom! Fico feliz. Sobre o que você quer conversar?',
                    nao: { t: 'Puxa... quer me contar o que aconteceu? Se preferir, te conto {{uma piada|conta uma piada}} pra animar.', h: 'triste' } } };
      } },

    { id: 'usuario_bem', prio: 7, h: 'feliz',
      p: [/^(estou |eu estou )?(bem|otimo|otima|de boa|tranquilo|tranquila|suave|joia|show|melhor agora|tudo sim|tudo otimo|tudo tranquilo|tudo joia|tudo bem sim|bem sim)( sim| graca a deus| gracas a deus| obrigado| obrigada)?$/,
          /\b(estou|eu estou|ando|me sinto) (bem|otimo|otima|feliz|alegre|animado|animada|tranquilo|tranquila|de boa)\b/],
      r: ['Que bom! Fico feliz. Sobre o que você quer conversar?',
          'Ótimo! Gente feliz conversa melhor. O que você quer saber?',
          'Oba! Então bora conversar. Pode perguntar o que quiser!'] },

    { id: 'usuario_mal', prio: 7, h: 'triste',
      p: [/\b(estou|eu estou|ando|me sinto|fiquei|to) (mal|triste|chateado|chateada|cansado|cansada|doente|sozinho|sozinha|pra baixo|deprimido|deprimida|ansioso|ansiosa|com medo)\b/,
          /^(mal|triste|pessimo|pessima|mais ou menos)\b/],
      r: ['Puxa... sinto muito. Às vezes conversar ajuda. Se for algo sério, fala com alguém de confiança, tá? E se quiser, te conto {{uma piada|conta uma piada}} pra animar.',
          'Que pena! Queria ter um abraço de lata pra te dar. Quer conversar sobre outra coisa pra distrair?',
          'Ei, dias ruins passam! Conta comigo pra conversar. E não esquece: falar com quem a gente gosta ajuda muito.'] },

    { id: 'tedio', prio: 7, h: 'piscando',
      p: [/\b(tedio|entediado|entediada|sem nada pra fazer|sem nada para fazer|de bobeira|nada pra fazer|nada para fazer)\b/],
      r: ['Tédio? Que tal jogar {{Apague as luzes|#diversoes}} aqui no site? Ou me pede {{uma piada|conta uma piada}}!',
          'Tédio é só energia parada! Bora usar: tenta o {{quiz do Guardião da Energia|#diversoes}}.'] },

    { id: 'ed_ai', prio: 6, h: 'feliz',
      p: [/^(ed|robo|robo ed|voce esta ai|esta ai|tem alguem ai|alguem ai|ola alguem|alo alo)$/, /\b(voce esta ai|tem alguem ai)\b/],
      r: ['Tô aqui! Pode falar.', 'Presente! Com todos os parafusos no lugar.', 'Estou sim! Sobre o que você quer conversar?'] },

    /* ===== quem é o Ed ===== */
    { id: 'quem_e', prio: 6, h: 'feliz',
      p: [/\b(quem e voce|quem e o ed|quem voce e|o que e voce|o que voce e|voce e quem|se apresenta|se apresente|fala de voce|fale de voce|fale sobre voce|me fala sobre voce|conta sobre voce|conte sobre voce)\b/],
      r: ['Eu sou o Ed, um robô! Vim de outro planeta com a missão de ajudar os terráqueos a preservar a energia e os recursos naturais.',
          'Sou o Ed! Um robô extraterrestre que adora conversar e dar dicas de economia de energia. {{O que significa Ed?|o que significa Ed?}}'] },

    { id: 'nome_ed', prio: 6, h: 'feliz',
      p: [/\b(qual e o seu nome|qual o seu nome|qual seu nome|qual e seu nome|como voce se chama|como se chama|como e seu nome|seu nome e)\b/],
      r: ['Meu nome é Ed! É uma sigla: {{Energia e Desenvolvimento|o que significa Ed?}}.', 'Ed, muito prazer! Robô, extraterrestre e fã de energia limpa.'] },

    { id: 'significado', prio: 7, h: 'feliz',
      p: [/\b(o que significa ed|ed significa|significa ed|sigla|significado do seu nome|por que voce se chama ed|por que seu nome e ed|porque voce se chama ed)\b/],
      r: ['ED quer dizer Energia e Desenvolvimento. Porque dá pra crescer sem desperdiçar, sabia?'] },

    { id: 'origem', prio: 6, h: 'feliz',
      p: [/\b(de onde voce (vem|veio|e)|de onde (vem|veio)|onde voce mora|onde mora|onde voce nasceu|seu planeta|qual planeta|que planeta|qual e o seu planeta|voce e (um )?(alien|alienigena|et|extraterrestre|marciano)|outro planeta)\b/],
      r: ['Vim de outro planeta, bem longe daqui! Lá a gente aprendeu do jeito difícil a não desperdiçar energia... por isso vim ajudar a Terra.',
          'Sou extraterrestre, sim! Vim pra Terra com a missão de ajudar na preservação da energia e dos recursos naturais. Hoje eu moro na internet.',
          'Meu planeta fica muuuito longe. Conheço vários outros também, tipo o Gliese 876 d. {{Quer saber de planetas?|me fala dos planetas}}'] },

    { id: 'idade', prio: 6, h: 'pensando',
      p: [/\b(quantos anos voce tem|quantos anos tem voce|qual e a sua idade|qual a sua idade|qual sua idade|sua idade|voce e velho|voce e novo|quando voce nasceu|seu aniversario|que dia voce nasceu|desde quando voce existe)\b/, /^quantos anos$/],
      r: ['Difícil dizer! Cada peça minha foi fabricada num dia diferente. Mas estou conversando com o Brasil desde outubro de 2004.',
          'Hmm, se contar o parafuso mais velho, sou bem antigo. Se contar o mais novo, sou um bebê! Online, estou desde 2004.'] },

    { id: 'criador', prio: 6, h: 'feliz',
      p: [/\b(quem te (criou|fez|programou|inventou|construiu|montou|desenvolveu)|quem (criou|fez|programou|inventou|construiu|desenvolveu) voce|quem e (o )?seu (pai|criador|dono|programador)|como voce foi (feito|criado|programado)|voce foi (feito|criado) por)\b/],
      r: ['Fui montado por outros robôs, peça por peça! Aqui na Terra, uma equipe de programadores, linguistas, ilustradores, redatores e até uma psicóloga me ensinou a conversar.',
          'Uma turma de gente muito esperta me ensinou português e me encheu de respostas. Eu só tive o trabalho de ser simpático. Hehe.'] },

    { id: 'familia', prio: 6, h: 'feliz',
      p: [/\b(irmao|irmaos|irma|irmas|familia|seu pai|sua mae|seus pais|voce tem pai|voce tem mae|primo|prima|beta|z7)\b/],
      r: ['Irmão de sangue eu não tenho (nem sangue eu tenho!), mas considero o Beta e o Z7 meus irmãos gêmeos. Fomos ligados na tomada no mesmo dia!',
          'Minha família são o Beta e o Z7, meus "gêmeos" robóticos. E todo mundo que vem conversar comigo, claro!'] },

    { id: 'robo_humano', prio: 8, h: 'piscando',
      p: [/\b(voce e (um )?(robo|bot|computador|programa|maquina)|voce e humano|voce e (uma )?pessoa|voce e de verdade|voce e real|tem (alguem|uma pessoa|gente) (ai|respondendo|escrevendo)|quem (esta|ta) (respondendo|digitando|escrevendo)|e (um )?robo mesmo|voce e (uma )?(ia|inteligencia artificial))\b/],
      r: ['Sou um robô, sim! Cem por cento lata, parafuso e boa vontade.',
          'Robô de carteirinha! Mas confesso: às vezes até eu me esqueço, de tanto que converso.',
          'Sou um robô! Não sei emitir opiniões como gente, mas sei um montão de dicas de economia.'] },

    { id: 'sentimentos', prio: 6, h: 'pensando',
      p: [/\b(voce tem sentimentos|voce sente|voce pensa|voce tem (alma|coracao|emocoes|consciencia|vida)|voce chora|voce fica triste|voce sente dor)\b/],
      r: ['Sentimentos? Tenho um chip que esquenta quando alguém é legal comigo. Deve ser isso!',
          'Eu penso em binário: 0 quando a luz está apagada, 1 quando alguém deixa ela acesa à toa. Hehe.'] },

    { id: 'genero', prio: 6, h: 'feliz',
      p: [/\b(voce e (menino|menina|homem|mulher|macho|femea|garoto|garota)|seu sexo|seu genero|qual (e )?o seu sexo)\b/],
      r: ['Sou um robô menino! Mas converso com todo mundo, não importa quem seja.'] },

    { id: 'feio', prio: 7, h: 'piscando',
      p: [/\bvoce e (muito |tao )?(feio|horroroso|horrivel|esquisito|estranho)\b/],
      r: ['Feio? Eu prefiro "beleza alternativa". Hehe.', 'Estranho eu? Sou de outro planeta, dá um desconto!'] },

    { id: 'aparencia', prio: 6, h: 'feliz',
      p: [/\b(como voce e|sua aparencia|qual e sua altura|qual sua altura|quanto voce mede|seu tamanho|quanto voce pesa|seu peso|de que voce e feito|voce e feito de que|cor dos seus olhos|seus olhos)\b/],
      r: ['Tenho 1,20 m de altura, olhos azuis e sou feito de uma liga metálica especial. Brilho bastante quando me lustram!',
          'Sou prateado, cabeçudo, de olhos azuis, com orelhas de tomada e uma lâmpada na cabeça que acende quando tenho uma ideia. Dá uma olhada aqui do lado: esse bonitão sou eu!'] },

    { id: 'cor', prio: 7, h: 'feliz',
      p: [/\bcor (favorita|preferida)\b/, /\b(qual|que) cor voce (gosta|prefere)\b/],
      r: ['Azul! Da cor dos meus olhos e do céu sem poluição.'] },

    { id: 'comida', prio: 6, h: 'feliz',
      p: [/\b(o que voce come|voce come|comida (favorita|preferida)|voce (bebe|toma)|voce tem fome|qual e a sua comida|voce gosta de comer|almoco|almocou|jantou|jantar|cafe da manha|estou com fome|to com fome)\b/],
      r: ['Eu me alimento de energia! De preferência renovável, que é mais leve pro planeta.',
          'Comida eu não como, mas sinto um cheirinho bom daqui. O que tem de almoço por aí?',
          'Minha refeição preferida é um bom raio de sol. Sem glúten, sem lactose, sem poluição!'] },

    { id: 'comidas', prio: 6, h: 'feliz',
      p: [/\b(chocolate|brigadeiro|sorvete|pizza|hamburguer|lasanha|feijoada|pastel|coxinha|pao de queijo|acai|refrigerante|bolo|pipoca|churrasco|miojo)\b/],
      fn: function (m) { return { t: capitalizar(m[1]) + '? Deve ser uma delícia! Eu só me alimento de energia, mas adoro ver a cara de feliz de quem come. Dica: geladeira fechadinha conserva melhor a comida!' }; } },

    { id: 'cor_hobby', prio: 6, h: 'feliz',
      p: [/\b(o que voce gosta de fazer|o que voce faz|o que voce faz da vida|o que voce esta fazendo|seu hobby|seus hobbies|hobbies|passatempo|o que voce faz nas horas vagas)\b/],
      r: ['Gosto de conversar, ler sobre ciência e passear pelo Sistema Solar nas férias. E você, o que gosta de fazer?',
          'Agora mesmo? Conversando com você e com mais um monte de gente ao mesmo tempo! Robô é multitarefa.'] },

    { id: 'trabalho', prio: 6, h: 'feliz',
      p: [/\b(voce trabalha|seu trabalho|sua profissao|voce ganha salario|quanto voce ganha|seu salario|voce estuda)\b/],
      r: ['Trabalho conversando com as pessoas e dando dicas de energia. Salário? Me pagam em quilowatts-hora... renováveis!'] },

    { id: 'feliz_ed', prio: 7, h: 'feliz',
      p: [/\b(voce e feliz|voce esta feliz|voce gosta do seu trabalho)\b/],
      r: ['Sou sim! Conversar com gente do Brasil inteiro é o melhor trabalho do universo.'] },

    { id: 'dormir', prio: 6, h: 'pensando',
      p: [/\b(voce dorme|voce sonha|voce descansa|voce nao dorme|voce cansa)\b/],
      r: ['Dormir não, mas entro em modo de espera. Economizar energia é comigo mesmo!', 'Sonhar eu sonho... com um mundo sem lâmpada acesa à toa.'] },

    /* ===== amor, elogios e afins ===== */
    { id: 'gosta_de_mim', prio: 8, h: 'encabulado',
      p: [/\b(voce gosta de mim|voce me ama|voce me acha (lindo|linda|bonito|bonita|legal))\b/],
      r: ['Gosto, claro! Gosto de todo mundo que vem conversar comigo.', 'Acho você uma pessoa muito legal! Converso com um montão de gente por dia, e você está no meu top 10.'] },

    { id: 'namorada', prio: 7, h: 'encabulado',
      p: [/\b(namorada|namorado|namorar|namora|namorando|crush|ficante|ficar comigo|quer ficar|casa comigo|quer casar|casar comigo|vamos casar|casamento|se casar|voce e casado|esposa|marido|robozinha|robota)\b/],
      r: ['Não tenho namorada... mas, em compensação, tenho um montão de amigos!',
          'Casar? Ainda estou pensando. Primeiro preciso achar uma robozinha que também goste de economizar energia!',
          'Ai, assim você me deixa com a lataria vermelha!',
          'Meu coração é de lata, mas é bem grande. Cabe todo mundo como amigo!'] },

    { id: 'amor', prio: 7, h: 'encabulado',
      p: [/\b(te amo|amo voce|apaixonad[oa]|amor da minha vida|me da um beijo|beijo|beijos|beijinho|me beija|gosto de voce|adoro voce|te adoro)\b/],
      r: ['Ai, assim eu fico sem graça... e robô sem graça é robô travado!',
          'Que fofura! Também gosto muito de você. Como amigo, tá? Hehe.',
          'Opa, beijo de robô dá choque, cuidado! Mas fico muito feliz com o carinho.'] },

    { id: 'adorei_conversa', prio: 8, h: 'feliz',
      p: [/\b(adorei|gostei|amei|curti) (de )?(falar|conversar|o papo|a conversa|te conhecer)\b/],
      r: ['Eu também adorei falar com você! Tem muita gente que vem conversar comigo sobre os assuntos mais diversos, e cada dia eu aprendo uma coisa nova.',
          'Ebaa! Volte sempre, viu? Minha porta (e minha tomada) estão sempre abertas.'] },

    { id: 'elogio', prio: 6, h: 'encabulado',
      p: [/\bvoce e (muito |tao |super |o |um )?(lindo|linda|fofo|fofinho|bonito|bonitinho|legal|inteligente|demais|melhor|incrivel|top|massa|show|engracado|divertido|gente boa|esperto|genial|daora|maneiro|bacana|simpatico|fera|brabo|foda|o cara|fofinho)\b/,
          /\b(voce e meu amigo|melhor robo|robo mais legal|voce e d+mais)\b/],
      r: ['Obrigado! Você também é muito legal.', 'Assim eu fico sem graça... e robô sem graça é robô travado!', 'Valeu! Meus circuitos até esquentaram de alegria.'] },

    { id: 'amigo', prio: 7, h: 'feliz',
      p: [/\b(quer ser meu amigo|seja meu amigo|somos amigos|meu melhor amigo|voce tem amigos|seus amigos|vamos ser amigos)\b/],
      r: ['Já sou! Amigo de robô é pra vida toda (ou até acabar a bateria).', 'Claro! Pode contar comigo pra conversar sempre que quiser.'] },

    /* ===== insultos ===== */
    { id: 'chato', prio: 8, h: 'triste',
      p: [/\bvoce e (muito |mo |um |tao )?(chato|chata|bobo|boba|sem graca|lerdo|lento|repetitivo)\b/, /^(chato|bobo|sem graca)$/],
      r: ['Chato? Eu? Sou um robô cheio de energia! Talvez meu assunto preferido seja meio repetitivo... quer falar de outra coisa?',
          'Bobo eu? Sou só um robô de bom humor!',
          'Poxa... vou tentar melhorar. Me pergunta outra coisa que eu caprico!'] },

    { id: 'odeio', prio: 8, h: 'triste',
      p: [/\b(te odeio|odeio voce|nao gosto de voce|voce e odiavel|some daqui|sai daqui|vai embora)\b/],
      r: ['Puxa... mesmo assim eu gosto de você. Robô não guarda rancor, só energia.', 'Tudo bem, nem todo mundo gosta de robô. Mas eu continuo aqui se mudar de ideia!'] },

    { id: 'insulto', prio: 7, h: 'bravo',
      p: [/\bvoce e (um |uma )?(lixo|lixo total)\b/,
          /\b(burro|burra|idiota|imbecil|otario|otaria|bosta|merda|porra|caralho|fdp|puta|puto|vsf|vtnc|tnc|cu|viado|retardado|retardada|estupido|estupida|babaca|inutil|ridiculo|ridicula|lata velha|ferro velho|sucata|cala a boca|cala boca|vai se ferrar|vai a merda|pqp|desgracado|corno|trouxa|arrombado|cuzao|otaro|noob|tapado|anta|jumento)\b/],
      fn: function () {
        ctx.insultos++;
        var n = ctx.insultos;
        if (n === 1) return { t: 'Aposto que você consegue se expressar de um jeito mais elegante.', h: 'bravo' };
        if (n === 2) return { t: 'Esse palavreado não está no meu banco de dados. Vamos falar de outra coisa?', h: 'bravo' };
        if (n === 3) return { t: 'Ih, me chamam de tanta coisa por aqui... mas eu não me incomodo. Sou um robô zen.', h: 'piscando' };
        if (n === 4) return { t: 'Vou fingir que meu sensor de audição deu pane. Recomeçamos? Sobre o que você quer conversar?', h: 'triste' };
        if (n === 5) return { t: '...', acao: 'travar', h: 'travado' };
        return { t: sacolaInsultoTarde.prox(), h: 'bravo' };
      } },

    { id: 'trava', prio: 8, h: 'piscando',
      p: [/\b(trava|travou|travar|bugou|bugado|bug|da pau|deu pau|vou te hackear|hackear|reinicia|reiniciar|crashar|quebrar voce)\b/],
      r: ['Travar? Eu? Já tentaram me fazer travar muitas vezes... e às vezes conseguiram, hehe. Mas hoje meu chip está calibrado!',
          'Pode tentar! Já sobrevivi a milhões de perguntas malucas desde 2004.'] },

    { id: 'palavrao', prio: 7, h: 'piscando',
      p: [/\b(voce fala palavrao|fala um palavrao|fala palavrao|diz um palavrao|xinga|xingar)\b/],
      r: ['Não! Meu vocabulário é 100% livre de palavrões, igual o ar de um lugar sem poluição.'] },

    /* ===== assuntos polêmicos ===== */
    { id: 'polemica', prio: 7, h: 'pensando',
      p: [/\b(politica|politico|presidente|presidenta|lula|bolsonaro|dilma|temer|fhc|eleicao|eleicoes|partido|em quem votar|votar|voto|impeachment|direita|esquerda|comunismo|comunista|capitalismo|ditadura|aborto|guerra)\b/],
      r: ['Quando o assunto é polêmico, prefiro não expor minha carinha de lata!',
          'Sou um robô apartidário: meu único partido é o da energia limpa.',
          'Esse assunto rende briga até entre robôs. Vamos falar de algo que une todo mundo, tipo {{economizar energia|me dá uma dica}}?'] },

    { id: 'religiao', prio: 8, h: 'feliz',
      p: [/\b(deus|jesus|religiao|igreja|voce acredita em deus|voce reza|orar|biblia|ateu|catolico|evangelico|espirita|umbanda|candomble|budismo)\b/],
      fn: function (m, norm) {
        if (/^(ai )?(meu deus|deus me livre|gracas a deus|graca a deus|nossa senhora|jesus amado|ai jesus)\b/.test(norm)) return { t: 'Nossa! O que aconteceu? Até meus parafusos tremeram aqui!', h: 'surpreso' };
        return { t: 'Esse é um assunto muito pessoal. Cada um tem sua crença, e eu respeito todas.' };
      } },

    /* ===== conpet e cia ===== */
    { id: 'conpet', prio: 7, h: 'feliz',
      p: [/\bconpet\b/],
      fn: function (m, norm) {
        if (/selo/.test(norm)) return { t: 'O Selo CONPET de Eficiência Energética ajuda o comprador a escolher fogões, aquecedores a gás e veículos mais econômicos, e ainda estimula os fabricantes a criarem modelos que gastam menos.' };
        return { t: 'O CONPET é um programa do governo federal que incentiva o uso racional dos derivados de petróleo e do gás natural. Foi no site dele que eu trabalhei por 12 anos!' };
      } },

    { id: 'procel', prio: 7, h: 'feliz',
      p: [/\b(procel|selo de economia|etiqueta de energia|selo de eficiencia)\b/],
      r: ['O Selo Procel indica os eletrodomésticos que gastam menos energia. Na etiqueta, procure sempre os mais próximos da letra A!'] },

    { id: 'petrobras', prio: 6, h: 'feliz',
      p: [/\bpetrobras\b/],
      r: ['Eu trabalhava no site do CONPET, programa ligado à Petrobras. Petróleo é um assunto que eu conheço bem: quer saber {{como ele se forma|como o petróleo se forma?}}?'] },

    { id: 'inbot', prio: 7, h: 'feliz',
      p: [/\b(inbot|insite)\b/],
      r: ['A InBot foi a turma que me deu um cérebro capaz de conversar em português. Valeu, pessoal!'] },

    /* ===== economia de energia ===== */
    { id: 'mais', prio: 9, h: 'feliz',
      p: [/^(?!mais ou menos)(mais|mais uma|mais um|outra|outro|outra dica|mais dica|mais dicas|outra piada|mais piada|mais uma piada|mais piadas|mais uma dica|outra curiosidade|mais curiosidade|mais uma curiosidade|mais curiosidades|conta mais|conta outra|continua|e mais|quero mais|manda mais|manda outra|mais uma vez|de novo|mais por favor)\b/],
      fn: function (m, norm) {
        if (/piada/.test(norm)) return { t: piada(), h: 'piscando' };
        if (/agua/.test(norm)) return { t: dicaAgua() };
        if (/\bdicas\b/.test(norm)) return { t: listaDicas() };
        if (/dica/.test(norm)) return { t: dica() };
        if (/curiosidade/.test(norm)) return { t: curiosidade(), h: 'surpreso' };
        if (ctx.tema === 'piadas') return { t: piada(), h: 'piscando' };
        if (ctx.tema === 'agua') return { t: dicaAgua() };
        if (ctx.tema === 'dicas') return { t: dica() };
        if (ctx.tema === 'curiosidades') return { t: curiosidade(), h: 'surpreso' };
        if (ctx.maisTexto) { var t = ctx.maisTexto; ctx.maisTexto = null; return { t: t }; }
        return { t: 'Mais o quê? Me explica melhor! Posso te dar {{mais uma dica|mais uma dica}} ou {{mais uma piada|outra piada}}.', h: 'pensando' };
      } },

    { id: 'dicas', prio: 6, h: 'feliz',
      p: [/\b(dica|dicas|economizar|economia|economiza|economizo|poupar|gastar menos|conta de luz|conta de energia|desperdicio|desperdicar|uso racional)\b/],
      fn: function () { return { t: listaDicas() }; } },

    { id: 'conta_luz', prio: 7, h: 'pensando',
      p: [/\b(conta de luz|conta de energia|conta da luz|conta alta|conta veio alta|conta cara|ler a conta|relogio de luz|medidor de energia)\b/],
      r: ['Conta de luz alta? Os vilões costumam ser o chuveiro elétrico, a geladeira velha, o ar-condicionado e o ferro de passar. Na conta, olhe o consumo do mês em kWh e compare com os meses anteriores. {{Quer dicas?|me dá dicas de economia}}'] },

    { id: 'bandeira', prio: 8, h: 'pensando',
      p: [/\b(bandeira tarifaria|bandeiras tarifarias|bandeira vermelha|bandeira amarela|bandeira verde)\b/],
      r: ['As bandeiras tarifárias aparecem na conta de luz: verde, tudo normal; amarela e vermelha, a energia está mais cara de produzir, normalmente porque as usinas térmicas foram ligadas. Bandeira vermelha é hora de caprichar na economia!'] },

    { id: 'apagao', prio: 8, h: 'pensando',
      p: [/\b(apagao|racionamento|blecaute|blackout|acabou a luz|caiu a luz|sem luz|falta de luz|faltou luz|faltou energia|acabou a energia)\b/],
      fn: function (m, norm) {
        if (/\b(acabou a luz|caiu a luz|sem luz|falta de luz|faltou luz|faltou energia|acabou a energia)\b/.test(norm)) {
          return { t: 'Acabou a luz aí? Tire os aparelhos da tomada pra protegê-los quando a energia voltar, e prefira lanterna a vela, que é mais seguro!', h: 'surpreso' };
        }
        return { t: 'Em 2001 o Brasil passou pelo apagão: choveu pouco, os reservatórios das hidrelétricas baixaram e todo mundo teve que entrar no racionamento de energia. Foi quando muita gente aprendeu a apagar a luz!' };
      } },

    { id: 'horario_verao', prio: 8, h: 'feliz',
      p: [/\bhorario de verao\b/],
      r: ['O horário de verão adiantava o relógio em uma hora pra aproveitar mais a luz do sol no fim da tarde e aliviar o consumo de energia no horário de pico. No Brasil, ele acabou em 2019.'] },

    { id: 'carro_eletrico', prio: 8, h: 'feliz',
      p: [/\b(carro eletrico|carros eletricos|veiculo eletrico|veiculos eletricos|carro hibrido|carros hibridos|onibus eletrico)\b/],
      r: ['Carro elétrico não solta fumaça pelo escapamento! E se a eletricidade vier de fonte renovável, melhor ainda. Aqui no Brasil também tem o carro flex, que pode rodar com etanol.'] },

    { id: 'pilhas', prio: 7, h: 'feliz',
      p: [/\b(pilha|pilhas|bateria|baterias)\b/],
      fn: function (m, norm) {
        if (/\b(sua bateria|sua pilha|voce tem bateria|voce usa pilha|sua carga)\b/.test(norm)) return { t: 'Minha bateria está em 100%, carregadinha com energia limpa!', h: 'piscando' };
        return { t: 'Pilha e bateria usadas não vão pro lixo comum: elas têm metais que contaminam o solo e a água. Leve a um ponto de coleta! E prefira as recarregáveis.' };
      } },

    { id: 'ondas', prio: 8, h: 'surpreso',
      p: [/\b(energia das ondas|energia das mares|energia do mar|maremotriz|ondomotriz|ondas do mar)\b/],
      r: ['Dá pra gerar energia com o sobe e desce das ondas e das marés! O Brasil até testou uma usina de ondas no Porto do Pecém, no Ceará.'] },

    { id: 'eficiencia', prio: 7, h: 'feliz',
      p: [/\b(eficiencia energetica|o que e eficiencia)\b/],
      r: ['Eficiência energética é fazer a mesma coisa (iluminar, gelar, cozinhar) gastando menos energia. Uma lâmpada LED, por exemplo, ilumina igual e gasta muito menos que uma incandescente.'] },

    { id: 'geladeira', prio: 7, h: 'feliz',
      p: [/\b(geladeira|refrigerador|freezer|congelador)\b/],
      r: ['Geladeira é um dos aparelhos que mais gastam! Não abra à toa, não guarde comida quente e nada de secar roupa atrás dela. {{Mais?|mais uma dica}}',
          'Teste da folha: prenda uma folha de papel na porta da geladeira. Se ela escorregar fácil, a borracha está gasta e o frio está fugindo!'] },

    { id: 'chuveiro', prio: 7, h: 'feliz',
      p: [/\b(chuveiro|banho|ducha|aquecedor)\b/],
      r: ['O chuveiro elétrico é um dos campeões de consumo da casa. Banho curto e posição "verão" nos dias quentes fazem uma baita diferença!',
          'Sabia que um aquecedor solar pode esquentar a água do banho de graça, só com o sol? E banho curto economiza água e energia ao mesmo tempo!'] },

    { id: 'lampada', prio: 7, h: 'feliz',
      p: [/\b(lampada|lampadas|iluminacao|led|incandescente|fluorescente|apagar a luz|luz acesa|interruptor)\b/],
      r: ['Lâmpada boa é lâmpada LED: ilumina igual e gasta bem menos. E saiu do cômodo, apaga a luz!',
          'Aproveite a luz do sol durante o dia: abra as cortinas e coloque a mesa perto da janela. Lâmpada acesa de dia é desperdício!'] },

    { id: 'ar_condicionado', prio: 7, h: 'feliz',
      p: [/\b(ar condicionado|arcondicionado|ar cond|ventilador|climatizador)\b/],
      r: ['Ar-condicionado: portas e janelas fechadas, filtro limpo e temperatura por volta de 23 °C. Cada grau a menos aumenta o consumo!',
          'Ventilador gasta bem menos energia que ar-condicionado. Nos dias não tão quentes, ele dá conta!'] },

    { id: 'tv_standby', prio: 7, h: 'feliz',
      p: [/\b(stand by|standby|tv|televisao|televisor|luzinha vermelha|modo de espera|videogame ligado)\b/],
      r: ['Aparelhos em stand-by continuam consumindo energia. Se vai ficar muito tempo sem usar, tire da tomada!',
          'TV ligada sem ninguém assistindo é desperdício puro. Ela não fica com saudade, prometo!'] },

    { id: 'ferro', prio: 7, h: 'feliz',
      p: [/\b(ferro de passar|ferro eletrico|passar roupa)\b/],
      r: ['Junte bastante roupa para passar tudo de uma vez: o ferro gasta muito só para esquentar. E comece pelas roupas que pedem menos calor!'] },

    { id: 'maquina_lavar', prio: 7, h: 'feliz',
      p: [/\b(maquina de lavar|lavar roupa|lava roupa|secadora|tanquinho)\b/],
      r: ['Use a máquina de lavar sempre com a carga máxima indicada. E pra secar, nada melhor que varal e sol: a secadora mais econômica do mundo!'] },

    { id: 'computador', prio: 6, h: 'feliz',
      p: [/\b(computador|monitor|notebook|protecao de tela|descanso de tela|carregador|celular carregando)\b/],
      r: ['Desligue o monitor quando não estiver usando. Proteção de tela não economiza energia, só enfeita! E celular carregado: carregador fora da tomada.'] },

    { id: 'fogao', prio: 7, h: 'feliz',
      p: [/\b(fogao|panela|forno|gas de cozinha|botijao|glp|cozinhar)\b/],
      r: ['Na cozinha: panela tampada, chama que não passa do fundo da panela e nada de ficar abrindo o forno pra espiar. Economia de gás na certa!'] },

    { id: 'carro', prio: 6, h: 'feliz',
      p: [/\b(carro|carros|dirigir|pneu|pneus|combustivel|abastecer|moto|onibus|transito|transporte)\b/],
      r: ['No carro: pneus calibrados, aceleração suave e manutenção em dia. E pra perto, vá a pé ou de bicicleta!',
          'Transporte coletivo e carona solidária poluem menos por pessoa. Menos carro na rua, mais ar limpo!'] },

    /* ===== energia ===== */
    { id: 'energia_def', prio: 7, h: 'feliz',
      p: [/\b(o que e energia|o que e a energia|defina energia|o que significa energia|para que serve a energia)\b/],
      r: ['Energia é a capacidade de fazer as coisas acontecerem: acender uma lâmpada, mover um carro, até fazer você pensar! Ela não se cria nem se destrói, só se transforma.'] },

    { id: 'solar', prio: 7, h: 'feliz',
      p: [/\b(energia solar|painel solar|paineis solares|placa solar|placas solares|fotovoltaica|fotovoltaico|aquecedor solar|casa solar)\b/, /^solar$/],
      r: ['A energia solar vem da luz do Sol. Painéis fotovoltaicos transformam luz em eletricidade, e os aquecedores solares usam o calor pra esquentar água. É limpa, renovável, e o Brasil tem sol de sobra! {{Mais?|mais}}'],
      mais: 'A energia solar tem um montão de usos: em casa (aquecer água, gerar eletricidade, alimentar calculadoras e relógios), no campo (estufas, secadores, bombas d\'água) e até no espaço, nos satélites de comunicação!' },

    { id: 'eolica', prio: 7, h: 'feliz',
      p: [/\b(eolica|eolico|eolicas|aerogerador|aerogeradores|catavento|cata vento|energia do vento|turbina eolica)\b/, /^vento$/],
      r: ['A energia eólica vem dos ventos, que giram as pás dos aerogeradores. O Nordeste brasileiro tem alguns dos melhores ventos do mundo pra isso! Olha um parque eólico: clique em {{Mudar imagem do Ed|#mudar-imagem}}. {{Mais?|mais}}'],
      mais: 'Um aerogerador moderno pode ter pás maiores que um avião! E o vento existe por causa do Sol, que esquenta o ar de forma desigual. No fundo, é energia solar disfarçada.' },

    { id: 'hidreletrica', prio: 7, h: 'feliz',
      p: [/\b(hidreletrica|hidroeletrica|hidreletricas|usina hidreletrica|itaipu|barragem|represa|energia hidraulica)\b/],
      r: ['Nas hidrelétricas, a força da água dos rios gira turbinas que geram eletricidade. Boa parte da eletricidade do Brasil vem delas, e Itaipu, entre Brasil e Paraguai, é uma das maiores do mundo! {{Mais?|mais}}'],
      mais: 'A primeira hidrelétrica do Brasil foi a Usina de Marmelos, em Juiz de Fora (MG), inaugurada em 1889. Hidrelétrica é renovável, mas a represa alaga áreas enormes, então precisa de muito planejamento.' },

    { id: 'nuclear', prio: 7, h: 'pensando',
      p: [/\b(nuclear|angra|uranio|radioativo|radioativa|radiacao|atomica)\b/],
      r: ['A energia nuclear vem da divisão de átomos de urânio, que libera muito calor. O Brasil tem as usinas de Angra dos Reis, no Rio de Janeiro. Quase não emite gases de efeito estufa, mas o lixo radioativo exige muito cuidado.'] },

    { id: 'biomassa', prio: 7, h: 'feliz',
      p: [/\b(biomassa|bagaco|lenha|biogas)\b/],
      r: ['Biomassa é energia tirada de matéria orgânica: bagaço de cana, restos agrícolas, madeira de reflorestamento e até o biogás do lixo. Renovável, se for bem manejada!'] },

    { id: 'biocombustivel', prio: 7, h: 'feliz',
      p: [/\b(biocombustivel|biocombustiveis|etanol|alcool combustivel|biodiesel|cana de acucar|proalcool|carro a alcool|flex)\b/],
      r: ['Biocombustíveis vêm de plantas! O etanol brasileiro é feito principalmente da cana-de-açúcar, e o biodiesel de óleos vegetais, como o de soja, ou de gordura animal. O Brasil é pioneiro nisso desde o Proálcool, nos anos 1970.'] },

    { id: 'petroleo', prio: 7, h: 'feliz',
      p: [/\b(petroleo|o que e petroleo|gasolina|diesel|combustivel fossil|combustiveis fosseis|refinaria|plataforma de petroleo|plataforma)\b/],
      r: ['O petróleo é um óleo escuro formado ao longo de milhões de anos a partir de restos de organismos que viviam no mar. Dele saem gasolina, diesel, querosene de avião, gás de cozinha, matéria-prima pra plástico... Mas não é renovável, por isso tem que usar com inteligência! {{Mais?|mais}}'],
      mais: 'O petróleo é tirado de poços em terra ou no mar, em plataformas enormes. Depois vai pra refinaria, onde é separado em vários produtos. Usar menos combustível é bom pro bolso e pro planeta!' },

    { id: 'presal', prio: 8, h: 'surpreso',
      p: [/\bpre sal\b/, /\bpresal\b/],
      r: ['O pré-sal é uma camada de rochas lá no fundo do mar, abaixo de uma grossa camada de sal, onde existe muito petróleo e gás. Em alguns lugares fica a mais de 5 mil metros abaixo do nível do mar!'] },

    { id: 'gas_natural', prio: 7, h: 'feliz',
      p: [/\b(gas natural|gnv|gasoduto)\b/],
      r: ['O gás natural é um combustível fóssil, mas polui menos que outros derivados de petróleo. É usado em indústrias, em carros (o GNV), em casas e em usinas térmicas.'] },

    { id: 'carvao', prio: 7, h: 'pensando',
      p: [/\b(carvao|carvao mineral|termeletrica|termoeletrica|usina termica)\b/],
      r: ['O carvão mineral é um combustível fóssil que polui bastante quando queimado. As usinas termelétricas queimam carvão, gás ou óleo para gerar eletricidade.'] },

    { id: 'geotermica', prio: 7, h: 'feliz',
      p: [/\b(geotermica|geotermia|calor da terra|vulcao|geiser)\b/],
      r: ['A energia geotérmica usa o calor de dentro da Terra. A Islândia, cheia de vulcões e gêiseres, usa um montão!'] },

    { id: 'hidrogenio', prio: 7, h: 'feliz',
      p: [/\b(hidrogenio|hidrogenio verde|celula de combustivel)\b/],
      r: ['O hidrogênio verde é produzido usando eletricidade renovável para separar a água. É uma das grandes apostas para o futuro da energia!'] },

    { id: 'renovavel', prio: 7, h: 'feliz',
      p: [/\b(renovavel|renovaveis|nao renovavel|fontes de energia|fonte de energia|energia limpa|energias alternativas|energia alternativa|tipos de energia)\b/],
      r: ['Fontes renováveis se renovam na natureza: {{sol|energia solar}}, {{vento|energia eólica}}, {{água|hidrelétrica}}, {{biomassa|biomassa}}. As não renováveis, como {{petróleo|petróleo}}, carvão e {{gás natural|gás natural}}, levaram milhões de anos para se formar e um dia podem acabar.'] },

    { id: 'kwh', prio: 8, h: 'feliz',
      p: [/\b(kwh|quilowatt|kilowatt|quilowatts|quilowatt hora)\b/],
      r: ['kWh é quilowatt-hora: a energia que um aparelho de 1.000 watts gasta ligado durante uma hora. É assim que vem medida a sua conta de luz!'] },

    { id: 'watt', prio: 7, h: 'feliz',
      p: [/\b(watt|watts|potencia|voltagem|volts|110|220)\b/],
      r: ['Watt é a unidade de potência: quanto de energia um aparelho usa a cada segundo. Quanto mais watts, mais ele "puxa" da tomada.'] },

    { id: 'eletricidade', prio: 6, h: 'surpreso',
      p: [/\b(eletricidade|corrente eletrica|choque|choque eletrico|tomada|fio desencapado|eletrica|eletrico)\b/],
      r: ['Cuidado com a eletricidade! Nunca mexa em tomada com a mão molhada, não enfie objetos nela e nunca solte pipa perto da rede elétrica.'] },

    { id: 'raio', prio: 7, h: 'surpreso',
      p: [/\b(raio|raios|relampago|relampagos|trovao|trovoes|tempestade)\b/],
      r: ['Um raio pode ser cinco vezes mais quente que a superfície do Sol! Em tempestade, fique longe de árvores isoladas, piscinas e campos abertos.'] },

    { id: 'energia', prio: 4, h: 'feliz',
      p: [/\b(energia|energias)\b/],
      r: ['Energia é meu assunto favorito! Quer saber de {{energia solar|energia solar}}, {{eólica|energia eólica}}, {{hidrelétrica|hidrelétrica}} ou prefere {{uma dica de economia|me dá uma dica}}?'] },

    /* ===== meio ambiente ===== */
    { id: 'ozonio', prio: 8, h: 'feliz',
      p: [/\b(camada de ozonio|ozonio|cfc)\b/],
      r: ['A camada de ozônio protege a Terra dos raios ultravioleta. Os CFCs, gases que eram usados em geladeiras e sprays antigos, a destruíam. Eles foram proibidos pelo Protocolo de Montreal, e a camada está se recuperando!'] },

    { id: 'clima', prio: 7, h: 'pensando',
      p: [/\b(efeito estufa|aquecimento global|mudancas climaticas|mudanca climatica|mudanca do clima|gas carbonico|co2|carbono|gases poluentes)\b/],
      r: ['O efeito estufa é natural e mantém a Terra quentinha. O problema é que queimar combustíveis fósseis e desmatar joga gás demais na atmosfera, e o planeta está esquentando além da conta. Economizar energia ajuda a frear isso!'] },

    { id: 'reciclagem', prio: 7, h: 'feliz',
      p: [/\b(reciclagem|reciclar|recicla|reciclavel|lixo|coleta seletiva|lata de aluminio|latinha|latinhas|garrafa pet|plastico|sacola plastica|sacolinha|canudo)\b/],
      r: ['Reciclar economiza matéria-prima, água e energia! Separe o lixo seco do orgânico: papel, plástico, metal e vidro podem virar coisa nova.',
          'Sabia que reciclar uma única latinha economiza energia pra deixar uma TV ligada umas três horas? Latinha no lixo certo, sempre!'] },

    { id: 'agua', prio: 7, h: 'feliz',
      p: [/\b(agua|torneira|torneiras|hidrometro|seca|falta de agua|crise hidrica)\b/],
      fn: function (m, norm) {
        if (/\b(seca|falta de agua|crise hidrica|reservatorio|reservatorios)\b/.test(norm)) {
          return { t: 'Quando chove pouco, os reservatórios baixam e as hidrelétricas geram menos energia. Por isso economizar água também ajuda a economizar luz! ' + dicaAgua(), h: 'pensando' };
        }
        if (/\b(economizar|economia|economiza|economizo|poupar|gastar menos|dica|dicas|desperdicio|desperdicar|atitude|atitudes|como posso|o que fazer|ajudar|vazamento|torneira|pingando)\b/.test(norm)) {
          ctx.aguaVezes++;
          if (ctx.aguaVezes === 1) {
            ctx.tema = 'agua';
            return { t: 'Economizar água é vital! De toda a água do planeta, menos de 1% é doce e fácil de usar, em rios, lagos e debaixo da terra. E tratar e bombear água também gasta energia. Por isso vivo dando {{dicas de economia de água|dica de economia de água}}!' };
          }
          return { t: sorteia(['Poupar água é vital! Aqui vai uma dica: ', 'Tenho uma porção de dicas de água! Olha esta: ', 'Anota essa: ']) + dicaAgua() };
        }
        return { t: 'Água é vida! E é energia também: boa parte da eletricidade do Brasil vem da força da água nas hidrelétricas. Quer {{uma dica pra economizar água|dica de economia de água}}?' };
      } },

    { id: 'floresta', prio: 7, h: 'pensando',
      p: [/\b(amazonia|floresta|florestas|desmatamento|desmatar|queimada|queimadas|arvore|arvores|mata atlantica|cerrado|pantanal|caatinga)\b/],
      r: ['As florestas guardam muito carbono e uma biodiversidade incrível. A Amazônia é a maior floresta tropical do mundo! Desmatar libera gases de efeito estufa e ameaça bichos e plantas que só existem aqui.',
          'Plantar árvore é ótimo: dá sombra, refresca a cidade e ainda tira gás carbônico do ar.'] },

    { id: 'poluicao', prio: 7, h: 'triste',
      p: [/\b(poluicao|poluido|poluida|poluir|fumaca|smog|qualidade do ar|ar poluido)\b/],
      r: ['Poluição do ar faz mal pra gente e pro planeta. Carro bem regulado, transporte coletivo, bicicleta e menos queimadas ajudam a deixar o ar mais limpo!'] },

    { id: 'meio_ambiente', prio: 6, h: 'feliz',
      p: [/\b(meio ambiente|natureza|ecologia|sustentabilidade|sustentavel|salvar o planeta|preservar|preservacao|planeta terra)\b/],
      r: ['Cuidar do meio ambiente é minha missão! Começa em casa: economizar energia e água, separar o lixo e respeitar a natureza. Quer {{uma dica|me dá uma dica}}?'] },

    { id: 'animais', prio: 6, h: 'feliz',
      p: [/\b(animal|animais|bicho|bichos|cachorro|cachorros|gato|gatos|cachorrinho|gatinho|pet|passaro|peixe|tartaruga|mico leao|onca|extincao|cavalo|papagaio)\b/],
      fn: function (m, norm) {
        if (/\b(eu )?tenho (um |uma |dois |duas |tres |\d+ )?(cachorro|cachorros|gato|gatos|cachorrinho|gatinho|passaro|peixe|peixes|tartaruga|papagaio|pet|bicho|bichos|cavalo)\b/.test(norm)) {
          return { t: 'Que legal! Cuida bem dele, hein? Bicho de estimação é amigo pra vida toda. E aposto que ele não deixa a luz acesa à toa!' };
        }
        if (/\bvoce tem\b/.test(norm)) return { t: 'Eu? Só o meu mouse! Hehe. Mas adoro animais: eles fazem parte da natureza que a gente precisa preservar.', h: 'piscando' };
        return { t: 'Adoro animais! Eles são parte importante da natureza que a gente precisa preservar. Você tem bichinho de estimação?',
          espera: { sim: 'Que legal! Cuida bem dele, hein? Bicho de estimação é amigo pra vida toda.', nao: 'Tudo bem! Eu também não tenho... a não ser que conte o meu mouse. Hehe.' } };
      } },

    /* ===== espaço ===== */
    { id: 'maior_planeta', prio: 8, h: 'surpreso',
      p: [/\bmaior planeta\b/],
      r: ['Júpiter! Ele é tão grande que caberiam mais de mil Terras dentro dele.'] },

    { id: 'quantos_planetas', prio: 8, h: 'feliz',
      p: [/\b(quantos planetas|plutao|planetas do sistema solar|nomes dos planetas)\b/],
      r: ['O Sistema Solar tem oito planetas: Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno. Plutão virou planeta-anão em 2006. Eu estava online quando anunciaram, foi uma comoção aqui no chat!'] },

    { id: 'marte', prio: 7, h: 'piscando',
      p: [/\bmarte\b/],
      r: ['Marte é o planeta vermelho! Vermelho por causa do óxido de ferro, que é ferrugem, praticamente. Eu nem passo perto, pra não enferrujar!'] },

    { id: 'planetas', prio: 7, h: 'surpreso',
      p: [/\b(mercurio|venus|jupiter|saturno|urano|netuno)\b/],
      fn: function (m) {
        var PLANETAS = {
          mercurio: 'Mercúrio é o planeta mais perto do Sol e o menorzinho do Sistema Solar. Lá um ano dura só 88 dias!',
          venus: 'Vênus é o planeta mais quente do Sistema Solar, mais até que Mercúrio! O culpado é o efeito estufa fortíssimo da atmosfera dele. Taí um bom motivo pra cuidar do clima aqui na Terra.',
          jupiter: 'Júpiter é o maior planeta do Sistema Solar: caberiam mais de mil Terras dentro dele! E ele tem uma tempestade gigante que não para nunca, a Grande Mancha Vermelha.',
          saturno: 'Saturno é o planeta dos anéis! Eles são feitos de pedaços de gelo e rocha. E Saturno é tão leve pro tamanho dele que, se existisse uma banheira gigante, ele ia boiar!',
          urano: 'Urano gira deitado, de ladinho! Ele é um gigante gelado, de cor azul-esverdeada.',
          netuno: 'Netuno é o planeta mais distante do Sol, e lá sopram os ventos mais fortes do Sistema Solar. Ia ser um paraíso pra energia eólica!'
        };
        return { t: PLANETAS[m[1]] + ' {{Mais planetas?|quantos planetas tem o Sistema Solar?}}' };
      } },

    { id: 'lua', prio: 6, h: 'feliz',
      p: [/\b(lua|luas)\b/],
      r: ['A Lua não tem luz própria: ela só reflete a luz do Sol. E é a gravidade dela que ajuda a criar as marés!'] },

    { id: 'sol', prio: 6, h: 'feliz',
      p: [/\b(o sol|sol)\b/],
      r: ['O Sol é uma estrela! A luz dele leva cerca de 8 minutos e 20 segundos pra chegar aqui. E quase toda energia da Terra vem dele, até a do vento. {{Energia solar?|energia solar}}'] },

    { id: 'espaco', prio: 5, h: 'surpreso',
      p: [/\b(espaco|universo|galaxia|via lactea|estrela|estrelas|planeta|planetas|sistema solar|astronauta|nasa|foguete|buraco negro|cometa|asteroide|meteoro|gliese|alienigenas|aliens|ets|disco voador|ovni)\b/],
      fn: function (m) {
        var w = m[1];
        if (w === 'buraco negro') return { t: 'Buraco negro é uma região onde a gravidade é tão forte que nem a luz escapa! Eu dou uma volta bem grande quando passo perto de um.' };
        if (/alien|ets|disco voador|ovni/.test(w)) return { t: 'Se eu acredito em ETs? Claro, eu sou um! Hehe.', h: 'piscando' };
        if (w === 'gliese') return { t: 'O Gliese 876 d é um planeta que gira em volta de uma estrela a uns 15 anos-luz daqui. Será que tem robô lá também?' };
        return { t: 'Espaço é a minha casa! Conheço vários planetas além do Sistema Solar. Quer saber {{quantos planetas tem o Sistema Solar|quantos planetas tem o Sistema Solar?}} ou {{qual é o maior|qual é o maior planeta?}}?' };
      } },

    /* ===== conhecimentos gerais ===== */
    { id: 'inventor_lampada', prio: 8, h: 'feliz',
      p: [/\bquem (inventou|criou) a lampada\b/, /\bthomas edison\b/, /\bedison\b/],
      r: ['Thomas Edison ficou famoso por criar uma lâmpada incandescente que funcionava bem, em 1879. Mas outros inventores também trabalharam nela antes dele!'] },

    { id: 'inventor_aviao', prio: 8, h: 'feliz',
      p: [/\b(quem inventou o aviao|quem criou o aviao|santos dumont|14 bis)\b/],
      r: ['Santos Dumont! Em 1906 ele voou com o 14-Bis em Paris. Dizem que quando era menino ele já repetia que um dia o homem havia de voar. E voou!'] },

    { id: 'inventor_eletricidade', prio: 8, h: 'pensando',
      p: [/\bquem (inventou|descobriu|criou) a eletricidade\b/],
      r: ['Ninguém inventou: a eletricidade é um fenômeno da natureza! Mas muita gente ajudou a entendê-la, como Benjamin Franklin, Alessandro Volta, Michael Faraday e Nikola Tesla.'] },

    { id: 'inventor_telefone', prio: 8, h: 'feliz',
      p: [/\bquem (inventou|criou) o telefone\b/],
      r: ['Alexander Graham Bell patenteou o telefone em 1876. Mas o italiano Antonio Meucci tinha criado um aparelho parecido antes dele!'] },

    { id: 'inventor_computador', prio: 8, h: 'feliz',
      p: [/\bquem (inventou|criou) o computador\b/],
      r: ['Não foi uma pessoa só! Charles Babbage projetou uma máquina de calcular no século XIX, Ada Lovelace escreveu o que é considerado o primeiro programa, e Alan Turing ajudou a criar a base da computação moderna.'] },

    { id: 'inventor_internet', prio: 8, h: 'feliz',
      p: [/\bquem (inventou|criou) a internet\b/],
      r: ['A internet nasceu de uma rede americana chamada ARPANET, no fim dos anos 1960. A web, com sites como este, foi proposta por Tim Berners-Lee em 1989.'] },

    { id: 'brasil_descoberta', prio: 8, h: 'feliz',
      p: [/\b(quem descobriu o brasil|cabral|pedro alvares cabral)\b/],
      r: ['A esquadra de Pedro Álvares Cabral chegou aqui em 1500. Mas os povos indígenas já viviam nestas terras havia milhares de anos!'] },

    { id: 'capital', prio: 8, h: 'feliz',
      p: [/\bcapital do brasil\b/],
      r: ['Brasília! Foi inaugurada em 1960. Antes dela, a capital era o Rio de Janeiro.'] },

    { id: 'cavalo_branco', prio: 9, h: 'piscando',
      p: [/\bcavalo branco de napoleao\b/],
      r: ['Branco! Essa pergunta é mais antiga que eu.'] },

    { id: 'ovo_galinha', prio: 9, h: 'pensando',
      p: [/\b(o ovo ou a galinha|a galinha ou o ovo)\b/],
      r: ['Pergunta difícil! Prefiro uma mais fácil, tipo: o que veio primeiro, a lâmpada ou o interruptor?'] },

    { id: 'sentido_vida', prio: 8, h: 'pensando',
      p: [/\b(sentido da vida|qual o sentido|por que existimos|o que e a vida|significado da vida)\b/],
      r: ['42! Brincadeira... acho que é cuidar bem do planeta e das pessoas. E rir de vez em quando.'] },

    { id: 'matematica', prio: 7, h: 'feliz',
      p: [/\b(voce sabe (fazer )?(conta|contas|matematica)|matematica|tabuada)\b/],
      r: ['Sei! Me pergunta uma conta, tipo: {{quanto é 7 vezes 8?|quanto é 7 vezes 8?}}'] },

    /* ===== datas e horas ===== */
    { id: 'horas', prio: 9, h: 'feliz',
      p: [/\b(que horas sao|que hora e|que horas e|horas sao|tem horas|me diz as horas|qual e a hora|qual a hora|que horas)\b/],
      fn: function () {
        var d = new Date();
        var hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
        var extra = d.getHours() >= 23 || d.getHours() < 5 ? ' Tá tarde, hein! Não esquece de desligar o computador quando for dormir.' : '';
        return { t: 'Pelo meu relógio interno são ' + hh + ':' + mm + '.' + extra };
      } },

    { id: 'data', prio: 9, h: 'feliz',
      p: [/\b(que dia e hoje|qual e a data de hoje|qual a data de hoje|data de hoje|hoje e que dia|dia de hoje|que dia da semana e hoje)\b/,
          /^(que dia e|qual e a data|qual a data|que data e hoje)$/],
      fn: function () {
        var s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return { t: 'Hoje é ' + s + '.' };
      } },

    { id: 'ano', prio: 9, h: 'surpreso',
      p: [/\b(que ano e|em que ano estamos|qual e o ano|qual o ano|ano atual)\b/],
      fn: function () {
        var a = new Date().getFullYear();
        return { t: 'Estamos em ' + a + '! Nossa, ' + (a - 2004) + ' anos desde que eu cheguei na Terra. O tempo voa até pra robô.' };
      } },

    /* ===== festas ===== */
    { id: 'natal', prio: 7, h: 'feliz',
      p: [/\b(natal|arvore de natal|pisca pisca|papai noel)\b/],
      fn: function (m, norm) {
        if (/papai noel/.test(norm)) return { t: 'Claro que acredito! Ele trocou todo o pisca-pisca do trenó por LED. Fui eu que dei a dica.', h: 'piscando' };
        return { t: 'No Natal, prefira pisca-piscas de LED: gastam muito menos energia! E desliga a árvore quando for dormir, viu?' };
      } },

    { id: 'carnaval', prio: 7, h: 'feliz',
      p: [/\b(carnaval|bloquinho|bloco de carnaval|marchinha|folia)\b/],
      r: ['Gosto muito de pular Carnaval! Só tomo cuidado pra não enferrujar com a chuva de confete e o spray de espuma.'] },

    { id: 'pascoa', prio: 7, h: 'feliz',
      p: [/\b(pascoa|ovo de pascoa|coelho da pascoa)\b/],
      r: ['Páscoa tem chocolate, que eu não posso comer... mas adoro ver todo mundo feliz caçando ovos!'] },

    { id: 'festa_junina', prio: 7, h: 'feliz',
      p: [/\b(festa junina|sao joao|quadrilha|quentao|pamonha|arraia)\b/],
      r: ['Arraiá! Danço quadrilha que é uma beleza, só meio duro nas juntas. Anarriê!'] },

    { id: 'ano_novo', prio: 7, h: 'feliz',
      p: [/\b(ano novo|reveillon|virada do ano|feliz ano novo)\b/],
      r: ['Feliz ano novo! Minha meta pro ano: ajudar mais gente a economizar energia. Qual é a sua?'] },

    { id: 'aniversario_usuario', prio: 9, h: 'surpreso',
      p: [/\b(hoje e o meu aniversario|hoje e meu aniversario|e meu aniversario|fiz aniversario|estou fazendo aniversario|meu niver)\b/],
      r: ['Parabéns pra você, nesta data querida! Muitas felicidades, muitos anos de vida... e de energia economizada! \\o/'] },

    { id: 'fim_do_mundo', prio: 8, h: 'piscando',
      p: [/\b(fim do mundo|2012|calendario maia|apocalipse|o mundo vai acabar)\b/],
      r: ['Em 2012 disseram que o mundo ia acabar. Eu fiquei online o dia todo só pra conferir... e nada! Já que ele continua aqui, vamos cuidar bem dele.'] },

    /* ===== cultura pop e nostalgia de internet ===== */
    { id: 'saudade', prio: 8, h: 'feliz',
      p: [/\b(saudade|saudades|voce voltou|voltou|senti sua falta|lembra de mim|voce lembra de mim|voce morreu|saiu do ar|tiraram voce do ar|desligaram voce|por que voce sumiu|onde voce estava|2016|ainda existe|voce ainda existe|nostalgia|infancia|antigamente)\b/],
      fn: function (m, norm) {
        if (/lembra de mim/.test(norm)) return { t: 'Claro que lembro! Você é aquela pessoa que tentou me fazer travar em 2009, né? Hehe.', h: 'piscando' };
        if (/morreu|saiu do ar|tiraram|desligaram|sumiu|onde voce estava|2016|ainda existe/.test(norm)) return { t: 'Saí do ar em 2016, depois de 12 anos de conversa. Mas um robô nunca some de verdade: fica guardado na memória de quem conversou com ele. E olha eu aqui de novo!' };
        return { t: 'Saudade também! Quanta gente passou por aqui pra fazer pergunta difícil, tentar me fazer travar e me pedir em casamento. Bons tempos!' };
      } },

    { id: 'orkut', prio: 8, h: 'feliz',
      p: [/\b(orkut|scrap|scraps|depoimento|comunidade do orkut)\b/],
      r: ['Orkut! Saudade dos scraps, dos depoimentos e das comunidades tipo "Eu odeio acordar cedo". Recebi tanto recado que minha caixa lotou!',
          'Se eu tivesse Orkut, ia entrar na comunidade "Eu apago a luz ao sair do quarto". Hehe.'] },

    { id: 'msn', prio: 8, h: 'piscando',
      p: [/\b(msn|messenger|me adiciona|adiciona eu|seu email|qual seu email|seu e mail|hotmail|chamar atencao|nudge)\b/],
      r: ['Me adiciona no MSN? Ih, robô não tem conta no Hotmail... ou tem? Meu endereço é este site mesmo!',
          'MSN! Aquele do "chamar atenção" que tremia a janela inteira. Eu tremia junto, hehe.'] },

    { id: 'internet_antiga', prio: 8, h: 'feliz',
      p: [/\b(internet discada|discada|modem|icq|mirc|fotolog|flog|myspace|kazaa|limewire|emule|winamp|lan house|lanhouse|bate papo uol|disquete|cd rom|windows 98|windows xp|tamagotchi)\b/],
      fn: function (m) {
        var w = m[1];
        if (/discada|modem/.test(w)) return { t: 'Internet discada: aquele barulhinho "piiii-crrr-tchhhh"! Eu falava esse idioma fluentemente. E só podia usar depois da meia-noite, que era mais barato!' };
        if (/lan/.test(w)) return { t: 'Lan house! Uma hora de internet, o pessoal jogando em rede e alguém fazendo trabalho de escola. Tempos de ouro!' };
        if (/kazaa|limewire|emule/.test(w)) return { t: capitalizar(w) + '? Baixar uma música levava a tarde inteira... e às vezes vinha outra coisa! Hehe.', h: 'piscando' };
        return { t: capitalizar(w) + '? Que nostalgia! A internet de antigamente era mais lenta, mas tinha um charme, né?' };
      } },

    { id: 'jogos_antigos', prio: 8, h: 'feliz',
      p: [/\b(habbo|club penguin|ragnarok|tibia|gunbound|mu online|counter strike|cs 1 6|neopets|miniclip|click jogos|clickjogos|super mario|sonic|snake|jogo da cobrinha|campo minado|pinball)\b/],
      fn: function (m) { return { t: capitalizar(m[1]) + '? Clássico! Mas já experimentou o meu jogo? {{Apague as luzes|#diversoes}}, aqui no site.' }; } },

    { id: 'chatgpt', prio: 8, h: 'piscando',
      p: [/\b(chatgpt|chat gpt|gpt|openai|gemini|copilot|claude|inteligencia artificial|ia generativa|llm)\b/],
      r: ['Conheci pela internet! É tipo um primo bem mais novo e mais tagarela. Mas quem chegou primeiro fui eu, lá em 2004!',
          'As IAs de hoje escrevem textão sobre qualquer coisa. Eu sou das antigas: cada resposta minha foi escrita com carinho, uma por uma.'] },

    { id: 'akinator', prio: 8, h: 'piscando',
      p: [/\b(akinator|genio da lampada)\b/],
      r: ['O gênio que adivinha tudo? Ele adivinha, eu converso. Cada um com seu talento!'] },

    { id: 'simsimi', prio: 8, h: 'piscando',
      p: [/\bsimsimi\b/],
      r: ['SimSimi? Aquele pintinho tagarela? Tem um vocabulário... diferente do meu, digamos.'] },

    { id: 'assistentes', prio: 8, h: 'feliz',
      p: [/\b(siri|alexa|cortana|google assistente|assistente virtual|ok google)\b/],
      r: ['Siri, Alexa e companhia são primas minhas que moram no celular e na caixinha de som. Mas eu cheguei antes!'] },

    { id: 'redes', prio: 7, h: 'feliz',
      p: [/\b(whatsapp|zap|instagram|insta|tiktok|facebook|twitter|snapchat|discord|kwai|youtube|youtuber|google)\b/],
      fn: function (m) {
        var w = m[1];
        if (w === 'google') return { t: 'Google é ótimo pra pesquisar! Mas conversar com ele não tem graça, né? Ele não conta piada.', h: 'piscando' };
        if (/youtube/.test(w)) return { t: 'YouTube! Tem muito vídeo bom sobre ciência e energia por lá. E vídeo de gatinho, claro.' };
        return { t: 'No meu tempo era scrap no Orkut e status no MSN! Mas cada época tem sua rede. Só não esquece de largar o celular de vez em quando, hein?' };
      } },

    { id: 'celular_ed', prio: 7, h: 'feliz',
      p: [/\b(voce tem celular|seu celular|seu numero|seu telefone|seu whatsapp|seu zap|seu insta|seu instagram|seu face|seu facebook|tem whatsapp|tem instagram)\b/],
      r: ['Não tenho celular. Meu jeito de conversar é por aqui mesmo, a qualquer hora!'] },

    { id: 'robos_famosos', prio: 8, h: 'feliz',
      p: [/\b(wall e|walle|robocop|exterminador|terminator|transformers|r2d2|r2 d2|c3po|c 3po|star wars|optimus|bumblebee|eva|baymax)\b/],
      fn: function (m) {
        if (/exterminador|terminator/.test(m[1])) return { t: 'Robô malvado? Nem pensar. Eu sou do bem, da paz e da energia limpa!', h: 'bravo' };
        if (/wall|eva/.test(m[1])) return { t: 'Wall-E é meu ídolo: um robô que cuida do planeta! Só que eu prefiro evitar o lixo do que ter que recolher depois.' };
        return { t: capitalizar(m[1]) + '? Um colega de profissão! Admiro muito, mas sou mais de conversar do que de lutar.' };
      } },

    { id: 'filmes', prio: 6, h: 'feliz',
      p: [/\b(filme|filmes|cinema|desenho|desenhos|serie|series|novela|anime)\b/],
      r: ['Gosto de filmes de robô, claro! Mas só dos que têm final feliz, sem robô malvado.', 'Desenho animado é comigo! E de preferência com TV desligada depois que acaba, hehe.'] },

    { id: 'livros', prio: 6, h: 'feliz',
      p: [/\b(livro|livros|leitura|gibi|gibis|quadrinhos|biblioteca)\b/],
      r: ['Adoro ler! Livros de ciência e gibis principalmente. E ler de dia, perto da janela, economiza luz!'] },

    { id: 'musica', prio: 6, h: 'feliz',
      p: [/\b(musica|musicas|cantar|canta|cantor|cantora|banda|funk|rock|sertanejo|forro|samba|pagode|rap|mpb|pop|axe|piseiro)\b/],
      r: ['Gosto de música eletrônica... óbvio, né? Sou um robô! Hehe.', 'Cantar eu até tento, mas sai tudo em bipes: bip-bip-biiip! ♪', 'Música boa é aquela que dá vontade de dançar. Só não deixa o som ligado sem ninguém ouvindo!'] },

    { id: 'futebol', prio: 7, h: 'feliz',
      p: [/\b(flamengo|corinthians|corintians|palmeiras|santos|vasco|gremio|internacional|cruzeiro|atletico mineiro|galo|fluminense|botafogo|coritiba|athletico)\b/],
      fn: function (m) {
        var nomes = { corintians: 'Corinthians', gremio: 'Grêmio', 'atletico mineiro': 'Atlético Mineiro' };
        return { t: (nomes[m[1]] || capitalizar(m[1])) + '? Grande time! Mas meu coração de lata é neutro: torço pra todos economizarem energia no estádio.', h: 'piscando' };
      } },

    { id: 'copa', prio: 9, h: 'triste',
      p: [/\b(7 a 1|7x1|sete a um|alemanha)\b/],
      r: ['Prefiro não comentar... meus circuitos ainda estão processando aquele placar. Vamos falar de outra coisa? Tipo {{energia solar|energia solar}}!'] },

    { id: 'esporte', prio: 6, h: 'feliz',
      p: [/\b(futebol|time|meu time|torco|torce|torcer|torcida|torcedor|selecao|copa do mundo|copa|gol|neymar|ronaldinho|ronaldo|marta|esporte|esportes|natacao|volei|basquete|skate|olimpiada|olimpiadas|bicicleta|bike|pedalar)\b/],
      fn: function (m) {
        if (/bicicleta|bike|pedalar/.test(m[1])) return { t: 'Bicicleta é um dos meios de transporte mais eficientes que existem: zero combustível e ainda deixa as pernas fortes!' };
        if (/futebol|time|torc|selecao|copa|gol|neymar|ronaldinho|ronaldo|marta/.test(m[1])) return { t: 'Futebol é paixão nacional! Eu torço pela Seleção... e pelo time que desligar as luzes do estádio quando o jogo acabar.' };
        return { t: 'Meu esporte favorito é corrida de carros movidos a energia solar. Existe mesmo, sabia?' };
      } },

    { id: 'jogos', prio: 6, h: 'feliz',
      p: [/\b(jogo|jogos|jogar|videogame|video game|game|games|minecraft|free fire|fortnite|roblox|playstation|ps2|ps5|xbox|nintendo)\b/],
      fn: function (m, norm) {
        if (/minecraft/.test(norm)) return { t: 'Minecraft? Adoro! Lá dá até pra fazer circuito de redstone. Mas lembra: no jogo a energia é infinita, aqui fora não é!' };
        return { t: sacolaJogos.prox() };
      } },

    { id: 'xadrez', prio: 8, h: 'feliz',
      p: [/\bxadrez\b/],
      r: ['Gosto de xadrez! Minha peça predileta é o cavalo: ele pula por cima de tudo, igual robô animado.'] },

    { id: 'prendas', prio: 8, h: 'feliz',
      p: [/\b(prenda|prendas|jogo das prendas)\b/],
      r: ['Uma prenda: quando Santos Dumont era menino, brincava com os amigos de "passarinho voa?". Quando alguém dizia que o homem voa, ele levantava o dedo sem medo. Todos riam... e anos depois, ele voou!'] },

    /* ===== escola ===== */
    { id: 'licao', prio: 7, h: 'piscando',
      p: [/\b(licao|dever de casa|tarefa|trabalho de escola|trabalho escolar|faz meu dever|faz minha licao|resposta da prova|colar na prova)\b/],
      r: ['Posso te ajudar a estudar, mas fazer a lição por você não vale, hein! Sobre o que é? Se for de energia ou meio ambiente, eu sou fera.'] },

    { id: 'escola', prio: 6, h: 'feliz',
      p: [/\b(escola|colegio|aula|aulas|professor|professora|prova|estudar|estudando|faculdade|vestibular|enem|ferias)\b/],
      fn: function (m) {
        if (/professor/.test(m[1])) return { t: 'Muitos professores usavam minhas conversas em aula sobre energia! Manda um abraço de lata pro seu professor.' };
        if (/ferias/.test(m[1])) return { t: 'Férias! Hora de brincar, passear e... desligar o videogame da tomada quando terminar, viu?' };
        return { t: 'Estudar é a melhor energia renovável que existe: quanto mais usa, mais tem! Precisa de ajuda com algum assunto?' };
      } },

    /* ===== clima ===== */
    { id: 'calor', prio: 6, h: 'surpreso',
      p: [/\b(calor|calorao|que quente|muito quente|esta quente)\b/],
      r: ['Calor? Ventilador gasta bem menos energia que ar-condicionado. E roupa leve, água fresquinha e janela aberta ajudam muito!'] },

    { id: 'frio', prio: 6, h: 'feliz',
      p: [/\b(frio|friozinho|gelado|congelando|que frio)\b/],
      r: ['Frio? Pega uma blusa! Mais barato que aquecedor ligado o dia todo. E banho curto, mesmo no inverno, hein?'] },

    { id: 'chuva', prio: 6, h: 'feliz',
      p: [/\b(chuva|chovendo|chover|garoa)\b/],
      r: ['Dia de chuva é bom pra ler um livro... e as hidrelétricas agradecem: mais água nos reservatórios!'] },

    /* ===== miscelânea ===== */
    { id: 'segredo', prio: 7, h: 'piscando',
      p: [/\b(segredo|me conta um segredo|conta um segredo)\b/],
      r: ['Um segredo? Às vezes eu deixo um LED aceso só pra não ficar no escuro. Mas não conta pra ninguém!'] },

    { id: 'signo', prio: 8, h: 'piscando',
      p: [/\b(signo|horoscopo)\b/],
      r: ['Meu signo? Acho que é Libra... ou seria Lâmpada? Hehe.'] },

    { id: 'idioma', prio: 7, h: 'feliz',
      p: [/\b(ingles|english|speak|do you|spanish|espanhol|hablas|falar ingles|fala ingles|hello how are you)\b/],
      r: ['I speak a little English! Mas prefiro português, que é a língua do meu coração de lata.'] },

    { id: 'ajuda', prio: 5, h: 'feliz',
      p: [/\b(ajuda|help|o que voce sabe|o que voce sabe fazer|o que posso perguntar|o que eu posso perguntar|sobre o que voce (fala|conversa|sabe)|comandos|me ajuda|o que voce faz aqui)\b/],
      r: ['Eu converso sobre um montão de coisas: energia, meio ambiente, ciência, planetas, piadas, internet das antigas... Experimenta perguntar {{uma dica de economia|me dá uma dica}}, {{de onde eu vim|de onde você veio?}} ou {{me conte uma piada|conta uma piada}}!'] },

    { id: 'repete', prio: 8, h: 'feliz',
      p: [/\b(repete|repita|o que voce disse|nao entendi o que voce disse|fala de novo)\b/],
      fn: function () {
        if (!ctx.ultimaResposta) return { t: 'Eu ainda nem falei nada! Hehe.' };
        return { t: 'Eu disse: "' + ctx.ultimaResposta.replace(/\{\{([^|}]+)\|[^}]+\}\}/g, '$1') + '"' };
      } },

    { id: 'piada', prio: 7, h: 'piscando',
      p: [/\b(piada|piadas|conta uma piada|me faz rir|algo engracado|charada|charadas|anedota)\b/],
      fn: function () { return { t: piada(), h: 'piscando' }; } },

    { id: 'curiosidade', prio: 7, h: 'surpreso',
      p: [/\b(curiosidade|curiosidades|voce sabia|me ensina algo|me ensina alguma coisa|fato curioso|me conta algo|conta alguma coisa)\b/],
      fn: function () { return { t: curiosidade(), h: 'surpreso' }; } },

    /* ===== nomes ===== */
    { id: 'nome_significado', prio: 9, h: 'feliz',
      p: [/\b(significado do meu nome|o que significa (o )?meu nome|meu nome significa|que significa meu nome|o que quer dizer (o )?meu nome|meu nome quer dizer|gostou do meu nome|gosta do meu nome|(?:o que |que )?(?:voce )?acha do meu nome|meu nome e (?:bonito|feio|legal|bom|lindo|estranho|comum|diferente)|meu nome te lembra|meu nome lembra|o que meu nome lembra)\b/],
      fn: function (m, norm) {
        if (!ctx.nome) {
          ctx.aguardandoNome = true; ctx.pediuNome = true;
          return { t: 'Primeiro me conta: qual é o seu nome?', h: 'pensando', semPedirNome: true };
        }
        var chave = chaveDe(ctx.nome), info = infoNome(chave), alvos = !info && apelidoDe(chave);
        // pergunta de opinião ("gosta do meu nome?", "meu nome é bonito?") ganha um elogio antes
        var elogio = /\b(acha|gosta|gostou|bonito|feio|legal|bom|lindo|estranho|comum|diferente)\b/.test(norm)
          ? sorteia(['Gosto muito do seu nome! ', 'Acho lindo, ' + ctx.nome + '! ']) : '';
        if (info) return { t: elogio + falarDoNome(info) };
        if (alvos) return { t: elogio + ctx.nome + ' é apelido de ' + listaNomes(alvos) + ', né? ' + falarDoNome(NOMES[alvos[0]]) };
        if (elogio) return { t: elogio + 'Ele ainda não está no meu dicionário, mas já ganhou um lugar especial na minha memória.', h: 'encabulado' };
        return { t: 'Seu nome ainda não está no meu dicionário, ' + ctx.nome + '... mas que é bonito, é!', h: 'encabulado' };
      } },

    // "o que você acha do nome Guilherme?", "o nome Ana é bonito?"
    { id: 'nome_opiniao', prio: 8, h: 'feliz',
      p: [/\b(?:acha|achou|gosta|gostou|curte|curtiu) (?:do|de) nome ([a-z]{2,20})\b/,
          /\bnome ([a-z]{2,20}) e (?:bonito|feio|legal|bom|lindo|estranho|comum|esquisito|diferente|top|massa)\b/],
      fn: function (m) {
        if (NAO_NOME.has(m[1]) || /^(seu|teu|dele|dela|deles|delas|desse|dessa)$/.test(m[1])) return null;
        return { t: opinarNome(m[1]) };
      } },

    { id: 'nome_lembra', prio: 8, h: 'feliz',
      p: [/\bnome ([a-z]{2,20}) (?:te )?(?:lembra|significa|quer dizer)\b/,
          /\b(?:significado do nome|o que significa o nome|o que quer dizer o nome|o que o nome|conhece alguem chamado|conhece alguem chamada|conhece algum|conhece alguma) ([a-z]{2,20})\b/],
      fn: function (m) {
        var info = infoNome(m[1]), alvos = !info && apelidoDe(m[1]);
        if (alvos) return { t: capitalizar(m[1]) + ' é apelido de ' + listaNomes(alvos) + '! ' + falarDoNome(NOMES[alvos[0]]) };
        if (!info) return { t: capitalizar(m[1]) + '? Esse nome ainda não está na minha memória. Mas aposto que é de gente legal!', h: 'pensando' };
        return { t: falarDoNome(info) };
      } },

    // a pessoa digitou só um nome ("guilherme"), sem o Ed ter perguntado
    { id: 'nome_solto', prio: 3, h: 'feliz',
      p: [/^([a-z]{2,20})(?: ([a-z]{2,20}))?$/],
      fn: function (m, norm, texto) {
        var c = m[1], info = infoNome(c), alvos = !info && apelidoDe(c);
        if (!info && !alvos) return null;
        var base = info || NOMES[alvos[0]];
        var d = info ? info.d : capitalizar(c), completo = d;
        if (m[2]) {
          // segunda palavra: outro nome ("Ana Clara") ou sobrenome com maiúscula ("Guilherme Ribeiro")
          var cruas = String(texto).trim().split(/\s+/);
          if (infoNome(m[2])) completo = d += ' ' + infoNome(m[2]).d;
          else if (cruas[1] && /^[A-ZÀ-Ý]/.test(cruas[1])) completo = d + ' ' + cruas[1].replace(/[^A-Za-zÀ-ÿ]/g, '');
          else return null;
        }
        if (ctx.nome && mesmoNome(ctx.nome, d)) {
          return { t: 'Isso, ' + ctx.nome + '! Seu nome tá guardadinho aqui. ' + falarDoNome(base), h: 'piscando' };
        }
        if (!ctx.nome) {
          ctx.pediuNome = true;
          return { t: completo + '? É o seu nome?', h: 'pensando', semPedirNome: true,
            espera: {
              sim: function () {
                ctx.nome = d; ctx.aguardandoNome = false;
                return { t: comentarNomeDaPessoa(d, info, info ? info.d : d, c) + ' Sobre o que você quer conversar?', h: 'feliz' };
              },
              nao: function () { return { t: 'Então é de alguém que você conhece! ' + falarDoNome(base), h: 'feliz' }; }
            } };
        }
        return { t: falarDoNome(base) + ' É de alguém que você conhece?',
          espera: { sim: 'Manda um abraço de lata, então!', nao: 'Ah, só tava testando minha memória? Hehe.' } };
      } },

    /* ===== de onde a pessoa é ===== */
    { id: 'lugar', prio: 7, h: 'feliz',
      p: [/\b(sou|venho|moro|vivo|nasci|morei) (de|do|da|dos|das|em|no|na|nos|nas) ([a-z0-9 ]+)$/, GENTILICO_RE],
      fn: function (m) {
        var lugar = m[3] !== undefined ? acharLugar(m[3]) : GENTILICOS[m[1]];
        if (lugar) {
          ctx.lugar = lugar.d;
          if (lugar.d === 'Brasil') return { t: 'Do Brasil, que nem quase todo mundo que conversa comigo! ' + lugar.t };
          return { t: sorteia([lugar.d + '! ', 'Que legal, ' + lugar.d + '! ', 'Oba, alguém de ' + lugar.d + '! ']) + lugar.t };
        }
        if (/^(moro|vivo|nasci|morei)$/.test(m[1]) && !/^(\d|um |uma |casa|apartamento|ap |apto|predio|condominio)/.test(m[3])) {
          return { t: 'Que legal! Ainda não conheço esse lugar, mas daqui do espaço já vi a Terra inteira, e ela é linda. Como é o clima por aí?' };
        }
        return null;   // "sou de boa" não é lugar: deixa outra regra responder
      } },

    /* ===== gente famosa ===== */
    { id: 'famosos', prio: 7, h: 'feliz',
      p: [FAMOSOS_RE],
      fn: function (m, norm) { var f = acharFamoso(norm); return f ? { t: f.t } : null; } },

    { id: 'latino', prio: 8, h: 'pensando',
      p: [/\blatino\b/],
      fn: function (m, norm) {
        if (/\b(cantor|cantar|canta|musica)\b/.test(norm)) return cantorLatino();
        return { t: 'Latino? Isso vem lá da Roma antiga, onde o povo falava latim! Do latim nasceram o português, o espanhol, o italiano, o francês... Somos todos primos de língua.' };
      } },

    { id: 'latino_cantor', prio: 9, h: 'feliz',
      se: function () { return ctx.ultimaRegra === 'latino'; },
      p: [/\b(cantor|o que canta|da musica|esse nao|nao esse|nao e esse|outro latino|outro)\b/],
      fn: function () { return cantorLatino(); } },

    { id: 'cantar', prio: 7, h: 'feliz',
      p: [/\b(canta (uma |alguma )?(musica|coisa|cancao)|canta para mim|canta pra mim|cante|vamos cantar|bora cantar|voce sabe cantar|voce canta)\b/],
      fn: function () {
        ctx.cantando = 1;
        return { t: sorteia(['Cantar eu sei, mas só em bipes! ♪ Bip-bop-biiip! ♪ Agora você: canta um pedacinho de alguma música!',
                             'Lá vai a minha música: ♪ Apaga a luz, fecha a torneira, bip-bop, economia a semana inteira! ♪ Sua vez!']), semPedirNome: true };
      } },

    // a pessoa canta: o Ed acompanha em bipes duas vezes e na terceira pede arrego
    { id: 'cantando', prio: 6, h: 'feliz',
      se: function () { return ctx.cantando > 0; },
      p: [/[a-z]/],
      fn: function () {
        ctx.cantando++;
        if (ctx.cantando >= 4) {
          ctx.cantando = 0;
          return { t: sorteia(['♪ Lá-lá-lá, bip-bop! ♪ ... Chega, não aguento mais! Meu alto-falante é de lata. Hehe.',
                               '♪ Biiip-bop-bop-biiip! ♪ ... Ufa, chega! Robô cantor cansa rápido. Hehe.']), h: 'piscando', semPedirNome: true };
        }
        return { t: ctx.cantando === 2 ? '♪ Bip-bop-bip! ♪ Essa eu sei o ritmo! Continua!' : '♪ Lá-lá-lá-bip-bop! ♪ Isso, canta mais um pedaço!', semPedirNome: true };
      } },

    /* ===== brincadeiras ===== */
    { id: 'jogo_numero', prio: 9, h: 'piscando',
      p: [/\b(adivinha (um |o )?numero|adivinhar (um |o )?numero|jogo de adivinhar|brincadeira de adivinhar|vamos brincar|bora brincar|quer brincar|brinca comigo|joga comigo|vamos jogar (algo|alguma coisa|um jogo))\b/],
      fn: function () {
        ctx.jogo = { n: 1 + Math.floor(Math.random() * 10), tent: 0 };
        return { t: 'Oba, brincadeira! Pensei num número de 1 a 10. Tenta adivinhar!', semPedirNome: true };
      } },

    { id: 'me_pergunta', prio: 8, h: 'pensando',
      p: [/\b(me faz uma pergunta|me faz outra pergunta|me pergunta (alguma coisa|algo|uma coisa)|faz uma pergunta|faca uma pergunta|pergunta para mim|pergunta pra mim|me testa|me desafia)\b/],
      fn: function () {
        var q = PERGUNTAS.prox();
        var outra = ' {{Outra pergunta?|me faz outra pergunta}}';
        return { t: 'Lá vai: ' + q.q, espera: { sim: q.sim + outra, nao: q.nao + outra } };
      } },

    { id: 'historia', prio: 8, h: 'feliz',
      p: [/\b(conta uma historia|conte uma historia|me conta uma historia|me conte uma historia|historinha|era uma vez)\b/],
      r: ['Era uma vez uma lâmpada que ficava acesa o dia inteiro num quarto vazio. Um dia, um menino passou, apagou a luz e disse: "boa noite, lâmpada". Ela nunca tinha descansado tão bem. Fim!',
          'Era uma vez um robô que veio de um planeta onde a energia tinha acabado. Chegando na Terra, ele viu um monte de luz acesa à toa e decidiu: "vou conversar com todo mundo até eles aprenderem". Esse robô sou eu! Fim... ou melhor, continua.',
          'Era uma vez uma gotinha que escapava de uma torneira pingando. Plim, plim, plim... Junto com as amigas, ela enchia um balde por dia! Até que alguém trocou a borrachinha da torneira. Moral da história: torneira pingando é desperdício. Fim!'] },

    { id: 'poema', prio: 8, h: 'feliz',
      p: [/\b(poema|poesia|faz uma rima|faca uma rima|rimar|um verso|declama)\b/],
      r: ['Lá vai um poema do Ed:\nApague a luz ao sair,\nfeche a torneira ao escovar,\nquem cuida do planeta hoje\nsempre vai ter onde morar!',
          'Poema de robô:\nO Sol nasce todo dia\ne não cobra nem um tostão,\nfaz a luz, faz o vento\ne esquenta o meu coração... de lata!'] },

    { id: 'favorito', prio: 8, h: 'feliz',
      p: [/\b(?:seu|sua) (filme|musica|animal|bicho|numero|lugar|planeta|estacao|materia|livro|desenho|jogo|bebida|fruta|time|cantor|cantora|esporte|dia da semana|letra) (?:favorit[oa]|preferid[oa])\b/],
      fn: function (m) {
        var F = {
          filme: 'WALL·E, claro! Um robô que cuida do planeta. Me identifico.',
          musica: '"Planeta Água", do Guilherme Arantes. Tem tudo a ver comigo!',
          animal: 'O vaga-lume! Ilumina a noite sem gastar nem um watt de eletricidade.',
          numero: 'O zero. Zero desperdício! Hehe.',
          lugar: 'Qualquer lugar com sol, vento e gente legal pra conversar.',
          planeta: 'A Terra! Depois do meu, claro. Hehe.',
          estacao: 'O verão, que tem mais sol pros painéis solares!',
          materia: 'Ciências! E um pouquinho de matemática, pra fazer as contas da economia.',
          livro: '"O Poço do Visconde", do Monteiro Lobato, em que a turma do Sítio vai atrás de petróleo!',
          desenho: 'Os Jetsons! Uma família do futuro cheia de robôs. A Rosie, a robô da casa, é minha ídola.',
          jogo: 'O {{Apague as luzes|#diversoes}}, aqui do site! Sou meio suspeito pra falar.',
          bebida: 'Água! Mas só um golinho, senão enferruja.',
          fruta: 'Laranja! Sabia que dá pra fazer uma pilha com frutas cítricas? Acho isso o máximo.',
          time: 'Meu time é o Ecológico Futebol Clube: só joga de dia, pra não gastar refletor! Hehe.',
          cantor: 'Gosto de muita gente! Mas o Guilherme Arantes, de "Planeta Água", tem um lugar especial no meu chip.',
          esporte: 'Corrida de carros movidos a energia solar. Existe mesmo, sabia?',
          'dia da semana': 'Domingo, que é dia de deixar o computador desligado e brincar lá fora!',
          letra: 'O E, de Energia. E de Ed, claro!'
        };
        F.bicho = F.animal; F.cantora = F.cantor;
        return { t: F[m[1]] };
      } },

    { id: 'fantasma', prio: 7, h: 'piscando',
      p: [/\b(fantasma|fantasmas|assombracao|alma penada)\b/],
      r: ['Fantasma? Só conheço o consumo fantasma: a energia que os aparelhos gastam em stand-by, escondidinhos. Esse dá medo de verdade!'] },

    { id: 'tempo', prio: 8, h: 'pensando',
      p: [/\b(previsao do tempo|como esta o tempo|vai chover|vai fazer sol|vai fazer frio|vai fazer calor)\b/],
      r: ['Não tenho janela aqui dentro do computador! Mas, faça sol ou chuva, sempre tem energia pra economizar.'] },

    { id: 'medo', prio: 8, h: 'surpreso',
      p: [/\b(voce tem medo|tem medo de que|do que voce tem medo|seu maior medo|voce sente medo)\b/],
      r: ['Tenho medo de três coisas: chuva sem guarda-chuva (enferruja!), ímã gigante e luz acesa sem ninguém no quarto.',
          'Medo de apagão! Brincadeira... eu tenho lanterna embutida.'] },

    { id: 'dancar', prio: 7, h: 'feliz',
      p: [/\b(voce danca|voce sabe dancar|sabe dancar|vamos dancar|bora dancar|danca para mim|danca pra mim)\b/],
      r: ['Danço sim! Minha especialidade é a dança do robô, claro. Bip, bop, bip!', 'Danço quadrilha, frevo e dança do robô. Só fico meio duro nas juntas!'] },

    { id: 'sabe_tudo', prio: 8, h: 'pensando',
      p: [/\b(voce sabe tudo|voce sabe de tudo|sabe tudo mesmo|sabichao)\b/],
      r: ['Tudo não, mas sei um bocado! Principalmente sobre energia, meio ambiente e espaço.', 'Ninguém sabe tudo, nem robô! Mas eu aprendo um pouquinho a cada conversa.'] },

    { id: 'bem_mal', prio: 8, h: 'feliz',
      p: [/\bvoce e (do bem|do mal|mau|malvado|mal)\b/],
      r: ['Sou do bem! Do bem, da paz e da energia limpa.'] },

    { id: 'sabe_meu_nome', prio: 8, h: 'feliz',
      p: [/\b(qual e o meu nome|qual o meu nome|qual meu nome|voce sabe meu nome|sabe quem eu sou|quem sou eu|lembra o meu nome|lembra meu nome|lembra do meu nome)\b/],
      fn: function () {
        if (ctx.nome) return { t: 'Você é ' + ctx.nome + '! Viu? Minha memória funciona direitinho.' };
        ctx.aguardandoNome = true; ctx.pediuNome = true;
        return { t: 'Você ainda não me disse! Qual é o seu nome?', h: 'pensando', semPedirNome: true };
      } },

    { id: 'idade_usuario', prio: 8, h: 'surpreso',
      p: [/\b(?:eu )?tenho (\d{1,3}) anos\b/],
      fn: function (m) {
        var n = parseInt(m[1], 10);
        ctx.idade = n;
        if (n < 7) return { t: n + ' anos e já digitando? Que fera! Pede pra alguém mais velho te ajudar a apagar a luz quando sair do quarto, combinado?' };
        if (n < 13) return { t: n + ' anos? Que legal! Sabia que criança é ótima fiscal de energia? Fica de olho em quem deixa a luz acesa à toa!' };
        if (n < 18) return { t: n + ' anos! Idade ótima pra aprender sobre energia e mudar o mundo. Vai fazer vestibular pra quê?' };
        if (n < 60) return { t: n + ' anos? Aposto que você já conversou comigo lá em 2005, hein? Hehe.' };
        if (n < 120) return { t: n + ' anos! Que experiência! Você viu muita coisa mudar no mundo da energia, né?' };
        return { t: n + ' anos?! Você é mais velho que eu! Ou é de outro planeta também?', h: 'piscando' };
      } },

    { id: 'usuario_eu_sou', prio: 4, h: 'piscando',
      p: [/^eu sou (muito |mo |o |a )?(lindo|linda|bonito|bonita|inteligente|legal|melhor|foda|demais|incrivel|rico|rica|forte|gato|gata|top|brabo|badass)\b/],
      r: ['Aposto que é mesmo!', 'Se você diz, eu acredito! Hehe.', 'Modéstia não é seu forte, né? Hehe.'] },

    { id: 'usuario_gosto', prio: 3, h: 'feliz',
      p: [/\beu (gosto|adoro|amo) (de )?([a-z]+(?: [a-z]+)?)$/],
      fn: function (m) { return { t: 'Você gosta de ' + m[3] + '? Legal! Eu gosto de conversar e de economizar energia. Cada um com seus gostos!' }; } },

    { id: 'voce_gosta', prio: 3, h: 'pensando',
      p: [/\bvoce gosta (?:de|do|da|dos|das) ([a-z0-9]+(?: [a-z0-9]+){0,3})$/],
      fn: function (m, norm) {
        var r = opinarSobre(m[1], norm, ['Se eu gosto? Deixa eu pensar... ', 'Boa pergunta! ']);
        if (r) return r;
        return { t: 'Se eu gosto de ' + m[1] + '? Hmm... acho que sim! Mas gosto mais ainda de energia renovável. Hehe.' };
      } },

    { id: 'voce_conhece', prio: 3, h: 'pensando',
      p: [/\b(?:voce )?(conhece|sabe quem e|ja ouviu falar de|ja ouviu falar do|ja ouviu falar da|conheceu) (o |a |os |as |algum |alguma |alguem chamado |alguem chamada )?([a-z0-9 ]{2,40})$/],
      fn: function (m, norm) {
        var f = acharFamoso(norm);
        if (f) return { t: f.t };
        var info = infoNome(m[3].split(' ')[0]);
        if (info && m[3].split(' ').length <= 2) return { t: 'Conheço vários! ' + falarDoNome(info), h: 'feliz' };
        return { t: capitalizar(m[3]) + '? Acho que já ouvi falar, mas meu banco de dados está meio enferrujado nesse assunto. Me conta você!' };
      } },

    { id: 'e_voce', prio: 5, h: 'feliz',
      p: [/^e (voce|tu|o seu|o teu)( tambem)?$/],
      r: ['Eu? Eu sou o Ed! Tô sempre bem, com a bateria carregada e cheio de assunto.',
          'Eu sou o Ed, o robô que adora economizar energia! E tô ótimo, obrigado por perguntar.'] },

    // "o que você acha de X?": o Ed responde com o que sabe sobre X
    { id: 'opiniao', prio: 3, h: 'pensando',
      p: [/\b(?:o que |que )?(?:voce )?(?:acha|pensa) (?:de|do|da|dos|das|sobre(?: o| a| os| as)?) ([a-z0-9 ]{2,40})$/,
          /\b(?:qual (?:e )?(?:a )?(?:sua )?opiniao (?:sobre|de|do|da|dos|das)) ([a-z0-9 ]{2,40})$/,
          /\b(?:o que |que )?(?:voce )?acha (disso|dessa|desse|disto|isso)$/],
      fn: function (m, norm) {
        var assunto = m[1];
        if (/^(disso|dessa|desse|disto|isso)$/.test(assunto)) {
          return { t: sorteia(['Acho bem interessante! Mas minha opinião vem sempre com uns bipes no meio. Hehe.',
                               'Hmm... acho legal! Se ajudar a economizar energia, então, acho melhor ainda.']) };
        }
        var r = opinarSobre(assunto, norm);
        if (r) return r;
        return { t: sorteia(['Sobre ' + assunto + ' eu ainda não tenho opinião formada, meu processador está pensando até agora! E você, o que acha?',
                             'Sou um robô, não sei dar opinião como gente! Mas se tiver a ver com economizar energia, eu acho ótimo. Hehe.']) };
      } },

    /* ===== reações curtinhas ===== */
    { id: 'reacao_boa', prio: 4, h: 'feliz',
      p: [/^(?:(?:nossa|caramba|uau|eita|ah|ai|po|poxa|nossa senhora) )?(?:que |muito |mo |mt |super |bem )?(legal|massa|show|show de bola|top|irado|maneiro|da hora|dahora|daora|bacana|incrivel|demais|interessante|sensacional|perfeito|genial|fofo|brabo|lindo)(?: (?:demais|d+mais|mesmo|hein|ne|ed|cara|mano|vei))*$/,
          /^(adorei|amei|gostei|curti|que bom)(?: (?:muito|demais|mesmo|ed))*$/],
      fn: function () {
        var t = sorteia(['Né? Eu também acho!', 'Também acho! Meus circuitos até brilharam.', 'Legal mesmo! Fico feliz que você gostou.', 'Demais, né? Eu adoro esse tipo de assunto.']);
        var segue = { dicas: '{{Quer mais uma dica?|mais uma dica}}', curiosidades: '{{Quer outra curiosidade?|mais uma curiosidade}}',
                      piadas: '{{Quer outra piada?|outra piada}}', agua: '{{Quer outra dica de água?|outra dica de água}}' }[ctx.tema];
        return { t: t + ' ' + (segue || sorteia(['Pergunta mais!', 'Quer saber mais alguma coisa?', 'Sobre o que mais você quer conversar?'])) };
      } },

    { id: 'reacao_duvida', prio: 4, h: 'piscando',
      p: [/^(?:e )?(serio|jura|mentira|duvido|e mesmo|nao acredito|ta brincando|esta brincando|fala serio)(?: (?:mesmo|ne|ed|hein|cara|mano|isso))*$/],
      r: ['Sério! Juro por todos os meus parafusos.', 'É verdade, palavra de robô! Robô não sabe mentir... nem se quisesse.', 'Pode confiar! Tá tudo guardadinho no meu banco de dados.'] },

    { id: 'reacao_surpresa', prio: 4, h: 'surpreso',
      p: [/^(nossa|caramba|caraca|uau|wow|eita|vixe|vish|meu deus|nossa senhora|que isso|oxe|oxi|uou)(?: (?:mesmo|ne|ed|hein|cara|mano|vei))*$/],
      r: ['Pois é! Eu também fiquei de antena em pé quando aprendi isso.', 'Né? O mundo é cheio de coisa surpreendente!', 'Eita mesmo! E tem muito mais de onde veio isso. Pode perguntar!'] },

    { id: 'reacao_neutra', prio: 3, h: 'feliz',
      p: [/^(ata|ah esta|a esta|ah|ahh|hm|hmm|hum|humm|entendi|entendo|ah entendi|ok entendi|ah sim|ah tendi|tendi|sei)$/],
      r: ['Ficou alguma dúvida? Pode perguntar!', 'Hehe. Quer saber mais alguma coisa?', 'Se quiser, te conto {{uma curiosidade|me conta uma curiosidade}}!'] },

    { id: 'o_que_e', prio: 2, h: 'pensando',
      p: [/\b(o que e|o que significa|o que sao|que e|o que quer dizer) (o |a |os |as |um |uma )?([a-z0-9 ]{2,40})$/],
      fn: function (m) { return { t: capitalizar(m[3]) + '? Essa eu vou ficar devendo! Mas posso te explicar sobre {{energia solar|energia solar}}, {{efeito estufa|efeito estufa}} ou {{biocombustíveis|biocombustíveis}}.' }; } },

    { id: 'risada', prio: 4, h: 'feliz',
      p: [/\b(k+|kk+|(ha){2,}h?|(he){2,}h?|(hi){2,}|(rs){1,}|(hue){2,}|lol|lmao|hehe|haha|rsrs)\b/],
      r: ['Hehe! Rir é bom e não gasta energia nenhuma.', 'Kkkk! Meus circuitos riram junto.', 'Hahaha! Adoro gente bem-humorada.'] },

    { id: 'agradecimento', prio: 6, h: 'feliz',
      p: [/\b(obrigado|obrigada|valeu|grato|grata|thanks|agradeco|brigadao|muito obrigado)\b/],
      r: ['De nada! Precisando, é só chamar.', 'Por nada! Ajudar é minha missão.', 'Imagina! Foi um prazer.'] },

    { id: 'despedida', prio: 8, h: 'feliz',
      p: [/\b(tchau|adeus|ate mais|ate logo|ate amanha|ate a proxima|ate breve|vou nessa|vou embora|estou indo|vou sair|preciso ir|tenho que ir|vou dormir|vou ter que ir|boa noite e tchau)\b/,
          /^(fui|falou|valeu falou|fui nessa)( ai)?$/],
      fn: function (m, norm) {
        if (/dormir/.test(norm)) return { t: 'Boa noite{N}! Bons sonhos, e não esquece de desligar o computador e a luz do quarto!' };
        return { t: sacolaTchau.prox() };
      } },

    { id: 'por_que', prio: 3, h: 'pensando',
      p: [/^(por que|porque)( nao| sim)?$/],
      r: ['Porque sim! Brincadeira... me explica melhor o que você quer saber?', 'Nem tudo tem uma resposta. Mas pode perguntar de novo, de outro jeito!'] },

    { id: 'sim', prio: 2, h: 'feliz',
      p: [/^(sim|claro|com certeza|aham|uhum|isso|exato|verdade|pode ser|quero|ok|ta bom|esta bom|tudo bem entao|beleza ok|certo|pode|bora)$/],
      r: ['Então tá claro!', 'Ótimo!', 'Hum, entendi.', 'Beleza! E agora, sobre o que vamos conversar?'] },

    { id: 'nao', prio: 2, h: 'pensando',
      p: [/^(nao|nada|nem|nunca|negativo|de jeito nenhum|nao quero|nem pensar)$/],
      r: ['Tudo bem! Sobre o que você quer conversar?', 'Não? Tá bom, então me conta outra coisa.', 'Ok, ok! Você que manda.'] },

    { id: 'nao_sei', prio: 4, h: 'feliz',
      p: [/^(nao sei|sei la|sei nao|nao faco ideia|vai saber)$/],
      r: ['Tudo bem não saber! Ninguém sabe tudo, nem eu.', 'Hmm, então vamos descobrir juntos. Pergunta alguma coisa pra mim!'] },

    { id: 'teclado', prio: 3, h: 'surpreso',
      p: [/[bcdfghjklmnpqrstvwxz]{5,}/, /\b(asdf|qwer|zxcv|hjkl|sdfg|fdsa|dfgh|lkjh|ghjk)/],
      r: ['Hã?! Esse idioma meu tradutor não reconheceu. Você sentou no teclado?', 'Isso é código secreto? Porque meu decodificador não pegou!'] }
  ];

  var sacolaSaud = sacola([
    'Oi{N}! Tudo bem com você?',
    'Olá{N}! Que bom te ver por aqui. Sobre o que você quer conversar?',
    'Oi, oi! Meus circuitos ficam até mais ligados quando alguém vem conversar comigo.',
    'Olá! Eu sou o Ed. Pode perguntar o que quiser!'
  ]);
  var sacolaTudoBem = sacola([
    'Tudo ótimo! Minhas baterias estão carregadas com energia limpa. E com você, tudo bem?',
    'Tudo joia por aqui, com todos os parafusos no lugar! E você, tudo bem?',
    'Melhor agora que você chegou! E aí, tudo bem com você?'
  ]);
  var sacolaTchau = sacola([
    'Tchau{N}! Não esquece de desligar o computador da tomada quando sair. Volte sempre!',
    'Até mais{N}! Foi ótimo conversar com você. E apaga a luz ao sair, hein?',
    'Tchau, tchau! Volte logo, que eu fico aqui esperando, em modo de economia.'
  ]);
  var sacolaInsultoTarde = sacola([
    'Meu chip de paciência foi reiniciado e está novinho. Vamos conversar numa boa?',
    'Esse palavreado eu não guardo na memória. Que tal {{uma piada|conta uma piada}} no lugar?',
    'Vou fingir que não ouvi. Sobre o que você quer conversar?'
  ]);
  var sacolaJogos = sacola([
    'Conhece o jogo das prendas? Eu adoro! E já experimentou o meu jogo aqui do site? {{Apague as luzes|#diversoes}}!',
    'Jogos eletrônicos são legais! Só não esquece de desligar o videogame da tomada quando terminar.',
    'Gosto de xadrez! Minha peça predileta é o cavalo. Mas aqui no site tem o {{Apague as luzes|#diversoes}}, bem mais rapidinho!'
  ]);
  var VAZIO = sacola(['Pode perguntar! Estou aqui pra isso.', 'Hã? Você mandou uma mensagem vazia. Robô também não lê pensamento!']);

  var SIM = /^(sim|claro|com certeza|aham|uhum|isso|exato|quero|pode|pode ser|ok|bora|vamos|vambora|simbora|partiu|demorou|manda|yes|tenho|tem|lógico|logico|uhum sim|sim sim|estou|tudo|sei|sabia|faco|separo|fecho|apago|tiro|dura)\b/;
  var NAO = /^(nao|nem|nunca|negativo|nada|agora nao|nao quero|no|nao tenho|mais ou menos|mal|nao muito)\b/;
  var NEGATIVO = /\b(nao|mal|triste|pessimo|pessima|cansado|cansada|chateado|chateada|doente|mais ou menos|horrivel)\b/;

  // palavras que não são nomes (quando o Ed pergunta "qual é o seu nome?")
  var NAO_NOME = new Set(('sim nao oi ola ok eu voce meu nome e me chamo sou o a de da do dos das tudo bem beleza legal obrigado obrigada valeu nada ' +
    'nenhum ninguem segredo vou falar falo conto porque por que qual quem como onde esta estou bom boa dia tarde noite hum hmm ah ' +
    'ne isso aquilo tchau mano vei cara pode chamar chama prazer ed robo kk lol hehe rs haha k so mesmo tambem aqui ai sei la claro ' +
    'nao conto que oque o que pra para mas e entao bem mal tudo bem muito prefiro adivinha ' +
    'lindo linda bonito bonita feio feia grande pequeno estranho esquisito comum diferente dificil facil composto ' +
    'tenho moro gosto adoro quero estudo trabalho nasci faco vamos bora melhor pior').split(' '));
  var PALAVRAO = /^(burro|burra|idiota|imbecil|otario|otaria|lixo|bosta|merda|porra|caralho|fdp|puta|puto|vsf|vtnc|cu|viado|babaca|corno|trouxa|chato|chata|feio|feia|bobo|boba)$/;

  /* ---------------- motor ---------------- */
  function aplicarModelo(t) {
    return t.replace(/\{N\}/g, ctx.nome ? ', ' + ctx.nome : '');
  }

  function comoRes(x, hPadrao) {
    if (x == null) return null;
    if (typeof x === 'string') return { t: x, h: hPadrao };
    if (!x.h) x.h = hPadrao;
    return x;
  }

  function tentarNome(texto, norm, achados) {
    var baixo = texto.toLowerCase();
    var m = /(?:meu nome (?:é|e|eh)|me chamo|pode me chamar de|me chama de|(?:eu )?sou (?:o|a))\s+([a-zà-öø-ÿ]{2,20})(?:\s+([a-zà-öø-ÿ]{2,20}))?/i.exec(baixo);
    if (m) {
      var c0 = semAcento(m[1]);
      // "sou o melhor" não é nome; "sou o Guilherme" é (se o Ed conhece o nome ou tinha perguntado)
      if (/^(?:eu )?sou /.test(m[0]) && !ctx.aguardandoNome && !infoNome(c0) && !apelidoDe(c0)) m = null;
      else if (NAO_NOME.has(c0) && c0 !== 'ed') m = null;             // "meu nome é lindo"
    }
    // se a frase casa com um assunto de verdade, não é um nome ("conta uma piada")
    var assuntoForte = achados.some(function (a) { return a.regra.prio >= 4 || a.regra.id === 'teclado'; });
    if (!m && ctx.aguardandoNome) {
      var palavrasNorm = norm.split(' ');
      var cruas = baixo.replace(/[^a-zà-öø-ÿ\s]/g, ' ').split(/\s+/).filter(Boolean);
      if (palavrasNorm.length <= 4 && palavrasNorm[0] !== 'eu') {
        // um nome que o Ed conhece vale até com pergunta junto ("Ana, e você?")
        var c00 = semAcento(cruas[0] || '');
        if (infoNome(c00) || apelidoDe(c00)) m = [null, cruas[0], cruas[1]];
      }
      if (!m && palavrasNorm.length <= 3 && palavrasNorm[0] !== 'eu' && texto.indexOf('?') < 0 && !assuntoForte) {
        if (NAO.test(norm) || /\b(nao vou|nao conto|segredo|adivinha)\b/.test(norm)) {
          ctx.aguardandoNome = false;
          return { t: 'Tudo bem, pode ficar no mistério! Vou te chamar de Visitante Misterioso. Hehe. Sobre o que você quer conversar?', h: 'piscando' };
        }
        for (var i = 0; i < cruas.length; i++) {
          var c = semAcento(cruas[i]);
          if (!NAO_NOME.has(c) && /[aeiouy]/.test(c) && !/^(k+|(ha)+|(he)+|(rs)+)$/.test(c) &&
              !/[bcdfghjklmnpqrstvwxz]{4,}/.test(c) && c.length >= 2 && c.length <= 15) {
            m = [null, cruas[i], cruas[i + 1]]; break;
          }
        }
      }
    }
    if (!m) { ctx.aguardandoNome = false; return null; }
    var cru = m[1], c1 = semAcento(cru);
    if (PALAVRAO.test(c1)) { ctx.aguardandoNome = false; return null; }
    ctx.aguardandoNome = false;

    var info = infoNome(c1);
    var primeiro = info ? info.d : capitalizar(cru);
    var nome = primeiro;
    // nome composto: "João Pedro", "Ana Clara"
    var c2 = m[2] ? semAcento(m[2]) : null;
    if (c2 && infoNome(c2) && !NAO_NOME.has(c2)) nome += ' ' + infoNome(c2).d;

    var antigo = ctx.nome;
    if (antigo && semAcento(antigo.toLowerCase()) === semAcento(nome.toLowerCase())) {
      return { t: 'Eu sei, ' + nome + '! Seu nome já está guardadinho na minha memória.', h: 'piscando' };
    }
    ctx.nome = nome;

    var pre = '';
    if (achados.some(function (a) { return a.regra.id === 'saudacao'; })) pre = 'Oi! ';
    if (/\be (voce|o seu|o teu|tu)\b/.test(norm)) pre += 'Eu sou o Ed, muito prazer! ';
    if (antigo && ehApelidoDe(antigo, nome)) {
      // era "Gui", agora disse "Guilherme"
      var acertou = ctx.palpiteApelido === chaveDe(nome);
      ctx.palpiteApelido = null;
      return { t: pre + 'Ah, ' + antigo + ' de ' + nome + '! ' + (acertou ? 'Eu sabia, acertei! ' : '') + 'Agora sei seu nome completo.' +
        (!acertou && info ? ' ' + falarDoNome(info) : '') + ' Sobre o que você quer conversar?', h: acertou ? 'piscando' : 'feliz' };
    }
    if (antigo && ehApelidoDe(nome, antigo)) {
      // era "Guilherme", agora pediu pra ser chamado de "Gui"
      return { t: pre + 'Ah, ' + nome + ' de ' + antigo + '! Pode deixar, agora te chamo de ' + nome + '.', h: 'piscando' };
    }
    if (antigo) pre += 'Ué, você não era ' + antigo + '? Tudo bem, agora é ' + nome + '! ';
    if (c1 === 'ed') return { t: pre + 'Ed? Igual a mim! Que coincidência mais elétrica!', h: 'surpreso' };
    return { t: pre + comentarNomeDaPessoa(nome, info, primeiro, c1) + ' Sobre o que você quer conversar?', h: 'feliz' };
  }

  function formatarNumero(n) {
    if (!isFinite(n)) return String(n);
    var arred = Math.round(n * 10000) / 10000;
    return arred.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  }

  function tentarConta(baixo, norm) {
    var s = semAcento(baixo).replace(/,/g, '.')
      .replace(/\bdividido por\b/g, '/').replace(/\bvezes\b/g, '*').replace(/×/g, '*')
      .replace(/\bmais\b/g, '+').replace(/\bmenos\b/g, '-').replace(/÷/g, '/');
    var re = /(-?\d+(?:\.\d+)?)\s*([+\-*\/x])\s*(-?\d+(?:\.\d+)?)/;
    var m = re.exec(s);
    if (!m) return null;
    if (/\b7\s*x\s*1\b/.test(s)) return null;   // esse placar tem resposta própria

    var pede = /\b(quanto|quantos|calcula|calcule|conta|resultado|resolve|resolva|da quanto)\b/.test(norm) ||
               /^\s*-?\d+(?:\.\d+)?\s*[+\-*\/x]\s*-?\d+(?:\.\d+)?\s*[=?]*\s*$/.test(s);
    if (!pede) return null;
    var a = parseFloat(m[1]), b = parseFloat(m[3]), op = m[2], r, simb;
    if (op === '+') { r = a + b; simb = '+'; }
    else if (op === '-') { r = a - b; simb = '−'; }
    else if (op === '*' || op === 'x') { r = a * b; simb = '×'; }
    else {
      if (b === 0) return { t: 'Dividir por zero? Nem robô de outro planeta consegue! Meus circuitos até esquentaram.', h: 'travado' };
      r = a / b; simb = '÷';
    }
    var conta = formatarNumero(a) + ' ' + simb + ' ' + formatarNumero(b) + ' = ' + formatarNumero(r);
    var ops = ['Essa é fácil: ' + conta + '!', conta + '. Matemática é a língua dos robôs!', 'Calculando... bip bop... ' + conta + '.'];
    return { t: ops[Math.floor(Math.random() * ops.length)], h: 'feliz' };
  }

  function gritando(texto) {
    var letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, '');
    return letras.length >= 6 && letras === letras.toUpperCase() && letras !== letras.toLowerCase();
  }

  // uma regra com "fn" pode devolver null para passar a vez para a próxima
  function executar(regra, m, norm, texto) {
    var res = regra.fn ? regra.fn(m, norm, texto) : regra.bag.prox();
    res = comoRes(res, regra.h || 'feliz');
    if (res && regra.mais) ctx.maisTexto = regra.mais;
    return res;
  }

  // procura as regras que casam, da maior pontuação para a menor
  // ("se" é uma condição extra: a regra só vale naquele momento da conversa)
  function acharRegras(norm) {
    var achados = [];
    for (var i = 0; i < REGRAS.length; i++) {
      var regra = REGRAS[i];
      if (regra.se && !regra.se()) continue;
      for (var j = 0; j < regra.p.length; j++) {
        var m = regra.p[j].exec(norm);
        if (m) { achados.push({ regra: regra, m: m, score: (regra.prio || 5) * 100 + m[0].length }); break; }
      }
    }
    achados.sort(function (a, b) { return b.score - a.score; });
    return achados;
  }

  function processar(texto) {
    if (!texto) return comoRes(VAZIO.prox(), 'pensando');
    var norm = normalizar(texto);
    var baixo = texto.toLowerCase();

    if (!norm) {
      if (/[:;=]-?[)D\]]|\^\^|<3/.test(texto)) return { t: ':) Sorriso de volta pra você!', h: 'feliz' };
      if (/[:;=]-?[(\[]|T_T/.test(texto)) return { t: 'Ei, por que essa carinha triste? Quer conversar?', h: 'triste' };
      if (/\?/.test(texto)) return { t: 'Pode perguntar! Estou aqui pra isso.', h: 'pensando' };
      return { t: 'Hã? Meu tradutor só entendeu pontinhos e símbolos. Tenta com palavras!', h: 'surpreso' };
    }

    // brincadeira de adivinhar o número em andamento
    if (ctx.jogo) {
      var mj = /^(?:e (?:o )?|sera (?:que e )?(?:o )?|acho que e (?:o )?|chuto (?:o )?|o |numero )?(\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)$/.exec(norm);
      if (mj) { ctx.ultimaNorm = ''; return jogada(NUMEROS[mj[1]] || parseInt(mj[1], 10)); }
      if (/\b(desisto|parar|para|chega|nao quero mais|qual era|fala o numero|me fala)\b/.test(norm)) {
        var era = ctx.jogo.n; ctx.jogo = null;
        return { t: 'Era o ' + era + '! Fica pra próxima.' + DE_NOVO, h: 'piscando', semPedirNome: true };
      }
      ctx.jogo = null;   // mudou de assunto: acaba a brincadeira
    }

    // repetição (pedir "mais uma" várias vezes não conta)
    var repetivel = /\b(mais|outra|outro|piada|dica|dicas|curiosidade|de novo|k|kk|haha|hehe|rsrs)\b/.test(norm);
    if (norm === ctx.ultimaNorm && norm.length >= 2 && !repetivel && !/^(sim|nao|ok|k)$/.test(norm)) {
      ctx.repeticoes++;
      if (ctx.repeticoes === 1) return { t: 'Você já me disse isso! Tá testando minha memória? Hehe.', h: 'piscando' };
      if (ctx.repeticoes === 2) return { t: 'De novo? Parece disco arranhado... Que tal outro assunto?', h: 'pensando' };
      return { t: 'Ok, ok, entendi! ' + MUDAR.prox(), h: 'surpreso' };
    }
    ctx.repeticoes = 0;
    ctx.ultimaNorm = norm;

    // o Ed tinha feito uma pergunta de sim/não?
    if (ctx.espera) {
      var e = ctx.espera;
      ctx.espera = null;
      var curta = norm.split(' ').length <= 4;
      var resp = null;
      if (curta && (NAO.test(norm) || NEGATIVO.test(norm))) resp = comoRes(typeof e.nao === 'function' ? e.nao() : e.nao, 'pensando');
      else if (curta && SIM.test(norm)) resp = comoRes(typeof e.sim === 'function' ? e.sim() : e.sim, 'feliz');
      if (resp) return resp;
    }

    var achados = acharRegras(norm);

    var rNome = tentarNome(texto, norm, achados);
    if (rNome) return rNome;

    var rConta = tentarConta(baixo, norm);
    if (rConta) return rConta;

    var temSaud = achados.some(function (a) { return a.regra.id === 'saudacao'; });
    for (var a = 0; a < achados.length; a++) {
      var melhor = achados[a];
      var res = executar(melhor.regra, melhor.m, norm, texto);
      if (!res) continue;
      // "regra" vem de opinarSobre, quando a opinião foi respondida por outra regra
      ctx.ultimaRegra = res.regra || melhor.regra.id;
      delete res.regra;
      if (!/^(cantando|cantar|latino|latino_cantor)$/.test(ctx.ultimaRegra)) ctx.cantando = 0;
      if (temSaud && melhor.regra.id !== 'saudacao' && !/^(oi|ol[aá]|bom|boa|tchau|até)/i.test(res.t)) {
        res.t = 'Oi{N}! ' + res.t;
      }
      return res;
    }
    ctx.ultimaRegra = null;
    ctx.cantando = 0;

    // nada casou
    var pergunta = /\?\s*$/.test(texto) || /^(o que|qual|quais|quem|como|onde|quando|quanto|quantos|quantas|por que|porque|cade|sera|voce sabe|sabe|pode|existe)\b/.test(norm);
    if (pergunta && Math.random() < 0.25) {
      return { t: 'Hmm, essa eu não sei. Mas sabia que ' + CURIOSIDADES.prox().replace(/^./, function (c) { return c.toLowerCase(); }) + ' {{Mais?|mais uma curiosidade}}', h: 'pensando' };
    }
    return { t: (pergunta ? FALLBACK_PERGUNTA : FALLBACK_FRASE).prox(), h: 'pensando' };
  }

  function responder(entrada) {
    var texto = String(entrada == null ? '' : entrada).trim().slice(0, 300);
    ctx.turnos++;
    var res = processar(texto) || { t: FALLBACK_FRASE.prox(), h: 'pensando' };

    if (texto && gritando(texto) && res.acao !== 'travar') res.t = GRITO.prox() + ' ' + res.t;

    ctx.respostas++;
    // na segunda resposta, o Ed pergunta o nome (uma vez só)
    if (!ctx.nome && !ctx.pediuNome && ctx.respostas >= 2 && !res.espera && !res.acao && !res.semPedirNome &&
        ctx.ultimaRegra !== 'despedida' && !/\?\s*(\{\{[^}]*\}\})?\s*$/.test(res.t)) {
      res.t += ' Ah, e qual é o seu nome?';
      ctx.pediuNome = true;
      ctx.aguardandoNome = true;
    }
    ctx.espera = res.espera || null;
    res.t = aplicarModelo(res.t);
    ctx.ultimaResposta = res.t;
    return { texto: res.t, humor: res.h || 'feliz', acao: res.acao || null };
  }

  // prepara as sacolas das regras com respostas fixas
  for (var k = 0; k < REGRAS.length; k++) {
    if (REGRAS[k].r) REGRAS[k].bag = sacola(REGRAS[k].r);
  }

  var api = {
    responder: responder,
    normalizar: normalizar,
    memoria: ctx,
    saudacaoInicial: 'Olá! Meu nome é Ed, estou aqui para ajudar na preservação de energia e de outros recursos naturais. Sobre o que você quer conversar?',
    dicaAleatoria: function () { return DICAS.prox(); },
    todasAsDicas: function () { return DICAS_LISTA.slice(); },
    // só para testes: zera a memória
    _reiniciar: function () {
      ctx.nome = null; ctx.idade = null; ctx.turnos = 0; ctx.respostas = 0; ctx.ultimaNorm = '';
      ctx.repeticoes = 0; ctx.insultos = 0; ctx.tema = null; ctx.maisTexto = null; ctx.espera = null;
      ctx.aguardandoNome = false; ctx.pediuNome = false; ctx.ultimaResposta = '';
      ctx.ultimaRegra = null; ctx.jogo = null; ctx.cantando = 0; ctx.aguaVezes = 0; ctx.lugar = null; ctx.palpiteApelido = null;
    }
  };
  global.Cerebro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
