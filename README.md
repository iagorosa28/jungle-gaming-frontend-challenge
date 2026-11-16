# Jungle Gaming — marketplace fictício

Implementação incremental do [Frontend Challenge](https://github.com/junglegaming/frontend-challenge/blob/main/README.md). A jornada disponível inclui catálogo com busca/filtros/paginação, autenticação, carrinho, cotação, checkout, pedidos e recibos. Usa React/TypeScript/Vite, TanStack Router/Query, Axios/REST, Socket.IO, Tailwind/shadcn, MSW, Zod e decimal.js.

**Todos os dados, carteiras, pagamentos e transações são fictícios.** Não há blockchain, extensão de carteira, gateway ou backend externo. A jornada de compra está publicada em Production. A versão desta branch acrescenta a experiência de descoberta e depende de integração para compor essa versão pública. O marketplace completo ainda está em desenvolvimento.

## Executar

Use **Node 24 LTS** e npm:

```sh
npm ci
npm run dev
```

Abra [http://127.0.0.1:5173](http://127.0.0.1:5173). `VITE_ENABLE_MOCKS=true` é o padrão explícito, inclusive no build otimizado. A variável está em `.env.example`; não exige segredos. O bootstrap aguarda o Service Worker; sem mocks não existe backend alternativo.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run lint` | ESLint sem warnings |
| `npm run typecheck` | Tipos da aplicação, configurações e testes |
| `npm run build` | Build otimizado em `dist` |
| `npm run preview` | Servir build na porta 4173 |
| `npm test` / `npm run test:e2e` | Build, servidor próprio e Playwright nos três viewports |
| `npm run test:e2e:dev` | Testes com Vite/StrictMode |
| `npm run test:visual` | Regressão visual da home; baselines Chromium/Windows em 390, 414, 768 e 1440 px |
| `npm run test:report` | Relatório HTML da última execução |
| `npm run lighthouse -- --profile=mobile --runs=3` | Auditoria do servidor já iniciado |

## Rotas e primeira compra

| Rota | Conteúdo |
| --- | --- |
| `/` | Hero, busca, filtros combináveis, ordenação e paginação de 21 NFTs |
| `/nfts/:nftId` | Seleção básica, edição, preço e disponibilidade |
| `/cart` | Quantidades, remoção e resumo autoritativo |
| `/login?returnTo=%2Fcheckout` | Login e retorno ao fluxo |
| `/register?returnTo=%2Fcheckout` | Cadastro mínimo |
| `/checkout` | Comprador, carteira/rede, revisão e confirmação |
| `/orders` | Pedidos da conta |
| `/orders/:orderId` | Estado e recibo somente quando confirmado |
| `/demo` | Seleção/reset e alterações reproduzíveis |
| `/spike?scenario=success` | Demonstração original REST/Socket.IO |

Contas: **ana@example.test** e **bruno@example.test**, ambas com senha **Demo123!**. Cadastro exige nome com 2–80 caracteres, e-mail válido e senha com 8–128 caracteres. Use somente informações fictícias.

1. Adicione um NFT, ajuste a quantidade no carrinho e continue para checkout.
2. Entre ou cadastre uma conta. Itens de visitante e conta são somados por NFT/edição, até 10 unidades; indisponibilidade permanece visível na cotação.
3. Selecione **Principal — aprova** e rede **ethereum** ou **polygon**. Revise comprador, itens, taxa e total.
4. Confirme a compra fictícia. O primeiro estado é `pending`; normalmente resolve após 2 segundos.
5. Somente `confirmed` libera recibo. A URL pode ser reaberta/recarregada; preços posteriores não alteram seu snapshot.

ETH usa strings decimais e decimal.js. A taxa desta fixture é `0.006 ETH`; desconto é zero, sem cupom nesta etapa. O servidor revalida preço, estoque, edição, revisão do carrinho e prazo da cotação de 2 minutos. Mudanças exigem nova revisão e confirmação explícita.

## Descoberta e catálogo

A busca é aplicada ao enviar o formulário; ignora caixa e acentos e procura no nome e na descrição. Categoria, rede e preço mínimo/máximo são combináveis. Preços usam ponto decimal e até 18 casas; limites são inclusivos. Busca, filtros e ordenação reiniciam a página. **Limpar filtros** também restaura a ordenação recente.

A URL guarda `q`, `category`, `network`, `min`, `max`, `sort` e `page`, com validação independente dos valores. Links diretos, refresh e histórico restauram controles e resultados. Valores inválidos da URL usam padrões seguros; a API rejeita parâmetros inválidos com HTTP 400. A página fora do intervalo é ajustada ao último resultado disponível.

`GET /api/nfts` recebe esses parâmetros via Axios e retorna `{ items, total, page, pageSize: 9, pages, facets }`. Filtros, comparação decimal, ordenação e paginação são executados nos handlers MSW. Categorias: `digital`, `photography`, `music`, `3d`, `collectibles`, `generative` e `games`. Redes: `ethereum` e `polygon`. Ordenações: `recent`, `price-asc` e `price-desc`. As contagens de categorias/redes e os extremos de preço vêm de `facets`, calculados sobre os 21 NFTs antes dos filtros; as contagens representam itens, não unidades de estoque. O slider ajusta a faixa em passos de 0,01 ETH; os campos numéricos preservam até 18 casas. Ambos aplicam filtros somente em **Aplicar preço**. Detalhes dos contratos em [ARCHITECTURE.md](ARCHITECTURE.md).

Cada combinação tem sua própria chave de cache. Consultas recebem AbortSignal; troca de parâmetros mostra skeleton em vez de resultados da consulta anterior. Refetch da mesma consulta mantém os itens e mostra **Atualizando resultados**. Falhas não repetem automaticamente e oferecem **Tentar novamente**. Atualizações Socket.IO invalidam listas e reconciliam preço, composição, ordenação e totais por REST, inclusive após reconexão.

Tokens centrais em `src/app/styles.css`: fundo `#140D0A`, texto `#F5F1EB`, primária `#D28A4C`, destaque `#E89B55`, texto secundário `#CFB28C`, card `#241612`, superfície escura `#38220F` e borda `#3F2319`. Roboto Mono 400/500/700 acompanha o build por Fontsource. Desktop usa sidebar e três colunas; tablet usa filtros expansíveis e três colunas; mobile usa filtros expansíveis e duas colunas. A busca integra a topbar no desktop e aparece antes do hero em tablet/mobile. Marca à esquerda, navegação central e ações à direita compõem o header desktop; no mobile, a navegação inferior contém somente destinos existentes. **Cenários da demonstração** fica abaixo do catálogo, junto aos controles de tempo real. Os botões dos cards usam apresentação discreta com contorno, preservando foco, teclado e área de toque. Skeletons usam shimmer e respeitam movimento reduzido.

## Cenários e recuperação

Em `/demo`, **Restaurar cenário** apaga dados da simulação e restaura usuários, catálogo e carrinhos iniciais. A seleção persiste após refresh.

| Cenário | Comportamento |
| --- | --- |
| `success` | Principal confirma após 2 s |
| `declined` | Qualquer carteira recusa; carrinho preservado |
| `timeout` | Pedido persistido, mas POST retorna HTTP 504 após 1,2 s; recuperação pela mesma chave |
| `pending` | Prazo de 60 s; **Resolver pedidos pendentes** conclui deterministicamente |
| `price-change` | Primeiro envio altera preço antes de validar e retorna conflito |
| `sold-out` | Primeiro envio esgota edição antes de validar e retorna conflito |

**Reserva — recusa**, na rede `polygon`, sempre recusa, inclusive em `success`. Recusa nunca gera recibo e permite retornar ao carrinho.

**Alterar preço** e **Esgotar edição** mudam o primeiro NFT por REST e emitem `nft.updated`. **Expirar sessão** permite validar retomada após login; os controles de eventos repetidos/antigos exercitam deduplicação. A conexão pode ser desligada/reconectada pela interface. Use o console da própria página para alterar estado sem navegar:

```js
await fetch('/api/demo', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'price', broadcast: false }),
})
```

`broadcast: false` demonstra rejeição de cotação antiga sem evento no cliente. Remova a opção para emitir pelo Socket.IO. Outras ações: `stock`, `expire`, `settle`, `duplicate` e `stale`. Esses controles são públicos e exclusivos dos mocks.

Em `/demo`, **Condições de rede** configura o catálogo: `normal` (80 ms), `slow` (1,2 s), `http-error` (503), `network-error` (falha de transporte) e `out-of-order` (1,5 s para busca com até um caractere; 100 ms para as demais). O controle também aceita latência de login entre 0 e 3.000 ms. Configuração persiste; **Restaurar cenário** retorna à rede normal. O formulário consulta `GET /api/demo` e reflete o cenário e as condições efetivas, inclusive a latência, após navegação e refresh. **Tentar novamente** repete a requisição; continua falhando enquanto a falha estiver forçada. No próprio erro, **Restaurar rede normal** configura catálogo normal e latência zero, reconsulta o estado e recupera os resultados sem limpar filtros, sessão ou carrinho. Também é possível abrir **Cenários** pelo erro. Os mesmos controles são acessíveis por REST:

```js
await fetch('/api/demo', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'network', catalog: 'http-error', loginDelayMs: 0 }),
})
```

Pedidos pendentes também são consultados por REST a cada 2 s. Reconexão invalida recursos ativos; refresh retoma o mesmo pedido. A tentativa autorizada fica em `sessionStorage` por usuário **antes** do envio: recuperação consulta a chave existente e só reenvia o mesmo conteúdo se ainda não houver pedido. Uma resposta perdida nunca autoriza gerar outra chave automaticamente.

## Persistência e segurança

`localStorage` contém somente estado fictício da API, validado por Zod ao reidratar. Estado ausente/inválido restaura fixtures. Carrinhos/pedidos são separados por conta. Logout e expiração encerram consultas, mutations e listeners do escopo anterior. Checkout/pedidos exigem sessão e preservam a rota para retomada após login. Sessão dura 30 minutos; consulta periódica de 15 s e HTTP 401 detectam expiração.

Senhas não são persistidas em claro: são guardados digest SHA-256 e salt por usuário. **Isso não fornece autenticação segura de produção**: código, estado, digests e identificadores estão acessíveis/alteráveis no navegador. Não use senhas, tokens ou dados pessoais reais. A simulação suporta um documento por vez, sem concorrência entre abas/dispositivos.

## Playwright independente

```sh
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm run build
npm test
npm run test:report
```

Em Linux/CI: `npx playwright install --with-deps chromium`. A porta 4173 precisa estar livre. Contextos isolados usam Service Worker real e Socket.IO da simulação, sem `page.route` substituindo respostas. A matriz Chromium cobre **390, 768 e 1440 px**. Relatório HTML em `playwright-report/`, JSON de recibo/screenshots anexados e traces nas falhas em `test-results/`.

Os testes de Cenários cobrem leitura REST, seleções persistidas, navegação, refresh, reset e recuperação de falhas forçadas. Os testes de catálogo cobrem contagens, slider/campos precisos, filtros combinados, REST, ordenação/paginação, URL/refresh/histórico, precisão decimal, vazio, erros HTTP/transporte, skeleton/movimento reduzido, respostas atrasadas, Socket.IO, detalhe e layout. Os testes da jornada cobrem compra, carrinho persistido/mesclado, cadastro/sessão/expiração, isolamento por conta, recusa, mudanças de cotação/estoque, idempotência, resposta perdida, pending/refresh/reconexão, eventos duplicados/antigos e recibo imutável. Os oito testes do spike continuam nos três viewports; a expectativa da rota inicial acompanha a abertura do catálogo.

Repetição do cenário de mesclagem com login lento e concorrência equivalente ao CI:

```sh
npx playwright test tests/e2e/purchase.spec.ts --grep "reconcilia carrinhos" --repeat-each 10 --workers 2
npx playwright test tests/e2e/catalog.spec.ts --workers 2
```

A regressão visual é independente: `npm run test:visual`. Baselines de Windows/Chromium são versionadas em `tests/visual/snapshots/win32/` para 390, 414, 768 e 1440 px, com fontes e imagens locais. O comando não cria nem atualiza snapshots automaticamente. Baselines Linux/macOS e inclusão visual no CI permanecem pendentes; a matriz funcional do CI continua nos três viewports.

CI executa instalação, lint, tipos, build e E2E, com artifacts por 14 dias. Resultados locais e evidências estão em [docs/validation.md](docs/validation.md); resultados remotos devem ser conferidos no PR. Relatório de desenvolvimento fica em `playwright-report/dev`.

## Publicação e auditorias

A configuração existente usa Vite, Node 24, `npm ci`, `npm run build`, saída `dist` e mocks habilitados em Preview/Production. `vercel.json` preserva assets, API e worker nos rewrites SPA. HTTPS fora de localhost, Service Worker e WebSocket são necessários. Esta evolução não executa deployment.

Lighthouse está configurado, sem auditoria final desta jornada. Sirva o build com `npm run preview`, depois execute `npm run lighthouse -- --profile=mobile --runs=3` e `--profile=desktop --runs=3`. Aceita `--url=<URL>` e `CHROME_PATH`; grava HTML/JSON, medianas e LCP/CLS/TBT em `reports/lighthouse/`.

## Limites e referências

Galeria completa, favoritos, perfil, gestão de carteiras, cupons e matriz completa de auditorias ficam para etapas posteriores. O detalhe é básico. A home utiliza as quatro artes individuais fornecidas com a referência; os demais itens reutilizam essas imagens e informam isso na descrição. A composição editorial, newsletter e navegação para áreas fora do escopo não foram implementadas.

- [Figma oficial](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).
- [Arquitetura e contratos](ARCHITECTURE.md).
- [Resultados e evidências](docs/validation.md).
- [Licenças e atribuições](THIRD_PARTY_NOTICES.md).
