# ADR 0010: voz com expo-speech e expo-speech-recognition

- **Status:** aceita
- **Data:** 14/11/2026

## Contexto

A voz é o centro do Voz & Via: a pessoa fala com o assistente e ouve a resposta (plano único,
decisão D7: "a fala vira texto no celular e a API recebe só texto"). O público inclui pessoas
idosas e com deficiência. A rubrica desconta biblioteca desnecessária, então cada pacote novo
precisa de justificativa. O Expo não tem biblioteca oficial para reconhecer fala, só para falar.

## Decisão

1. **`expo-speech`** (MIT, oficial do Expo) para ler a resposta em voz alta, em `pt-BR`. A voz é
   do próprio aparelho: o texto não sai do celular.
2. **`expo-speech-recognition`** (MIT, versão 58.0.1, acompanha o SDK 58) para transformar a fala
   em texto, em `pt-BR`.
3. **Camada fina em `src/services/voz/`**, no mesmo molde de `services/aparelho`:
   `falar.ts` (ler a resposta), `reconhecimento.ts` (escutar) e o hook `use-escuta-de-voz.ts`
   (estado da escuta para as telas). As telas não falam com as bibliotecas; isso as deixa
   testáveis com `jest.mock`.
4. **Reconhecimento: local primeiro, sistema só com aviso.** Se o aparelho reconhece fala sem
   internet, usamos sempre o modo local (`requiresOnDeviceRecognition: true`) e o áudio não sai do
   celular. Se não reconhece mas o sistema tem reconhecedor, o serviço lança
   `CONSENTIMENTO_NECESSARIO` e a tela mostra um aviso ("o serviço de fala da Apple ou do Google
   pode processar o seu áudio; o Voz & Via só recebe o texto"). Só depois do "Entendi, usar a voz"
   o reconhecedor do sistema é usado. O aceite vale só enquanto o app está aberto e não é gravado.
   Sem nenhum reconhecedor, a pessoa digita.
5. **A fala só preenche o campo.** Quem toca em "Enviar" é a pessoa, depois de conferir o texto.
   Executar uma ação continua exigindo o toque em "Sim, confirmar" (regra de segurança do plano).
6. **Leitura da resposta configurável.** O interruptor "Ler sempre a resposta em voz alta" começa
   ligado. Desligado, só a resposta a uma pergunta falada é lida. "Ouvir de novo" existe nos dois
   casos. A leitura para ao cancelar, confirmar, mexer no texto, abrir o microfone ou sair da tela.
7. **O módulo nativo é opcional em tempo de execução.** `reconhecimento.ts` pergunta, com
   `requireOptionalNativeModule` do `expo`, se o nativo existe **antes** de carregar a biblioteca.
   Só o `try/catch` não basta: em desenvolvimento o Metro trata um módulo que lança erro ao
   carregar como erro fatal e abre a tela vermelha, mesmo com o erro capturado (descoberto no
   simulador, no Expo Go). Sem o nativo, a tela mostra "Voz indisponível neste aparelho. Digite o
   que você precisa." e o texto continua funcionando.
8. **Textos de permissão em português no `app.json`** (microfone e reconhecimento de fala),
   protegidos por teste: sem eles o iOS fecha o app ao pedir a permissão.
9. **A Política de Privacidade foi atualizada** para dizer a verdade: o áudio fica no celular
   quando o aparelho consegue; senão o app avisa antes e o sistema (Apple ou Google) pode
   processar a fala. Nós nunca recebemos nem guardamos o áudio.

## Alternativas

- **`@react-native-voice/voice`:** descartada. Sem config plugin para Expo (mais atrito com o
  prebuild) e sem atualização desde janeiro de 2026. A `expo-speech-recognition` tem plugin e
  versões por SDK.
- **Só reconhecimento local, sem nunca usar o sistema:** protege mais a privacidade, mas deixa sem
  voz quem tem um celular sem modelo local de pt-BR, justamente o público do projeto. Ficou como
  segunda opção, com aviso.
- **Enviar o áudio para a API (Java) e reconhecer lá:** descartada pelo D7: o áudio sairia do
  celular, o tráfego seria maior e exigiria guardar ou descartar áudio no servidor.

## Consequências

- A voz exige **development build** (módulo nativo): não funciona no Expo Go, onde o app abre com
  "Voz indisponível" e usa só o texto.
- **Build no iPhone sem conta paga da Apple:** é possível instalar em um aparelho próprio pelo
  Xcode com Apple ID gratuito, mas o app expira em 7 dias e não dá para distribuir por Firebase App
  Distribution nem TestFlight. A entrega ao professor precisa de outro caminho (decisão em aberto).
- O D7 não diz se o reconhecimento "no celular" é estritamente local ou o reconhecedor padrão do
  sistema. A leitura adotada aqui ("local primeiro, sistema com aviso") deve ser levada ao grupo. O
  plano único (seção de privacidade) ainda diz "áudio não sai do celular" e precisa ser revisto.
- **Não verificado em aparelho:** se o iPhone tem modelo local de pt-BR, a qualidade do
  reconhecimento, o comportamento do aviso e do VoiceOver. Só o development build no celular real
  responde (passo 5 do plano).
- Crédito e licença das duas bibliotecas (MIT) entram no README.

## Atualização de 18/11/2026: Android e o pacote pt-BR

- **Achado no emulador (Android 17):** `supportsOnDeviceRecognition()` respondeu que sim, mas o
  pacote de voz em português do Google **não estava baixado**, e o reconhecimento falhou com
  `language-not-supported` (código 13). A pessoa só via "Não consegui ouvir você". O mesmo pode
  acontecer no celular de quem testar o app.
- **Decisão:** no Android, o modelo local só conta como pronto se o pacote **pt-BR** estiver
  instalado (`getSupportedLocales().installedLocales`; aceita `pt-BR`, `pt_BR` e `pt-br`, e não
  aceita `pt-PT`). Se o pacote faltar, se a consulta falhar ou vier vazia (Android 12 ou menor), vale
  o item 4: `CONSENTIMENTO_NECESSARIO`, aviso, e só depois do "Entendi, usar a voz" se usa o
  reconhecedor do sistema. Falha para o lado seguro: no pior caso o app pergunta sem precisar, e
  nunca liga o microfone num caminho que vai falhar nem envia áudio ao Google sem aceite. No iOS nada
  muda (a consulta de idiomas só existe no Android).
- **Texto do aviso:** passou a dizer "Este aparelho não reconhece a sua voz em português sem
  internet", que vale tanto para quem não tem voz offline quanto para quem não tem o pacote.
- **Alternativa descartada, por ora:** baixar o pacote offline pelo próprio app
  (`androidTriggerOfflineModelDownload`). Manteria o áudio só no aparelho, mas exige um fluxo e um
  download novos. Fica como melhoria futura.
- **Verificado:** testes automáticos (pacote ausente, presente, variações de escrita, consulta que
  falha, iOS sem consulta). No emulador: o aviso aparece, nenhum reconhecimento começa antes do
  aceite, e depois do aceite o app passa a "Ouvindo…".
- **Não verificado:** a fala reconhecida de verdade no Android (o emulador não tem microfone real).
  No iPhone 14 Pro Max, em 17/11/2026, falar com o assistente e o "Ouvir de novo" funcionaram; não
  sabemos se o reconhecimento ali foi local ou pelo sistema.
