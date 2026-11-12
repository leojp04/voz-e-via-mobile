# ADR 0006: Hash do commit gravado no build pelo app.config.ts

- **Status:** aceita
- **Data:** 12/11/2026

## Contexto

O PDF de Mobile exige uma tela "Sobre o App" com o hash do commit de referência, e a versão
publicada no Firebase App Distribution precisa corresponder exatamente ao código-fonte enviado.
Portanto o hash tem de ser descoberto **no momento do build** e viajar dentro do app, e não digitado
à mão (um número digitado envelhece no primeiro commit novo).

## Decisão

- `app.config.ts` (configuração dinâmica do Expo) recebe o conteúdo do `app.json`, roda
  `git rev-parse --short HEAD` e grava o resultado em `extra.commitHash`.
- Se a árvore tiver alterações não commitadas, o hash ganha o sufixo `-sujo`; sem Git, vale
  `desconhecido`. Assim a tela nunca afirma uma correspondência que não existe.
- A tela (`TelaSobre`) lê o valor com `expo-constants`, que já estava instalado: nenhuma biblioteca
  nova.
- A lógica do hash fica em `hash-do-commit.js`, um arquivo **JavaScript na raiz**, com o `git`
  injetado como função para o teste (`hash-do-commit.test.ts`) não depender do Git.

## Por que .js e não .ts

Primeiro a lógica estava em `src/utils/hash-do-commit.ts`. Os testes passavam, mas ao iniciar o
Expo o app quebrou com `Cannot find module`: o Expo transpila **somente** o `app.config.ts`, e o
`require` de outro `.ts` não é resolvido. Um `.js` em CommonJS é carregado pelo Node sem
transpilação e continua tipado por JSDoc (o `allowJs` já vem ligado no `tsconfig`).
Lição: testes de unidade não provam que o arquivo carrega no ambiente real; é preciso subir o Expo.

## Alternativas

- **Hash escrito à mão em um arquivo:** desatualiza sozinho e é fácil esquecer antes do build.
- **Script de pré-build que gera um arquivo:** outro arquivo gerado para ignorar no Git e mais uma
  etapa que pode ser esquecida; a config dinâmica já roda em todo build.
- **Importar o `.ts` com a extensão explícita:** depende do suporte do Node a TypeScript, que muda
  entre versões; o `.js` funciona em qualquer uma.
- **Biblioteca de informações de build:** peso e justificativa a mais para um único texto.

## Consequências

- O hash vale para o app construído, mesmo que alguém mude o código depois.
- Para a entrega no Firebase, o build deve sair de uma árvore limpa, sem `-sujo`, no commit
  entregue.
- `tsconfig.json` passou a liberar os tipos do Node (`types: ["jest", "node"]`) para tipar o
  `app.config.ts`. O pacote `@types/node` já estava instalado como dependência de outras
  ferramentas.
