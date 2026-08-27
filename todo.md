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
- [ ] Publicar o projeto no repositório GitHub JoaoSantosCodes/BookRevise

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
