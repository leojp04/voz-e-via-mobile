# Voz & Via (app mobile)

App React Native do projeto **Voz & Via**, da Global Solution 2026/2 (CitizenTech, FIAP). Ele é
voltado a pessoas idosas e pessoas com deficiência e reúne duas partes, cada uma com a sua API:

- **Assistente por voz** (API Java): a pessoa fala, uma IA entende a intenção e o app executa a
  ação depois de uma confirmação (reportar um problema, pedir ajuda, ligar para um contato,
  tirar uma dúvida sobre direitos).
- **Zeladoria de acessibilidade** (API .NET): o cidadão reporta barreiras na rua (calçada
  quebrada, rampa ausente, buraco) com foto e localização e acompanha o andamento.

> **Status:** em construção. Hoje o app tem login, cadastro, início, política de privacidade, a
> tela "Sobre o app" (versão e **hash do commit** gravado no build,
> [ADR 0006](docs/adr/0006-hash-do-commit-em-app-config.md)) e o fluxo de **reportes**: novo
> reporte com foto e localização, lista "Meus reportes", detalhe, edição e cancelamento, e os
> **perfil de emergência** (criar e editar; condições de saúde, medicamentos e mobilidade são
> opcionais) com os **contatos de emergência** (lista, criar, editar e excluir, até 10). A tela do **assistente por voz**
> existe (fala e leitura da resposta, [ADR 0010](docs/adr/0010-voz-expo-speech-e-reconhecimento.md))
> e precisa de _development build_. O convite de cuidador e os alertas entram nas próximas etapas.
>
> **Integração:** a API .NET (reportes) já foi testada de verdade no simulador, com login de
> teste. A API Java (login, cadastro, perfil e contatos de emergência, exclusão de conta,
> assistente) também: em 16/11/2026 o fluxo perfil, contatos e exclusão de conta foi conferido no
> simulador contra o Java local. Sem `.env`, ou com `EXPO_PUBLIC_USE_FAKE_API=true`, o app usa a
> API falsa em memória.

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

A voz usa um módulo nativo e **não funciona no Expo Go**: lá a tela do assistente avisa
"Voz indisponível" e deixa digitar. Para testar a voz, gere um _development build_ com
`npx expo run:ios` ou `npx expo run:android`.

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
| `npm test`             | Roda os testes automáticos com o Jest          |

Antes de cada commit: `npm run lint`, `npm run format:check`, `npm run typecheck` e `npm test`
devem passar.

## Variáveis de ambiente

Veja o [`.env.example`](.env.example). As variáveis `EXPO_PUBLIC_*` ficam dentro do app
instalado e podem ser lidas por qualquer pessoa, por isso **não guardam segredo**. O arquivo
`.env` real não vai para o Git.

## Suposições sobre as APIs

Enquanto as APIs reais não confirmam, o app assume o seguinte (o detalhe de cada ponto está no
plano único, seções 8.1 e 8.2). Se a API divergir, a tela quebra só na integração, então
convém confirmar antes:

- **Contatos (API Java):** prioridade é um inteiro de 1 a 10 (não 1 a 5), sendo 1 quem chamar
  primeiro; no máximo 10 contatos por perfil (o 11º dá 409). O cidadão cria o próprio perfil de
  emergência (`POST /api/v1/perfis-emergencia`); `mobilidade` é opcional e, sem escolha, vai como
  `NAO_INFORMADO`. Sem perfil, `GET /perfis-emergencia/meu` dá 404 e o app oferece criá-lo.
- **Exclusão de conta (APIs .NET e Java):** o app chama, nesta ordem e com o mesmo token,
  `DELETE /api/usuarios/eu` (.NET: apaga reportes, histórico, fotos e cadastro; depois disso o token
  dá 401 lá) e `DELETE /api/v1/auth/eu` (Java: apaga conta, perfil, contatos, socorros, avisos e
  histórico de voz). Um 401 do .NET é tratado como "já excluída", para a pessoa poder tentar de novo
  se o Java falhar; se só o Java falhar, a tela avisa que os reportes já foram apagados. Cancelar um
  reporte só muda o status para CANCELADO: o registro continua até a conta ser excluída. A política
  de privacidade do app diz isso. Ver [ADR 0011](docs/adr/0011-exclusao-de-conta-em-duas-apis.md).
- **Reportes (API .NET, já conferido na API real):** a porta padrão é 5080; o `POST` recebe o
  **código** da categoria (ex.: `RAMPA`); a foto sobe antes, em `POST /api/fotos`, e a API devolve
  só o caminho (`/uploads/...`); o `PUT` **substitui** descrição, endereço e foto, então o app
  reenvia os valores atuais ao editar só um deles.
- **Páginas:** o app conta a partir de 1. A API Java (Spring) conta a partir de 0, e o app
  converte só no adaptador real. A API .NET deve contar a partir de 1.
- **Formato das listas:** `{ itens, pagina, tamanho, total }`. O `Page` padrão do Spring usa
  outros nomes (`content`, `number`, `size`, `totalElements`), então a API Java precisa de um
  DTO próprio ou o adaptador do app muda.
- **Telefone:** o app envia com máscara e a API guarda só os dígitos (DDD mais 8 ou 9 números).

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
5. [Rotas protegidas com Stack.Protected](docs/adr/0005-rotas-protegidas-com-stack-protected.md)
6. [Hash do commit em app.config](docs/adr/0006-hash-do-commit-em-app-config.md)
7. [Identidade visual](docs/adr/0007-identidade-visual.md)
8. [Contrato de reportes e foto](docs/adr/0008-contrato-de-reportes-e-foto.md)
9. [Câmera e localização](docs/adr/0009-camera-e-localizacao.md)
10. [Voz com expo-speech e expo-speech-recognition](docs/adr/0010-voz-expo-speech-e-reconhecimento.md)
11. [Exclusão de conta em duas APIs](docs/adr/0011-exclusao-de-conta-em-duas-apis.md)

