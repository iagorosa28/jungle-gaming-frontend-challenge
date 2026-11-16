# Validação final de estabilidade

Validação de 16/11/2026 em build de produção local, Windows, Node 24.22.2, Playwright 1.65.1 e Chromium 159.0.8154.6. Escopo: hero mobile, retomada da aba e recuperação explícita de falhas. Contratos de compra, cotação, idempotência e persistência permanecem inalterados.

## Diagnóstico

**Hero.** A arte secundária era um segundo `img` dentro de `.hero-art`, exibido até 600 px com posição absoluta. O elemento e suas regras foram removidos. Emerald Ape, título, descrição, Explorar e as dimensões da seção foram preservados. Não foi necessário ajustar fontes, cores ou assets. A remoção é um ajuste explícito da composição de referência.

**Retorno à aba.** Não foi reproduzida a tela escura. A investigação examinou bootstrap React/MSW, barreiras de sessão, queries, fallback de erro, eventos de ciclo de vida e reconexão Socket.IO. O roteiro independente usa Chromium sem a emulação padrão de foco do Playwright, confirma `document.visibilityState` e verifica dimensões CSS de 412 × 924. Foram executadas três alternâncias, com uma permanência de 17 s em segundo plano, e um ciclo adicional `frozen`/`active` de 2 s. Houve quatro pares `hidden`/`visible`, eventos `freeze`/`resume`, nenhuma exceção de página ou rejeição não tratada, preservação de sessão/carrinho/URL e resposta REST de pedidos consistente. Um `nft.updated` chegou pelo cliente Socket.IO após a retomada. Não foram adicionados listeners de foco/visibilidade à aplicação.

**Retry.** Foi reproduzido um estado sem recuperação após encerrar o Service Worker com `ServiceWorker.stopWorker`. O worker gerado mantém os IDs de clientes ativos em memória; ao reiniciar, perde essa ativação. Os handlers e o estado fictício continuam no documento. As requisições deixam de ser interceptadas: o preview responde 404 sem JSON ao Accept do Axios, ou HTML da SPA ao Accept padrão de fetch. Repetir a consulta não reativa o cliente. O catálogo e a consulta de sessão podem falhar sucessivamente. A regressão confirmou que o código anterior não voltava a receber HTTP 200 do catálogo após clicar em Tentar novamente.

Essa reprodução demonstra uma causa concreta de retry sem saída, mas não comprova que o incidente original na hospedagem teve a mesma causa. O encerramento controlado do worker também não reproduziu uma interface completamente escura.

## Recuperação

Tentar novamente verifica erros de transporte/contrato somente quando os mocks estão habilitados. Antes de reativar qualquer coisa, consulta `/session` por Axios. HTML ou 404 sem JSON nesse endpoint identificam que a hospedagem respondeu no lugar da API simulada. Uma sessão respondida normalmente mantém o retry convencional, inclusive quando o catálogo está em `network-error` ou `http-error` intencional.

A recuperação reenvia `MOCK_ACTIVATE` ao controller existente e aguarda `MOCKING_ENABLED` do mesmo worker. O listener temporário é removido tanto na confirmação quanto no timeout de 8 s. Tentativas concorrentes compartilham uma Promise. A consulta original só é repetida após a confirmação; o botão informa ocupação e permite nova tentativa em caso de falha. Não há reload, reset de dados, reenvio de compra ou desativação de falha forçada.

O handshake pertence ao protocolo do worker MSW 2.15 versionado em `public/mockServiceWorker.js`; deve ser revalidado ao atualizar MSW. `worker.start()` isolado não reativa um runtime que já se considera iniciado. A solução não chama `worker.stop()`, preservando a interceptação WebSocket e as conexões existentes.

## Arquivos

| Arquivo | Alteração |
| --- | --- |
| `src/features/market/catalog-page.tsx`, `src/app/styles.css` | Remoção do elemento secundário e de seu CSS |
| `src/features/market/components.tsx` | Retry assíncrono, estado ocupado e erro de recuperação |
| `src/features/market/api.ts` | Diagnóstico da perda de interceptação antes do retry |
| `src/mocks/browser.ts` | Reativação limitada ao handshake do worker existente |
| `tests/e2e/navigation.spec.ts` | Enquadramento da arte única em lugar da sobreposição |
| `tests/e2e/stability.spec.ts` | Encerramento real do worker, recuperação normal/forçada, snapshots REST, evento Socket.IO e hero em cinco larguras |
| `scripts/check-tab-resume.mjs`, `package.json` | Roteiro independente de visibilidade e suspensão com perfil temporário isolado |
| Três `tests/visual/snapshots/win32/*/catalog-home.png` | Baselines mobile revisadas |
| `README.md`, `ARCHITECTURE.md`, `docs/validation.md`, este documento | Composição atual, protocolo de recuperação e evidências; validação anterior identificada como histórica |
| `docs/evidence/final-tab-resume.json` | Registro de visibilidade, suspensão/retomada, ausência de exceções e evento observado |

## Comandos e resultados

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, zero warnings |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado |
| `npm run test:e2e` | 129 aprovados, zero falhas, 3,8 min; 43 cenários em cada viewport 390/768/1440 |
| `npm run test:visual` | 10 aprovados, zero falhas, 31,6 s; zero pixels divergentes |
| `npm run test:tab-resume` | Aprovado em 412 × 924, usando preview de produção |
| `git diff --check` | Aprovado |

As regressões usam o worker real e os controles REST dos mocks; não substituem respostas com `page.route`, setters ou stubs de Socket.IO. Os cenários forçados permanecem ativos após o primeiro retry e só se recuperam após Restaurar rede normal. Login, catálogo, carrinho, checkout, recibo, idempotência e eventos existentes passaram na suíte completa.

Na comparação visual inicial, sete baselines permaneceram idênticas e somente três homes mobile divergiram. As capturas de 390 × 844, 390 × 568 e 414 × 896 foram inspecionadas antes da promoção manual. As diferenças ficaram restritas à região da arte removida: x=234–288/y=180–235 em 390 px e x=249–308/y=186–245 em 414 px. Dimensões das imagens e restante dos pixels permaneceram iguais. O teste mantém `maxDiffPixels: 0` e atualização automática desativada. Tablet, desktop e todas as capturas de navegação permanecem inalterados. O enquadramento também foi verificado funcionalmente em 412 px.

## Reprodução independente

```sh
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:visual
```

Para o roteiro de abas, iniciar o preview em um terminal:

```sh
npm run preview -- --port 4173 --strictPort
```

Em outro terminal:

```sh
npm run test:tab-resume
```

`TAB_RESUME_BASE_URL` permite escolher outra origem de preview. O roteiro exige o Chromium instalado pelo Playwright, usa um perfil temporário próprio e grava `reports/tab-resume/result.json` e `mobile-412.png`. O [registro desta execução](evidence/final-tab-resume.json) está versionado. Os relatórios completos ficam em `playwright-report/index.html` e `playwright-report/visual/index.html`.

## Limites

- A tela escura permanece sem causa comprovada; não foi aplicada correção especulativa para esse relato.
- A emulação Android/Chromium não comprova comportamento em um Pixel 9 físico, descarte da aba pelo sistema operacional ou nas condições do incidente público. Esta validação usa hospedagem local, não um novo deploy na Vercel.
- O protocolo de reativação depende do worker MSW 2.15 atual. Ausência de controller, falha de confirmação ou rede ainda indisponível podem exigir outra tentativa; o erro continua visível e os dados são preservados.
- Baselines visuais continuam específicas de Chromium/Windows. Evidências históricas Lighthouse não foram alteradas e nenhuma nova auditoria foi executada.
