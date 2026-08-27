# Project TODO

- [x] Autenticação de usuários e área privada protegida
- [x] Organização de manuscritos por projetos de livro
- [x] Upload seguro de manuscritos DOCX
- [x] Status de processamento do manuscrito
- [x] Dashboard do livro com contagem de palavras
- [x] Indicador de saúde do manuscrito
- [x] Problemas agrupados por categoria e severidade
- [x] Relatório de revisão com contexto e explicação
- [x] Ações de aceitar, editar e ignorar sugestões
- [x] Fluxo para gerar versão revisada do manuscrito
- [x] Download do manuscrito revisado
- [x] Download do relatório de revisão
- [x] Interface elegante, responsiva e acessível
- [x] Persistência segura de metadados e referências dos arquivos
- [x] Testes unitários do backend e fluxos principais
- [x] Verificação visual em desktop e mobile
- [x] Documentação de execução e arquitetura
- [x] Publicar o projeto no repositório GitHub JoaoSantosCodes/BookRevise

## Ajustes de qualidade identificados

- [x] Implementar parsing real de DOCX e validação da estrutura do arquivo
- [x] Recalcular contagem, problemas e score a partir do texto real do DOCX
- [x] Implementar geração persistida do manuscrito revisado aplicando decisões
- [x] Gerar e persistir o relatório de revisão no backend
- [x] Adicionar testes de upload, análise, atualização de sugestões e downloads
- [x] Executar revisão visual também em viewport mobile
- [x] Criar documentação de arquitetura e execução do projeto

## Correções finais antes da publicação

- [x] Adicionar validação robusta de DOCX e mensagens claras para arquivos inválidos
- [x] Tratar falhas da análise sem mascará-las como manuscrito saudável
- [x] Criar testes de upload, análise, decisões e geração de versões

## Cobertura adicional de mutations

- [x] Testar criação de livro com DOCX válido, inválido e acima do limite
- [x] Testar sucesso e falha da análise editorial
- [x] Testar atualização de sugestões e geração das versões exportadas

## Evolução solicitada em 27/08/2026

- [x] Criar habilidade reutilizável do processo BookRevise com /skill-creator
- [x] Adicionar exportação de manuscritos revisados em PDF
- [x] Adicionar exportação de manuscritos revisados em EPUB
- [x] Implementar histórico de versões no dashboard
- [x] Adicionar progresso visual durante a análise editorial da IA
- [x] Validar habilidade, testes, layout e sincronização da nova versão

## Evolução solicitada em 27/08/2026 — fila e publicação

- [x] Atualizar a habilidade reutilizável com diff, EPUB editorial, fila assíncrona e Vercel
- [x] Implementar visualização de diff entre versões no histórico
- [x] Adicionar capítulos, metadados editoriais e capa personalizada ao EPUB
- [x] Criar fila persistente e assíncrona para análise de manuscritos longos
- [x] Preparar configuração e documentação de deploy compatível com Vercel
- [x] Testar, validar visualmente, sincronizar e salvar a nova versão

## Evolução solicitada em 27/08/2026 — diff, editor e retries

- [x] Atualizar a habilidade reutilizável com diff por palavra, editor de EPUB e retry de jobs
- [x] Implementar diff palavra por palavra no histórico
- [x] Criar editor visual interativo para capa e organização de capítulos
- [x] Adicionar retry automático com backoff para análises falhas
- [x] Exibir estados de erro amigáveis no dashboard
- [x] Testar, validar visualmente, sincronizar e salvar a nova versão

## Evolução solicitada em 27/08/2026 — interação editorial

- [x] Atualizar a habilidade reutilizável com drag-and-drop, retry manual e navegação de diff
- [x] Adicionar arrastar e soltar acessível para reordenar capítulos
- [x] Adicionar botão de repetição manual para análises falhas
- [x] Adicionar navegação entre alterações no diff
- [x] Testar, validar visualmente, sincronizar e salvar a nova versão

## Evolução solicitada em 27/08/2026 — acessibilidade e touch

- [x] Atualizar a habilidade reutilizável com atalhos, touch e diagnóstico de retry
- [x] Adicionar atalhos de teclado para navegar entre alterações do diff
- [x] Otimizar reordenação de capítulos para toque em dispositivos móveis
- [x] Exibir o motivo detalhado da falha antes do retry manual
- [x] Testar, validar visualmente, sincronizar e salvar a nova versão

## Correções finais da rodada de acessibilidade

- [x] Implementar reordenação touch-first com pointer events e alvo visual de inserção
- [x] Validar visualmente a versão final em desktop e mobile após o ajuste touch
- [x] Sincronizar esta rodada com o GitHub e salvar checkpoint final após o push

## Evolução solicitada em 27/08/2026 — leitura avançada do diff

- [x] Atualizar a habilidade reutilizável com copiar diagnóstico, swipe e tela cheia
- [x] Adicionar botão para copiar o motivo detalhado da falha
- [x] Implementar swipe para navegar entre alterações do diff em mobile
- [x] Adicionar modo de tela cheia ao visualizador de diff
- [x] Testar, validar visualmente, sincronizar e salvar a nova versão
