# Validação da fundação técnica

Registro de 15/11/2026. Ambiente de validação: Windows, Node 24.22.1, npm 11.6.2, Vite 8.3.8, Playwright 1.65.1 e Chromium 159.0.8154.6.

[CI Linux da implementação: aprovado](https://github.com/iagorosa28/jungle-gaming-frontend-challenge/actions/runs/43726603878).

## Comandos e resultados

| Comando | Resultado |
| --- | --- |
| `npm ci --prefer-offline` | aprovado |
| `npm run lint` | aprovado, sem warnings |
| `npm run typecheck` | aprovado |
| `npm run build` | aprovado; saída `dist`, incluindo worker e assets |
| `npm audit --omit=dev` | zero vulnerabilidades de produção |
| `node --check scripts/lighthouse.mjs` e `node --check lighthouse.config.mjs` | sintaxe aprovada; nenhuma auditoria final executada |
| `npm test` | **24 aprovados**, zero falhas, 59,5 s na validação editorial; oito cenários em cada largura: 390, 768 e 1440 px |
| `npm run test:e2e:dev -- --project=chromium-390` | **8 aprovados**, zero falhas, 29,5 s; validação anterior em desenvolvimento com React StrictMode |

O runner gera o build otimizado e o serve com `vite preview` antes dos testes.

## Comportamento comprovado

O teste REST observa `Response.fromServiceWorker() === true`, HTTP 200 e JSON com `source: MSW`, preço `1.19` e versão 1, antes de conferir o conteúdo renderizado. Não há interceptação Playwright substituindo a API.

O teste de tempo real solicita a atualização por POST, observa a evidência de `nft.updated` recebido pelo `socket.io-client` com ID `nft-emerald-042-v2` e verifica preço `1.20 ETH` e versão REST 2 após invalidação/refetch. O resultado do POST contém somente ID e versão; ele não preenche o snapshot nem a evidência visual do evento.

## Evidências reproduzíveis

- Relatório HTML: `playwright-report/index.html`, aberto com `npm run test:report`.
- JSON da resposta REST anexado ao teste de acesso direto.
- Screenshot `spike-rest-socket.png` por viewport no teste de atualização.
- Traces e screenshots nas falhas em `test-results/`.
- CI publica os diretórios de relatórios como artifact por 14 dias; relatórios gerados não são versionados.
- As imagens em `docs/evidence/` são capturas da interface implementada, não PNGs de referência nem baselines de regressão visual.

Capturas após `nft.updated` v2 e reconciliação REST: [390 px](evidence/spike-390.png), [768 px](evidence/spike-768.png) e [1440 px](evidence/spike-1440.png). As três foram inspecionadas visualmente; o teste também verifica ausência de overflow horizontal e navegação pelo link de pular conteúdo.

## Pendências e limites

- Validação da publicação HTTPS pendente.
- Auditorias Lighthouse de início/detalhe pertencem às entregas dessas telas; nenhuma pontuação final foi medida no spike.
- `order.updated` tem contrato e listener preparados, mas não há pedidos nem emissão desse evento nesta etapa.
- Transporte validado é WebSocket interceptado no navegador, sem backend público Socket.IO. Persistência, sessões, checkout e isolamento por conta não pertencem a este marco.
- `npm audit` completo aponta sete avisos moderados no tooling typescript-eslint por dependência transitiva `minimatch` (GHSA-g3hv-75wg-m249). A sugestão automática envolve trocar versões do tooling; não foi aplicada atualização forçada ou override de major. As dependências de produção não têm avisos na consulta realizada.
