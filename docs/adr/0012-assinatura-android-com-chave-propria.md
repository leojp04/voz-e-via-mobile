# ADR 0012: assinatura do APK com chave própria, fora do Git

- **Status:** aceita
- **Data:** 18/11/2026

## Contexto

Todo APK Android precisa de uma **assinatura digital** (feita com uma chave guardada num arquivo
`.jks`, o "keystore"). O Android e o Firebase App Distribution só aceitam **atualizar** um app se o
APK novo tiver a mesma assinatura do instalado. Até aqui o build release saía assinado com a chave de
**debug**, que o Expo gera igual para qualquer projeto e é pública. Para distribuir ao professor, o app
precisa de uma chave só nossa.

Dois fatos pesam no desenho:

- A pasta `android/` é **gerada** pelo `expo prebuild` e fica fora do Git. Uma edição à mão no
  `android/app/build.gradle` some no próximo `prebuild --clean`.
- Chave e senhas **não podem** ir para o Git (regra do projeto: nenhum segredo no repositório).

## Decisão

1. A chave fica em `~/.android-keys/voz-e-via/vozevia-release.jks` (fora do repositório, permissão
   600). Caminho, alias e as duas senhas ficam em `~/.gradle/gradle.properties`, nas propriedades
   `VOZEVIA_STORE_FILE`, `VOZEVIA_KEY_ALIAS`, `VOZEVIA_STORE_PASSWORD` e `VOZEVIA_KEY_PASSWORD`.
2. Um **config plugin** versionado, `plugins/assinatura-android.js`, edita o `build.gradle` a cada
   prebuild: cria o `signingConfigs.release` lendo essas propriedades e faz o build release usá-lo.
   Nenhum valor secreto entra no arquivo gerado.
3. **Falha fechada:** se faltar qualquer propriedade ao montar um build release, o Gradle para com a
   mensagem "faltam ... em ~/.gradle/gradle.properties". O app nunca é assinado com a chave de debug
   sem ninguém perceber. Builds de debug não são afetados.
4. O plugin é `.js` em CommonJS, pelo mesmo motivo do `hash-do-commit.js` (ADR 0006): o Expo só
   transpila o `app.config.ts`. O teste, em TypeScript, fica em `plugins/assinatura-android.test.ts`.

## Alternativas descartadas

- **Editar o `build.gradle` à mão:** perdido a cada `prebuild --clean`; risco de gerar o APK final com
  a chave de debug.
- **Script de pós-prebuild:** funciona, mas é frágil e precisa ser lembrado; o plugin roda sozinho.

## Consequências

- **Perder o `.jks` ou as senhas obriga os testers a desinstalar e reinstalar o app** (a assinatura
  mudaria). Por isso convém guardar uma cópia de segurança fora do Mac.
- Quem clonar o repositório não consegue gerar o APK release sem criar a própria chave e preencher as
  quatro propriedades. É proposital: a chave é do dono do app.
- O `prebuild --clean` também apaga `android/local.properties` (caminho do SDK); o build precisa de
  `ANDROID_HOME` definido.
