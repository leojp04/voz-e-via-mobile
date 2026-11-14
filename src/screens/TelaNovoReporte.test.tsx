import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { escolherFotoDaGaleria, tirarFoto } from '../services/aparelho/camera';
import { ErroAparelho } from '../services/aparelho/erro-aparelho';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ErroApi } from '../services/api/erro';
import type { Categoria, Reporte } from '../services/api/types';
import {
  criarAuthApiMock,
  criarFotosApiMock,
  criarReportesApiMock,
  montarTela,
} from '../test-utils/montar-tela';
import { TelaNovoReporte } from './TelaNovoReporte';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o erro so aparece em
// testes que esperam tempo suficiente, como estes. O icone e decorativo, entao vira um host simples.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

// Camera e GPS sao do aparelho: nos testes, os modulos que falam com eles sao simulados.
jest.mock('../services/aparelho/camera', () => ({
  tirarFoto: jest.fn(),
  escolherFotoDaGaleria: jest.fn(),
}));
jest.mock('../services/aparelho/localizacao', () => ({ obterLocalizacao: jest.fn() }));

const mockTirarFoto = tirarFoto as jest.Mock;
const mockEscolherDaGaleria = escolherFotoDaGaleria as jest.Mock;
const mockObterLocalizacao = obterLocalizacao as jest.Mock;

const CATEGORIAS: Categoria[] = [
  { id: 1, codigo: 'CALCADA', nome: 'Calçada quebrada' },
  { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' },
  { id: 8, codigo: 'OUTRO', nome: 'Outro problema' },
];

const LOCAL = {
  latitude: -23.5505,
  longitude: -46.6333,
  endereco: 'Rua das Flores, 120 - Centro, São Paulo',
};

const FOTO = { uri: 'file:///cache/foto.jpg', nome: 'foto.jpg', tipo: 'image/jpeg' };

const REPORTE_CRIADO: Reporte = {
  id: 7,
  protocolo: 'VV-2026-000007',
  categoria: CATEGORIAS[0],
  descricao: 'A calçada em frente ao número 120 está quebrada.',
  urgencia: 'MEDIA',
  status: 'ABERTO',
  criadoEm: '2026-11-13T12:00:00.000Z',
  latitude: LOCAL.latitude,
  longitude: LOCAL.longitude,
  atualizadoEm: '2026-11-13T12:00:00.000Z',
  historico: [{ statusAnterior: null, statusNovo: 'ABERTO', criadoEm: '2026-11-13T12:00:00.000Z' }],
};

const DESCRICAO = '  A calçada em frente ao número 120 está quebrada.  ';

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

// A tela e montada em /reportes/novo (e nao no "index"), para "voltar" cair no Início falso.
async function montar() {
  const reportes = criarReportesApiMock();
  reportes.listarCategorias.mockResolvedValue(CATEGORIAS);
  reportes.criar.mockResolvedValue(REPORTE_CRIADO);
  const fotos = criarFotosApiMock();
  fotos.enviar.mockResolvedValue({ fotoUrl: 'https://fotos.exemplo/1.jpg' });
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    reportes,
    fotos,
    rotas: {
      'reportes/novo': TelaNovoReporte,
      reportes: () => <Text>Destino meus reportes</Text>,
    },
    url: '/reportes/novo',
  });
  await screen.findByRole('radio', { name: 'Calçada quebrada' });
  return { reportes, fotos };
}

const enviar = () => fireEvent.press(screen.getByRole('button', { name: 'Enviar reporte' }));

async function usarLocalizacao() {
  mockObterLocalizacao.mockResolvedValue(LOCAL);
  await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
  await screen.findByText(LOCAL.endereco);
}

async function preencher() {
  await fireEvent.press(screen.getByRole('radio', { name: 'Calçada quebrada' }));
  await fireEvent.changeText(screen.getByLabelText('Descrição'), DESCRICAO);
  await usarLocalizacao();
}

beforeEach(() => jest.resetAllMocks());

