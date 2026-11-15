// Endereco que abre o app de mapas do aparelho num ponto (botao "Ver no mapa"). O app nao embute
// mapa (docs/adr/0009): entrega a pessoa ao app de mapas que ela ja conhece.
//  - iOS: link do Apple Maps.
//  - Android: esquema "geo:", que abre o app de mapas que a pessoa escolheu como padrao.

import { Alert, Linking, Platform } from 'react-native';

const NOME_DO_PONTO = encodeURIComponent('Local do reporte');

export function urlDoMapa(latitude: number, longitude: number): string {
  const ponto = `${latitude},${longitude}`;
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?ll=${ponto}&q=${NOME_DO_PONTO}`;
  }
  return `geo:${ponto}?q=${ponto}(${NOME_DO_PONTO})`;
}

/** Abre o app de mapas no ponto; sem app de mapas, avisa em vez de falhar calado. */
export function abrirNoMapa(latitude: number, longitude: number): void {
  Linking.openURL(urlDoMapa(latitude, longitude)).catch(() => {
    Alert.alert(
      'Não foi possível abrir o mapa',
      'Seu aparelho não tem um aplicativo de mapas disponível.',
    );
  });
}

export interface PontoNoMapa {
  latitude: number;
  longitude: number;
}
