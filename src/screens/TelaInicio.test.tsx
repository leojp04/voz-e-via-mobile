import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import {
  criarArmazenamentoEmMemoria,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { TelaInicio } from './TelaInicio';

async function montar() {
  const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
  await montarTela(TelaInicio, { auth: criarAuthApiMock(), armazenamento });
  return armazenamento;
}

const BOTOES = [
  'Falar com o assistente por voz',
  'Reportar um problema na rua',
  'Meus reportes',
  'Contatos de emergência',
  'Achar hospital, posto de saúde, farmácia ou CRAS perto de mim',
  'Pedir ajuda',
];

describe('TelaInicio', () => {
  afterEach(() => jest.restoreAllMocks());

  it('cumprimenta a pessoa pelo nome', async () => {
    await montar();
    expect(screen.getByText('Olá, Maria')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Voz & Via' })).toBeOnTheScreen();
  });

  it.each(BOTOES)('tem o botão "%s" com rótulo de acessibilidade', async (nome) => {
    await montar();
    expect(screen.getByRole('button', { name: nome })).toBeOnTheScreen();
  });

  it('Pedir ajuda abre a confirmação do aviso aos contatos (sem aviso de "Em breve")', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { ajuda: () => <Text>Destino pedir ajuda</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Pedir ajuda' }));
    expect(await screen.findByText('Destino pedir ajuda')).toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('Atendimento perto abre a busca por hospital, posto ou farmácia (sem "Em breve")', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { atendimentos: () => <Text>Destino atendimentos</Text> },
    });
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Achar hospital, posto de saúde, farmácia ou CRAS perto de mim',
      }),
    );
    expect(await screen.findByText('Destino atendimentos')).toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('o microfone é o destaque da tela e mostra a dica "Toque e fale"', async () => {
    await montar();
    expect(screen.getByText('Toque e fale')).toBeOnTheScreen();
  });

  it('tocar no microfone abre o assistente (sem aviso de "Em breve")', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { assistente: () => <Text>Destino assistente</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Falar com o assistente por voz' }));
    expect(await screen.findByText('Destino assistente')).toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('os atalhos mostram o título curto, mas falam o rótulo completo', async () => {
    await montar();
    expect(screen.getByText('Reportar problema')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reportar um problema na rua' })).toBeOnTheScreen();
  });

  it('Reportar problema abre a tela de novo reporte (sem aviso de "Em breve")', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { 'reportes/novo': () => <Text>Destino novo reporte</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Reportar um problema na rua' }));
    expect(await screen.findByText('Destino novo reporte')).toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('Meus reportes abre a lista de reportes (sem aviso de "Em breve")', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { reportes: () => <Text>Destino meus reportes</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Meus reportes' }));
    expect(await screen.findByText('Destino meus reportes')).toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('Contatos abre a lista de contatos de emergência (sem aviso de "Em breve")', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { contatos: () => <Text>Destino contatos</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Contatos de emergência' }));
    expect(await screen.findByText('Destino contatos')).toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('Privacidade abre a tela de política de privacidade', async () => {
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { privacidade: () => <Text>Destino privacidade</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Política de privacidade' }));
    expect(await screen.findByText('Destino privacidade')).toBeOnTheScreen();
  });

  it('Sobre o app abre a tela com versão e hash', async () => {
    const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento,
      rotas: { sobre: () => <Text>Destino sobre</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Sobre o app' }));
    expect(await screen.findByText('Destino sobre')).toBeOnTheScreen();
  });

  it('Sair apaga a sessão do cofre e volta ao estado anônimo', async () => {
    const armazenamento = await montar();
    expect(screen.getByTestId('status')).toHaveTextContent('autenticado');
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonimo'));
    expect(armazenamento.apagar).toHaveBeenCalled();
  });
});
