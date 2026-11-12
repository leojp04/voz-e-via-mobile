# ADR 0002: `fetch` em vez de Axios

- **Status:** aceita
- **Data:** 11/11/2026

## Contexto

O app chama duas APIs (Java e .NET), precisa mandar o token em toda requisição, tratar o erro 401
e mostrar feedback visual quando algo falha. O PDF aceita Axios ou Fetch e desconta pontos por
bibliotecas "sem justificativa clara".

## Decisão

Usar o **`fetch`**, que já vem no React Native, dentro de um pequeno cliente HTTP em
`src/services/` que acrescenta o token, converte a resposta e padroniza os erros.

## Alternativas

- **Axios:** traz interceptadores e cancelamento prontos, mas é uma dependência a mais para um
  uso que cabe em poucas linhas.

## Consequências

- Uma biblioteca a menos para manter e justificar.
- O tratamento de erro (401, falha de rede, formato de erro das APIs) fica numa função só, que
  será testada.
- Se o cliente HTTP crescer demais, a troca por Axios é simples, porque as telas só conhecem
  esse cliente.
