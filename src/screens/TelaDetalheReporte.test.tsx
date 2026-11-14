import { fireEvent, screen } from 'expo-router/testing-library';
import { Linking, Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import type { Reporte } from '../services/api/types';
import { criarAuthApiMock, criarReportesApiMock, montarTela } from '../test-utils/montar-tela';
import { formatarData } from '../utils/formatar-data';
import { urlDoMapa } from '../utils/url-do-mapa';
import { TelaDetalheReporte } from './TelaDetalheReporte';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const CRIADO_EM = new Date(2026, 10, 13, 9, 5).toISOString();
const ATUALIZADO_EM = new Date(2026, 10, 14, 15, 30).toISOString();

const REPORTE: Reporte = {
  id: 7,
  protocolo: 'VV-2026-000007',
  categoria: { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' },
  descricao: 'Buraco grande na frente do número 80.',
  urgencia: 'ALTA',
  status: 'EM_ANALISE',
  criadoEm: CRIADO_EM,
  latitude: -23.5505,
  longitude: -46.6333,
  endereco: 'Praça João Kaiser, 40 - Sé, São Paulo',
  fotoUrl: 'https://fotos.exemplo/7.jpg',
  atualizadoEm: ATUALIZADO_EM,
  historico: [
    { statusAnterior: null, statusNovo: 'ABERTO', criadoEm: CRIADO_EM },
    {
      statusAnterior: 'ABERTO',
      statusNovo: 'EM_ANALISE',
      observacao: 'Equipe da prefeitura vai vistoriar.',
      criadoEm: ATUALIZADO_EM,
    },
  ],
};

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

// A tela e montada em /reportes/<id> (e nao no "index"), para "voltar" cair no Início falso.
async function montar(
  configurar: (api: ReturnType<typeof criarReportesApiMock>) => void,
  caminho = '/reportes/7',
) {
  const reportes = criarReportesApiMock();
  configurar(reportes);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    reportes,
    rotas: { 'reportes/[id]': TelaDetalheReporte },
    url: caminho,
  });
  return reportes;
}

afterEach(() => jest.restoreAllMocks());

describe('TelaDetalheReporte', () => {
  it('busca o reporte pelo id da rota e mostra o protocolo e os dados principais', async () => {
    const reportes = await montar((api) => api.obter.mockResolvedValue(REPORTE));

    expect(await screen.findByRole('header', { name: 'Detalhe do reporte' })).toBeOnTheScreen();
    expect(reportes.obter).toHaveBeenCalledWith(7);
    expect(screen.getByText('VV-2026-000007')).toBeOnTheScreen();
    expect(screen.getByLabelText('Status: Em análise')).toBeOnTheScreen();
    expect(screen.getByText('Buraco na rua')).toBeOnTheScreen();
    expect(screen.getByText('Urgência: Alta')).toBeOnTheScreen();
    expect(screen.getByText('Buraco grande na frente do número 80.')).toBeOnTheScreen();
  });

  it('mostra as datas de envio e de atualizacao', async () => {
    await montar((api) => api.obter.mockResolvedValue(REPORTE));
    expect(await screen.findByText(`Enviado em ${formatarData(CRIADO_EM)}`)).toBeOnTheScreen();
    expect(screen.getByText(`Atualizado em ${formatarData(ATUALIZADO_EM)}`)).toBeOnTheScreen();
  });

  it('reporte nunca atualizado nao repete a data como "Atualizado em"', async () => {
    await montar((api) =>
      api.obter.mockResolvedValue({ ...REPORTE, atualizadoEm: CRIADO_EM, historico: [] }),
    );
    await screen.findByText(`Enviado em ${formatarData(CRIADO_EM)}`);
    expect(screen.queryByText(/Atualizado em/)).not.toBeOnTheScreen();
  });

  describe('foto', () => {
    it('mostra a foto, descrita para o leitor de tela', async () => {
      await montar((api) => api.obter.mockResolvedValue(REPORTE));
      const imagem = await screen.findByLabelText('Foto do problema');
      expect(imagem.props.source).toEqual({ uri: 'https://fotos.exemplo/7.jpg' });
    });

    it('sem foto, nao mostra imagem', async () => {
      await montar((api) => api.obter.mockResolvedValue({ ...REPORTE, fotoUrl: undefined }));
      await screen.findByText('VV-2026-000007');
      expect(screen.queryByLabelText('Foto do problema')).not.toBeOnTheScreen();
    });
  });

  describe('localizacao', () => {
    it('mostra o endereco e as coordenadas', async () => {
      await montar((api) => api.obter.mockResolvedValue(REPORTE));
      expect(await screen.findByText('Praça João Kaiser, 40 - Sé, São Paulo')).toBeOnTheScreen();
      expect(screen.getByText('-23.55050, -46.63330')).toBeOnTheScreen();
    });

    it('sem endereco, explica que so o ponto foi registrado', async () => {
      await montar((api) => api.obter.mockResolvedValue({ ...REPORTE, endereco: undefined }));
      expect(
        await screen.findByText('Endereço não informado, mas o ponto no mapa foi registrado.'),
      ).toBeOnTheScreen();
    });

    it('"Ver no mapa" abre o app de mapas no ponto do reporte', async () => {
      const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      await montar((api) => api.obter.mockResolvedValue(REPORTE));
      await screen.findByText('VV-2026-000007');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver no mapa' }));

      expect(abrir).toHaveBeenCalledWith(urlDoMapa(-23.5505, -46.6333));
    });
  });

  describe('historico de status', () => {
    it('lista cada mudanca, na ordem, com a data e a observacao', async () => {
      await montar((api) => api.obter.mockResolvedValue(REPORTE));
      expect(await screen.findByRole('header', { name: 'Histórico' })).toBeOnTheScreen();

      expect(screen.getByText(`Aberto · ${formatarData(CRIADO_EM)}`)).toBeOnTheScreen();
      expect(screen.getByText(`Em análise · ${formatarData(ATUALIZADO_EM)}`)).toBeOnTheScreen();
      expect(screen.getByText('Equipe da prefeitura vai vistoriar.')).toBeOnTheScreen();
    });
  });

  it('enquanto carrega, avisa que esta carregando', async () => {
    await montar((api) => api.obter.mockReturnValue(new Promise(() => {})));
    expect(await screen.findByText('Carregando reporte…')).toBeOnTheScreen();
  });

  it('reporte que nao existe (ou e de outra pessoa): avisa e deixa tentar de novo', async () => {
    const reportes = await montar((api) =>
      api.obter.mockRejectedValueOnce(new ErroApi(404, 'x')).mockResolvedValueOnce(REPORTE),
    );
    expect(await screen.findByText('Reporte não encontrado.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('VV-2026-000007')).toBeOnTheScreen();
    expect(reportes.obter).toHaveBeenCalledTimes(2);
  });

  it('sem conexao: mensagem propria', async () => {
    await montar((api) => api.obter.mockRejectedValue(new ErroApi(0, 'x')));
    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
  });

  it('id que nao e numero: nem chama a API, so avisa', async () => {
    const reportes = await montar(() => {}, '/reportes/abc');
    expect(await screen.findByText('Reporte não encontrado.')).toBeOnTheScreen();
    expect(reportes.obter).not.toHaveBeenCalled();
  });

  it('"Voltar" leva ao Início', async () => {
    await montar((api) => api.obter.mockResolvedValue(REPORTE));
    await screen.findByText('VV-2026-000007');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Início de mentira')).toBeOnTheScreen();
  });
});
