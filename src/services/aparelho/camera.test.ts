import * as ImagePicker from 'expo-image-picker';

import { escolherFotoDaGaleria, tirarFoto } from './camera';
import { ErroAparelho } from './erro-aparelho';

// O expo-image-picker e nativo (precisa do aparelho), entao nos testes ele e substituido por
// funcoes simuladas. Assim conferimos o que o app PEDE ao aparelho e como trata cada resposta.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));

const pedirPermissao = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const abrirCamera = ImagePicker.launchCameraAsync as jest.Mock;
const abrirGaleria = ImagePicker.launchImageLibraryAsync as jest.Mock;

function permissao(concedida: boolean, podePedirDeNovo = true) {
  return {
    granted: concedida,
    canAskAgain: podePedirDeNovo,
    status: concedida ? 'granted' : 'denied',
  };
}

function fotoTirada(extra: Record<string, unknown> = {}) {
  return {
    canceled: false,
    assets: [
      {
        uri: 'file:///cache/foto-1.jpg',
        fileName: 'foto-1.jpg',
        mimeType: 'image/jpeg',
        width: 3000,
        height: 4000,
        ...extra,
      },
    ],
  };
}

async function erroDe(promessa: Promise<unknown>): Promise<ErroAparelho> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroAparelho);
  return erro as ErroAparelho;
}

beforeEach(() => jest.resetAllMocks());

describe('tirarFoto', () => {
  it('pede permissao da camera e abre a camera com foto comprimida, sem edicao', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockResolvedValue(fotoTirada());

    await tirarFoto();

    expect(pedirPermissao).toHaveBeenCalledTimes(1);
    expect(abrirCamera).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: false,
    });
  });

  it('devolve a foto no formato do app: uri, nome e tipo', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockResolvedValue(fotoTirada());

    await expect(tirarFoto()).resolves.toEqual({
      uri: 'file:///cache/foto-1.jpg',
      nome: 'foto-1.jpg',
      tipo: 'image/jpeg',
    });
  });

  it('permissao negada: nao abre a camera e explica como resolver', async () => {
    pedirPermissao.mockResolvedValue(permissao(false, false));

    const erro = await erroDe(tirarFoto());

    expect(erro.codigo).toBe('PERMISSAO_NEGADA');
    expect(erro.message).toBe(
      'Para tirar a foto, permita o uso da câmera nas configurações do aparelho. Você também pode escolher uma foto da galeria.',
    );
    expect(abrirCamera).not.toHaveBeenCalled();
  });

  it('se a pessoa fecha a camera sem tirar foto, devolve null (nao e erro)', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockResolvedValue({ canceled: true, assets: null });

    await expect(tirarFoto()).resolves.toBeNull();
  });

  it('camera indisponivel (ex.: simulador): erro claro que sugere a galeria', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockRejectedValue(new Error('Camera not available on simulator'));

    const erro = await erroDe(tirarFoto());

    expect(erro.codigo).toBe('INDISPONIVEL');
    expect(erro.message).toBe(
      'A câmera não está disponível neste aparelho. Escolha uma foto da galeria.',
    );
  });

  it('sem mimeType, deduz o tipo pela extensao (.png e .jpg)', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockResolvedValueOnce(fotoTirada({ mimeType: undefined, uri: 'file:///c/a.png' }));
    abrirCamera.mockResolvedValueOnce(fotoTirada({ mimeType: undefined, uri: 'file:///c/b.JPG' }));

    expect((await tirarFoto())?.tipo).toBe('image/png');
    expect((await tirarFoto())?.tipo).toBe('image/jpeg');
  });

  it('sem nome de arquivo, gera um nome com a extensao certa', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockResolvedValue(fotoTirada({ fileName: null, mimeType: 'image/png' }));

    const foto = await tirarFoto();

    expect(foto?.nome).toMatch(/^foto-\d+\.png$/);
  });

  it('formato que o servidor nao aceita (ex.: HEIC) vira erro antes do envio', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    abrirCamera.mockResolvedValue(fotoTirada({ mimeType: 'image/heic', uri: 'file:///c/a.heic' }));

    const erro = await erroDe(tirarFoto());

    expect(erro.codigo).toBe('FORMATO_INVALIDO');
    expect(erro.message).toBe('Use uma foto JPEG ou PNG.');
  });
});

describe('escolherFotoDaGaleria', () => {
  it('abre a galeria pedindo o formato mais compativel (JPEG), sem pedir a camera', async () => {
    abrirGaleria.mockResolvedValue(fotoTirada());

    await escolherFotoDaGaleria();

    expect(pedirPermissao).not.toHaveBeenCalled();
    expect(abrirGaleria).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: false,
      preferredAssetRepresentationMode: 'compatible',
    });
  });

  it('devolve a foto escolhida no formato do app', async () => {
    abrirGaleria.mockResolvedValue(fotoTirada({ uri: 'file:///g/x.jpg', fileName: 'x.jpg' }));

    await expect(escolherFotoDaGaleria()).resolves.toEqual({
      uri: 'file:///g/x.jpg',
      nome: 'x.jpg',
      tipo: 'image/jpeg',
    });
  });

  it('se a pessoa fecha a galeria sem escolher, devolve null', async () => {
    abrirGaleria.mockResolvedValue({ canceled: true, assets: null });

    await expect(escolherFotoDaGaleria()).resolves.toBeNull();
  });

  it('falha ao abrir a galeria vira erro claro', async () => {
    abrirGaleria.mockRejectedValue(new Error('boom'));

    const erro = await erroDe(escolherFotoDaGaleria());

    expect(erro.codigo).toBe('INDISPONIVEL');
    expect(erro.message).toBe('Não foi possível abrir a galeria. Tente de novo.');
  });
});
