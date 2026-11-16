# Validação do catálogo e da jornada de compra

Validação de 15/11/2026 em Windows, Node 24.22.2, npm 11.19.1, Vite 8.3.8 e Playwright 1.65.1. Chromium nos viewports 390, 768 e 1440 px, build otimizado e dois workers (`CI=true`), sem retries.

## Resultados

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, zero warnings |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; MSW, quatro artes PNG e Roboto Mono incluídos em dist |
| `npm test` | 120 aprovados, zero falhas, 4,3 min; 40 cenários por projeto |
| `npm run test:visual` | 10 aprovados; home e navegação, incluindo 390 × 568 e 414 × 896; zero pixels divergentes |
| Vite/React StrictMode, comando abaixo | 3 aprovados; painel, filtros com conta/Socket.IO e layout em 390 px |
| `git diff --check` | Aprovado |

```sh
npm run test:e2e:dev -- --project chromium-390 --workers 2 --grep "painel sobreposto|filtros mantêm URL|layout, assets"
```

## Auditoria Lighthouse — 16/11/2026

Auditoria realizada no build otimizado do Vite, servido localmente
por `npm run preview`, com MSW habilitado. Ambiente: Windows,
Node 24.22.2, Lighthouse 13.6.0 e Chromium Headless 157.

Foram realizadas três execuções para cada combinação de página
e perfil (mobile e desktop), totalizando 12 medições. Os valores
abaixo representam as medianas registradas pelo script.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 80 | 100 | 100 | 92 | 3482 | 0,211 | 106 |
| Início | Desktop | 99 | 100 | 100 | 92 | 858 | 0,067 | 0 |
| Detalhe do NFT | Mobile | 83 | 100 | 100 | 92 | 3419 | 0,188 | 57 |
| Detalhe do NFT | Desktop | 99 | 100 | 100 | 92 | 795 | 0,043 | 0 |

Metas do desafio: Performance ≥ 90, Acessibilidade ≥ 95,
Boas práticas ≥ 95 e SEO ≥ 90.

### Análise dos resultados

As quatro auditorias atingiram as metas de acessibilidade,
boas práticas e SEO. Os perfis desktop também atingiram a meta
de performance, com nota 99 nas duas páginas.

A performance mobile ficou abaixo da meta: 80 na página inicial
e 83 no detalhe do NFT. As principais métricas a investigar
são LCP e CLS. Na página inicial, o Lighthouse sinalizou o
carregamento adiado da imagem principal do catálogo e
deslocamentos visuais envolvendo o rodapé.

Esses diagnósticos são evidências para investigação, não
comprovação definitiva das causas. Nenhuma otimização de
performance foi aplicada após estas medições.

### Evidências

Os relatórios HTML e JSON das três execuções, acompanhados dos resumos e medianas, estão organizados nos seguintes diretórios para inclusão no repositório:

- `docs/evidence/lighthouse/home-mobile/`
- `docs/evidence/lighthouse/home-desktop/`
- `docs/evidence/lighthouse/detail-mobile/`
- `docs/evidence/lighthouse/detail-desktop/`

As auditorias usaram ambiente local e mocks simulados. Os
resultados não representam uma medição da hospedagem pública.

## Regressão da autenticação

