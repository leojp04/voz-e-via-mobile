// Sem os textos de permissao no app.json, o iOS FECHA o app na hora em que ele tenta usar a
// camera ou o GPS (e a loja recusa o app). Este teste protege contra esse esquecimento.

import appJson from '../../app.json';

type Plugin = string | [string, Record<string, unknown>];

function configDoPlugin(nome: string): Record<string, unknown> | undefined {
  const plugins = appJson.expo.plugins as Plugin[];
  const achado = plugins.find((p) => (Array.isArray(p) ? p[0] : p) === nome);
  return Array.isArray(achado) ? achado[1] : undefined;
}

describe('permissoes declaradas no app.json', () => {
  it('a camera tem um texto de permissao em portugues que explica o uso', () => {
    const config = configDoPlugin('expo-image-picker');
    expect(config?.cameraPermission).toEqual(expect.stringContaining('câmera'));
    expect(config?.cameraPermission).toEqual(expect.stringContaining('reporte'));
  });

  it('a galeria tem um texto de permissao em portugues', () => {
    const config = configDoPlugin('expo-image-picker');
    expect(config?.photosPermission).toEqual(expect.stringContaining('fotos'));
  });

  it('o app nao pede o microfone no picker (nao usa video nem audio nesta tela)', () => {
    expect(configDoPlugin('expo-image-picker')?.microphonePermission).toBe(false);
  });

  it('a localizacao e pedida so com o app em uso, com texto em portugues', () => {
    const config = configDoPlugin('expo-location');
    expect(config?.locationWhenInUsePermission).toEqual(expect.stringContaining('localização'));
    // Nunca em segundo plano: a Privacidade promete ler o local so ao enviar um reporte.
    expect(config?.isIosBackgroundLocationEnabled).not.toBe(true);
    expect(config?.isAndroidBackgroundLocationEnabled).not.toBe(true);
  });

  it('o microfone e o reconhecimento de fala tem texto em portugues que explica o uso', () => {
    const config = configDoPlugin('expo-speech-recognition');
    expect(config?.microphonePermission).toEqual(expect.stringContaining('microfone'));
    expect(config?.speechRecognitionPermission).toEqual(expect.stringContaining('assistente'));
  });
});
