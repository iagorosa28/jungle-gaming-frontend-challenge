# Validação do catálogo e da jornada de compra

Validação de 15/11/2026 em Windows, Node 24.22.2, npm 11.19.1, Vite 8.3.8 e Playwright 1.65.1. Chromium nos viewports 390, 768 e 1440 px, build otimizado e dois workers (`CI=true`), sem retries.

## Resultados

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, zero warnings |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; MSW, quatro artes PNG e Roboto Mono incluídos em dist |
| `npm test` | 114 aprovados, zero falhas, 4,2 min; 38 cenários por viewport |
| `npm run test:visual` | 4 aprovados; 390, 414, 768 e 1440 px; zero pixels divergentes |
| Vite/React StrictMode, comando abaixo | 7 aprovados; Cenários, slider, layout e reset da persistência em 390 px |
| `git diff --check` | Aprovado |

```sh
npm run test:e2e:dev -- --project chromium-390 --workers 2 --grep "Cenários|reset restaura|restaurar rede|contagens vêm|layout, assets"
```

## Regressão da autenticação

O [trace do CI anterior](https://github.com/iagorosa28/jungle-gaming-frontend-challenge/actions/runs/43759723893) mostra navegação completa para `/cart` imediatamente após o clique de login, antes do término do POST. O documento responsável pelo handler MSW foi encerrado e a sessão seguinte continuou como visitante. O carrinho de 1 unidade observado era o visitante, não o carrinho mesclado de 3 unidades.

O helper aguarda resposta HTTP 200 interceptada pelo Service Worker, identidade autenticada, URL de retorno e sessão publicada na interface antes de continuar. O cenário mantém as assertions da mesclagem e do rollback, consulta a quantidade pela API e verifica sua persistência após refresh. A latência controlada reproduz a falha com o helper anterior e permanece ativa no teste de regressão. A regra de mesclagem, isolamento e idempotência não foi alterada.

## Estado efetivo dos Cenários

O formulário é inicializado por `GET /api/demo`, validado por Zod e armazenado somente no cache de estado remoto. Após comandos, o estado é reconsultado. Rede e latência não usam defaults locais como representação de uma configuração já persistida. Os testes validam o formulário e o contrato REST após aplicação, navegação, refresh e reset.

O catálogo explica falhas forçadas sem alterar o significado de Tentar novamente: cada clique reexecuta a consulta e falha enquanto a condição persistir. Restaurar rede normal envia o comando REST, mantém os dados da compra e os filtros da URL e reconcilia as queries.

## Cobertura

Os 38 cenários por viewport incluem 12 do catálogo, 4 de Cenários, 14 da compra e 8 do spike. A suíte usa Axios/REST com MSW e transporte Socket.IO efetivo, sem `page.route` ou respostas alternativas no cliente.

| Área | Verificações |
| --- | --- |
| Catálogo | Contagens da API, slider/campos decimais, busca, categoria, rede e preços combinados enviados à API; ordenação e três páginas |
| Cenários | GET do estado efetivo, seleção e latência persistidas após navegação/refresh, retry que mantém falha forçada, reset e recuperação sem perder URL |
| URL | Acesso direto, refresh, voltar/avançar, validação e precisão de 18 casas decimais |
| Persistência | Catálogo anterior enriquecido sem perder carrinho, preços ou sessão; estado inválido restaura fixtures |
| Rede | Vazio, HTTP 503, falha de transporte, retry explícito, skeleton/shimmer, movimento reduzido e resposta fora de ordem |
| Tempo real | Preço/estoque e pedidos via Socket.IO, REST após reconexão, duplicatas/versões antigas |
| Compra | Visitante/conta, quantidades/remoção, sessão/expiração, isolamento, revisão, confirmação e recibo imutável |
| Recuperação | Recusa, conflito de preço/estoque, idempotência, timeout após criação, pending e refresh |
| Interface | Assets e fonte locais, teclado, detalhe e ausência de overflow nos três viewports |

Relatório principal: `playwright-report/index.html` (`npm run test:report`). Capturas/recibo JSON são anexados aos testes; falhas produzem trace e screenshot em `test-results/`. CI disponibiliza os artifacts por 14 dias. Relatório visual independente: `playwright-report/visual/index.html`. Relatórios gerados não são versionados.

## Evidências visuais

As referências visuais foram reavaliadas para as mudanças intencionais de header, busca, navegação mobile, sidebar/slider, proporções e botões. As diferenças foram inspecionadas contra as imagens anteriores e os PNGs locais antes da promoção manual das capturas. O teste mantém zero pixels divergentes e atualização automática desativada; 414 px complementa a cobertura de 390 px.

| 390 px | 414 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| [Home mobile](../tests/visual/snapshots/win32/chromium-390/catalog-home.png) | [Home mobile](../tests/visual/snapshots/win32/chromium-414/catalog-home.png) | [Home tablet](../tests/visual/snapshots/win32/chromium-768/catalog-home.png) | [Home desktop](../tests/visual/snapshots/win32/chromium-1440/catalog-home.png) |

As capturas da jornada anterior permanecem como referência histórica em `docs/evidence/purchase-*.png`; as capturas atuais de carrinho, checkout e recibo são anexadas à execução Playwright. As imagens do Figma não são baselines da aplicação e não estão versionadas.

## Limitações

- Baselines visuais disponíveis somente para Chromium/Windows. Linux/macOS e execução visual no CI permanecem pendentes; os testes funcionais continuam em Linux/CI.
- A auditoria executada por `npm ci` reportou sete alertas moderados. Correções de dependências que exigem mudanças fora desta entrega permanecem pendentes.
- Auditoria final Lighthouse não foi executada nesta entrega. O comando e a configuração existentes permanecem disponíveis.
- A jornada de compra está em Production; a evolução do catálogo depende de integração. Esta validação não publica Production nem comprova o catálogo em HTTPS público.
- Autenticação/persistência são simulações alteráveis no navegador; não há servidor seguro, concorrência entre documentos ou pagamento real.
- A home adapta a referência para controles funcionais e acessíveis. Galeria, favoritos, perfil, carteiras, cupons e áreas editoriais continuam fora desta entrega.
