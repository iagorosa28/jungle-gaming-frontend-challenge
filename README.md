# Jungle Gaming — fundação e spike técnico

Fundação técnica do [Frontend Challenge](https://github.com/junglegaming/frontend-challenge/blob/main/README.md). Demonstra REST com Axios + MSW e evento recebido pelo `socket.io-client`, com React, TypeScript, Vite, TanStack Router/Query, Tailwind e componentes shadcn/ui adaptados. Zod valida contratos; decimal.js mantém ETH como string decimal.

Esta etapa não implementa catálogo completo, compra, conta ou carteira. Todos os dados são fictícios. **Preparado para publicação; primeira publicação e validação pública ainda pendentes de configuração manual na Vercel.**

## Instalar e executar

Use **Node 24 LTS** (indicado em `.nvmrc`) e npm. A instalação normal não depende de ferramentas privadas ou do backend do desafio.

```sh
npm ci
npm run dev
```

Abra [http://127.0.0.1:5173/spike](http://127.0.0.1:5173/spike). O MSW deve iniciar antes da aplicação. O arquivo `.env.example` documenta `VITE_ENABLE_MOCKS=true`; esse também é o padrão explícito da demonstração quando a variável não existe. Opcionalmente copie-o para `.env.local`. Não são necessárias credenciais ou segredos.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Vite local com mocks |
| `npm run typecheck` | TypeScript da aplicação, configs e testes |
| `npm run lint` | ESLint, sem warnings permitidos |
| `npm run build` | Tipos + build otimizado em `dist` |
| `npm run preview` | Servir `dist` localmente, porta padrão 4173 |
| `npm test` / `npm run test:e2e` | Playwright; cria e serve o build de produção automaticamente |
| `npm run test:e2e:dev` | Mesmos testes no servidor de desenvolvimento |
| `npm run test:report` | Abrir o último relatório HTML |
| `npm run lighthouse -- --profile=mobile` | Auditoria futura do build servido; detalhes abaixo |

## Reproduzir os cenários

1. Abra `/spike?scenario=success`: o GET Axios retorna `Emerald Ape #042`, `1.19 ETH`, versão 1. A resposta vem de um handler MSW.
2. Selecione **Lento**: veja o skeleton durante 1.600 ms. Selecione **Erro HTTP**: o GET retorna 503 e a interface permite tentar novamente. Para recuperar, selecione **Sucesso**. O cenário está na URL e sobrevive a refresh/histórico.
3. Aguarde **Conectado** no painel de tempo real e clique **Emitir atualização**. Um POST Axios pede ao mock que incremente o preço. O handler emite `nft.updated` pelo binding Socket.IO; o cliente recebe o evento e invalida a consulta REST. Resultado: evento v2, snapshot v2 e `1.20 ETH`.
4. Use **Desconectar** e **Reconectar** para exercitar a reconciliação. O Playwright também altera o mock enquanto o socket está offline e confirma a recuperação por REST.
5. Recarregue a página para resetar fixture, versões e eventos. Não há persistência nem autenticação neste spike; não existem credenciais fictícias a fornecer nesta etapa.

O controle `POST /api/spike/events` aceita `delivery: next`, `duplicate` ou `stale` para testes determinísticos. Ele pertence à demonstração, não a uma API real. Contratos, transporte e limites estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## Playwright independente

```sh
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm test
npm run test:report
```

Em Linux/CI, use `npx playwright install --with-deps chromium` para instalar também as dependências do navegador. A porta 4173 deve estar livre. Os testes não reutilizam servidor externo e não substituem Axios ou Socket.IO por stubs. Cada teste recebe um contexto isolado, com Service Workers habilitados. São executados em Chromium com larguras **390, 768 e 1440 px**. Há evidências anexadas de resposta REST interceptada e screenshot após o evento, relatório em `playwright-report/` e traces em `test-results/` nas falhas.

O workflow `.github/workflows/ci.yml` executa lint, tipos, build e E2E em PRs e pushes na main, e disponibiliza artifacts por 14 dias. A execução remota do CI deve ser conferida no PR; não é presumida a partir de resultados locais.

O modo de desenvolvimento grava os resultados em `test-results/dev/` e o relatório em `playwright-report/dev/`, preservando o relatório de produção. Para abri-lo: `npx playwright show-report playwright-report/dev`.

## Lighthouse preparado

Não há pontuações finais neste marco. Para auditar a página técnica posteriormente, instale Chrome/Chromium e, em dois terminais:

```sh
# Terminal 1
npm run build
npm run preview

# Terminal 2
npm run lighthouse -- --profile=mobile --runs=3
npm run lighthouse -- --profile=desktop --runs=3
```

Se necessário, defina `CHROME_PATH` para o executável. O script usa Lighthouse e chrome-launcher, grava HTML/JSON por medição e `summary.json` com medianas, versões, ambiente, LCP, CLS e TBT em `reports/lighthouse/<perfil>/`. Aceita `--url=<URL>`. Início e detalhe deverão ser auditados após sua implementação; a página técnica não os substitui.

## Publicação

Configuração técnica para a Vercel: framework **Vite**, runtime **Node 24.x**, instalação `npm ci`, build `npm run build` e saída `dist`. Usar `VITE_ENABLE_MOCKS=true` em Preview e Production; a variável é pública e não contém segredos.

`vercel.json` configura rewrites SPA e headers do Service Worker. A demonstração requer HTTPS fora de localhost e suporte a Service Worker e WebSocket. Os mocks estão incluídos no build; não há backend substituto quando desativados.

A validação pública está pendente. Em HTTPS, verificar acesso direto e refresh de `/spike?scenario=success`, carregamento de `/assets/` e `/mockServiceWorker.js`, cenários REST e recebimento de eventos Socket.IO.

## Referências e evidências

- [Figma oficial](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).
- [Arquitetura, contratos e limitações](ARCHITECTURE.md).
- [Resultados e evidências](docs/validation.md).

Não há senhas, tokens reais ou persistência de dados neste marco. A simulação no navegador não equivale à segurança de um servidor real.