O [trace do CI anterior](https://github.com/iagorosa28/jungle-gaming-frontend-challenge/actions/runs/43759723893) mostra navegação completa para `/cart` imediatamente após o clique de login, antes do término do POST. O documento responsável pelo handler MSW foi encerrado e a sessão seguinte continuou como visitante. O carrinho de 1 unidade observado era o visitante, não o carrinho mesclado de 3 unidades.

O helper aguarda resposta HTTP 200 interceptada pelo Service Worker, identidade autenticada, URL de retorno e sessão publicada na interface antes de continuar. O cenário mantém as assertions da mesclagem e do rollback, consulta a quantidade pela API e verifica sua persistência após refresh. A latência controlada reproduz a falha com o helper anterior e permanece ativa no teste de regressão. A regra de mesclagem, isolamento e idempotência não foi alterada.

## Estado efetivo dos Cenários

O formulário é inicializado por `GET /api/demo`, validado por Zod e armazenado somente no cache de estado remoto. Após comandos, o estado é reconsultado. Rede e latência não usam defaults locais como representação de uma configuração já persistida. Os testes validam o formulário e o contrato REST após aplicação, navegação, refresh e reset.

O catálogo explica falhas forçadas sem alterar o significado de Tentar novamente: cada clique reexecuta a consulta e falha enquanto a condição persistir. Restaurar rede normal envia o comando REST, mantém os dados da compra e os filtros da URL e reconcilia as queries.

## Cobertura

Os 40 cenários por projeto incluem 12 do catálogo, 4 de Cenários, 2 de navegação, 14 da compra e 8 do spike. Os testes de navegação usam explicitamente 390 × 568, 414 × 896 e 768 × 1024; o restante mantém 390, 768 e 1440 px. A suíte usa Axios/REST com MSW e transporte Socket.IO efetivo, sem `page.route` ou respostas alternativas no cliente.

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
| Navegação | Drawer sem deslocar o catálogo; foco inicial/cíclico/restaurado; Escape, botão e backdrop; rolagem interna, fundo bloqueado, resize e filtros precisos com conta e Socket.IO |
| Interface | Header sticky, âncoras e campos focados livres de obstrução; assets locais, hero sobreposto, teclado, detalhe e ausência de overflow |

Relatório principal: `playwright-report/index.html` (`npm run test:report`). Capturas/recibo JSON são anexados aos testes; falhas produzem trace e screenshot em `test-results/`. CI disponibiliza os artifacts por 14 dias. Relatório visual independente: `playwright-report/visual/index.html`. Relatórios gerados não são versionados.

## Navegação responsiva

O painel modal permite combinar filtros sem deslocar a listagem. Seu header e footer ficam fora da área de rolagem interna; a camada modal cobre a navegação inferior. Fechar restaura foco e posição da página, preservando os filtros aplicados na URL. Os testes verificam o ciclo de Tab/Shift+Tab e a limpeza do bloqueio de rolagem ao mudar para desktop.

O header desktop permanece acessível ao rolar. Sua altura medida determina o espaço de rolagem; os testes navegam por âncora, focam controles e usam busca/carrinho com o header fixado. Conta autenticada e eventos Socket.IO são exercitados com o painel aberto, sem retirar seu foco. A composição de duas artes no hero permanece inalterada.

## Evidências visuais

As quatro baselines anteriores da home permanecem inalteradas. A cobertura inclui também a home em 390 × 568, o painel aberto nos quatro tamanhos compactos e o header desktop após navegar até o catálogo. As seis novas capturas foram inspecionadas antes da promoção manual; o teste mantém zero pixels divergentes e atualização automática desativada. A composição sobreposta do hero foi preservada.

| 390 px | 414 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| [Home mobile](../tests/visual/snapshots/win32/chromium-390/catalog-home.png) | [Home mobile](../tests/visual/snapshots/win32/chromium-414/catalog-home.png) | [Home tablet](../tests/visual/snapshots/win32/chromium-768/catalog-home.png) | [Home desktop](../tests/visual/snapshots/win32/chromium-1440/catalog-home.png) |

| 390 × 568 | 414 × 896 | 768 × 1024 | 1440 × 1000 |
| --- | --- | --- | --- |
| [Painel mobile](../tests/visual/snapshots/win32/chromium-390-short/catalog-navigation.png) | [Painel mobile](../tests/visual/snapshots/win32/chromium-414/catalog-navigation.png) | [Painel tablet](../tests/visual/snapshots/win32/chromium-768/catalog-navigation.png) | [Header durante rolagem](../tests/visual/snapshots/win32/chromium-1440/catalog-navigation.png) |

[Home em 390 × 568](../tests/visual/snapshots/win32/chromium-390-short/catalog-home.png) e [painel em 390 × 844](../tests/visual/snapshots/win32/chromium-390/catalog-navigation.png) completam a matriz visual. A suíte funcional anexa capturas do painel com conta autenticada, filtros precisos e aviso de Socket.IO.

As capturas da jornada anterior permanecem como referência histórica em `docs/evidence/purchase-*.png`; as capturas atuais de carrinho, checkout e recibo são anexadas à execução Playwright. As imagens do Figma não são baselines da aplicação e não estão versionadas.

## Limitações

- Baselines visuais disponíveis somente para Chromium/Windows. Linux/macOS e execução visual no CI permanecem pendentes; os testes funcionais continuam em Linux/CI.
- A auditoria executada por `npm ci` reportou sete alertas moderados. Correções de dependências que exigem mudanças fora desta entrega permanecem pendentes.
- Auditoria final Lighthouse não foi executada nesta entrega. O comando e a configuração existentes permanecem disponíveis.
- A jornada de compra está em Production; a evolução do catálogo depende de integração. Esta validação não publica Production nem comprova o catálogo em HTTPS público.
- Autenticação/persistência são simulações alteráveis no navegador; não há servidor seguro, concorrência entre documentos ou pagamento real.
- A home adapta a referência para controles funcionais e acessíveis. Galeria, favoritos, perfil, carteiras, cupons e áreas editoriais continuam fora desta entrega.