## Acessibilidade e privacidade

O app é para pessoas com mais dificuldade de uso, então a acessibilidade faz parte do projeto:
rótulos em todos os botões, áreas de toque de pelo menos 48 dp, alto contraste e respeito ao
tamanho de fonte do sistema. O áudio da voz não sai do celular (só o texto é enviado). Nesta
etapa os usuários são apenas contas de teste.

### Leitor de tela (VoiceOver no iPhone)

Testado no iPhone com o VoiceOver ligado. Dois cuidados do app, e um requisito do aparelho:

- **Idioma:** todo elemento diz ao iOS que o texto está em português (`accessibilityLanguage`
  `pt-BR`). Sem isso, um iPhone em inglês lê o app com sotaque estrangeiro.
- **Erros:** o iOS não lê sozinho uma mensagem que aparece na tela (`accessibilityLiveRegion`
  só vale no Android). Por isso o app anuncia erros e avisos por conta própria, na fila do
  VoiceOver e meio segundo depois. Sem essa espera, o aviso se perdia quando o VoiceOver ainda
  estava falando o nome do botão tocado.
- **Requisito do aparelho:** é preciso ter uma **voz em português baixada** em Ajustes →
  Acessibilidade → VoiceOver → Fala → Voz. Sem ela o iOS usa a voz do idioma do aparelho,
  mesmo com o app avisando que o texto é em português.

Limite conhecido: a resposta do assistente não é anunciada pelo VoiceOver, porque já é falada
pela opção "Ler sempre a resposta em voz alta" e as duas vozes se atropelariam.

## Créditos e licenças

O app usa só bibliotecas de código aberto. As 25 dependências diretas de execução (as que vão
dentro do app) são **MIT**, conferidas no campo `license` do `package.json` de cada pacote
instalado (versões do `package.json` do projeto, conferência de 15/11/2026). A licença MIT exige
manter o aviso de copyright e o texto da licença: o texto completo de cada pacote está em
`node_modules/<pacote>/LICENSE`.

| Pacotes                                                                                                                                                          | Para que serve                                        | Licença                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `expo`, `expo-constants`, `expo-font`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`                                                 | Base do app Expo                                      | MIT                                |
| `expo-router`                                                                                                                                                    | Navegação entre telas                                 | MIT                                |
| `expo-secure-store`                                                                                                                                              | Guardar a sessão (token) no cofre do aparelho         | MIT                                |
| `expo-image-picker`                                                                                                                                              | Câmera e galeria (foto do reporte)                    | MIT                                |
| `expo-location`                                                                                                                                                  | Localização (GPS do reporte)                          | MIT                                |
| `expo-file-system`                                                                                                                                               | Envio da foto (arquivo como `File`)                   | MIT                                |
| `expo-speech`                                                                                                                                                    | Leitura da resposta em voz alta                       | MIT                                |
| `expo-speech-recognition` (de terceiros, não é do Expo)                                                                                                          | Reconhecimento de fala                                | MIT                                |
| `react`, `react-dom`, `react-native`                                                                                                                             | Base do app (Meta)                                    | MIT                                |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-screens`, `react-native-safe-area-context`, `react-native-web` | Gestos, animações, telas nativas, áreas seguras e web | MIT                                |
| `@expo/vector-icons`                                                                                                                                             | Ícones Ionicons (Ionic, MIT)                          | MIT                                |
| `@expo-google-fonts/atkinson-hyperlegible`                                                                                                                       | Fonte Atkinson Hyperlegible (Braille Institute)       | MIT (pacote) e SIL OFL 1.1 (fonte) |

**Ferramentas de desenvolvimento** (não vão dentro do app): `eslint`, `eslint-config-expo`,
`eslint-config-prettier`, `prettier`, `jest`, `jest-expo`, `@testing-library/react-native`,
`@types/jest` e `@types/react` são MIT. O **`typescript` é Apache-2.0** (não é MIT).

**O que não foi conferido:** as licenças das dependências indiretas (as que as bibliotecas acima
trazem junto). Para isso seria preciso uma ferramenta própria, como o `license-checker`.

### Conteúdo e dados de terceiros

- **Fonte Atkinson Hyperlegible**: Braille Institute, licença SIL OFL 1.1 (texto em
  `node_modules/@expo-google-fonts/atkinson-hyperlegible/LICENSE_FONT`).
- **Locais de atendimento (assistente por voz)**: os dados vêm da API Java e são do
  **OpenStreetMap** (© Colaboradores do OpenStreetMap), licença **ODbL** (Open Database License).
  A licença exige dar o crédito: o app mostra "© Colaboradores do OpenStreetMap (ODbL)" na tela do
  assistente, sempre junto da lista, com o texto que a própria API devolve (`creditoDados`).
  Mais em <https://www.openstreetmap.org/copyright>.
- **Logo e ícone do app**: desenho próprio do projeto (`assets/images/voz-e-via.svg`).

## Integrantes do grupo

| Nome                          | RM       |
| ----------------------------- | -------- |
| Fabrício Henrique Pereira     | RM563237 |
| Henrique Sinkevicius Maran    | RM562977 |
| Leonardo José Pereira         | RM563065 |
| Miguel Henrique Oliveira Dias | RM565492 |
| Pedro Henrique de Oliveira    | RM562312 |

## Entrega

- Vídeo (até 5 min): _link a preencher_
- Publicação no Firebase App Distribution: _a preencher_
- Tela "Sobre o App" com o hash do commit: disponível em Início → Sobre o app
