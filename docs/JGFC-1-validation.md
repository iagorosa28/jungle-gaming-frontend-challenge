# Verificações — JGFC-1

Registro de 15/11/2026. Ambiente de validação: Windows, Node 24.22.1, npm 11.6.2, Vite 8.3.8, Playwright 1.65.1 e Chromium 159.0.8154.6.

## Comandos e resultados

| Comando | Resultado |
| --- | --- |
| `git fetch origin main` e `git merge --ff-only origin/main` | main já atualizada; branch `chore/JGFC-1-fundacao-spike` criada |
| `git status`, `git check-ignore` para os 15 PNGs e `git ls-files referencias-locais` | 9 desktop + 6 mobile; todos ignorados, nenhum versionado |
| `npm exec msw init public -- --save` | worker gerado em `public/mockServiceWorker.js` |
| `npm ci --prefer-offline` | aprovado após regenerar a árvore; 375 pacotes instalados pelo lockfile |
| `npm run lint` | aprovado, sem warnings |
| `npm run typecheck` | aprovado |
| `npm run build` | aprovado; saída `dist`, incluindo worker e assets; sem aviso de chunk grande após separar o bootstrap |
| `npm audit --omit=dev` | zero vulnerabilidades de produção |
| `node --check scripts/lighthouse.mjs` e `node --check lighthouse.config.mjs` | sintaxe aprovada; nenhuma auditoria final executada |
| `npm test -- --project=chromium-390 --grep 'evento Socket.IO'` | 1 aprovado no build de produção, 12,5 s no total |
| `npm test` | **24 aprovados**, zero falhas, 53,9 s na rodada final; oito cenários em cada largura: 390, 768 e 1440 px |
| `npm run test:e2e:dev -- --project=chromium-390` | **8 aprovados**, zero falhas, 29,5 s; desenvolvimento com React StrictMode |
| `git diff --cached --check` | aprovado após remover uma linha em branco excedente no Layout |

A suíte de produção passou após a instalação limpa pelo lockfile. O runner gera novamente o build otimizado e o serve com `vite preview` antes dos testes.

## Comportamento comprovado

O teste REST observa `Response.fromServiceWorker() === true`, HTTP 200 e JSON com `source: MSW`, preço `1.19` e versão 1, antes de conferir o conteúdo renderizado. Não há interceptação Playwright substituindo a API.

O teste de tempo real solicita a atualização por POST, observa a evidência de `nft.updated` recebido pelo `socket.io-client` com ID `nft-emerald-042-v2` e verifica preço `1.20 ETH` e versão REST 2 após invalidação/refetch. O resultado do POST contém somente ID e versão; ele não preenche o snapshot nem a evidência visual do evento.

## Falhas identificadas e corrigidas durante a implementação

- A resolução inicial tentou MSW 3, incompatível com o peer do binding publicado. Foi adotado MSW 2.15 e a API `toSocketIo` da versão npm 0.2.0, sem forçar peers.
- A configuração TypeScript dos testes precisava incluir DOM para as verificações executadas na página; a regra de Fast Refresh exigiu separar o componente Layout do módulo do Router.
- Na primeira rodada E2E de 390 px, dois testes passaram e seis falharam porque o socket não conectava. O MSW normaliza `/socket.io/` para `/` na correspondência dos handlers. Corrigida a URL do handler, o teste de evento passou pelo transporte.
- A instalação limpa detectou entradas opcionais nativas ausentes no primeiro lockfile. A árvore foi regenerada sem depender de `node_modules` existente.

## Evidências reproduzíveis

- Relatório HTML: `playwright-report/index.html`, aberto com `npm run test:report`.
- JSON da resposta REST anexado ao teste de acesso direto.
- Screenshot `spike-rest-socket.png` por viewport no teste de atualização.
- Traces e screenshots nas falhas em `test-results/`.
- CI publica os diretórios de relatórios como artifact por 14 dias; relatórios gerados não são versionados.
- As imagens em `docs/evidence/` são capturas da interface implementada, não PNGs de referência nem baselines de regressão visual.

Capturas após `nft.updated` v2 e reconciliação REST: [390 px](evidence/spike-390.png), [768 px](evidence/spike-768.png) e [1440 px](evidence/spike-1440.png). As três foram inspecionadas visualmente; o teste também verifica ausência de overflow horizontal e navegação pelo link de pular conteúdo.

## Arquivos da entrega

| Área | Arquivos |
| --- | --- |
| Setup e execução | `package.json`, `package-lock.json`, `.nvmrc`, `.env.example`, `.gitignore`, `.gitattributes`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `components.json` |
| Aplicação | `src/main.tsx`, `src/app/{layout,providers,router}.tsx`, `src/app/styles.css` |
| Spike | `src/features/spike/{api.ts,spike-page.tsx,use-spike-socket.ts}` |
| Compartilhado | `src/shared/api/http.ts`, `src/shared/contracts/spike.ts`, `src/shared/lib/{eth,utils}.ts`, `src/shared/components/ui/{button,card,skeleton}.tsx` |
| Rede simulada | `src/mocks/{browser,fixtures,handlers}.ts`, `public/mockServiceWorker.js` |
| Verificação | `playwright.config.ts`, `playwright.dev.config.ts`, `tests/e2e/spike.spec.ts`, `.github/workflows/ci.yml`, `lighthouse.config.mjs`, `scripts/lighthouse.mjs` |
| Publicação e docs | `vercel.json`, `public/favicon.svg`, `README.md`, `ARCHITECTURE.md`, `THIRD_PARTY_NOTICES.md`, este registro e `docs/evidence/` |

## Pendências e limites

- Primeira configuração GitHub–Vercel e validação do Preview HTTPS pelo responsável. Nenhuma URL publicada é alegada. Não foi feito merge na main.
- Auditorias Lighthouse de início/detalhe pertencem às entregas dessas telas; nenhuma pontuação final foi medida no spike.
- `order.updated` tem contrato e listener preparados, mas não há pedidos nem emissão desse evento nesta etapa.
- Transporte validado é WebSocket interceptado no navegador, sem backend público Socket.IO. Persistência, sessões, checkout e isolamento por conta não pertencem a este marco.
- `npm audit` completo aponta sete avisos moderados no tooling typescript-eslint por dependência transitiva `minimatch` (GHSA-g3hv-75wg-m249). A sugestão automática envolve trocar versões do tooling; não foi aplicada atualização forçada ou override de major. As dependências de produção não têm avisos na consulta realizada.
