# BookRevise

O BookRevise é uma plataforma de inteligência editorial para autores que desejam organizar, revisar e preparar manuscritos com segurança. O MVP oferece autenticação, biblioteca privada, upload de DOCX, análise editorial estruturada, decisões do autor, histórico comparável e exportações editoriais.

## Arquitetura

A aplicação usa React 19, Vite, Tailwind CSS 4, Express e tRPC. A autenticação é fornecida pelo OAuth do Manus. O banco MySQL/TiDB usa Drizzle ORM, com tabelas separadas para usuários, livros, problemas editoriais, jobs de análise e versões. Os bytes ficam no storage seguro; o banco mantém metadados, referências, conteúdo necessário para geração e texto comparável.

## Fila e retries

O upload cria rapidamente um job persistente `queued`. Um worker protegido em `/api/queue` é chamado pelo cron e reivindica um job com lease. A análise passa por `processing`, `completed` ou `failed`. Falhas transitórias retornam automaticamente para `queued` com backoff de 1, 5 e 15 minutos, até três tentativas. O dashboard consulta o status e exibe mensagens amigáveis sem expor detalhes técnicos. Em uma falha terminal, o autor pode usar o botão de repetição manual, que apenas cria um novo job e também não executa a IA no clique.

## Diff e editor editorial

O histórico permite comparar qualquer versão com a original ou com outra versão. O modo atual é **palavra por palavra**, preservando espaços e pontuação e distinguindo adições e remoções com cores, legenda acessível e navegação entre ocorrências por botões, teclado e swipe. Diffs extensos são renderizados em páginas de 120 blocos, reduzindo o trabalho do DOM e mantendo a contagem e a navegação claras. O visualizador permite exportar o diff como documento de texto ou PDF gerado no servidor; no preview modal, o autor pode registrar destaques ou comentários associados a um trecho, página ou referência antes do download. O painel de atalhos valida conflitos antes de salvar e as preferências de atalhos e modo escuro ficam vinculadas à conta do usuário. O editor visual permite atualizar autor, descrição, idioma, capa JPEG/PNG, títulos de capítulos, texto de capítulos e sua ordem antes da exportação. Os capítulos podem ser reorganizados por drag-and-drop ou pelos controles acessíveis de mover para cima/baixo.

## Exportações

A geração cria DOCX, PDF, EPUB e relatório Markdown. O EPUB possui um XHTML por capítulo, título, autor, descrição, idioma, data, manifest/spine e capa personalizada quando configurada. O PDF do diff é produzido server-side, armazenado no storage seguro e registrado no histórico de versões.

## Execução local sem a hospedagem Manus

A conta Manus não é necessária para compilar, testar ou abrir a interface local. Use Node.js 22 ou superior e pnpm; no Ubuntu, `corepack enable` pode habilitar o gerenciador. Depois de clonar o repositório, execute:

```bash
pnpm install
pnpm e2e:fixture
pnpm check
pnpm test
pnpm build
pnpm dev
```

Crie um `.env` ou `.env.local` somente na sua máquina e nunca o versione. Para a aplicação funcionar além da página estática, configure um banco MySQL/TiDB acessível, OAuth, storage e o provedor de IA. Os nomes usados pelo código são:

| Variável | Obrigatória para | Observação |
|---|---|---|
| `DATABASE_URL` | banco e autenticação | Connection string MySQL/TiDB; execute as migrations `drizzle/*.sql` no banco escolhido. |
| `JWT_SECRET` | sessões | Segredo aleatório longo; não reutilize em preview e produção. |
| `VITE_APP_ID` | OAuth | ID da aplicação OAuth. |
| `OAUTH_SERVER_URL` | callback OAuth | URL base do servidor OAuth. |
| `VITE_OAUTH_PORTAL_URL` | login no navegador | URL pública do portal OAuth. |
| `BUILT_IN_FORGE_API_URL` | IA e storage integrados | Endpoint server-side usado pelos helpers existentes. |
| `BUILT_IN_FORGE_API_KEY` | IA e storage integrados | Chave server-side; nunca expor no frontend. |
| `VITE_FRONTEND_FORGE_API_URL` | recursos Forge no cliente | Somente se o fluxo frontend correspondente for usado. |
| `VITE_FRONTEND_FORGE_API_KEY` | recursos Forge no cliente | Não usar para operações privilegiadas. |
| `OWNER_OPEN_ID` e `OWNER_NAME` | contexto do proprietário | Valores do proprietário da aplicação. |
| `CRON_SECRET` ou `QUEUE_WORKER_SECRET` | worker `/api/queue` | Obrigatória para chamar o worker com segurança em serverless. |

Se a conta Manus estiver indisponível, substitua `BUILT_IN_FORGE_API_URL/KEY` por uma implementação compatível de IA e storage externo ou mantenha esses recursos desativados; não há fallback seguro que possa ser inventado localmente. Para usar somente a interface e os testes unitários, `pnpm check`, `pnpm test` e `pnpm build` são suficientes. Para E2E autenticado, gere a fixture com `pnpm e2e:fixture`, obtenha um `storageState` real por uma sessão OAuth local e execute `BOOKREVISE_E2E_STORAGE_STATE=/caminho/storage-state.json pnpm e2e`. O teste é pulado de forma segura quando essa variável não existe; cookies nunca devem ser commitados.

## Deploy no Vercel

O repositório inclui `api/index.ts`, `api/queue.ts` e `vercel.json`. **O domínio `bookrevise-esxq6kne.manus.space` é a publicação gerenciada do Manus; ele não cria automaticamente um projeto na conta Vercel.** Para aparecer no Vercel, importe manualmente `https://github.com/JoaoSantosCodes/BookRevise`, selecione a branch `main`, mantenha `pnpm build` como build command e `dist/public` como output directory. Configure no Vercel as variáveis usadas pelo OAuth, banco, storage e IA e defina obrigatoriamente `CRON_SECRET` (ou `QUEUE_WORKER_SECRET` como fallback). O banco e o storage precisam ser externos e acessíveis pelas funções serverless; não use filesystem local para manuscritos. O Cron do Vercel chama `/api/queue` a cada cinco minutos. O hosting gerenciado do Manus continua sendo a opção integrada quando você quiser OAuth, storage, banco e Heartbeat sem configuração externa.

## Verificação

A suíte cobre autenticação, autorização, validação DOCX, decisões, fila, estados do worker, retries, diff e geração PDF/EPUB. Execute `pnpm check && pnpm test && pnpm build` antes de publicar. Para gerar a fixture DOCX real e executar o E2E autenticado, use `pnpm e2e:fixture` e depois `BOOKREVISE_E2E_STORAGE_STATE=/caminho/storage-state.json pnpm e2e`; o estado de sessão nunca deve ser commitado. A habilidade reutilizável correspondente está em `bookrevise-editorial-workflow/SKILL.md`.
