# BookRevise

O BookRevise é uma plataforma de inteligência editorial para autores que desejam organizar, revisar e preparar manuscritos com segurança. O MVP permite autenticação, biblioteca privada, upload de DOCX, análise editorial estruturada, decisões do autor e geração de versões exportáveis.

## Arquitetura

A aplicação usa React 19, Vite, Tailwind CSS 4, Express e tRPC. A autenticação é fornecida pelo fluxo OAuth do Manus. O banco MySQL/TiDB usa Drizzle ORM, com tabelas separadas para usuários, livros, problemas editoriais, jobs de análise e versões geradas. Os bytes dos documentos ficam no armazenamento seguro; o banco mantém metadados, referências, texto extraído e conteúdo necessário para diff e exportação.

## Revisão assíncrona

O upload valida o DOCX, armazena o original e cria rapidamente um job `queued`. A análise editorial roda separadamente, com estados `queued`, `processing`, `completed` e `failed`; o dashboard consulta o status e exibe progresso indeterminado sem inventar percentual. Em produção, o worker pode ser acionado pela rota `GET/POST /api/queue`, protegida por `QUEUE_WORKER_SECRET`. A configuração `vercel.json` inclui Vercel Cron a cada cinco minutos. Para cargas maiores, recomenda-se trocar o acionamento por uma fila gerenciada externa sem alterar o contrato do job.

## Exportações e histórico

A geração de uma revisão cria DOCX, PDF, EPUB e relatório Markdown. O EPUB preserva capítulos detectados por títulos como “Capítulo 1”, inclui título, autor, descrição, idioma e capa JPEG/PNG opcional. O dashboard lista todos os artefatos por versão e oferece comparação visual por linhas entre o manuscrito original e qualquer versão gerada, distinguindo adições, remoções e linhas preservadas.

## Execução local

Use Node.js 22 ou superior e pnpm. Instale as dependências com `pnpm install`; valide os tipos com `pnpm check`; execute os testes com `pnpm test`; gere o build com `pnpm build`; e inicialize o servidor com `pnpm dev`. As variáveis de ambiente de autenticação, banco, armazenamento e IA são injetadas pelo ambiente Manus e não devem ser commitadas.

## Deploy no Vercel

O repositório inclui `api/index.ts`, `api/queue.ts` e `vercel.json` para uma implantação baseada em funções Node. Configure no projeto Vercel as variáveis usadas pelo OAuth, banco, storage e IA, além de `QUEUE_WORKER_SECRET`. O banco e o storage precisam ser serviços acessíveis externamente; não use filesystem local para documentos. O Cron do Vercel chama `/api/queue`, que deve permanecer idempotente e protegido pelo segredo. O hosting gerenciado do Manus continua sendo a opção integrada quando você quiser OAuth, storage, banco e Heartbeat sem configurar serviços externos; Vercel é uma alternativa compatível, mas exige essa configuração adicional.

## Fluxo do usuário

O usuário autentica-se e acessa uma biblioteca privada. Ao criar um manuscrito, informa título, autor, descrição e uma capa opcional, então escolhe um DOCX. O servidor valida, armazena, extrai e enfileira o conteúdo. O dashboard acompanha a análise, exibe palavras, score de saúde e problemas filtráveis. Cada sugestão pode ser aceita, editada ou ignorada. Depois, o autor gera e baixa as versões revisadas e compara alterações no histórico.

## Verificação

A suíte atual cobre autenticação, autorização, validação DOCX, decisões, fila de criação, geração de PDF/EPUB e diff. Execute `pnpm check && pnpm test && pnpm build` antes de publicar. A habilidade reutilizável correspondente está em `bookrevise-editorial-workflow/SKILL.md` no pacote entregue ao usuário.
