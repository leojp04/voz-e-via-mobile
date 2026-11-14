import { Platform } from 'react-native';

import { urlDoMapa } from './url-do-mapa';

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
