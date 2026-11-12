# ADR 0005: Rotas protegidas com Stack.Protected

- **Status:** aceita
- **Data:** 11/11/2026

## Contexto

O PDF de Mobile pede autenticação real com rotas protegidas: quem não tem sessão não pode abrir as
telas internas, e quando a sessão acaba (logout ou token vencido) o app volta ao login. O Expo
Router permite fazer isso de duas formas.

## Decisão

Usar **`Stack.Protected`** no navegador raiz (`src/components/NavegadorRaiz.tsx`). Cada grupo de
rotas tem um `guard` (uma condição verdadeira ou falsa):

- `(app)`, as telas que exigem sessão: `guard` verdadeiro só com a sessão `autenticado`; se falso,
  redireciona para `/login`.
- `(auth)`, login e cadastro: `guard` verdadeiro só `anonimo`; se falso, redireciona para `/`.

Enquanto o app lê a sessão do cofre (`carregando`), o navegador nem é montado e o splash continua
na tela, para o login não piscar antes do início.

Para um 401 (token vencido) derrubar a sessão, a fábrica de APIs recebe a função `logout` por uma
"ponte" preenchida dentro do `AuthProvider` (`src/contexts/AppProviders.tsx`). Como o `guard` passa a
falso, o Router tira o usuário da tela sozinho e apaga o histórico dela.

## Alternativas

- **`<Redirect>` no layout de cada grupo:** funciona, mas a regra fica espalhada por vários
  arquivos, e é fácil esquecer de proteger um grupo novo. Também deixa a tela aparecer por um
  instante antes do redirecionamento.
- **Checar a sessão dentro de cada tela:** repete código em toda tela e uma tela nova esquecida
  fica aberta.

## Consequências

- A regra de acesso fica em **um único lugar** e é testada sem simulador (`NavegadorRaiz.test.tsx`).
- Cada grupo precisa de um `_layout.tsx`. Sem ele, a pasta não vira uma rota chamada `(app)` ou
  `(auth)` e o `Stack.Protected` não a encontra. Descobrimos isso quando os testes passavam sem
  proteger nada; por isso os testes foram conferidos desligando a proteção de propósito.
- A proteção vale só no app (cliente). Quem decide de verdade o que cada usuário pode fazer é a
  API, que valida o token em toda chamada.
