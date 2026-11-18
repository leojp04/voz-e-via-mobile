import { aplicarAssinaturaRelease } from './assinatura-android';

// Trecho do android/app/build.gradle que o prebuild do Expo gera (mesma forma do arquivo real).
const GRADLE_GERADO = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled true
        }
    }
}
`;

// Devolve só o bloco "release { ... }" de buildTypes, para conferir qual assinatura ele usa.
function blocoReleaseDeBuildTypes(gradle: string): string {
  const inicio = gradle.indexOf('buildTypes');
  const aPartirDali = gradle.slice(inicio);
  const posicao = aPartirDali.indexOf('release {');
  return aPartirDali.slice(posicao);
}

describe('aplicarAssinaturaRelease', () => {
  it('cria o signingConfigs.release lendo as 4 propriedades VOZEVIA_* do Gradle', () => {
    const saida = aplicarAssinaturaRelease(GRADLE_GERADO);

    expect(saida).toContain('VOZEVIA_STORE_FILE');
    expect(saida).toContain('VOZEVIA_KEY_ALIAS');
    expect(saida).toContain('VOZEVIA_STORE_PASSWORD');
    expect(saida).toContain('VOZEVIA_KEY_PASSWORD');
  });

  it('faz o build release assinar com a chave release, não mais com a de debug', () => {
    const saida = aplicarAssinaturaRelease(GRADLE_GERADO);

    expect(blocoReleaseDeBuildTypes(saida)).toContain('signingConfig signingConfigs.release');
    expect(blocoReleaseDeBuildTypes(saida)).not.toContain('signingConfig signingConfigs.debug');
  });

  it('mantém o build debug assinado com a chave de debug', () => {
    const saida = aplicarAssinaturaRelease(GRADLE_GERADO);

    expect(saida).toMatch(/debug \{\s+signingConfig signingConfigs\.debug/);
  });

  it('falha o build com mensagem clara quando falta alguma propriedade (nunca assina com debug em silêncio)', () => {
    const saida = aplicarAssinaturaRelease(GRADLE_GERADO);

    expect(saida).toContain('GradleException');
    expect(saida).toContain('~/.gradle/gradle.properties');
  });

  it('é idempotente: rodar duas vezes não duplica o bloco', () => {
    const uma = aplicarAssinaturaRelease(GRADLE_GERADO);
    const duas = aplicarAssinaturaRelease(uma);

    expect(duas).toBe(uma);
  });

  it('não grava nenhuma senha literal no arquivo gerado', () => {
    const saida = aplicarAssinaturaRelease(GRADLE_GERADO);
    const inicio = saida.indexOf('release {');
    const configRelease = saida.slice(inicio, saida.indexOf('}', inicio));

    expect(configRelease).toContain('storePassword');
    expect(configRelease).not.toMatch(/Password\s+['"][^'"]+['"]/);
  });

  it('lança erro se o build.gradle não tem o bloco release esperado (formato mudou)', () => {
    expect(() => aplicarAssinaturaRelease('android { }')).toThrow(/release/);
  });
});
