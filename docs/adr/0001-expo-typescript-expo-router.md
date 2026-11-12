# ADR 0001: Expo com TypeScript e Expo Router

- **Status:** aceita
- **Data:** 11/11/2026

## Contexto

O app precisa de no mínimo 6 telas com navegação, autenticação com rotas protegidas e publicação
no Firebase App Distribution. O PDF de Mobile da GS pede React Native com React Navigation ou
Expo Router, e avalia só o que foi visto nas aulas. O grupo tem pouco tempo (entrega em 19/11).

## Decisão

Usar **Expo** (fluxo gerenciado, SDK 58) com **TypeScript** e **Expo Router** para a navegação.

## Alternativas

- **React Native puro (CLI):** mais controle sobre o código nativo, mas exige Xcode e Android
  Studio configurados em toda máquina e perde tempo que não temos.
- **Expo com React Navigation:** também é aceito pelo PDF. O Expo Router é construído sobre ele
  e define as rotas pelos arquivos, o que deixa a proteção de rotas mais simples de explicar.
- **JavaScript em vez de TypeScript:** menos configuração, mas os tipos pegam erros de contrato
  com as APIs antes de rodar o app.

## Consequências

- Cada arquivo em `src/app/` vira uma rota; o código que não é rota fica fora dessa pasta.
- Reconhecimento de voz nativo não funciona no Expo Go: na etapa do assistente será preciso um
  _development build_.
- Os pacotes novos entram com `npx expo install`, para vir a versão compatível com o SDK.