describe('TelaNovoReporte', () => {
  it('mostra o titulo, as categorias vindas da API e a urgencia Média ja escolhida', async () => {
    const { reportes } = await montar();
    expect(screen.getByRole('header', { name: 'Novo reporte' })).toBeOnTheScreen();
    expect(reportes.listarCategorias).toHaveBeenCalledTimes(1);
    for (const nome of ['Calçada quebrada', 'Buraco na rua', 'Outro problema']) {
      expect(screen.getByRole('radio', { name: nome })).toBeOnTheScreen();
    }
    expect(screen.getByRole('radio', { name: 'Média' })).toBeSelected();
    expect(screen.getByLabelText('Descrição')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeOnTheScreen();
  });

  it('se as categorias nao carregam, avisa e deixa tentar de novo', async () => {
    const reportes = criarReportesApiMock();
    reportes.listarCategorias
      .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
      .mockResolvedValueOnce(CATEGORIAS);
    await montarTela(InicioFalso, {
      auth: criarAuthApiMock(),
      reportes,
      rotas: { 'reportes/novo': TelaNovoReporte },
      url: '/reportes/novo',
    });

    expect(
      await screen.findByText(
        'Não foi possível carregar as categorias. Verifique a internet e tente de novo.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('radio', { name: 'Calçada quebrada' })).toBeOnTheScreen();
    expect(reportes.listarCategorias).toHaveBeenCalledTimes(2);
  });

  it('enviar vazio mostra os tres avisos e NAO chama a API', async () => {
    const { reportes } = await montar();
    await enviar();
    expect(screen.getByText('Escolha uma categoria.')).toBeOnTheScreen();
    expect(screen.getByText('Descreva o problema.')).toBeOnTheScreen();
    expect(
      screen.getByText('Toque em "Usar minha localização" para dizer onde está o problema.'),
    ).toBeOnTheScreen();
    expect(reportes.criar).not.toHaveBeenCalled();
  });

  it('"Usar minha localização" mostra o endereco e as coordenadas', async () => {
    await montar();
    await usarLocalizacao();
    expect(mockObterLocalizacao).toHaveBeenCalledTimes(1);
    expect(screen.getByText('-23.55050, -46.63330')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver no mapa' })).toBeOnTheScreen();
  });

  it('permissao de localizacao negada: mostra a explicacao do aparelho e segue sem local', async () => {
    const { reportes } = await montar();
    mockObterLocalizacao.mockRejectedValue(
      new ErroAparelho('PERMISSAO_NEGADA', 'Para usar sua localização, permita o acesso.'),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));

    expect(
      await screen.findByText('Para usar sua localização, permita o acesso.'),
    ).toBeOnTheScreen();
    expect(reportes.criar).not.toHaveBeenCalled();
  });

  it('envia o reporte sem foto: dados certos, chave de idempotencia e protocolo na tela', async () => {
    const { reportes, fotos } = await montar();
    await preencher();

    await enviar();

    await waitFor(() => expect(reportes.criar).toHaveBeenCalledTimes(1));
    const [dados, chave] = reportes.criar.mock.calls[0];
    expect(dados).toEqual({
      categoriaId: 1,
      descricao: 'A calçada em frente ao número 120 está quebrada.',
      latitude: LOCAL.latitude,
      longitude: LOCAL.longitude,
      endereco: LOCAL.endereco,
      fotoUrl: undefined,
      urgencia: 'MEDIA',
    });
    expect(chave).toMatch(/^[0-9a-f-]{36}$/);
    expect(fotos.enviar).not.toHaveBeenCalled();
    expect(await screen.findByRole('header', { name: 'Reporte enviado!' })).toBeOnTheScreen();
    expect(screen.getByText('Protocolo: VV-2026-000007')).toBeOnTheScreen();
  });

  it('a urgencia escolhida vai no reporte', async () => {
    const { reportes } = await montar();
    await preencher();
    await fireEvent.press(screen.getByRole('radio', { name: 'Alta' }));

    await enviar();

    await waitFor(() => expect(reportes.criar).toHaveBeenCalled());
    expect(reportes.criar.mock.calls[0][0].urgencia).toBe('ALTA');
  });

  describe('foto', () => {
    it('foto tirada aparece na tela e e enviada ANTES de criar o reporte, que leva so a URL', async () => {
      const { reportes, fotos } = await montar();
      mockTirarFoto.mockResolvedValue(FOTO);
      await preencher();
      await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
      expect(await screen.findByLabelText('Foto do problema')).toBeOnTheScreen();

      await enviar();

      await waitFor(() => expect(reportes.criar).toHaveBeenCalled());
      expect(fotos.enviar).toHaveBeenCalledWith(FOTO);
      expect(fotos.enviar.mock.invocationCallOrder[0]).toBeLessThan(
        reportes.criar.mock.invocationCallOrder[0],
      );
      expect(reportes.criar.mock.calls[0][0].fotoUrl).toBe('https://fotos.exemplo/1.jpg');
    });

    it('a foto tambem pode vir da galeria', async () => {
      await montar();
      mockEscolherDaGaleria.mockResolvedValue(FOTO);
      await fireEvent.press(screen.getByRole('button', { name: 'Escolher da galeria' }));
      expect(await screen.findByLabelText('Foto do problema')).toBeOnTheScreen();
    });

    it('fechar a camera sem tirar foto nao muda nada', async () => {
      await montar();
      mockTirarFoto.mockResolvedValue(null);
      await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
      await waitFor(() => expect(mockTirarFoto).toHaveBeenCalled());
      expect(screen.queryByLabelText('Foto do problema')).not.toBeOnTheScreen();
    });

    it('camera indisponivel: mostra a mensagem do aparelho no campo da foto', async () => {
      await montar();
      mockTirarFoto.mockRejectedValue(
        new ErroAparelho('INDISPONIVEL', 'A câmera não está disponível. Escolha da galeria.'),
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
      expect(
        await screen.findByText('A câmera não está disponível. Escolha da galeria.'),
      ).toBeOnTheScreen();
    });

    it('remover foto tira a imagem da tela e o reporte segue sem foto', async () => {
      const { reportes, fotos } = await montar();
      mockTirarFoto.mockResolvedValue(FOTO);
      await preencher();
      await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
      await screen.findByLabelText('Foto do problema');

      await fireEvent.press(screen.getByRole('button', { name: 'Remover foto' }));
      expect(screen.queryByLabelText('Foto do problema')).not.toBeOnTheScreen();
      await enviar();

      await waitFor(() => expect(reportes.criar).toHaveBeenCalled());
      expect(fotos.enviar).not.toHaveBeenCalled();
      expect(reportes.criar.mock.calls[0][0].fotoUrl).toBeUndefined();
    });

    it('se o envio da foto falha, mostra o aviso no campo da foto e NAO cria o reporte', async () => {
      const { reportes, fotos } = await montar();
      fotos.enviar.mockRejectedValue(new ErroApi(400, 'tipo'));
      mockTirarFoto.mockResolvedValue(FOTO);
      await preencher();
      await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
      await screen.findByLabelText('Foto do problema');

      await enviar();

      expect(
        await screen.findByText('A foto não foi aceita. Escolha outra, em JPEG ou PNG.'),
      ).toBeOnTheScreen();
      expect(reportes.criar).not.toHaveBeenCalled();
    });
  });

  describe('erros ao criar o reporte', () => {
    it('sem conexao: avisa que NAO foi enviado e a nova tentativa usa a MESMA chave e nao reenvia a foto', async () => {
      const { reportes, fotos } = await montar();
      reportes.criar
        .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
        .mockResolvedValueOnce(REPORTE_CRIADO);
      mockTirarFoto.mockResolvedValue(FOTO);
      await preencher();
      await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
      await screen.findByLabelText('Foto do problema');

      await enviar();
      expect(
        await screen.findByText('Sem conexão. O seu reporte não foi enviado. Tente de novo.'),
      ).toBeOnTheScreen();
      await enviar();

      expect(await screen.findByRole('header', { name: 'Reporte enviado!' })).toBeOnTheScreen();
      expect(reportes.criar).toHaveBeenCalledTimes(2);
      expect(reportes.criar.mock.calls[1][1]).toBe(reportes.criar.mock.calls[0][1]);
      expect(reportes.criar.mock.calls[1][0].fotoUrl).toBe('https://fotos.exemplo/1.jpg');
      // A foto ja tinha subido na 1a tentativa: nao sobe de novo (nao deixa foto "orfa" no servidor).
      expect(fotos.enviar).toHaveBeenCalledTimes(1);
    });

    it('erro de validacao do servidor aparece no campo certo', async () => {
      const { reportes } = await montar();
      reportes.criar.mockRejectedValue(
        new ErroApi(400, 'Dados inválidos.', { descricao: 'Descreva melhor o problema.' }),
      );
      await preencher();

      await enviar();

      expect(await screen.findByText('Descreva melhor o problema.')).toBeOnTheScreen();
      expect(screen.getByText('Confira os dados do reporte e tente de novo.')).toBeOnTheScreen();
    });

    it('429: pede para esperar um minuto', async () => {
      const { reportes } = await montar();
      reportes.criar.mockRejectedValue(new ErroApi(429, 'x'));
      await preencher();

      await enviar();

      expect(
        await screen.findByText(
          'Muitos reportes em pouco tempo. Espere um minuto e tente de novo.',
        ),
      ).toBeOnTheScreen();
    });
  });

  it('toque duplo em "Enviar reporte" cria um reporte so', async () => {
    const { reportes } = await montar();
    let concluir: (reporte: Reporte) => void = () => {};
    reportes.criar.mockReturnValue(new Promise<Reporte>((resolver) => (concluir = resolver)));
    await preencher();

    await enviar();
    await enviar();
    concluir(REPORTE_CRIADO);

    await screen.findByRole('header', { name: 'Reporte enviado!' });
    expect(reportes.criar).toHaveBeenCalledTimes(1);
  });

  describe('depois de enviar', () => {
    it('"Fazer outro reporte" limpa o formulario e usa uma chave nova', async () => {
      const { reportes } = await montar();
      await preencher();
      await enviar();
      await screen.findByRole('header', { name: 'Reporte enviado!' });

      await fireEvent.press(screen.getByRole('button', { name: 'Fazer outro reporte' }));

      expect(await screen.findByRole('header', { name: 'Novo reporte' })).toBeOnTheScreen();
      expect(screen.getByLabelText('Descrição').props.value).toBe('');
      expect(screen.getByRole('radio', { name: 'Calçada quebrada' })).not.toBeSelected();
      expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeOnTheScreen();

      await preencher();
      await enviar();
      await waitFor(() => expect(reportes.criar).toHaveBeenCalledTimes(2));
      expect(reportes.criar.mock.calls[1][1]).not.toBe(reportes.criar.mock.calls[0][1]);
    });

    it('"Ver meus reportes" leva para a lista, onde o reporte novo aparece', async () => {
      await montar();
      await preencher();
      await enviar();
      await screen.findByRole('header', { name: 'Reporte enviado!' });

      await fireEvent.press(screen.getByRole('button', { name: 'Ver meus reportes' }));

      expect(await screen.findByText('Destino meus reportes')).toBeOnTheScreen();
    });

    it('"Voltar ao início" leva para o Início', async () => {
      await montar();
      await preencher();
      await enviar();
      await screen.findByRole('header', { name: 'Reporte enviado!' });

      await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));

      expect(await screen.findByText('Início de mentira')).toBeOnTheScreen();
    });
  });

  it('"Voltar" sai do formulario sem enviar nada', async () => {
    const { reportes } = await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('Início de mentira')).toBeOnTheScreen();
    expect(reportes.criar).not.toHaveBeenCalled();
  });
});
