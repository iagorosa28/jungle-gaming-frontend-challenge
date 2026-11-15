# Arquitetura — JGFC-1

## Escopo e referências

Esta entrega valida a fundação técnica. O [enunciado oficial](https://github.com/junglegaming/frontend-challenge/blob/main/README.md) orienta o marketplace completo; o card JGFC-1 limita esta etapa a REST, Socket.IO, interface técnica e preparação de publicação. Compra, sessão, catálogo definitivo, carrinho e carteiras ainda não existem.

A página técnica usa cores escuras, acentos quentes e uma pilha de fontes monoespaçadas locais. Os tokens são aproximações para o spike; a reprodução integral das telas do Figma pertence às próximas entregas. O monograma J é provisório. Nenhum PNG de tela é usado como interface ou asset.

## Responsabilidades

- `src/app`: Router, Query provider e tokens Tailwind; `src/main.tsx` aguarda o MSW antes de renderizar React.
- `src/features/spike`: consultas Axios, demonstração e ciclo de vida do socket.
- `src/shared`: contratos Zod, formatação decimal, cliente HTTP e componentes shadcn/ui adaptados (MIT).
- `src/mocks`: fixtures e handlers REST/WebSocket; toda alteração fictícia acontece aqui.
- `tests/e2e`: Playwright com Service Worker real, Chromium em 390, 768 e 1440 px.

Router mantém `scenario` na URL em `/spike`. Query mantém os snapshots remotos. React mantém somente estado efêmero da conexão e evidência dos eventos. O hook não contém fixtures nem copia a resposta do POST para o cache.

Vite usa `index.html` como entrada explícita da descoberta de dependências; Tailwind busca classes apenas em `src`. O bootstrap carrega os mocks e depois importa os providers da aplicação, separando esses módulos no build.

## Contratos REST implementados

| Endpoint | Entrada | Resposta |
| --- | --- | --- |
| `GET /api/spike?scenario=success\|slow\|error` | cenário validado | `{ source: 'MSW', nft: { id, name, priceEth, available, version } }` |
| `POST /api/spike/events` | `{ delivery: 'next'\|'duplicate'\|'stale' }` | `{ eventId, version }` |

GET normal tem latência de 300 ms; `slow`, 1.600 ms; `error`, HTTP 503 após 300 ms. Cenário inválido na API retorna 400; na URL da interface usa `success`. POST inválido retorna 400. Repetir evento antes da primeira atualização retorna 409. As respostas de erro usam `{ message: string }`. O cenário de erro permanece até trocar para Sucesso; tentar novamente não remove uma falha configurada.

O POST é um controle explícito de demonstração, não um endpoint de compra. `next` incrementa a versão e o preço em `0.01` ETH usando decimal.js, registra o evento e o envia aos clientes conectados. `duplicate` reenvia o mesmo evento. `stale` envia a versão inicial sem regredir o estado REST. `priceEth` trafega como string decimal validada, com até 18 casas; nunca passa por ponto flutuante. A apresentação de duas casas é suficiente para esta fixture, não define a precisão final do marketplace.

## Transporte Socket.IO

O cliente usa `socket.io-client`, namespace `/`, path `/socket.io/` e **somente WebSocket**. O endereço deriva da origem do navegador: `ws:` em HTTP local e `wss:` em HTTPS. MSW intercepta o WebSocket no navegador. Não existe servidor Socket.IO externo, Vercel Function ou conexão pública de backend neste spike.

O pacote npm `@mswjs/socket.io-binding@0.2.0` exporta `toSocketIo`, que faz handshake Engine.IO/Socket.IO e codifica os eventos. A documentação da branch principal do projeto descreve uma API diferente (`SocketIo`); o código segue o pacote publicado. O binding declara peer MSW 2; por isso usamos MSW 2.15, sem `--force`/`--legacy-peer-deps`. O lockfile fixa a árvore validada.

MSW 2.15 normaliza o path de transporte `/socket.io/` para `/` ao corresponder handlers WebSocket. Por isso `ws.link` registra a origem com path `/`, enquanto o cliente mantém `/socket.io/`. A correspondência usa a mesma origem e protocolo do ambiente, sem host ou porta de desenvolvimento fixos.

Cada conexão é registrada no handler MSW e liberada em `close`. O mock envia ping Engine.IO (`2`) a cada 20 s, pois esta versão do binding não gerencia heartbeat periódico; `socket.io-client` responde pelo transporte. O teste avança o relógio do navegador por 61 s e verifica uma nova entrega. O envio usa `io.client.emit`, nunca setters de React ou chamadas diretas ao cliente. Suporta o namespace padrão e eventos JSON de texto usados aqui; polling, upgrade de transporte, rooms, acknowledgements e binários não foram validados. O mock não comprova operação de um servidor Socket.IO real.

| Evento | Envelope |
| --- | --- |
| `nft.updated` | `{ type, eventId, resourceId, version, nft }` |
| `order.updated` | `{ type, eventId, resourceId, version, status: 'pending'\|'confirmed'\|'declined' }` |

Ambos têm schema e listener; somente `nft.updated` tem emissão e fluxo demonstrado. Não há pedido ou pagamento simulado nesta etapa. IDs estáveis e versões positivas são obrigatórios. O contrato de NFT exige coerência entre ID/versão do envelope e do recurso. Eventos inválidos são contados e descartados; duplicatas e versões antigas não reaplicam efeitos.

## Cache, reconexão e ciclo de vida

Chaves Query: `['spike', scenario]`; `staleTime: 0`, sem retry automático e sem refetch por foco. Axios recebe `AbortSignal` para cancelar consultas obsoletas ao trocar de cenário. Timeout HTTP de 8 s. A mutação não tem retry.

Um evento válido invalida o prefixo `['spike']`; a consulta ativa é refeita via Axios/MSW. A UI mostra separadamente o evento recebido e o snapshot REST. Toda conexão, inclusive reconexão, invalida os recursos ativos para recuperar mudanças perdidas. Reconexão automática é limitada a três tentativas, com atraso inicial de 500 ms e sem jitter; desconectar manualmente exige o botão Reconectar. Há até cinco eventos no histórico visual. Listeners e conexão são liberados no unmount, inclusive no ciclo adicional do StrictMode.

Não há sessão nesta etapa: o ciclo de vida é o da página técnica pública. Quando contas forem implementadas, socket, controles de versão, mutations e cache privado deverão ser isolados e descartados na troca de usuário. A base atual não deve ser apresentada como isolamento de sessão já implementado.

## Estado fictício e segurança

O estado dos mocks existe apenas na memória do documento. Refresh ou novo contexto de navegador restaura deterministicamente a fixture v1. Abas e visitantes não compartilham alterações. Não usamos localStorage/sessionStorage, credenciais, tokens ou senhas. Persistência validada por usuário, sessão, idempotência, cotações e snapshots de recibos pertencem às próximas entregas. Mocks no navegador são públicos, alteráveis pelo visitante e não fornecem segurança de servidor.

## Build e demonstração pública

`VITE_ENABLE_MOCKS` aceita `true` ou `false`, com padrão explícito `true` para esta aplicação de demonstração. A ativação independe de `DEV`: os handlers são importados também no build otimizado. Uma configuração inválida ou falha ao iniciar o Service Worker interrompe o bootstrap com mensagem visível; não há fallback silencioso para fixtures na interface.

O worker gerado pelo MSW é versionado em `public/mockServiceWorker.js` e copiado para `dist`. A aplicação requer localhost ou HTTPS e navegador com Service Worker e WebSocket. O MSW REST usa Service Worker; a interceptação WebSocket vive no contexto da página. Desativar mocks não disponibiliza um backend: a integração real ainda precisará de URL, autenticação e servidor próprios.

Vercel recebe build Vite em `dist`. Rewrites cobrem rotas SPA e preservam `/api`, `/assets`, o worker e favicon. O worker usa `Cache-Control: no-cache`; não se coloca segredo em variáveis `VITE_*`. O Playwright padrão usa o build servido por `vite preview`; esse teste não substitui o teste do Preview Vercel. A validação pública permanece pendente da configuração manual pelo responsável.

## Validação e limites

Os comandos e resultados reais são registrados em `docs/JGFC-1-validation.md`. Os relatórios Playwright e screenshots são gerados fora do Git e enviados como artifacts no CI. A configuração Lighthouse prepara três medições por perfil e relatórios HTML/JSON com medianas, ambiente, LCP, CLS e TBT. Não foram realizadas auditorias finais neste marco; início e detalhe ainda serão implementados.
