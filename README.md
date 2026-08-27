# BookRevise

O BookRevise é uma plataforma de inteligência editorial para autores que desejam organizar, revisar e preparar manuscritos com segurança. O MVP permite autenticação, biblioteca privada de livros, upload de DOCX, análise editorial estruturada, decisões do autor e geração de versões exportáveis.

## Arquitetura

A aplicação usa React 19, Vite, Tailwind CSS 4, Express e tRPC. A autenticação é fornecida pelo fluxo OAuth do Manus. O banco MySQL/TiDB usa Drizzle ORM, com tabelas separadas para usuários, livros, problemas editoriais e versões geradas. Os bytes dos documentos ficam no armazenamento seguro; o banco mantém apenas metadados, referências e o texto extraído necessário para aplicar decisões.

O upload aceita exclusivamente DOCX e possui limite de 8 MB. O texto é extraído com Mammoth. Uma chamada server-side ao modelo integrado produz problemas estruturados em português, com categoria, severidade, contexto, sugestão e explicação. A geração de versão usa o texto persistido e substitui somente problemas aceitos ou editados, preservando itens ignorados.

## Execução local

Use Node.js 22 ou superior e pnpm. Instale as dependências com `pnpm install`; valide os tipos com `pnpm check`; execute os testes com `pnpm test`; e inicialize o servidor com `pnpm dev`. As variáveis de ambiente de autenticação, banco, armazenamento e IA são injetadas pelo ambiente Manus e não devem ser commitadas.

## Fluxo do usuário

O usuário entra pela tela inicial, autentica-se e acessa uma biblioteca privada. Ao criar um manuscrito, informa o título e escolhe um DOCX. O servidor valida, armazena, extrai e analisa o conteúdo. O dashboard exibe palavras, score de saúde e problemas filtráveis. Cada sugestão pode ser aceita, editada ou ignorada. Quando terminar, o autor gera um DOCX revisado e um relatório Markdown persistido no armazenamento.

## Próximos passos

O MVP está preparado para evoluir com processamento assíncrono para livros muito grandes, exportação PDF/EPUB, mapa de personagens e timeline narrativa. Antes de uso comercial, recomenda-se adicionar fila de processamento, limites por plano, observabilidade e testes de integração com arquivos DOCX representativos.
