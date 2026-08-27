# Auditoria visual e de runtime — 27/08/2026

A tela preta foi associada ao estado HMR inválido observado no log: o componente exportava helpers além do componente React e o Vite registrava `Could not Fast Refresh`. Os helpers foram separados em `versionHistoryUtils.ts` e o servidor foi reiniciado. Após o reinício limpo, a rota `/` renderizou normalmente em desktop (1280×720) e mobile (375×812), sem áreas pretas ou sobreposição.

O layout mantém a identidade editorial de papel quente, carvão e cobre. No mobile, as métricas empilham corretamente e o CTA permanece visível. O diff extenso agora usa páginas de 120 blocos; anotações do preview são persistidas por usuário, livro e versão. A validação visual direta do histórico/modal ainda depende de uma sessão autenticada com manuscrito e versões disponíveis.

## Evidência de performance

O build otimizado passou a gerar chunks separados de React core (397 kB), ecossistema React (103 kB), aplicação (125 kB), dados (74 kB) e vendor (46 kB), eliminando o aviso de chunk acima de 500 kB. Os inputs de comparação e anotações usam `useMemo`, evitando referências novas e refetches desnecessários do tRPC durante a renderização. A suíte ficou em 23 testes aprovados.
