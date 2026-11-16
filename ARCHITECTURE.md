# Arquitetura do marketplace fictício

## Escopo e interface

O [enunciado oficial](https://github.com/junglegaming/frontend-challenge/blob/main/README.md) define o produto completo. A jornada atual é descoberta com busca/filtros/paginação → sessão → carrinho → cotação → revisão → pedido pendente → confirmação/recusa. `/spike` permanece independente.

A identidade da home segue os PNGs de referência e os tokens confirmados: Roboto Mono 400/500/700, fundo `#140D0A`, foreground `#F5F1EB`, primária `#D28A4C`, accent `#E89B55`, secundária `#CFB28C`, card `#241612`, superfície escura `#38220F`, borda `#3F2319`. Tokens estão centralizados em CSS e expostos ao Tailwind/shadcn. Fontsource fornece arquivos locais e sua licença acompanha o build. `public/art/nfts` contém somente quatro artes individuais; screenshots completos do Figma não são assets da interface.

Desktop usa conteúdo de até 1.200 px e sidebar de 310 px. Tablet e mobile usam filtros expansíveis sem modal nem captura de foco; botão informa `aria-expanded`/`aria-controls`. Categorias/redes usam radios nativos. Preços combinam dois ranges nativos acessíveis por teclado, com passos de 0,01 ETH, e campos decimais que preservam até 18 casas. O limite visual superior usa o maior preço da API arredondado para cima e acomoda limites numéricos maiores; mover um thumb não reescreve o valor preciso do outro campo. Somente Aplicar preço envia os filtros ao Router/API. O header desktop usa marca à esquerda, navegação central, busca e ações à direita. Em tablet/mobile, a busca antecede o hero; no mobile a navegação inferior fixa oferece somente rotas existentes, com espaço de rolagem para acessar controles. Cenários fica junto aos controles de demonstração. Cards usam botão de adição com contorno e área de toque de 44 px, mantendo detalhe e compra. Hero mobile adapta a composição com arte secundária; carrossel, favoritos e áreas editoriais não são simulados. Outras telas recebem apenas os tokens e o header compartilhados; não foram redesenhadas.

## Responsabilidades

| Diretório | Responsabilidade |
| --- | --- |
| `src/app` | Bootstrap, Router, Query provider, layout e Tailwind |
| `src/features/market` | Axios tipado, queries/mutations, páginas, tentativas e socket |
| `src/features/spike` | Demonstração original |
| `src/shared/contracts` | Schemas TypeScript/Zod de entradas, respostas e eventos |
| `src/shared/components/ui` | shadcn/ui adaptado |
| `src/mocks/market` | Estado autoritativo, persistência, sessão, estoque, preços e pedidos |
| `tests/e2e` | Playwright com REST/MSW e Socket.IO efetivos |

Router controla navegação, retorno de login e parâmetros do catálogo. A serialização preserva strings sem conversão implícita de JSON/números, evitando perda de precisão de preços em links diretos. Somente `page` é convertida explicitamente por Zod. Query controla dados remotos. React mantém formulário, seleção, revisão e feedback efêmeros. A tentativa autorizada é um registro de recuperação, não um pedido confirmado. Componentes e Axios não possuem fixtures ou cálculos/regras de negócio.

`src/main.tsx` inicia MSW antes de renderizar. Mocks também entram no build. `VITE_ENABLE_MOCKS` aceita `true`/`false`, padrão `true`; configuração inválida/falha do worker interrompe bootstrap com erro visível. Desativar mocks não oferece backend real.

## REST e validação

ETH trafega como string decimal de até 18 casas. Quantidade é inteira de 1 a 10; edição atual `standard`. Inputs e respostas importantes são validados com Zod. Erros usam `{ message, code }` e HTTP 400/401/404/409/422/504.

Recursos de escopo enviam `X-Mock-Session`, identificador fictício rotacionado em login/logout/expiração. Dados privados também exigem usuário. Requisições de escopo anterior são rejeitadas. Pedido ou chave de outra conta retorna 404.

| Método e caminho, prefixo `/api` | Contrato |
| --- | --- |
| `GET /session` | `{ id, user: { id, name, email } ou null, expiresAt }` |
| `POST /session/register` | `{ name, email, password }` → sessão; conflito 409 |
| `POST /session/login` | `{ email, password }` → sessão; credenciais inválidas 401 |
| `POST /session/logout` | Encerra escopo → visitante |
| `GET /nfts` | Parâmetros abaixo → `{ items, total, page, pageSize: 9, pages, facets }` |
| `GET /nfts/:id` | NFT: id, nome, edição, preço, disponibilidade, versão, arte, descrição, categoria, rede, listedAt |
| `GET /cart` | `{ items: [{ nftId, edition, quantity }], revision }` |
| `POST /cart/items` | Item → soma quantidade e retorna carrinho |
| `PUT /cart/items` | Item → substitui quantidade com validação |
| `DELETE /cart/items/:id` | Remove item → carrinho |
| `POST /quotes` | Cotação autoritativa válida por 2 minutos |
| `GET /wallets` | Opções fictícias, redes e resultado determinístico |
| `POST /orders` | `Idempotency-Key` + `{ quoteId, walletId, network, buyer: { name, email } }` |
| `GET /orders` | Pedidos da conta |
| `GET /orders/by-key/:key` | Recuperação exclusivamente da conta |
| `GET /orders/:id` | Estado, versão e snapshot |
| `GET /orders/:id/receipt` | Somente confirmado; pendente/recusado retorna 409 |
| `GET /demo` | `{ scenario, networkConditions: { catalog, loginDelayMs } }`; estado efetivo dos mocks |
| `POST /demo` | Reset/alterações → mesmo contrato de leitura; controle público exclusivo dos mocks |
| `GET /spike?scenario=success ou slow ou error` | Snapshot original com origem MSW |
| `POST /spike/events` | `{ delivery: next ou duplicate ou stale }` → metadados |

Cotação: `{ id, revision, lines, subtotalEth, discountEth, feeEth, totalEth, valid, issues, expiresAt }`. Linhas preservam NFT, nome, edição, quantidade, preço unitário, total e versão. Desconto é zero; taxa é `0.006 ETH` quando há linhas. Sem cupom nesta etapa. decimal.js calcula todos os valores; apresentação preserva casas significativas, mínimo de duas.

## Sessão e persistência

`localStorage['jungle.mock.market.v1']` guarda estado versionado da API: usuários/digests/salts fictícios, sessão, catálogo, carrinhos, cotações e pedidos. Zod valida o documento inteiro ao reidratar; ausência/erro restaura fixtures. Reset restaura os dois usuários e catálogo; pela interface também remove tentativas desta aplicação do sessionStorage. Não há senha em claro, token real ou segredo.

SHA-256 com salt evita somente guardar senha em claro. Não substitui password KDF, cookies HttpOnly, autorização e servidor reais. Estado e identificadores são acessíveis/alteráveis no navegador. A simulação suporta um documento por vez; concorrência entre abas/dispositivos não é implementada.

Carrinhos usam chave do usuário ou `guest`. Login soma visitante/conta por NFT/edição até 10, incrementa revisão e limpa visitante. Quantidades indisponíveis na mesclagem permanecem visíveis e invalidam cotação. Logout/expiração preservam carrinho da conta e abrem escopo visitante independente. Sessão dura 30 minutos; API verifica prazo em operações de escopo. Cliente consulta a cada 15 s e reage a `SESSION_EXPIRED`.

Rotas privadas verificam sessão via REST no `beforeLoad`. Uma barreira React também impede render privado após expiração. `returnTo` aceita só rotas locais conhecidas. Login/cadastro retomam a rota e preservam compra. IDs não concedem acesso a pedidos de outra conta.

## Cotação e pedido idempotente

1. Cotação calcula estoque líquido de reservas pendentes, valores, taxa e revisão do carrinho.
2. Formulário valida comprador e carteira/rede e apresenta revisão separada. Mudança recebida desabilita confirmação antiga.
3. Confirmação persiste `{ key: UUID, input }` em `sessionStorage['jungle.attempt.<userId>']` antes da rede. Falha ao guardar impede envio.
4. Recuperação consulta chave existente, enviando o mesmo input/chave apenas se não houver pedido. Resposta ambígua consulta novamente. Refresh retoma autorização sem criar chave nova.
5. Servidor resolve idempotência **antes** de revalidar cotação: mesma chave/conta/conteúdo recupera pedido inclusive terminal. Conteúdo diferente retorna `IDEMPOTENCY_CONFLICT` (409). Só um pedido pendente por conta.
6. Chave nova exige cotação aceita do proprietário, não expirada e igual à corrente: revisão, linhas/versões, preço, estoque e taxa. Mudança retorna `QUOTE_CHANGED` (409), sem pedido; interface exige nova revisão e confirmação.
7. Pedido persiste em `pending`, reserva quantidades e resolve por prazo persistido. Refresh retoma prazos. `confirmed`/`declined` são terminais.
8. Confirmação reduz estoque e remove apenas quantidades compradas do carrinho da conta. Recusa libera reserva e preserva itens. Snapshot próprio não é recalculado com catálogo.

Pedido: `{ id, userId, key, input, status, version, quote, createdAt, resolveAt, outcome, transaction }`. Transação começa com `simulated-`, sem explorador real. Somente o endpoint de recibo confirmado alimenta o recibo; pendente nunca aparece como sucesso.

Cenários estão no README. `timeout` representa HTTP 504 após commit e atraso de 1,2 s. Axios mantém timeout geral de 8 s. Erro de transporte também pode ser recuperado com consulta/reenvio da mesma chave.

## Consulta do catálogo

| Parâmetro | Valores / padrão |
| --- | --- |
| `q` | Texto de até 100 caracteres; padrão vazio; trim, sem distinção de caixa/acentos, nome e descrição |
| `category` | Opcional: digital, photography, music, 3d, collectibles, generative, games |
| `network` | Opcional: ethereum, polygon |
| `min`, `max` | Strings positivas ou zero, até seis dígitos inteiros e 18 casas; limites inclusivos; min ≤ max |
| `sort` | recent (padrão), price-asc, price-desc |
| `page` | Inteiro entre 1 e 10.000; padrão 1; limitado pela API ao último resultado |

API valida estritamente e retorna 400 para parâmetros inválidos. A URL aplica padrões seguros por campo, descartando o par de preços quando a faixa é invertida. Uma lista vazia retorna total/pages 0 e page 1. Ordenação recente usa `listedAt` decrescente; preços usam decimal.js; empates usam ID. A rede descreve o NFT e o filtro; não altera os contratos de carteira e checkout existentes.

`facets` contém `{ total, categories, networks, priceRange: { min, max } }`. Categorias/redes são mapas completos de contagens inteiras sobre todo o catálogo, independentes dos filtros e da página; representam NFTs, incluindo esgotados, e não unidades de estoque. Os extremos usam strings decimais de 18 casas. O cliente apenas apresenta esses metadados, sem filtrar fixtures ou derivar contagens de uma página parcial.

Os 21 itens têm três páginas, sete categorias e duas redes. IDs, preço e estoque dos três itens anteriores são preservados. Reidratação válida enriquece o catálogo anterior com metadados/novas fixtures e mantém preços, estoque, versões, carrinhos, sessão, pedidos e snapshots. Estado inválido restaura as fixtures. Reset também limpa condições de rede.

`GET /demo` lê o estado efetivo, sem depender das condições impostas ao catálogo. A query pública `['demo']` é invalidada após comandos; o formulário é inicializado pelos dados REST. React mantém somente edições ainda não enviadas. O erro do catálogo consulta esse mesmo contrato, explica falhas forçadas e pode enviar rede normal/latência zero, invalidando o estado e os recursos do marketplace sem resetar dados de compra. Tentar novamente continua sendo somente um refetch.

`POST /demo` aceita `{ action: 'network', catalog, loginDelayMs }`. Modos do catálogo: normal (80 ms), slow (1.200 ms), http-error (503), network-error (`HttpResponse.error`) e out-of-order (1.500 ms com q de até um caractere, 100 ms nas demais consultas). Snapshot é capturado antes da latência, permitindo resposta antiga fora de ordem. Login aceita atraso de 0–3.000 ms antes de validar a sessão e mesclar os carrinhos. Controles ficam nos mocks, persistem com validação Zod e são públicos apenas para demonstração.

## Cache e ciclo de vida

Chaves: `['session']`, `['market', sessionId, recurso, ...id]` e `['spike', scenario]`. Catálogo usa `['market', sessionId, 'catalog', { q, category, network, min, max, sort, page }]`. Recursos incluem catálogo, detalhe, carrinho, cotação, carteiras, pedidos, recibos e tentativas. Sessões diferentes da mesma conta também têm chaves diferentes. `staleTime: 0`, sem retry automático/refetch por foco. Mutations de pedido não repetem com chave nova.

Consultas recebem AbortSignal. A lista não usa placeholder da combinação anterior; cada alteração inicia skeleton ou recupera somente cache da mesma combinação com indicador de atualização. Submissão explícita da busca evita requisição por tecla. Eventos invalidam todas as combinações, pois preços podem mudar a inclusão/ordenação/paginação. A UI renderiza erro, vazio, sucesso e refetch separadamente. Uma tentativa autorizada pode continuar no mock após cancelamento do observador, sendo recuperada posteriormente. Troca de sessão cancela/remove queries, descarta mutations do escopo e desmonta listeners/componentes. Respostas antigas não são copiadas ao novo escopo.

Edição/remoção do carrinho atualiza sua lista otimisticamente, com snapshot anterior e rollback em erro; rollback não recria dados de uma sessão encerrada. Ao finalizar, invalida os recursos para reconciliar por REST. Valores monetários e pedidos aguardam a API. Eventos também invalidam recursos. Pedido pendente tem polling de 2 s como recuperação complementar. Toda conexão/reconexão invalida recursos ativos.

## Transporte Socket.IO

Reutiliza `@mswjs/socket.io-binding@0.2.0`/`toSocketIo`, MSW 2.15 e `socket.io-client`. Namespace `/`, path `/socket.io/`, apenas WebSocket, origem dinâmica (`ws` local, `wss` HTTPS). MSW normaliza path para `/` ao corresponder handler. Não há servidor externo. Mock fornece heartbeat Engine.IO de 20 s e remove conexão/assinatura em `close`.

Emissão usa `io.client.emit` pelo binding. Conexão do marketplace informa sessão fictícia; emissão de pedidos exige sessão atual e proprietário correspondente. Cliente valida ambos. Sessão anterior não recebe eventos privados da próxima conta.

| Evento | Envelope |
| --- | --- |
| `nft.updated` | `{ type, eventId, resourceId, version, nft }`; ID/versão coerentes |
| `order.updated` | `{ type, eventId, resourceId, version, status, userId, sessionId }` no marketplace |

Cliente deduplica eventId e compara versão com eventos/REST. Duplicatas/versões antigas não aplicam efeitos. Evento válido invalida recursos; REST permanece autoritativo. Troca de sessão reconstrói conexão e controles. A interface expõe conexão, contagem e aviso recebido. Spike preserva estado em memória, resetado por refresh.

Reconexão automática: três tentativas, atraso inicial 500 ms, sem jitter. Desconexão manual exige reconectar. Binding validado para eventos JSON no namespace padrão; polling de transporte, upgrade, rooms, ack e binários não validados. Não comprova servidor Socket.IO de produção.

## Build, evidências e limites

Vite copia assets/worker a `dist`; rewrites Vercel preservam assets e rotas SPA. Exige HTTPS/localhost, Service Worker e WebSocket. Jornada de compra já publicada em Production; esta evolução do catálogo não executa deployment.

Playwright usa build otimizado/servidor próprio e 390/768/1440 px, sem interceptações artificiais substituindo rede. Controles REST resolvem pendências/repetem eventos deterministicamente. Resultados em [docs/validation.md](docs/validation.md).

Regressão visual usa configuração separada (`playwright.visual.config.ts`), comparação sem pixels divergentes, movimento reduzido e espera explícita por fontes/imagens. Snapshots Chromium/Windows em 390, 414, 768 e 1440 px são versionados; geração/atualização automática é desativada. Baselines de outros sistemas e execução visual no CI ainda não estão disponíveis.

Auditoria final Lighthouse, galeria completa, favoritos, perfil, gestão de carteiras, cupons e concorrência entre documentos permanecem pendentes. A fidelidade de áreas editoriais e outras telas está fora desta evolução.
