import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import type { AuthApi, Sessao } from '../services/api/types';
import type { ArmazenamentoSessao } from '../services/armazenamento-sessao';
import { NavegadorRaiz } from './NavegadorRaiz';

jest.mock('expo-splash-screen', () => ({ hide: jest.fn() }));

const sessaoValida: Sessao = {
  token: 'tok-123',
  expiraEm: '2999-01-01T00:00:00.000Z',
  usuario: { id: 1, nome: 'Maria', role: 'CIDADAO' },
};

const apiFalsa: AuthApi = { login: jest.fn(), cadastrar: jest.fn(), excluirConta: jest.fn() };

function criarArmazenamento(inicial: Sessao | null): ArmazenamentoSessao {
  let guardada = inicial;
  return {
    ler: jest.fn(async () => guardada),
    salvar: jest.fn(async (s: Sessao) => {
      guardada = s;
    }),
    apagar: jest.fn(async () => {
      guardada = null;
    }),
  };
}

function LayoutDoGrupo() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

function TelaLogin() {
  return <Text>Tela de login</Text>;
}

function TelaInicio() {
  const { logout } = useAuth();
  return (
    <>
      <Text>Tela de inicio</Text>
      <Pressable onPress={() => void logout()}>
        <Text>Sair</Text>
      </Pressable>
    </>
  );
}

// As rotas de mentira ficam dentro de um _layout que monta o AuthProvider + o NavegadorRaiz real.
function montar(armazenamento: ArmazenamentoSessao, url = '/') {
  return renderRouter(
    {
      _layout: () => (
        <AuthProvider api={apiFalsa} armazenamento={armazenamento}>
          <NavegadorRaiz />
        </AuthProvider>
      ),
      // Cada grupo precisa do proprio _layout para virar uma rota chamada "(auth)" / "(app)";
      // sem ele, as telas ficam soltas e o Stack.Protected da raiz nao as encontra.
      '(auth)/_layout': LayoutDoGrupo,
      '(auth)/login': TelaLogin,
      '(app)/_layout': LayoutDoGrupo,
      '(app)/index': TelaInicio,
    },
    { initialUrl: url },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NavegadorRaiz', () => {
  it('sem sessao, abrir uma rota de (app) leva ao login', async () => {
    await montar(criarArmazenamento(null), '/');

    await waitFor(() => expect(screen.getByText('Tela de login')).toBeOnTheScreen());
    expect(screen.queryByText('Tela de inicio')).not.toBeOnTheScreen();
  });

  it('com sessao salva, abre o inicio direto', async () => {
    await montar(criarArmazenamento(sessaoValida), '/');

    await waitFor(() => expect(screen.getByText('Tela de inicio')).toBeOnTheScreen());
    expect(screen.queryByText('Tela de login')).not.toBeOnTheScreen();
  });

  it('com sessao, tentar abrir o login leva ao inicio', async () => {
    await montar(criarArmazenamento(sessaoValida), '/login');

    await waitFor(() => expect(screen.getByText('Tela de inicio')).toBeOnTheScreen());
    expect(screen.queryByText('Tela de login')).not.toBeOnTheScreen();
  });

  it('o logout tira o usuario do inicio e volta ao login', async () => {
    await montar(criarArmazenamento(sessaoValida), '/');
    await waitFor(() => expect(screen.getByText('Tela de inicio')).toBeOnTheScreen());

    await fireEvent.press(screen.getByText('Sair'));

    await waitFor(() => expect(screen.getByText('Tela de login')).toBeOnTheScreen());
    expect(screen.queryByText('Tela de inicio')).not.toBeOnTheScreen();
  });

  it('enquanto le o cofre nao mostra nenhuma tela e mantem o splash; depois esconde o splash', async () => {
    let liberarLeitura: () => void = () => {};
    const armazenamento = criarArmazenamento(null);
    armazenamento.ler = jest.fn(
      () =>
        new Promise<null>((resolver) => {
          liberarLeitura = () => resolver(null);
        }),
    );

    await montar(armazenamento, '/');

    expect(screen.queryByText('Tela de login')).not.toBeOnTheScreen();
    expect(screen.queryByText('Tela de inicio')).not.toBeOnTheScreen();
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    await act(async () => liberarLeitura());

    await waitFor(() => expect(screen.getByText('Tela de login')).toBeOnTheScreen());
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});
