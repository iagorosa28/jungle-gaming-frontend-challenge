# Validação da jornada de compra

Registro de 15/11/2026. Ambiente local: Windows, Node 24.22.2, npm 11.19.1, Vite 8.3.8 e Playwright 1.65.1. A matriz principal usa Chromium e build otimizado servido por `vite preview`.

## Comandos e resultados

| Comando | Resultado |
| --- | --- |
| `npm ci --prefer-offline --no-audit` | Aprovado; 375 pacotes instalados pelo lockfile, sem alteração de dependências |
| `npm run lint` | Aprovado, zero warnings |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; worker e três ilustrações SVG incluídos em `dist` |
| `npm test` | **66 aprovados, zero falhas, 2,9 min**; 22 cenários por viewport em 390, 768 e 1440 px |
| `npm run test:e2e:dev -- --project=chromium-390` | **22 aprovados, zero falhas, 1,7 min**; Vite e React StrictMode |
| `git diff --check` | Aprovado |

Dos 66 testes, **24 são os testes existentes do spike** e **42 cobrem a compra**. A única atualização de expectativa do spike é a rota inicial, que agora mostra o catálogo. Nenhuma baseline visual foi substituída. O conjunto principal executa do build otimizado, com servidor próprio e porta 4173 livre.

## Evidências verificáveis

`tests/e2e/purchase.spec.ts` exercita a interface e os handlers MSW reais. Os controles de cenário também passam por REST. Não há `page.route` fornecendo respostas alternativas, cliente Axios substituído ou eventos recebidos por setters de React.

| Cenário | Verificação |
| --- | --- |
| Compra completa | POST interceptado pelo Service Worker; resposta inicial pendente; recibo somente após confirmação REST |
| Carrinho visitante | Refresh conserva quantidades; login soma carrinho da conta e visitante; remoção confirmada pela API |
| Edição otimista | Quantidade indisponível retorna 409 e restaura a quantidade anterior |
| Cadastro/sessão | Conflito de e-mail, cadastro novo, refresh autenticado, expiração e retomada do checkout |
| Isolamento | Logout/troca de usuário; carrinho/pedidos independentes; consulta de pedido/recibo alheio retorna 404; eventos privados não chegam à outra conta |
| Recusa | Carteira de recusa preserva itens; endpoint de recibo retorna 409; refresh conserva recusa |
| Cotação antiga | Alteração silenciosa de preço retorna 409, sem pedido; exige revisar e confirmar novamente |
| Disponibilidade em tempo real | `nft.updated` via Socket.IO invalida cotação e impede confirmação antiga |
| Idempotência | Clique repetido e POSTs com mesma chave recuperam um pedido; conteúdo diferente retorna 409 |
| Resposta perdida | HTTP 504 após criação; recuperação da mesma chave e refresh mantêm somente um pedido |
| Refresh antes da resposta | Tentativa autorizada persistida recupera pedido sem nova criação |
| Pendente/reconexão | Refresh preserva pendência; reconexão recupera por REST; eventos duplicados/antigos são ignorados |
| Evento do pedido | `order.updated` efetivo no `socket.io-client`; confirmação remove somente quantidades compradas |
| Recibo imutável | Comparação integral do JSON antes/depois de alterar preço e recarregar |
| Contratos | Quantidades fracionadas/fora do limite, edição inexistente, rede incompatível e credenciais inválidas rejeitadas |
| Prazo/reidratação | Data controlada expira cotação; armazenamento malformado restaura fixtures |

Relatório HTML local: `playwright-report/index.html`, aberto por `npm run test:report`. O teste positivo anexa JSON do recibo e capturas de catálogo, carrinho, checkout e recibo por viewport. Traces/screenshots de falhas são gerados em `test-results/`. CI publica relatórios como artifacts por 14 dias; relatórios gerados não são versionados.

O relatório adicional de desenvolvimento fica em `playwright-report/dev/index.html`, com resultados em `test-results/dev/`, preservando o relatório principal.

## Capturas da interface implementada

As doze capturas abaixo foram inspecionadas visualmente. São evidências, não baselines nem PNGs usados como interface. Os testes também verificam ausência de overflow horizontal em carrinho, checkout e recibo.

| Tela | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| Catálogo | [Captura](evidence/purchase-catalog-390.png) | [Captura](evidence/purchase-catalog-768.png) | [Captura](evidence/purchase-catalog-1440.png) |
| Carrinho | [Captura](evidence/purchase-cart-390.png) | [Captura](evidence/purchase-cart-768.png) | [Captura](evidence/purchase-cart-1440.png) |
| Checkout | [Captura](evidence/purchase-checkout-390.png) | [Captura](evidence/purchase-checkout-768.png) | [Captura](evidence/purchase-checkout-1440.png) |
| Recibo | [Captura](evidence/purchase-receipt-390.png) | [Captura](evidence/purchase-receipt-768.png) | [Captura](evidence/purchase-receipt-1440.png) |

Evidências anteriores do spike: [390 px](evidence/spike-390.png), [768 px](evidence/spike-768.png) e [1440 px](evidence/spike-1440.png). O [CI da fundação](https://github.com/iagorosa28/jungle-gaming-frontend-challenge/actions/runs/43726603878) permanece como registro histórico; não substitui as verificações desta alteração.

## Limites

- Auditoria final Lighthouse e regressão visual com baselines não foram executadas nesta etapa.
- A fundação já está publicada em Production; esta validação não executa deployment nem comprova os fluxos novos em HTTPS público.
- A instalação usou `--no-audit`; auditoria de dependências não foi refeita nesta etapa. O registro anterior apontava sete alertas moderados no tooling typescript-eslint/minimatch e nenhum nas dependências de produção; a árvore de dependências foi preservada.
- Persistência e autenticação são fictícias e alteráveis no navegador. Não há segurança de servidor, concorrência entre abas/dispositivos ou integração real de pagamento.
- PNGs locais orientaram composição/identidade; fonte/tokens são aproximações e os SVGs substituem os assets artísticos. Fidelidade final permanece pendente.
