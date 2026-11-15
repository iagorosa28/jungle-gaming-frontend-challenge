# Arquitetura do marketplace fictício

## Escopo e interface

O [enunciado oficial](https://github.com/junglegaming/frontend-challenge/blob/main/README.md) define o produto completo. A jornada atual é catálogo básico → sessão → carrinho → cotação → revisão → pedido pendente → confirmação/recusa. `/spike` permanece independente.

O Figma e os PNGs locais acessíveis orientam fundo escuro, cartões arredondados, tipografia monoespaçada e acentos cobre. Tokens/fonte são aproximações: a fonte exata e os assets exportáveis não foram confirmados. `public/art/*.svg` contém substituições geométricas locais incluídas no build. Screenshots não compõem a interface. Fidelidade visual final permanece pendente.

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

Router controla navegação/retorno de login. Query controla dados remotos. React mantém formulário, seleção, revisão e feedback efêmeros. A tentativa autorizada é um registro de recuperação, não um pedido confirmado. Componentes e Axios não possuem fixtures ou cálculos/regras de negócio.

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
| `GET /nfts`, `GET /nfts/:id` | Lista/detalhe: id, nome, edição, preço, disponibilidade, versão, arte, descrição |
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
| `POST /demo` | Reset/alterações; controle público exclusivo dos mocks |
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

## Cache e ciclo de vida

Chaves: `['session']`, `['market', sessionId, recurso, ...id]` e `['spike', scenario]`. Recursos incluem catálogo, detalhe, carrinho, cotação, carteiras, pedidos, recibos e tentativas. Sessões diferentes da mesma conta também têm chaves diferentes. `staleTime: 0`, sem retry automático/refetch por foco. Mutations de pedido não repetem com chave nova.

Consultas recebem AbortSignal. Uma tentativa autorizada pode continuar no mock após cancelamento do observador, sendo recuperada posteriormente. Troca de sessão cancela/remove queries, descarta mutations do escopo e desmonta listeners/componentes. Respostas antigas não são copiadas ao novo escopo.

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

Vite copia assets/worker a `dist`; rewrites Vercel preservam assets e rotas SPA. Exige HTTPS/localhost, Service Worker e WebSocket. Fundação já publicada em Production; esta evolução não executa deployment.

Playwright usa build otimizado/servidor próprio e 390/768/1440 px, sem interceptações artificiais substituindo rede. Controles REST resolvem pendências/repetem eventos deterministicamente. Resultados em [docs/validation.md](docs/validation.md).

Sem baselines visuais novos ou auditoria final Lighthouse nesta etapa. Catálogo avançado, favoritos, perfil, gestão de carteiras, cupons, fidelidade final e concorrência entre documentos permanecem pendentes.
