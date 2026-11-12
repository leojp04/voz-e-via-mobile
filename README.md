# Voz & Via (app mobile)

App React Native do projeto **Voz & Via**, da Global Solution 2026/2 (CitizenTech, FIAP). Ele é
voltado a pessoas idosas e pessoas com deficiência e reúne duas partes, cada uma com a sua API:

- **Assistente por voz** (API Java): a pessoa fala, uma IA entende a intenção e o app executa a
  ação depois de uma confirmação (reportar um problema, pedir ajuda, ligar para um contato,
  tirar uma dúvida sobre direitos).
- **Zeladoria de acessibilidade** (API .NET): o cidadão reporta barreiras na rua (calçada
  quebrada, rampa ausente, buraco) com foto e localização e acompanha o andamento.

> **Status:** em construção. Hoje o app tem login, cadastro, início, política de privacidade e a
> tela "Sobre o app", que mostra a versão e o **hash do commit** gravado no build
> ([ADR 0006](docs/adr/0006-hash-do-commit-em-app-config.md)). As telas de reportes, assistente por
> voz e contatos entram nas próximas etapas.

## Requisitos

- Node.js 22.13 ou mais novo (testado com o Node 26)
- npm
- Simulador iOS (Xcode), emulador Android ou o app Expo Go no celular

## Como rodar

```bash
npm install
cp .env.example .env     # ajuste as URLs das APIs, se precisar
npx expo start
```

Na saída do comando, escolha `i` (simulador iOS), `a` (emulador Android) ou leia o QR code com o
Expo Go.

Enquanto as APIs não estiverem no ar, deixe `EXPO_PUBLIC_USE_FAKE_API=true` no `.env`: o app usa
uma API falsa em memória. Na entrega, o app usa apenas as APIs reais (ver
[ADR 0004](docs/adr/0004-api-falsa-temporaria.md)).

## Scripts

| Comando                | O que faz                                      |
| ---------------------- | ---------------------------------------------- |
| `npm start`            | Abre o servidor de desenvolvimento do Expo     |
| `npm run lint`         | Procura erros e más práticas com o ESLint      |
| `npm run format`       | Formata o código com o Prettier                |
| `npm run format:check` | Só confere a formatação, sem alterar nada      |
| `npm run typecheck`    | Confere os tipos do TypeScript, sem gerar nada |

Antes de cada commit: `npm run lint`, `npm run format:check` e `npm run typecheck` devem passar.

## Variáveis de ambiente

Veja o [`.env.example`](.env.example). As variáveis `EXPO_PUBLIC_*` ficam dentro do app
instalado e podem ser lidas por qualquer pessoa, por isso **não guardam segredo**. O arquivo
`.env` real não vai para o Git.

## Estrutura de pastas (alvo)

```text
src/
  app/          rotas (Expo Router): cada arquivo é uma tela
  screens/      conteúdo de cada tela
  components/   botões grandes, cartões e campos acessíveis
  services/     acesso às APIs (cliente HTTP, token, erros)
  contexts/     sessão do usuário (token, login, logout)
  hooks/        hooks reutilizáveis
  theme/        cores, fontes e espaçamentos
  utils/        funções puras (validações etc.)
assets/         fontes e imagens
docs/adr/       decisões técnicas e o motivo de cada uma
```

As pastas são criadas conforme o código chega. Pasta vazia não vai para o Git.

## Decisões técnicas

Cada escolha importante tem um registro curto (ADR) com o contexto, a decisão, as alternativas
e as consequências:

1. [Expo com TypeScript e Expo Router](docs/adr/0001-expo-typescript-expo-router.md)
2. [`fetch` em vez de Axios](docs/adr/0002-fetch-sem-axios.md)
3. [Token guardado no SecureStore](docs/adr/0003-token-no-securestore.md)
4. [API falsa temporária no desenvolvimento](docs/adr/0004-api-falsa-temporaria.md)

## Acessibilidade e privacidade

O app é para pessoas com mais dificuldade de uso, então a acessibilidade faz parte do projeto:
rótulos em todos os botões, áreas de toque de pelo menos 48 dp, alto contraste e respeito ao
tamanho de fonte do sistema. O áudio da voz não sai do celular (só o texto é enviado). Nesta
etapa os usuários são apenas contas de teste.

## Entrega

- Vídeo (até 5 min): _link a preencher_
- Publicação no Firebase App Distribution: _a preencher_
- Tela "Sobre o App" com o hash do commit: _ainda não implementada_
