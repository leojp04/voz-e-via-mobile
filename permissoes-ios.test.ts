import appJson from './app.json';

// Regressão do crash no iPhone: o plugin da câmera/galeria com "microphonePermission: false"
// APAGA a chave NSMicrophoneUsageDescription que o plugin de voz coloca no Info.plist. Sem essa
// chave, o iOS encerra o app no instante em que o usuário toca no microfone.
// Aqui garantimos que nenhum plugin pede para remover o microfone e que a justificativa existe.

type Opcoes = Record<string, unknown>;

function opcoesDoPlugin(nome: string): Opcoes {
  const plugin = (appJson.expo.plugins as unknown[]).find(
    (p) => Array.isArray(p) && p[0] === nome,
  ) as [string, Opcoes] | undefined;
  if (!plugin) throw new Error(`plugin ${nome} não está no app.json`);
  return plugin[1];
}

describe('permissão de microfone no iOS (app.json)', () => {
  it('o plugin de voz declara a justificativa do microfone', () => {
    const { microphonePermission } = opcoesDoPlugin('expo-speech-recognition');
    expect(typeof microphonePermission).toBe('string');
    expect((microphonePermission as string).length).toBeGreaterThan(10);
  });

  it('nenhum outro plugin remove a permissão de microfone (false apaga a chave do Info.plist)', () => {
    const plugins = appJson.expo.plugins as unknown[];
    const removem = plugins
      .filter((p): p is [string, Opcoes] => Array.isArray(p) && typeof p[1] === 'object')
      .filter(([, opcoes]) => opcoes.microphonePermission === false)
      .map(([nome]) => nome);
    expect(removem).toEqual([]);
  });

  it('o plugin da câmera usa o mesmo texto do plugin de voz, para a ordem dos plugins não importar', () => {
    const voz = opcoesDoPlugin('expo-speech-recognition').microphonePermission;
    const camera = opcoesDoPlugin('expo-image-picker').microphonePermission;
    expect(camera).toBe(voz);
  });
});
