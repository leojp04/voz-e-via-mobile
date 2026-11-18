// Config plugin do Expo: faz o build release do Android assinar com a chave PROPRIA do app.
//
// A pasta android/ e gerada pelo "expo prebuild" e fica fora do Git, entao editar o build.gradle
// a mao se perderia no proximo prebuild. Este plugin refaz a edicao toda vez que o prebuild roda.
//
// Nenhum segredo entra aqui: o caminho do keystore, o alias e as senhas ficam em
// ~/.gradle/gradle.properties (fora do repositorio) e o Gradle os le na hora do build.
// E um .js em CommonJS (e nao .ts) pelo mesmo motivo do hash-do-commit.js: o Expo so transpila o
// app.config.ts, entao um plugin em .ts nao e resolvido. Ver docs/adr/0006 e docs/adr/0012.

const MARCA = 'VOZEVIA_STORE_FILE';

const BLOCO_DA_CHAVE = `        release {
            storeFile file(findProperty('VOZEVIA_STORE_FILE') ?: 'chave-nao-configurada.jks')
            keyAlias findProperty('VOZEVIA_KEY_ALIAS')
            storePassword findProperty('VOZEVIA_STORE_PASSWORD')
            keyPassword findProperty('VOZEVIA_KEY_PASSWORD')
        }
`;

// Antes de montar um build release, confere as 4 propriedades. Sem isto o Gradle falharia com um
// erro obscuro do Android; e nunca assinamos com a chave de debug em silencio.
const CONFERENCIA = `    gradle.taskGraph.whenReady { grafo ->
        def montaRelease = grafo.allTasks.any { it.name.toLowerCase().contains('release') }
        def faltando = ['VOZEVIA_STORE_FILE', 'VOZEVIA_KEY_ALIAS', 'VOZEVIA_STORE_PASSWORD', 'VOZEVIA_KEY_PASSWORD']
            .findAll { !findProperty(it) }
        if (montaRelease && !faltando.isEmpty()) {
            throw new GradleException("Assinatura release do Voz e Via: faltam \${faltando.join(', ')} em ~/.gradle/gradle.properties")
        }
    }
`;

/**
 * Recebe o texto do android/app/build.gradle e devolve o texto com a assinatura release propria.
 * @param {string} gradle
 * @returns {string}
 */
function aplicarAssinaturaRelease(gradle) {
  if (gradle.includes(MARCA)) return gradle; // ja aplicado: idempotente

  const inicioTipos = gradle.indexOf('buildTypes {');
  const inicioRelease = gradle.indexOf('release {', inicioTipos);
  if (!/signingConfigs \{\n/.test(gradle) || inicioTipos === -1 || inicioRelease === -1) {
    throw new Error(
      'plugin assinatura-android: nao achei signingConfigs e o bloco release no build.gradle (o formato do Expo mudou?)',
    );
  }
  const trocado = gradle
    .slice(inicioRelease)
    .replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release');
  if (trocado === gradle.slice(inicioRelease)) {
    throw new Error(
      'plugin assinatura-android: o bloco release nao usa signingConfigs.debug como esperado',
    );
  }

  const antesDoRelease = gradle.slice(0, inicioRelease);
  return (antesDoRelease + trocado)
    .replace(/signingConfigs \{\n/, (m) => m + BLOCO_DA_CHAVE)
    .replace(/\n(\s*)buildTypes \{/, (m, espaco) => `\n${CONFERENCIA}${espaco}buildTypes {`);
}

/** @param {import('expo/config').ExpoConfig} config */
function withAssinaturaAndroid(config) {
  const { withAppBuildGradle } = require('expo/config-plugins');
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = aplicarAssinaturaRelease(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = withAssinaturaAndroid;
module.exports.aplicarAssinaturaRelease = aplicarAssinaturaRelease;
