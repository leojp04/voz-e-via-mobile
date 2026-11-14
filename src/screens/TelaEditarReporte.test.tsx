import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { escolherFotoDaGaleria, tirarFoto } from '../services/aparelho/camera';
import { ErroApi } from '../services/api/erro';
import type { Reporte } from '../services/api/types';
import {
  criarAuthApiMock,
  criarFotosApiMock,
  criarReportesApiMock,
  montarTela,
} from '../test-utils/montar-tela';
import { TelaEditarReporte } from './TelaEditarReporte';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../services/aparelho/camera', () => ({
  tirarFoto: jest.fn(),
  escolherFotoDaGaleria: jest.fn(),
}));

const mockTirarFoto = tirarFoto as jest.Mock;
const mockEscolherDaGaleria = escolherFotoDaGaleria as jest.Mock;

const CRIADO_EM = '2026-11-13T12:00:00.000Z';
const FOTO_NOVA = { uri: 'file:///cache/nova.jpg', nome: 'nova.jpg', tipo: 'image/jpeg' };

const REPORTE: Reporte = {
  id: 7,
  protocolo: 'VV-2026-000007',
  categoria: { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' },
  descricao: 'Buraco grande na frente do número 80.',
  urgencia: 'ALTA',
  status: 'ABERTO',
  criadoEm: CRIADO_EM,
  latitude: -23.5505,
  longitude: -46.6333,
  endereco: 'Praça João Kaiser, 40 - Sé, São Paulo',
  fotoUrl: 'https://fotos.exemplo/7.jpg',
  atualizadoEm: CRIADO_EM,
  historico: [{ statusAnterior: null, statusNovo: 'ABERTO', criadoEm: CRIADO_EM }],
};

function DetalheFalso() {
  return <Text>Detalhe de mentira</Text>;
}

// Monta em /reportes/7/editar, com um "detalhe" falso por baixo, para ver para onde a tela volta.
async function montar(configurar: (api: ReturnType<typeof criarReportesApiMock>) => void) {
  const reportes = criarReportesApiMock();
  const fotos = criarFotosApiMock();
  fotos.enviar.mockResolvedValue({ fotoUrl: 'https://fotos.exemplo/nova.jpg' });
  configurar(reportes);
  await montarTela(DetalheFalso, {
    auth: criarAuthApiMock(),
    reportes,
    fotos,
    rotas: { 'reportes/[id]/editar': TelaEditarReporte },
    url: '/reportes/7/editar',
  });
  return { reportes, fotos };
}

async function salvar() {
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar mudanças' }));
}

beforeEach(() => jest.resetAllMocks());

describe('TelaEditarReporte', () => {
  it('carrega o reporte e preenche a descricao e a foto atuais', async () => {
    const { reportes } = await montar((api) => api.obter.mockResolvedValue(REPORTE));

    expect(await screen.findByRole('header', { name: 'Editar reporte' })).toBeOnTheScreen();
    expect(reportes.obter).toHaveBeenCalledWith(7);
    expect(screen.getByText('VV-2026-000007')).toBeOnTheScreen();
    expect(screen.getByText('VV-2026-000007').props.adjustsFontSizeToFit).toBe(true);
    expect(screen.getByLabelText('Descrição').props.value).toBe(REPORTE.descricao);
    expect((await screen.findByLabelText('Foto do problema')).props.source).toEqual({
      uri: 'https://fotos.exemplo/7.jpg',
    });
  });

  it('categoria, urgencia e local aparecem so para leitura', async () => {
    await montar((api) => api.obter.mockResolvedValue(REPORTE));
    await screen.findByRole('header', { name: 'Editar reporte' });
    expect(screen.getByText('Buraco na rua')).toBeOnTheScreen();
    expect(screen.getByText('Urgência: Alta')).toBeOnTheScreen();
    expect(screen.getByText('Praça João Kaiser, 40 - Sé, São Paulo')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Usar minha localização' })).not.toBeOnTheScreen();
  });

  it('reporte que ja nao esta ABERTO: avisa e nao mostra o formulario', async () => {
    await montar((api) => api.obter.mockResolvedValue({ ...REPORTE, status: 'EM_ANALISE' }));
    expect(
      await screen.findByText('Este reporte já não está em aberto e não pode mais ser editado.'),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Descrição')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Salvar mudanças' })).not.toBeOnTheScreen();
  });

  it('se o reporte nao carrega, avisa e deixa tentar de novo', async () => {
    const { reportes } = await montar((api) =>
      api.obter.mockRejectedValueOnce(new ErroApi(0, 'sem rede')).mockResolvedValue(REPORTE),
    );
    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByLabelText('Descrição')).toBeOnTheScreen();
    expect(reportes.obter).toHaveBeenCalledTimes(2);
  });

  it('descricao vazia mostra o aviso e NAO chama a API', async () => {
    const { reportes } = await montar((api) => api.obter.mockResolvedValue(REPORTE));
    await fireEvent.changeText(await screen.findByLabelText('Descrição'), '   ');
    await salvar();
    expect(screen.getByText('Descreva o problema.')).toBeOnTheScreen();
    expect(reportes.editar).not.toHaveBeenCalled();
  });

  it('salvar so a descricao: manda texto sem espacos e MANTEM a foto (fotoUrl ausente)', async () => {
    const { reportes, fotos } = await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockResolvedValue(REPORTE);
    });
    await fireEvent.changeText(
      await screen.findByLabelText('Descrição'),
      '  Buraco enorme, já causou acidente.  ',
    );
    await salvar();

    await waitFor(() => expect(reportes.editar).toHaveBeenCalledTimes(1));
    expect(reportes.editar).toHaveBeenCalledWith(7, {
      descricao: 'Buraco enorme, já causou acidente.',
    });
    expect(fotos.enviar).not.toHaveBeenCalled();
  });

  it('salvar volta para o detalhe', async () => {
    await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockResolvedValue(REPORTE);
    });
    await screen.findByLabelText('Descrição');
    await salvar();
    expect(await screen.findByText('Detalhe de mentira')).toBeOnTheScreen();
  });

  it('trocar a foto: sobe a nova ANTES de editar e manda so a URL nova', async () => {
    mockTirarFoto.mockResolvedValue(FOTO_NOVA);
    const { reportes, fotos } = await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockResolvedValue(REPORTE);
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Tirar foto' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Foto do problema').props.source).toEqual({
        uri: FOTO_NOVA.uri,
      }),
    );
    await salvar();

    await waitFor(() => expect(reportes.editar).toHaveBeenCalled());
    expect(fotos.enviar).toHaveBeenCalledWith(FOTO_NOVA);
    expect(fotos.enviar.mock.invocationCallOrder[0]).toBeLessThan(
      reportes.editar.mock.invocationCallOrder[0],
    );
    expect(reportes.editar).toHaveBeenCalledWith(7, {
      descricao: REPORTE.descricao,
      fotoUrl: 'https://fotos.exemplo/nova.jpg',
    });
  });

  it('a foto tambem pode vir da galeria', async () => {
    mockEscolherDaGaleria.mockResolvedValue(FOTO_NOVA);
    await montar((api) => api.obter.mockResolvedValue(REPORTE));
    await fireEvent.press(await screen.findByRole('button', { name: 'Escolher da galeria' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Foto do problema').props.source).toEqual({
        uri: FOTO_NOVA.uri,
      }),
    );
  });

  it('remover a foto atual: manda fotoUrl null (remove)', async () => {
    const { reportes } = await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockResolvedValue({ ...REPORTE, fotoUrl: undefined });
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Remover foto' }));
    expect(screen.queryByLabelText('Foto do problema')).not.toBeOnTheScreen();
    await salvar();

    await waitFor(() => expect(reportes.editar).toHaveBeenCalled());
    expect(reportes.editar).toHaveBeenCalledWith(7, {
      descricao: REPORTE.descricao,
      fotoUrl: null,
    });
  });

  it('reporte sem foto e nada novo: nao mexe na foto', async () => {
    const { reportes } = await montar((api) => {
      api.obter.mockResolvedValue({ ...REPORTE, fotoUrl: undefined });
      api.editar.mockResolvedValue(REPORTE);
    });
    await screen.findByLabelText('Descrição');
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeOnTheScreen();
    await salvar();
    await waitFor(() => expect(reportes.editar).toHaveBeenCalled());
    expect(reportes.editar).toHaveBeenCalledWith(7, { descricao: REPORTE.descricao });
  });

  it('falha ao subir a foto: avisa, NAO edita e nao sai da tela', async () => {
    mockTirarFoto.mockResolvedValue(FOTO_NOVA);
    const { reportes, fotos } = await montar((api) => api.obter.mockResolvedValue(REPORTE));
    fotos.enviar.mockRejectedValue(new ErroApi(0, 'sem rede'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Tirar foto' }));
    await salvar();

    expect(
      await screen.findByText('Sem conexão. A foto não foi enviada. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(reportes.editar).not.toHaveBeenCalled();
    expect(screen.queryByText('Detalhe de mentira')).not.toBeOnTheScreen();
  });

  it('se a edicao falha depois do upload, a nova tentativa NAO sobe a foto de novo', async () => {
    mockTirarFoto.mockResolvedValue(FOTO_NOVA);
    const { reportes, fotos } = await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockRejectedValueOnce(new ErroApi(0, 'sem rede')).mockResolvedValue(REPORTE);
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Tirar foto' }));
    await salvar();
    expect(
      await screen.findByText('Sem conexão. As suas mudanças não foram salvas. Tente de novo.'),
    ).toBeOnTheScreen();

    await salvar();
    await waitFor(() => expect(reportes.editar).toHaveBeenCalledTimes(2));
    expect(fotos.enviar).toHaveBeenCalledTimes(1);
    expect(reportes.editar.mock.calls[1][1].fotoUrl).toBe('https://fotos.exemplo/nova.jpg');
  });

  it('409 ao salvar: explica que ja nao esta em aberto', async () => {
    await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockRejectedValue(new ErroApi(409, 'conflito'));
    });
    await screen.findByLabelText('Descrição');
    await salvar();
    expect(
      await screen.findByText('Este reporte já não está em aberto e não pode mais ser editado.'),
    ).toBeOnTheScreen();
  });

  it('400 com campos: mostra a mensagem junto da descricao', async () => {
    await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockRejectedValue(
        new ErroApi(400, 'invalido', { descricao: 'Descrição inválida no servidor.' }),
      );
    });
    await screen.findByLabelText('Descrição');
    await salvar();
    expect(await screen.findByText('Descrição inválida no servidor.')).toBeOnTheScreen();
  });

  it('toque duplo em salvar edita uma vez so', async () => {
    let liberar: (r: Reporte) => void = () => {};
    const { reportes } = await montar((api) => {
      api.obter.mockResolvedValue(REPORTE);
      api.editar.mockImplementation(() => new Promise<Reporte>((resolve) => (liberar = resolve)));
    });
    await screen.findByLabelText('Descrição');
    await salvar();
    await salvar();
    expect(reportes.editar).toHaveBeenCalledTimes(1);
    liberar(REPORTE);
    await screen.findByText('Detalhe de mentira');
  });

  it('"Voltar" sai sem salvar', async () => {
    const { reportes } = await montar((api) => api.obter.mockResolvedValue(REPORTE));
    await fireEvent.press(await screen.findByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('Detalhe de mentira')).toBeOnTheScreen();
    expect(reportes.editar).not.toHaveBeenCalled();
  });

  it('id que nao e numero: nem chama a API, so avisa', async () => {
    const reportes = criarReportesApiMock();
    await montarTela(DetalheFalso, {
      auth: criarAuthApiMock(),
      reportes,
      rotas: { 'reportes/[id]/editar': TelaEditarReporte },
      url: '/reportes/abc/editar',
    });
    expect(await screen.findByText('Reporte não encontrado.')).toBeOnTheScreen();
    expect(reportes.obter).not.toHaveBeenCalled();
  });
});
