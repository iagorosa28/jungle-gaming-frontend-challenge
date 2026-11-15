# Instruções para o Codex — Jungle Gaming Frontend Challenge

## Fontes e objetivo
- Implementar um marketplace de NFTs fictício, responsivo e funcional. O [README oficial](https://github.com/junglegaming/frontend-challenge/blob/main/README.md) é a fonte dos requisitos; o [Figma oficial](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) é a referência visual. Em caso de dúvida relevante, sinalizar ao responsável pelo projeto; não inventar requisitos nem declarar funcionalidades simuladas como reais.
- Trabalhar em entregas pequenas ou médias, verificáveis, conforme o prompt da tarefa. Não ampliar o escopo sem necessidade.

## Stack e arquitetura
- Usar Vite + React + TypeScript, TanStack Router, TanStack Query, Axios/REST, Socket.IO (`socket.io-client`), Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse. Todas as tecnologias obrigatórias devem ter uso efetivo.
- Usar Zod nos contratos/inputs importantes e `decimal.js` para valores em ETH representados como strings decimais.
- Organizar por responsabilidades: `src/app`, `src/features`, `src/shared`, `src/mocks` e `tests`. TanStack Query gerencia estado remoto, Router gerencia estado navegável na URL e React gerencia estado efêmero de interface.
- Regras de negócio e respostas fictícias pertencem à API simulada via MSW, não aos componentes nem a atalhos no cliente Axios. Mocks precisam funcionar também no deploy de demonstração.

## Dados, sessão e tempo real
- Persistir apenas dados fictícios dos mocks, com reidratação validada, reset determinístico e isolamento por usuário. Nunca guardar senhas em claro, tokens reais ou segredos em `localStorage`/`sessionStorage`. A simulação não equivale à segurança de um servidor real.
- A cotação da API simulada é a autoridade para checkout; revalidar preços, estoque, cupons e taxas. Pedidos exigem chave de idempotência e recuperação após timeout/refresh, sem duplicar compras; recibos preservam o snapshot confirmado.
- Eventos `nft.updated` e `order.updated` devem chegar realmente ao `socket.io-client` por transporte compatível com Socket.IO. Não substituir eventos por setters diretos. Ignorar eventos duplicados/antigos, reconciliar com REST após reconexão e limpar listeners na troca de sessão.

## Referências visuais e Git
- Os PNGs de referência ficam em `referencias-locais/figma/`, ignorados por `/referencias-locais/` no `.gitignore`. Não versionar esses PNGs. Confirmar que estão acessíveis neste ambiente; não presumir que vieram pelo Git.
- Padrão dos arquivos: `web-tela-*.png` (desktop) e `app-tela-*.png` (mobile). Eles servem de referência, não como telas estáticas da aplicação. Assets usados de verdade na interface podem ser versionados normalmente.
- Priorizar fidelidade ao Figma, responsividade (390, 768 e 1440 px), acessibilidade e estados de carregamento/erro. Se fonte, cor, espaçamento ou asset não puder ser confirmado, registrar a dúvida e a aproximação adotada.
- Trabalhar em branch por entrega verificável; não integrar à `main` sem aprovação do responsável pelo projeto. Usar PR quando solicitado ou quando a entrega justificar.

## Testes, entrega e comunicação
- A cada tarefa, executar verificações pertinentes e registrar comandos e resultados reais. Usar Playwright com cenários determinísticos; não alterar baselines visuais automaticamente para ocultar diferenças. Preparar scripts para que o responsável pelo projeto execute os testes E2E de forma independente.
- O primeiro marco é um spike pequeno: comprovar Axios + MSW, evento no `socket.io-client`, um Playwright real e deploy público com mocks. Depois, priorizar uma compra funcional ponta a ponta antes de ampliar o restante.
- Quando houver PR, descrever: **(1)** objetivo/card, **(2)** alterações, **(3)** testes e resultados, **(4)** como validar, **(5)** evidências, **(6)** pendências/limitações. Não afirmar testes não executados.
- Ao concluir, informar arquivos modificados, decisões relevantes, testes executados, falhas, riscos e dúvidas. O Codex não precisa consultar Jira ou Drive; os prompts conterão o contexto da tarefa. Não fazer comentários de revisão no GitHub. A revisão técnica e a aprovação cabem ao responsável pelo projeto, que avaliará o código, os testes e as evidências. Os apontamentos e solicitações de correção serão registrados nos cards do Jira; nenhuma revisão ou aprovação deve ser presumida.
- Manter `README.md` e `ARCHITECTURE.md` da solução compatíveis com a implementação e com os requisitos oficiais, documentando especialmente limites de segurança da persistência simulada, contratos, eventos, cache e reconexão.
