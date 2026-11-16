# Validação do catálogo e da jornada de compra

Validação de 15/11/2026 em Windows, Node 24.22.2, npm 11.19.1, Vite 8.3.8 e Playwright 1.65.1. Chromium nos viewports 390, 768 e 1440 px, build otimizado e dois workers (`CI=true`), sem retries.

## Resultados

| Comando | Resultado |
| --- | --- |
| `npm ci --prefer-offline` | Aprovado; 376 pacotes instalados; auditoria npm reportou sete alertas moderados |
| `npm test` | 99 aprovados, zero falhas, 3,5 min; 33 cenários por viewport |
| `npm run lint` | Aprovado, zero warnings |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; MSW, quatro artes PNG e Roboto Mono incluídos em dist |
| `npx playwright test tests/e2e/purchase.spec.ts --grep "reconcilia carrinhos" --repeat-each 10 --workers 2` | 30 aprovados; login com latência controlada de 800 ms; três viewports |
| Vite/React StrictMode, comando abaixo | 4 aprovados, 390 px e dois workers |
| `npm run test:visual` | 3 aprovados; baselines iniciais inspecionadas, sem atualização automática, zero pixels divergentes |
| `git diff --check` | Aprovado |

```sh
npm run test:e2e:dev -- --project chromium-390 --workers 2 --grep "reconcilia carrinhos|preserva 18 casas|histórico restauram|descarta resposta"
```

## Regressão da autenticação

O [trace do CI anterior](https://github.com/iagorosa28/jungle-gaming-frontend-challenge/actions/runs/43759723893) mostra navegação completa para `/cart` imediatamente após o clique de login, antes do término do POST. O documento responsável pelo handler MSW foi encerrado e a sessão seguinte continuou como visitante. O carrinho de 1 unidade observado era o visitante, não o carrinho mesclado de 3 unidades.

O helper aguarda resposta HTTP 200 interceptada pelo Service Worker, identidade autenticada, URL de retorno e sessão publicada na interface antes de continuar. O cenário mantém as assertions da mesclagem e do rollback, consulta a quantidade pela API e verifica sua persistência após refresh. A latência controlada reproduz a falha com o helper anterior e permanece ativa no teste de regressão. A regra de mesclagem, isolamento e idempotência não foi alterada.

## Cobertura

Os 33 cenários por viewport incluem 11 do catálogo, 14 da compra e 8 do spike. A suíte usa Axios/REST com MSW e transporte Socket.IO efetivo, sem `page.route` ou respostas alternativas no cliente.

| Área | Verificações |
| --- | --- |
| Catálogo | Busca, categoria, rede e preços combinados enviados à API; ordenação e três páginas |
| URL | Acesso direto, refresh, voltar/avançar, validação e precisão de 18 casas decimais |
| Persistência | Catálogo anterior enriquecido sem perder carrinho, preços ou sessão; estado inválido restaura fixtures |
| Rede | Vazio, HTTP 503, falha de transporte, retry explícito, skeleton/shimmer, movimento reduzido e resposta fora de ordem |
| Tempo real | Preço/estoque e pedidos via Socket.IO, REST após reconexão, duplicatas/versões antigas |
| Compra | Visitante/conta, quantidades/remoção, sessão/expiração, isolamento, revisão, confirmação e recibo imutável |
| Recuperação | Recusa, conflito de preço/estoque, idempotência, timeout após criação, pending e refresh |
| Interface | Assets e fonte locais, teclado, detalhe e ausência de overflow nos três viewports |

Relatório principal: `playwright-report/index.html` (`npm run test:report`). Capturas/recibo JSON são anexados aos testes; falhas produzem trace e screenshot em `test-results/`. CI disponibiliza os artifacts por 14 dias. Relatório visual independente: `playwright-report/visual/index.html`. Relatórios gerados não são versionados.

## Evidências visuais

Baselines iniciais da implementação, verificadas com `npm run test:visual`, sem geração/atualização automática:

| 390 px | 768 px | 1440 px |
| --- | --- | --- |
| [Home mobile](../tests/visual/snapshots/win32/chromium-390/catalog-home.png) | [Home tablet](../tests/visual/snapshots/win32/chromium-768/catalog-home.png) | [Home desktop](../tests/visual/snapshots/win32/chromium-1440/catalog-home.png) |

As capturas da jornada anterior permanecem como referência histórica em `docs/evidence/purchase-*.png`; as capturas atuais de carrinho, checkout e recibo são anexadas à execução Playwright. As imagens do Figma não são baselines da aplicação e não estão versionadas.

## Limitações

- Baselines visuais disponíveis somente para Chromium/Windows. Linux/macOS e execução visual no CI permanecem pendentes; os testes funcionais continuam em Linux/CI.
- A auditoria executada por `npm ci` reportou sete alertas moderados. Correções de dependências que exigem mudanças fora desta entrega permanecem pendentes.
- Auditoria final Lighthouse não foi executada nesta entrega. O comando e a configuração existentes permanecem disponíveis.
- A jornada de compra está em Production; a evolução do catálogo depende de integração. Esta validação não publica Production nem comprova o catálogo em HTTPS público.
- Autenticação/persistência são simulações alteráveis no navegador; não há servidor seguro, concorrência entre documentos ou pagamento real.
- A home adapta a referência para controles funcionais e acessíveis. Galeria, favoritos, perfil, carteiras, cupons e áreas editoriais continuam fora desta entrega.
