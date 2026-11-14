// Camera e galeria do aparelho, pelo expo-image-picker (ver docs/adr/0009). Devolve a foto no
// formato do app (ArquivoFoto) ou null se a pessoa fechar sem escolher. Tudo que o aparelho pode
// recusar vira ErroAparelho com mensagem em portugues e um caminho alternativo.
//
// A camera so e pedida quando a pessoa toca em "Tirar foto" (nunca ao abrir o app), e a galeria
// usa o seletor do sistema, que nao exige permissao de acesso a todas as fotos.

import * as ImagePicker from 'expo-image-picker';

import type { ArquivoFoto } from '../api/types';
import { ErroAparelho } from './erro-aparelho';

// quality 0.6: a foto de celular pesa varios MB; comprimir poupa o pacote de dados de quem usa
// o app (o servidor ainda valida tipo e tamanho de verdade, plano unico secao 9).
const OPCOES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  allowsEditing: false,
};

const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];

function tipoPelaExtensao(uri: string): string | null {
  const extensao = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extensao === 'png') return 'image/png';
  if (extensao === 'jpg' || extensao === 'jpeg') return 'image/jpeg';
  return null;
}

function paraArquivoFoto(asset: ImagePicker.ImagePickerAsset): ArquivoFoto {
  const tipo = asset.mimeType ?? tipoPelaExtensao(asset.uri);
  if (!tipo || !TIPOS_ACEITOS.includes(tipo)) {
    throw new ErroAparelho('FORMATO_INVALIDO', 'Use uma foto JPEG ou PNG.');
  }
  const extensao = tipo === 'image/png' ? 'png' : 'jpg';
  return { uri: asset.uri, nome: asset.fileName ?? `foto-${Date.now()}.${extensao}`, tipo };
}

function primeiraFoto(resultado: ImagePicker.ImagePickerResult): ArquivoFoto | null {
  if (resultado.canceled || resultado.assets.length === 0) return null;
  return paraArquivoFoto(resultado.assets[0]);
}

/** Abre a camera. null = a pessoa fechou sem tirar foto. */
export async function tirarFoto(): Promise<ArquivoFoto | null> {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissao.granted) {
    throw new ErroAparelho(
      'PERMISSAO_NEGADA',
      'Para tirar a foto, permita o uso da câmera nas configurações do aparelho. Você também pode escolher uma foto da galeria.',
    );
  }
  let resultado: ImagePicker.ImagePickerResult;
  try {
    resultado = await ImagePicker.launchCameraAsync(OPCOES);
  } catch {
    // Ex.: o simulador do iOS nao tem camera.
    throw new ErroAparelho(
      'INDISPONIVEL',
      'A câmera não está disponível neste aparelho. Escolha uma foto da galeria.',
    );
  }
  return primeiraFoto(resultado);
}

/** Abre a galeria. null = a pessoa fechou sem escolher. */
export async function escolherFotoDaGaleria(): Promise<ArquivoFoto | null> {
  let resultado: ImagePicker.ImagePickerResult;
  try {
    resultado = await ImagePicker.launchImageLibraryAsync({
      ...OPCOES,
      // iPhone guarda fotos em HEIC; "compativel" entrega JPEG, que o servidor aceita.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
  } catch {
    throw new ErroAparelho('INDISPONIVEL', 'Não foi possível abrir a galeria. Tente de novo.');
  }
  return primeiraFoto(resultado);
}
