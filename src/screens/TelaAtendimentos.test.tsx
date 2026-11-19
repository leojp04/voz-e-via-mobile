import { fireEvent, screen } from 'expo-router/testing-library';
import type { ReactTestInstance } from 'react-test-renderer';

import { ErroAparelho } from '../services/aparelho/erro-aparelho';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ErroApi } from '../services/api/erro';
import type { AtendimentosProximos } from '../services/api/types';
import { auditar } from '../test-utils/auditar-acessibilidade';
import {
  criarArmazenamentoEmMemoria,
  criarAtendimentosApiMock,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { ligarPara } from '../utils/ligar-para';
import { abrirNoMapa } from '../utils/url-do-mapa';
import { TelaAtendimentos } from './TelaAtendimentos';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// Discador, mapa e GPS sao do aparelho: aqui so conferimos que a tela os aciona.
jest.mock('../utils/ligar-para');
jest.mock('../utils/url-do-mapa');
jest.mock('../services/aparelho/localizacao');

const raiz = () => screen.root as unknown as ReactTestInstance;
const BUSCAR = 'Buscar perto de mim usando a minha localização';

const HOSPITAL: AtendimentosProximos = {
  tipo: 'HOSPITAL',
  atendimentos: [
    {
      id: 159,
      nome: 'Pronto-Socorro Exemplo',
      tipo: 'HOSPITAL',
      endereco: 'Rua das Flores, 10',
      telefone: null,
      latitude: -23.51,
      longitude: -46.77,
      distanciaMetros: 1605,
      acessibilidade: 'SIM',
      banheiroAdaptado: null,
      funciona24h: true,
      aviso: null,
      rotas: {
        googleMaps: 'https://maps.example/1',
        waze: 'https://waze.example/1',
        geo: 'geo:0,0',
      },
    },
  ],
  semAcessivelNoRaio: false,
  mensagemFalada: 'O hospital mais perto com acessibilidade fica a 1,6 km.',
  orientacaoEmergencia: 'Se for urgência, ligue 192.',
  telefoneEmergencia: '192',
  observacao: null,
  creditoDados: '© Colaboradores do OpenStreetMap (ODbL)',
};

async function montar(resultado: AtendimentosProximos | Error = HOSPITAL) {
  const atendimentos = criarAtendimentosApiMock();
  if (resultado instanceof Error) atendimentos.proximos.mockRejectedValue(resultado);
  else atendimentos.proximos.mockResolvedValue(resultado);
  await montarTela(TelaAtendimentos, {
    auth: criarAuthApiMock(),
    armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    atendimentos,
  });
  await screen.findByRole('header', { name: 'Atendimento perto' });
  return atendimentos;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.7 });
});

describe('TelaAtendimentos', () => {
  it('sem escolher o tipo, pede para escolher e não lê o GPS', async () => {
    const atendimentos = await montar();

    await fireEvent.press(screen.getByRole('button', { name: BUSCAR }));

    expect(await screen.findByText('Escolha o tipo de lugar.')).toBeOnTheScreen();
    expect(obterLocalizacao).not.toHaveBeenCalled();
    expect(atendimentos.proximos).not.toHaveBeenCalled();
  });

  it('busca o hospital mais perto com acessibilidade e mostra a lista, o 192 e o caminho', async () => {
    const atendimentos = await montar();

    await fireEvent.press(screen.getByRole('radio', { name: 'Hospital' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Preciso de acessibilidade/ }));
    await fireEvent.press(screen.getByRole('button', { name: BUSCAR }));

    expect(await screen.findByText('Pronto-Socorro Exemplo')).toBeOnTheScreen();
    expect(atendimentos.proximos).toHaveBeenCalledWith({
      tipo: 'HOSPITAL',
      latitude: -23.5,
      longitude: -46.7,
      acessivel: true,
    });
    expect(screen.getByText('© Colaboradores do OpenStreetMap (ODbL)')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para o SAMU, 192' }));
    expect(ligarPara).toHaveBeenCalledWith('192');
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Abrir o caminho até Pronto-Socorro Exemplo, o mais perto de você',
      }),
    );
    expect(abrirNoMapa).toHaveBeenCalledWith(-23.51, -46.77);
  });

  it('GPS negado: mostra o aviso do aparelho e não chama a API', async () => {
    jest
      .mocked(obterLocalizacao)
      .mockRejectedValue(new ErroAparelho('PERMISSAO_NEGADA', 'Permita o acesso à localização.'));
    const atendimentos = await montar();

    await fireEvent.press(screen.getByRole('radio', { name: 'Farmácia' }));
    await fireEvent.press(screen.getByRole('button', { name: BUSCAR }));

    expect(await screen.findByText('Permita o acesso à localização.')).toBeOnTheScreen();
    expect(atendimentos.proximos).not.toHaveBeenCalled();
  });

  it('sem internet: diz isso com clareza', async () => {
    await montar(new ErroApi(0, 'Sem conexão.'));

    await fireEvent.press(screen.getByRole('radio', { name: 'Posto de saúde' }));
    await fireEvent.press(screen.getByRole('button', { name: BUSCAR }));

    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
  });

  it('passa na auditoria de acessibilidade, antes e depois da busca', async () => {
    await montar();
    expect(auditar(raiz())).toEqual([]);

    await fireEvent.press(screen.getByRole('radio', { name: 'Hospital' }));
    await fireEvent.press(screen.getByRole('button', { name: BUSCAR }));
    await screen.findByText('Pronto-Socorro Exemplo');
    expect(auditar(raiz())).toEqual([]);
  });
});
