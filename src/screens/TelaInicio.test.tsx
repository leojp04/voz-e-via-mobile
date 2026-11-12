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

  it('ainda sem função: tocar num botão avisa "Em breve" em vez de parecer quebrado', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Meus reportes' }));
    expect(alerta).toHaveBeenCalledWith(
      'Em breve',
      'A função "Meus reportes" ainda não está disponível.',
    );
  });

  it('a frase do aviso não depende de singular ou plural do nome da ação', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Pedir ajuda' }));
    expect(alerta).toHaveBeenCalledWith(
      'Em breve',
      'A função "Pedir ajuda" ainda não está disponível.',
    );
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
