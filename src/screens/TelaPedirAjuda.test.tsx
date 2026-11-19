import { fireEvent, screen } from 'expo-router/testing-library';
import type { ReactTestInstance } from 'react-test-renderer';

import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ErroApi } from '../services/api/erro';
import { auditar } from '../test-utils/auditar-acessibilidade';
import {
  criarArmazenamentoEmMemoria,
  criarAssistenteApiMock,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { ligarPara } from '../utils/ligar-para';
import { TelaPedirAjuda } from './TelaPedirAjuda';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../utils/ligar-para');
jest.mock('../services/aparelho/localizacao');

const raiz = () => screen.root as unknown as ReactTestInstance;
const AVISAR = 'Sim, avisar meus contatos';

async function montar(configurar?: (api: ReturnType<typeof criarAssistenteApiMock>) => void) {
  const assistente = criarAssistenteApiMock();
  configurar?.(assistente);
  await montarTela(TelaPedirAjuda, {
    auth: criarAuthApiMock(),
    armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    assistente,
  });
  await screen.findByRole('header', { name: 'Pedir ajuda' });
  return assistente;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.7 });
});

describe('TelaPedirAjuda', () => {
  it('nada sai sem a confirmação, e o 192 já está a um toque', async () => {
    const assistente = await montar();

    expect(assistente.acionarEmergencia).not.toHaveBeenCalled();
    expect(obterLocalizacao).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para o SAMU, 192' }));
    expect(ligarPara).toHaveBeenCalledWith('192');
  });

  it('confirmado, avisa os contatos com a localização e mostra quantos foram avisados', async () => {
    const assistente = await montar((api) =>
      api.acionarEmergencia.mockResolvedValue({
        id: 4,
        contatosNotificados: 0,
        mensagemFalada: 'Pedido de ajuda enviado. Estamos avisando seus contatos.',
      }),
    );

    await fireEvent.press(screen.getByRole('button', { name: AVISAR }));

    expect(
      await screen.findByText('Pedido de ajuda enviado. Estamos avisando seus contatos.'),
    ).toBeOnTheScreen();
    expect(assistente.acionarEmergencia).toHaveBeenCalledWith({
      latitude: -23.5,
      longitude: -46.7,
      textoOriginal: 'Pedido de ajuda pelo botão do app',
    });
    expect(screen.queryByRole('button', { name: AVISAR })).not.toBeOnTheScreen();
  });

  it('sem GPS, o aviso sai mesmo assim (avisar vale mais que a coordenada)', async () => {
    jest.mocked(obterLocalizacao).mockRejectedValue(new Error('GPS desligado'));
    const assistente = await montar((api) =>
      api.acionarEmergencia.mockResolvedValue({
        id: 5,
        contatosNotificados: 1,
        mensagemFalada: 'Ok.',
      }),
    );

    await fireEvent.press(screen.getByRole('button', { name: AVISAR }));

    expect(await screen.findByText('Contatos avisados: 1')).toBeOnTheScreen();
    expect(assistente.acionarEmergencia).toHaveBeenCalledWith({
      textoOriginal: 'Pedido de ajuda pelo botão do app',
    });
  });

  it('se a API falhar, nunca finge que avisou: manda ligar para o SAMU', async () => {
    await montar((api) => api.acionarEmergencia.mockRejectedValue(new ErroApi(0, 'Sem conexão.')));

    await fireEvent.press(screen.getByRole('button', { name: AVISAR }));

    expect(
      await screen.findByText(
        'Não foi possível avisar seus contatos. Ligue agora para o SAMU: 192.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ligar para o SAMU, 192' })).toBeOnTheScreen();
  });

  it('passa na auditoria de acessibilidade', async () => {
    await montar();
    expect(auditar(raiz())).toEqual([]);
  });
});
