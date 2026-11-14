import { Alert, Linking, Platform } from 'react-native';

import { abrirBuscaNoMapa, abrirNoMapa, urlDeBuscaNoMapa, urlDoMapa } from './url-do-mapa';

describe('abrirNoMapa', () => {
  afterEach(() => jest.restoreAllMocks());

  it('abre o app de mapas no ponto', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    abrirNoMapa(-23.5505, -46.6333);
    expect(abrir).toHaveBeenCalledWith(urlDoMapa(-23.5505, -46.6333));
  });

  it('se nao houver app de mapas, avisa em vez de falhar calado', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem app'));
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    abrirNoMapa(-23.5505, -46.6333);
    await Promise.resolve();

    expect(alerta).toHaveBeenCalledWith(
      'Não foi possível abrir o mapa',
      'Seu aparelho não tem um aplicativo de mapas disponível.',
    );
  });
});

describe('urlDoMapa', () => {
  it('no iOS abre o Apple Maps no ponto, com o nome "Local do reporte"', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(urlDoMapa(-23.5505, -46.6333)).toBe(
      'https://maps.apple.com/?ll=-23.5505,-46.6333&q=Local%20do%20reporte',
    );
  });

  it('no Android usa o esquema geo:, que abre o app de mapas escolhido pela pessoa', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(urlDoMapa(-23.5505, -46.6333)).toBe(
      'geo:-23.5505,-46.6333?q=-23.5505,-46.6333(Local%20do%20reporte)',
    );
  });
});

describe('urlDeBuscaNoMapa', () => {
  const PONTO = { latitude: -23.5505, longitude: -46.6333 };

  it('no iOS busca o termo perto do ponto, com acento codificado', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(urlDeBuscaNoMapa('farmácia', PONTO)).toBe(
      'https://maps.apple.com/?q=farm%C3%A1cia&ll=-23.5505,-46.6333',
    );
  });

  it('no iOS, sem ponto, busca so o termo', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(urlDeBuscaNoMapa('posto de saúde')).toBe(
      'https://maps.apple.com/?q=posto%20de%20sa%C3%BAde',
    );
  });

  it('no Android usa geo: com o ponto e a busca', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(urlDeBuscaNoMapa('farmácia', PONTO)).toBe('geo:-23.5505,-46.6333?q=farm%C3%A1cia');
  });

  it('no Android, sem ponto, usa geo:0,0 (o app de mapas usa o local do aparelho)', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(urlDeBuscaNoMapa('farmácia')).toBe('geo:0,0?q=farm%C3%A1cia');
  });
});

describe('abrirBuscaNoMapa', () => {
  afterEach(() => jest.restoreAllMocks());

  it('abre o app de mapas com a busca', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    abrirBuscaNoMapa('mercado');
    expect(abrir).toHaveBeenCalledWith('geo:0,0?q=mercado');
  });

  it('sem app de mapas, avisa em vez de falhar calado', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem app'));
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    abrirBuscaNoMapa('mercado');
    await Promise.resolve();
    expect(alerta).toHaveBeenCalledWith(
      'Não foi possível abrir o mapa',
      'Seu aparelho não tem um aplicativo de mapas disponível.',
    );
  });
});
