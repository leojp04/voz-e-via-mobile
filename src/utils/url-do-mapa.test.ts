import { Alert, Linking, Platform } from 'react-native';

import { abrirNoMapa, urlDoMapa } from './url-do-mapa';

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
