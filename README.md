# BookRevise

O BookRevise é uma plataforma de inteligência editorial para autores que desejam organizar, revisar e preparar manuscritos com segurança. O MVP oferece autenticação, biblioteca privada, upload de DOCX, análise editorial estruturada, decisões do autor, histórico comparável e exportações editoriais.

## Arquitetura

A aplicação usa React 19, Vite, Tailwind CSS 4, Express e tRPC. A autenticação é fornecida pelo OAuth do Manus. O banco MySQL/TiDB usa Drizzle ORM, com tabelas separadas para usuários, livros, problemas editoriais, jobs de análise e versões. Os bytes ficam no storage seguro; o banco mantém metadados, referências, conteúdo necessário para geração e texto comparável.

## Fila e retries

O upload cria rapidamente um job persistente `queued`. Um worker protegido em `/api/queue` é chamado pelo cron e reivindica um job com lease. A análise passa por `processing`, `completed` ou `failed`. Falhas transitórias retornam automaticamente para `queued` com backoff de 1, 5 e 15 minutos, até três tentativas. O dashboard consulta o status e exibe mensagens amigáveis sem expor detalhes técnicos. Em uma falha terminal, o autor pode usar o botão de repetição manual, que apenas cria um novo job e também não executa a IA no clique.

## Diff e editor editorial

O histórico permite comparar qualquer versão com a original ou com outra versão. O modo atual é **palavra por palavra**, preservando espaços e pontuação e distinguindo adições e remoções com cores, legenda acessível e navegação entre ocorrências por botões, teclado e swipe. O visualizador permite exportar o diff como documento de texto ou PDF gerado no servidor. O painel de atalhos valida conflitos antes de salvar e as preferências de atalhos e modo escuro ficam vinculadas à conta do usuário. O editor visual permite atualizar autor, descrição, idioma, capa JPEG/PNG, títulos de capítulos, texto de capítulos e sua ordem antes da exportação. Os capítulos podem ser reorganizados por drag-and-drop ou pelos controles acessíveis de mover para cima/baixo.

## Exportações

A geração cria DOCX, PDF, EPUB e relatório Markdown. O EPUB possui um XHTML por capítulo, título, autor, descrição, idioma, data, manifest/spine e capa personalizada quando configurada. O PDF do diff é produzido server-side, armazenado no storage seguro e registrado no histórico de versões.

## Execução local

Use Node.js 22 ou superior e pnpm. Execute `pnpm install`, `pnpm check`, `pnpm test`, `pnpm build` e `pnpm dev`. As variáveis de OAuth, banco, storage e IA não devem ser commitadas.

## Deploy no Vercel

O repositório inclui `api/index.ts`, `api/queue.ts` e `vercel.json`. Configure no Vercel as variáveis usadas pelo OAuth, banco, storage e IA e defina obrigatoriamente `CRON_SECRET` (ou `QUEUE_WORKER_SECRET` como fallback). O banco e o storage precisam ser externos e acessíveis pelas funções serverless; não use filesystem local para manuscritos. O Cron do Vercel chama `/api/queue` a cada cinco minutos. O hosting gerenciado do Manus continua sendo a opção integrada quando você quiser OAuth, storage, banco e Heartbeat sem configuração externa.

## Verificação

A suíte cobre autenticação, autorização, validação DOCX, decisões, fila, estados do worker, retries, diff e geração PDF/EPUB. A validação de conflitos de atalhos e a persistência de preferências devem ser exercitadas no ambiente autenticado. Execute `pnpm check && pnpm test && pnpm build` antes de publicar. A habilidade reutilizável correspondente está em `bookrevise-editorial-workflow/SKILL.md`.
