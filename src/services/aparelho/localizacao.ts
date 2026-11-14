// Localizacao (GPS) do aparelho, pelo expo-location (ver docs/adr/0009). So le o local quando a
// pessoa toca em "Usar minha localizacao" e so com o app em uso (nunca em segundo plano), como a
// tela de Privacidade promete. Tambem converte o ponto em endereco legivel; se isso falhar o
// reporte segue so com latitude e longitude.

import * as Location from 'expo-location';

import { ErroAparelho } from './erro-aparelho';

export interface LocalizacaoAtual {
  latitude: number;
  longitude: number;
  /** Ex.: "Rua das Flores, 120 - Centro, Sao Paulo"; ausente se o aparelho nao soube dizer. */
  endereco?: string;
}

type PartesDoEndereco = Pick<
  Location.LocationGeocodedAddress,
  'street' | 'streetNumber' | 'district' | 'city' | 'name'
>;

/** "Rua, numero - bairro, cidade", pulando o que faltar. undefined se nao sobrar nada. */
export function montarEndereco(endereco: PartesDoEndereco): string | undefined {
  const rua = endereco.street ?? endereco.name;
  const numero = endereco.street ? endereco.streetNumber : null;
  const linhaDaRua = [rua, numero].filter(Boolean).join(', ');
  const linhaDoBairro = [endereco.district, endereco.city].filter(Boolean).join(', ');
  return [linhaDaRua, linhaDoBairro].filter(Boolean).join(' - ') || undefined;
}

export async function obterLocalizacao(): Promise<LocalizacaoAtual> {
  const permissao = await Location.requestForegroundPermissionsAsync();
  if (!permissao.granted) {
    throw new ErroAparelho(
      'PERMISSAO_NEGADA',
      'Para usar sua localização, permita o acesso nas configurações do aparelho.',
    );
  }

  let posicao: Location.LocationObject;
  try {
    // Precisao "equilibrada": suficiente para achar a rua e gasta menos bateria que a maxima.
    posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    throw new ErroAparelho(
      'INDISPONIVEL',
      'Não foi possível obter sua localização. Verifique se o GPS está ligado e tente de novo.',
    );
  }

  const { latitude, longitude } = posicao.coords;
  let endereco: string | undefined;
  try {
    const [primeiro] = await Location.reverseGeocodeAsync({ latitude, longitude });
    endereco = primeiro ? montarEndereco(primeiro) : undefined;
  } catch {
    endereco = undefined;
  }
  return { latitude, longitude, endereco };
}
