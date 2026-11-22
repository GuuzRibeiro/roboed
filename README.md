# Robô Ed: homenagem de fã

Lembra do **Robô Ed**? O robozinho que conversava com a internet brasileira de 2004 a 2016 no site do CONPET, dava dica de economia de energia e travava quando a gente xingava ele?

Este projeto recria o site dele com a estética de internet de antigamente: fundo azul estrelado, menu com fonte pixelada, contador de visitas, letreiro de dicas e o aviso "melhor visualizado em 1024x768".

![Print do site](docs/print.jpg)

## O que tem

- **Converse comigo**: o chat com o Ed. Ele responde sobre energia, meio ambiente, planetas, piadas, Orkut, MSN, 7x1 e muito mais. Também lembra o seu nome, faz contas e reclama se você repetir a mesma pergunta. Se você xingar demais, ele trava.
- **Quem sou eu**: a ficha técnica do Ed e botões pra ver cada expressão dele.
- **Diversões**: o joguinho *Apague as luzes!* e um quiz pra descobrir se você é um Guardião da Energia.
- **Meu blog**: posts do Ed de 2004 a 2016.
- **Venha aprender**: dicas de economia por cômodo da casa e as fontes de energia.
- **Sobre o site** e **Links**: a história do Ed original e matérias sobre ele.

## Como abrir

Não precisa instalar nada. Baixe o projeto (botão verde **Code → Download ZIP**) e dê dois cliques no `index.html`.

Funciona offline. Só as fontes do Google precisam de internet; sem elas, o site usa fontes do próprio computador.

## Como o "cérebro" funciona

O Ed original não era uma IA como as de hoje, e este também não é. As respostas ficam todas em [`js/cerebro.js`](js/cerebro.js) e o funcionamento é parecido com o de antigamente:

1. A mensagem é "limpa": tira acentos e pontuação e entende abreviações como "vc", "pq" e "tbm".
2. O Ed procura palavras-chave usando regras (expressões regulares) e escolhe a que combina melhor.
3. As respostas saem de uma "sacola" embaralhada, pra ele não repetir a mesma coisa.
4. Uma memória curtinha guarda o seu nome e o último assunto.

Tudo roda no navegador, sem servidor e sem mandar nada pra lugar nenhum.

Quer ensinar coisa nova pro Ed? Abra o `js/cerebro.js` e copie uma das regras. O formato é este:

```js
{ id: 'pizza', prio: 3, h: 'feliz',
  p: [/\b(pizza|pizzaria)\b/],
  r: ['Pizza é bom demais! Dica do Ed: forno fechado esquenta mais rápido e gasta menos.'] },
```

`p` são os padrões que disparam a regra, `r` são as respostas possíveis e `h` é a cara que o Ed faz.

## Estrutura

```
index.html        a página inteira (todas as seções)
css/estilo.css    o visual "internet de antigamente"
js/ed-robo.js     o desenho do Ed em SVG e as expressões dele
js/cerebro.js     o cérebro: regras, respostas e memória
js/site.js        liga tudo: chat, menu, jogo, quiz, contador
fotos/            fotos opcionais do Ed (só no seu computador, veja abaixo)
```

## Fotos do Ed de verdade (opcional)

O desenho do Ed neste repositório foi feito do zero em SVG. A arte original do personagem pertence aos donos dela, por isso ela **não** está aqui.

Se quiser ver fotos do Ed original no retrato do site **no seu computador**, salve as imagens na pasta `fotos/` com os nomes `ed-1.jpg`, `ed-2.jpg`, `ed-3.jpg` e assim por diante (até `ed-12`, pode ser `.jpg` ou `.png`). O botão **Mudar imagem do Ed** passa a mostrar as fotos antes dos cenários desenhados.

A pasta `fotos/` está no `.gitignore`, então essas imagens nunca vão pro GitHub. As fotos só aparecem quando o site roda no seu computador (abrindo o arquivo ou em `localhost`).

## Aviso

Esta é uma **homenagem de fã**, feita por nostalgia e sem fins lucrativos. Não tem nenhum vínculo com a Petrobras, o CONPET ou a InBot.

O Robô Ed original (2004–2016) é um personagem do CONPET/Petrobras, criado com tecnologia InBot. O nome e o personagem pertencem aos seus donos. As respostas deste projeto foram escritas do zero, imitando o jeitão do original.

Quer conversar com o Ed "de verdade"? A InBot mantém uma versão dele no ar em [roboed.in.bot](https://roboed.in.bot).

## Fontes

- [Robô Ed na Wikipédia](https://pt.wikipedia.org/wiki/Rob%C3%B4_Ed)
- [Como foi feito o Robô Ed (InBot)](https://in.bot/comofoifeitoroboed.php)
- [Case Robô Ed (InBot)](https://in.bot/cases/roboed/index.php)
- [Lembra do Robô Ed? (TechTudo)](https://www.techtudo.com.br/noticias/2023/03/lembra-do-robo-ed-chatgpt-brasileiro-foi-criado-ha-quase-20-anos-edsoftwares.ghtml)
- [Robô Ed e Akinator (CNN Brasil)](https://www.cnnbrasil.com.br/tecnologia/robo-ed-e-akinator-conheca-os-chats-com-ia-que-fizeram-sucesso-nos-anos-2000/)
- [5 chatbots que surgiram antes do ChatGPT (Canaltech)](https://canaltech.com.br/inteligencia-artificial/robo-ed-e-mais-relembre-5-chatbots-que-surgiram-antes-do-chatgpt/)
- [O "avô do ChatGPT" (Catai)](https://catai.com.br/robo-ed-o-avo-do-chatgpt-que-a-internet-brasileira-nao-esquece/)

## Licença

O código e os textos deste repositório estão sob a [licença MIT](LICENSE): pode usar, copiar, modificar e compartilhar à vontade. A licença não vale para o nome "Robô Ed" nem para o personagem original, que pertencem aos seus donos.

Achou um bug ou quer ensinar uma resposta nova pro Ed? Abre uma *issue* ou manda um *pull request*!
