# ADR 0003: Token guardado no SecureStore

- **Status:** aceita
- **Data:** 11/11/2026

## Contexto

O login na API Java devolve um JWT (texto assinado que prova quem é o usuário). O app guarda esse
token para continuar logado e o envia nas duas APIs. Quem tem o token age como o usuário, então
ele é um segredo. O PDF avalia "clareza e segurança mínima" na autenticação e exige que o logout
limpe a sessão.

## Decisão

Guardar o token com o **`expo-secure-store`**, que usa o Keychain (iOS) e o Keystore (Android).
O logout apaga o token e o app volta para a tela de login.

## Alternativas

- **AsyncStorage:** simples, mas grava em texto puro no aparelho. Serve para preferências, não
  para segredos.
- **Guardar só em memória:** mais seguro, porém o usuário precisaria entrar de novo toda vez que
  abrisse o app, o que é ruim para pessoas idosas.

## Consequências

- O token fica protegido pelo sistema do aparelho.
- A sessão é restaurada ao abrir o app; se o token venceu ou for recusado (401), o app volta ao
  login.
- Variáveis `EXPO_PUBLIC_*` nunca guardam segredo, pois ficam dentro do app instalado.
